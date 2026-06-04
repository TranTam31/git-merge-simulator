import { mergeDigIn } from 'node-diff3';

/**
 * Main 3-way merge function.
 *
 * Uses node-diff3's dig-in merge mode because it matches Git's conflict
 * boundaries more closely than the previous per-line custom merge.
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
  const result = mergeDigIn(currentLines, baseLines, incomingLines);

  return markerLinesToHunks(result.result);
}

function toLines(str) {
  if (!str) return [];

  const lines = str.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function markerLinesToHunks(lines) {
  const hunks = [];
  let mergedLines = [];
  let conflict = null;

  function flushMerged() {
    if (mergedLines.length > 0) {
      hunks.push({ type: 'merged', lines: mergedLines });
      mergedLines = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      flushMerged();
      conflict = {
        current: [],
        incoming: [],
        side: 'current',
      };
      continue;
    }

    if (line.startsWith('=======') && conflict) {
      conflict.side = 'incoming';
      continue;
    }

    if (line.startsWith('>>>>>>>') && conflict) {
      hunks.push({
        type: 'conflict',
        current: conflict.current,
        incoming: conflict.incoming,
      });
      conflict = null;
      continue;
    }

    if (conflict) {
      conflict[conflict.side].push(line);
    } else {
      mergedLines.push(line);
    }
  }

  flushMerged();
  return collapseAdjacentMergedHunks(hunks);
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
