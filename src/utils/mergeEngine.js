import { diff3Merge } from 'node-diff3';

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

  return mergeRegionsToHunks(result);
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
