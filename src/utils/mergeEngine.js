/**
 * mergeEngine.js
 * True 3-way merge algorithm using LCS-based line diffing (diff-match-patch).
 *
 * threeWayMerge(base, current, incoming) → Hunk[]
 *
 * Hunk:
 *   { type: 'merged',   lines: string[] }
 *   { type: 'conflict', current: string[], incoming: string[] }
 */

import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

// Diff operation codes
const EQUAL = 0;
const INSERT = 1;
const DELETE = -1;

/**
 * Compute a line-level diff between two strings.
 * Returns an array of [op, lines[]] tuples where op is EQUAL, INSERT, or DELETE.
 */
function lineDiff(a, b) {
  const { chars1, chars2, lineArray } = dmp.diff_linesToChars_(a, b);
  const diffs = dmp.diff_main(chars1, chars2, false);
  dmp.diff_charsToLines_(diffs, lineArray);
  return diffs; // [op, text][]  — text contains full line strings (with \n)
}

/**
 * Split a string into an array of lines (preserving newline at end of each line).
 */
function toLines(str) {
  if (!str) return [];
  const lines = [];
  let remaining = str;
  while (remaining.length > 0) {
    const nl = remaining.indexOf('\n');
    if (nl === -1) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.slice(0, nl + 1));
    remaining = remaining.slice(nl + 1);
  }
  return lines;
}

/**
 * Expand a diff array into per-line operations for easier alignment.
 * Returns { op, line }[]
 */
function expandDiff(diffs) {
  const result = [];
  for (const [op, text] of diffs) {
    const lines = toLines(text);
    for (const line of lines) {
      if (line !== '') result.push({ op, line });
    }
  }
  return result;
}

/**
 * Main 3-way merge function.
 *
 * Strategy:
 * 1. Diff base→current (what "our" branch changed)
 * 2. Diff base→incoming (what "their" branch changed)
 * 3. Walk both diff sequences aligned on base, applying merge rules per region.
 */
export function threeWayMerge(base, current, incoming) {
  const diffCur = expandDiff(lineDiff(base, current));
  const diffInc = expandDiff(lineDiff(base, incoming));

  // Build per-base-line change maps
  // We'll use a different approach: reconstruct the sequences and merge

  // Actually, let's use a cleaner approach:
  // Convert diffs to chunks of (baseLines, curLines, incLines)

  const hunks = [];

  // We'll walk diffs in sequence form
  const curOps = lineDiff(base, current);
  const incOps = lineDiff(base, incoming);

  // Convert to region arrays: each region = { baseLines, sideLines, changed }
  function toRegions(diffs) {
    const regions = [];
    for (const [op, text] of diffs) {
      const lines = toLines(text);
      if (lines.length === 0) continue;
      if (op === EQUAL) {
        regions.push({ type: 'equal', lines });
      } else if (op === DELETE) {
        regions.push({ type: 'delete', lines }); // lines from base that were removed
      } else if (op === INSERT) {
        regions.push({ type: 'insert', lines }); // new lines added by this side
      }
    }
    return regions;
  }

  const curRegions = toRegions(curOps);
  const incRegions = toRegions(incOps);

  // Align both region lists on shared "equal" (base) segments using a pointer approach
  // We'll work on the base line sequence
  const baseLines = toLines(base);

  // Build an aligned structure: iterate base lines and track what each side did
  // Map from base line index → { curOp, curLine } and { incOp, incLine }

  // Simpler robust approach: convert each diff to a sequence of BaseLinePatch objects
  // Then do a 3-way alignment

  // Build per-position arrays describing what happened to each base line
  // and what insertions happened before/after

  function buildSideMap(diffs) {
    // Returns: array of events in order
    // Each event: { kind: 'keep'|'delete'|'insert', baseLine?: string, sideLine?: string }
    const events = [];
    for (const [op, text] of diffs) {
      const lines = toLines(text);
      for (const line of lines) {
        if (line === '') continue;
        if (op === EQUAL) events.push({ kind: 'keep', line });
        else if (op === DELETE) events.push({ kind: 'delete', line });
        else if (op === INSERT) events.push({ kind: 'insert', line });
      }
    }
    return events;
  }

  const curEvents = buildSideMap(curOps);
  const incEvents = buildSideMap(incOps);

  // Now walk both event lists together, keeping them aligned on base (keep/delete events)
  let ci = 0; // cursor into curEvents
  let ii = 0; // cursor into incEvents

  function flushInserts(events, idx) {
    const inserts = [];
    while (idx < events.length && events[idx].kind === 'insert') {
      inserts.push(events[idx].line);
      idx++;
    }
    return { inserts, idx };
  }

  function trimNewline(line) {
    return line.replace(/\n$/, '');
  }

  function addMerged(lines) {
    const trimmed = lines.map(trimNewline);
    if (trimmed.length === 0) return;
    if (hunks.length > 0 && hunks[hunks.length - 1].type === 'merged') {
      hunks[hunks.length - 1].lines.push(...trimmed);
    } else {
      hunks.push({ type: 'merged', lines: [...trimmed] });
    }
  }

  function addConflict(curLines, incLines) {
    hunks.push({
      type: 'conflict',
      current: curLines.map(trimNewline),
      incoming: incLines.map(trimNewline),
    });
  }

  while (ci < curEvents.length || ii < incEvents.length) {
    // Flush leading inserts from both sides
    const { inserts: curIns, idx: ci2 } = flushInserts(curEvents, ci);
    const { inserts: incIns, idx: ii2 } = flushInserts(incEvents, ii);
    ci = ci2;
    ii = ii2;

    // Both sides inserted lines at this position
    if (curIns.length > 0 || incIns.length > 0) {
      // If both inserted the same lines → auto-merge
      const curStr = curIns.join('');
      const incStr = incIns.join('');
      if (curStr === incStr) {
        addMerged(curIns);
      } else if (curIns.length === 0) {
        addMerged(incIns);
      } else if (incIns.length === 0) {
        addMerged(curIns);
      } else {
        // Both inserted different content → conflict
        addConflict(curIns, incIns);
      }
    }

    if (ci >= curEvents.length && ii >= incEvents.length) break;

    // Now handle the next base-aligned event
    const curEv = ci < curEvents.length ? curEvents[ci] : null;
    const incEv = ii < incEvents.length ? incEvents[ii] : null;

    // Both sides agree on the base line (keep or delete)
    if (curEv && incEv) {
      const curKind = curEv.kind;
      const incKind = incEv.kind;

      if (curKind === 'keep' && incKind === 'keep') {
        // Both kept the line unchanged
        addMerged([trimNewline(curEv.line)]);
        ci++;
        ii++;
      } else if (curKind === 'keep' && incKind === 'delete') {
        // Incoming deleted, current kept → incoming wins (deletion)
        // Actually in git: if one side deletes and other keeps, the deletion wins
        // (same as "incoming changed, current didn't")
        ci++;
        ii++;
        // Line deleted → emit nothing
      } else if (curKind === 'delete' && incKind === 'keep') {
        // Current deleted, incoming kept → current wins (deletion)
        ci++;
        ii++;
        // Line deleted → emit nothing
      } else if (curKind === 'delete' && incKind === 'delete') {
        // Both deleted the line → trivially resolved, emit nothing
        ci++;
        ii++;
      }
    } else if (curEv && !incEv) {
      // Only current side has remaining events
      if (curEv.kind === 'keep' || curEv.kind === 'delete') {
        if (curEv.kind === 'keep') addMerged([trimNewline(curEv.line)]);
        ci++;
      }
    } else if (!curEv && incEv) {
      // Only incoming side has remaining events
      if (incEv.kind === 'keep' || incEv.kind === 'delete') {
        if (incEv.kind === 'keep') addMerged([trimNewline(incEv.line)]);
        ii++;
      }
    }
  }

  // Collapse adjacent merged hunks
  const collapsed = [];
  for (const h of hunks) {
    if (h.type === 'merged' && collapsed.length > 0 && collapsed[collapsed.length - 1].type === 'merged') {
      collapsed[collapsed.length - 1].lines.push(...h.lines);
    } else {
      collapsed.push(h);
    }
  }

  return collapsed;
}

/**
 * Compute character-level diff between two strings.
 * Returns diffs array: [op, text][]
 * op: EQUAL=0, INSERT=1, DELETE=-1
 */
export function charDiff(a, b) {
  const diffs = dmp.diff_main(a, b);
  dmp.diff_cleanupSemantic(diffs);
  return diffs;
}

export { EQUAL, INSERT, DELETE };
