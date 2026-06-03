import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import CompareDiff from './CompareDiff';

/**
 * MergeResult — Monaco-based merge result display with inline conflict resolution.
 * Uses Monaco decorations for colored conflict backgrounds and viewZones for action buttons.
 */
export default function MergeResult({ hunks, resolutions, onResolve }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const viewZoneIdsRef = useRef([]);
  const decorationCollectionRef = useRef(null);
  const hunksRef = useRef(hunks);
  const onResolveRef = useRef(onResolve);
  const [compareInfo, setCompareInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  // Keep refs up-to-date for DOM event handlers (viewZone buttons)
  hunksRef.current = hunks;
  onResolveRef.current = onResolve;

  // Stats
  const totalConflicts = hunks.filter(h => h.type === 'conflict').length;
  const resolvedCount = hunks.filter((h, i) => h.type === 'conflict' && resolutions[i] !== undefined).length;
  const remaining = totalConflicts - resolvedCount;
  const allResolved = remaining === 0;

  // Build full text content + conflict line metadata
  const { text, conflictMeta } = useMemo(() => {
    const lines = [];
    const meta = [];

    hunks.forEach((hunk, i) => {
      if (hunk.type === 'merged') {
        lines.push(...hunk.lines);
      } else if (hunk.type === 'conflict') {
        if (resolutions[i] !== undefined) {
          // Resolved — show clean lines
          lines.push(...resolutions[i]);
        } else {
          // Unresolved — show conflict markers
          const markerStart = lines.length + 1; // 1-indexed for Monaco
          lines.push('<<<<<<< HEAD (Current Change)');
          const currentStart = lines.length + 1;
          lines.push(...hunk.current);
          const currentEnd = lines.length;
          lines.push('=======');
          const sepLine = lines.length;
          const incomingStart = lines.length + 1;
          lines.push(...hunk.incoming);
          const incomingEnd = lines.length;
          lines.push('>>>>>>> Incoming Change');
          const markerEnd = lines.length;

          meta.push({
            hunkIndex: i,
            markerStart,
            currentStart,
            currentEnd,
            sepLine,
            incomingStart,
            incomingEnd,
            markerEnd,
          });
        }
      }
    });

    return { text: lines.join('\n'), conflictMeta: meta };
  }, [hunks, resolutions]);

  // Apply decorations and viewZones to the Monaco editor
  const applyDecorationsAndZones = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // --- Clear old viewZones ---
    editor.changeViewZones(accessor => {
      viewZoneIdsRef.current.forEach(id => accessor.removeZone(id));
      viewZoneIdsRef.current = [];
    });

    // --- Build decorations ---
    const newDecorations = [];

    conflictMeta.forEach(cm => {
      // Marker lines (<<<, ===, >>>)
      [cm.markerStart, cm.sepLine, cm.markerEnd].forEach(line => {
        newDecorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'merge-marker-line',
            inlineClassName: 'merge-marker-text',
          },
        });
      });

      // Current change background
      if (cm.currentStart <= cm.currentEnd) {
        newDecorations.push({
          range: new monaco.Range(cm.currentStart, 1, cm.currentEnd, 1),
          options: { isWholeLine: true, className: 'merge-current-bg' },
        });
      }

      // Incoming change background
      if (cm.incomingStart <= cm.incomingEnd) {
        newDecorations.push({
          range: new monaco.Range(cm.incomingStart, 1, cm.incomingEnd, 1),
          options: { isWholeLine: true, className: 'merge-incoming-bg' },
        });
      }
    });

    // Apply decorations
    if (decorationCollectionRef.current) {
      decorationCollectionRef.current.clear();
    }
    decorationCollectionRef.current = editor.createDecorationsCollection(newDecorations);

    // --- Add viewZones with action buttons (like VSCode codelens) ---
    editor.changeViewZones(accessor => {
      conflictMeta.forEach(cm => {
        const domNode = document.createElement('div');
        domNode.className = 'merge-action-bar';
        domNode.style.pointerEvents = 'auto';

        // Prevent Monaco from intercepting clicks and mouse/pointer down events
        const stopProp = (e) => e.stopPropagation();
        domNode.addEventListener('mousedown', stopProp);
        domNode.addEventListener('pointerdown', stopProp);
        domNode.addEventListener('click', stopProp);

        const actions = [
          {
            label: 'Accept Current Change',
            cls: 'merge-action-btn merge-action-current',
            handler: () => onResolveRef.current(cm.hunkIndex, hunksRef.current[cm.hunkIndex].current),
          },
          {
            label: 'Accept Incoming Change',
            cls: 'merge-action-btn merge-action-incoming',
            handler: () => onResolveRef.current(cm.hunkIndex, hunksRef.current[cm.hunkIndex].incoming),
          },
          {
            label: 'Accept Both Changes',
            cls: 'merge-action-btn merge-action-both',
            handler: () => onResolveRef.current(cm.hunkIndex, [
              ...hunksRef.current[cm.hunkIndex].current,
              ...hunksRef.current[cm.hunkIndex].incoming,
            ]),
          },
          {
            label: 'Compare Changes',
            cls: 'merge-action-btn merge-action-compare',
            handler: () => setCompareInfo({
              current: hunksRef.current[cm.hunkIndex].current,
              incoming: hunksRef.current[cm.hunkIndex].incoming,
            }),
          },
        ];

        actions.forEach(({ label, cls, handler }, idx) => {
          if (idx > 0) {
            const sep = document.createElement('span');
            sep.className = 'merge-action-sep';
            sep.textContent = '|';
            domNode.appendChild(sep);
          }
          const btn = document.createElement('a');
          btn.textContent = label;
          btn.className = cls;
          btn.href = '#';
          btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); handler(); };
          domNode.appendChild(btn);
        });

        const id = accessor.addZone({
          afterLineNumber: cm.markerStart - 1,
          heightInLines: 1.3,
          domNode,
        });
        viewZoneIdsRef.current.push(id);
      });
    });
  }, [conflictMeta]);

  // Mount handler
  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('merge-result-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#00000000',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editorCursor.foreground': '#d4d4d4',
      },
    });
    monaco.editor.setTheme('merge-result-dark');

    setEditorReady(true);
    requestAnimationFrame(() => applyDecorationsAndZones());
  }

  // Re-apply when text/decorations change
  useEffect(() => {
    if (!editorReady) return;
    // Small delay to let Monaco finish updating value
    const timer = setTimeout(() => applyDecorationsAndZones(), 50);
    return () => clearTimeout(timer);
  }, [text, editorReady, applyDecorationsAndZones]);

  // Build full text for copy (includes conflict markers for unresolved)
  function buildFullText() {
    return hunks.map((hunk, i) => {
      if (hunk.type === 'merged') return hunk.lines.join('\n');
      if (resolutions[i] !== undefined) return resolutions[i].join('\n');
      return [
        '<<<<<<< HEAD',
        ...hunk.current,
        '=======',
        ...hunk.incoming,
        '>>>>>>> Incoming Change',
      ].join('\n');
    }).join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildFullText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  // Dynamic editor height based on line count
  const lineCount = text.split('\n').length + conflictMeta.length * 1.5;
  const editorHeight = Math.min(Math.max(lineCount * 20 + 48, 200), 600);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-editor-surface border border-editor-border">
        <div className="flex items-center gap-2">
          {totalConflicts === 0 ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-green-400">Auto-merged successfully — no conflicts</span>
            </>
          ) : allResolved ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-green-400">All conflicts resolved ✓</span>
            </>
          ) : (
            <>
              <span className="relative flex w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
              <span className="text-sm font-semibold text-orange-400">
                {remaining} conflict{remaining !== 1 ? 's' : ''} remaining
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {totalConflicts > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <div className="w-24 h-1.5 bg-editor-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${(resolvedCount / totalConflicts) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{resolvedCount}/{totalConflicts}</span>
          </div>
        )}

        {/* Copy button */}
        <button
          id="copy-result-btn"
          onClick={handleCopy}
          className="ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Result
            </>
          )}
        </button>
      </div>

      {/* Monaco editor — merge result */}
      <div className="rounded-lg border border-editor-border bg-editor-surface overflow-hidden">
        {/* Header tab */}
        <div className="flex items-center gap-2 px-3 py-2 bg-editor-line border-b border-editor-border">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs text-gray-400 font-mono">MERGE RESULT</span>
          {totalConflicts > 0 && !allResolved && (
            <span className="text-xs text-gray-600 ml-2">— click actions above each conflict block to resolve</span>
          )}
        </div>

        <div style={{ height: editorHeight }}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={text}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              readOnly: true,
              domReadOnly: true,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'none',
              padding: { top: 8, bottom: 8 },
              wordWrap: 'on',
              automaticLayout: true,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
            loading={
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Loading editor…
              </div>
            }
          />
        </div>
      </div>

      {/* Compare Changes modal */}
      {compareInfo && (
        <CompareDiff
          currentLines={compareInfo.current}
          incomingLines={compareInfo.incoming}
          onClose={() => setCompareInfo(null)}
        />
      )}
    </div>
  );
}
