import { diff3Merge, diffPatch } from 'node-diff3';

/**
 * Main 3-way merge function.
 *
 * Uses node-diff3 regions and trims only common conflict edges. This keeps
 * matching lines inside a conflicted region, like Git, while still pulling
 * identical prefix/suffix lines out of the conflict markers.
 *
 * threeWayMerge(base, current, incoming) -> Hunk[]
 *
 * Hunk:
 *   { type: 'merged',   lines: string[] }
 *   { type: 'conflict', current: string[], incoming: string[] }
 */
export function threeWayMerge(base, current, incoming) {
  const currentLines = toLines(current);
  const baseLines = toLines(base);
  const incomingLines = toLines(incoming);
  const result = diff3Merge(currentLines, baseLines, incomingLines);

  const hunks = mergeRegionsToHunks(result);
  return addMissingDeleteConflicts(hunks, baseLines, currentLines, incomingLines);
}

function toLines(str) {
  if (!str) return [];

  const lines = str.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function mergeRegionsToHunks(regions) {
  const hunks = [];

  for (const region of regions) {
    if (region.ok) {
      addMerged(hunks, region.ok);
      continue;
    }

    if (region.conflict) {
      addTrimmedConflict(hunks, region.conflict.a, region.conflict.b);
    }
  }

  return collapseAdjacentMergedHunks(hunks);
}

function addTrimmedConflict(hunks, currentLines, incomingLines) {
  let start = 0;
  let currentEnd = currentLines.length;
  let incomingEnd = incomingLines.length;

  while (
    start < currentEnd &&
    start < incomingEnd &&
    currentLines[start] === incomingLines[start]
  ) {
    start += 1;
  }

  while (
    currentEnd > start &&
    incomingEnd > start &&
    currentLines[currentEnd - 1] === incomingLines[incomingEnd - 1]
  ) {
    currentEnd -= 1;
    incomingEnd -= 1;
  }

  addMerged(hunks, currentLines.slice(0, start));

  const currentConflict = currentLines.slice(start, currentEnd);
  const incomingConflict = incomingLines.slice(start, incomingEnd);
  if (currentConflict.length > 0 || incomingConflict.length > 0) {
    hunks.push({
      type: 'conflict',
      current: currentConflict,
      incoming: incomingConflict,
    });
  }

  addMerged(hunks, currentLines.slice(currentEnd));
}

function addMerged(hunks, lines) {
  if (lines.length === 0) return;

  const previous = hunks[hunks.length - 1];
  if (previous?.type === 'merged') {
    previous.lines.push(...lines);
  } else {
    hunks.push({ type: 'merged', lines: [...lines] });
  }
}

function collapseAdjacentMergedHunks(hunks) {
  const collapsed = [];

  for (const hunk of hunks) {
    const previous = collapsed[collapsed.length - 1];
    if (hunk.type === 'merged' && previous?.type === 'merged') {
      previous.lines.push(...hunk.lines);
    } else {
      collapsed.push(hunk);
    }
  }

  return collapsed;
}

function addMissingDeleteConflicts(hunks, baseLines, currentLines, incomingLines) {
  const incomingPatch = diffPatch(baseLines, incomingLines);
  let nextHunks = hunks;

  incomingPatch.forEach((patch, index) => {
    if (patch.buffer1.length === 0 || patch.buffer2.length !== 0) return;

    const previousPatch = incomingPatch[index - 1];
    if (!previousPatch || previousPatch.buffer1.length !== 0 || previousPatch.buffer2.length === 0) return;

    const deletedLines = patch.buffer1.chunk;
    const currentIndex = findSubsequence(currentLines, deletedLines);
    if (currentIndex === -1) return;
    if (hunksContainLines(nextHunks, deletedLines)) return;

    const nextAnchor = currentLines[currentIndex + deletedLines.length] ?? null;
    nextHunks = insertConflictBeforeAnchor(nextHunks, nextAnchor, {
      type: 'conflict',
      current: deletedLines,
      incoming: [],
    });
  });

  return collapseAdjacentMergedHunks(nextHunks);
}

function findSubsequence(lines, target) {
  if (target.length === 0) return -1;

  for (let i = 0; i <= lines.length - target.length; i += 1) {
    let matches = true;
    for (let j = 0; j < target.length; j += 1) {
      if (lines[i + j] !== target[j]) {
        matches = false;
        break;
      }
    }
    if (matches) return i;
  }

  return -1;
}

function hunksContainLines(hunks, lines) {
  const mergedAndCurrentLines = [];

  hunks.forEach((hunk) => {
    if (hunk.type === 'merged') {
      mergedAndCurrentLines.push(...hunk.lines);
    } else if (hunk.type === 'conflict') {
      mergedAndCurrentLines.push(...hunk.current);
    }
  });

  return findSubsequence(mergedAndCurrentLines, lines) !== -1;
}

function insertConflictBeforeAnchor(hunks, anchor, conflictHunk) {
  if (!anchor) return [...hunks, conflictHunk];

  const nextHunks = [];
  let inserted = false;

  for (const hunk of hunks) {
    if (!inserted && hunk.type === 'merged') {
      const anchorIndex = hunk.lines.indexOf(anchor);
      if (anchorIndex !== -1) {
        const before = hunk.lines.slice(0, anchorIndex);
        const after = hunk.lines.slice(anchorIndex);
        if (before.length > 0) nextHunks.push({ type: 'merged', lines: before });
        nextHunks.push(conflictHunk);
        if (after.length > 0) nextHunks.push({ type: 'merged', lines: after });
        inserted = true;
        continue;
      }
    }

    nextHunks.push(hunk);
  }

  if (!inserted) {
    nextHunks.push(conflictHunk);
  }

  return nextHunks;
}
