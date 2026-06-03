import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import CompareDiff from './CompareDiff';

// Helper parser to find conflict markers in editor text
function parseConflicts(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const meta = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // Monaco line numbers are 1-indexed

    if (line.startsWith('<<<<<<<')) {
      currentBlock = {
        hunkIndex: meta.length,
        markerStart: lineNumber,
        currentLines: [],
        incomingLines: [],
        currentStart: lineNumber + 1,
        currentEnd: null,
        sepLine: null,
        incomingStart: null,
        incomingEnd: null,
        markerEnd: null,
      };
    } else if (line.startsWith('=======') && currentBlock) {
      currentBlock.currentEnd = lineNumber - 1;
      currentBlock.sepLine = lineNumber;
      currentBlock.incomingStart = lineNumber + 1;
    } else if (line.startsWith('>>>>>>>') && currentBlock) {
      currentBlock.incomingEnd = lineNumber - 1;
      currentBlock.markerEnd = lineNumber;

      // Extract raw lines
      currentBlock.currentLines = lines.slice(currentBlock.currentStart - 1, currentBlock.currentEnd);
      currentBlock.incomingLines = lines.slice(currentBlock.incomingStart - 1, currentBlock.incomingEnd);

      meta.push(currentBlock);
      currentBlock = null;
    }
  }

  return meta;
}

export default function MergeResult({ hunks, currentFile, incomingFile }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const viewZoneIdsRef = useRef([]);
  const decorationCollectionRef = useRef(null);
  const [conflicts, setConflicts] = useState([]);
  const [totalConflictsInitial, setTotalConflictsInitial] = useState(0);
  const [compareInfo, setCompareInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [linesCount, setLinesCount] = useState(1);

  // Generate initial merge text with markers
  const initialText = useMemo(() => {
    const lines = [];
    hunks.forEach((hunk) => {
      if (hunk.type === 'merged') {
        lines.push(...hunk.lines);
      } else if (hunk.type === 'conflict') {
        lines.push('<<<<<<< HEAD (Current Change)');
        lines.push(...hunk.current);
        lines.push('=======');
        lines.push(...hunk.incoming);
        lines.push('>>>>>>> Incoming Change');
      }
    });
    return lines.join('\n');
  }, [hunks]);

  // Compute stats
  const remaining = conflicts.length;
  const resolvedCount = totalConflictsInitial - remaining;
  const allResolved = remaining === 0;

  // Apply decorations and viewZones based on current parsed conflicts
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
    conflicts.forEach(cm => {
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
      conflicts.forEach(cm => {
        const domNode = document.createElement('div');
        domNode.className = 'merge-action-bar';
        domNode.style.pointerEvents = 'auto';

        const stopProp = (e) => e.stopPropagation();
        domNode.addEventListener('mousedown', stopProp);
        domNode.addEventListener('pointerdown', stopProp);
        domNode.addEventListener('click', stopProp);

        const actions = [
          {
            label: 'Accept Current Change',
            cls: 'merge-action-btn merge-action-current',
            handler: () => {
              const model = editor.getModel();
              const range = new monaco.Range(cm.markerStart, 1, cm.markerEnd, model.getLineMaxColumn(cm.markerEnd));
              editor.executeEdits('resolve-conflict', [{
                range,
                text: cm.currentLines.join('\n'),
                forceMoveMarkers: true,
              }]);
            },
          },
          {
            label: 'Accept Incoming Change',
            cls: 'merge-action-btn merge-action-incoming',
            handler: () => {
              const model = editor.getModel();
              const range = new monaco.Range(cm.markerStart, 1, cm.markerEnd, model.getLineMaxColumn(cm.markerEnd));
              editor.executeEdits('resolve-conflict', [{
                range,
                text: cm.incomingLines.join('\n'),
                forceMoveMarkers: true,
              }]);
            },
          },
          {
            label: 'Accept Both Changes',
            cls: 'merge-action-btn merge-action-both',
            handler: () => {
              const model = editor.getModel();
              const range = new monaco.Range(cm.markerStart, 1, cm.markerEnd, model.getLineMaxColumn(cm.markerEnd));
              editor.executeEdits('resolve-conflict', [{
                range,
                text: [...cm.currentLines, ...cm.incomingLines].join('\n'),
                forceMoveMarkers: true,
              }]);
            },
          },
          {
            label: 'Compare Changes',
            cls: 'merge-action-btn merge-action-compare',
            handler: () => setCompareInfo({
              current: cm.currentLines,
              incoming: cm.incomingLines,
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
  }, [conflicts]);

  // Handle editor mount
  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('merge-result-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2d2d30',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editorCursor.foreground': '#d4d4d4',
      },
    });
    monaco.editor.setTheme('merge-result-dark');

    editor.setValue(initialText);
    const parsed = parseConflicts(initialText);
    setConflicts(parsed);
    setTotalConflictsInitial(parsed.length);
    setLinesCount(editor.getModel().getLineCount());
    setEditorReady(true);

    // Track editing dynamically
    editor.onDidChangeModelContent(() => {
      const val = editor.getValue();
      const parsed = parseConflicts(val);
      setConflicts(parsed);
      setLinesCount(editor.getModel().getLineCount());
    });
  }

  // Reset editor value if hunks prop changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editorReady) return;
    editor.setValue(initialText);
    const parsed = parseConflicts(initialText);
    setConflicts(parsed);
    setTotalConflictsInitial(parsed.length);
    setLinesCount(editor.getModel().getLineCount());
  }, [initialText, editorReady]);

  // Re-apply when conflicts list changes
  useEffect(() => {
    if (!editorReady) return;
    applyDecorationsAndZones();
  }, [conflicts, editorReady, applyDecorationsAndZones]);

  function buildFullText() {
    if (editorRef.current) {
      return editorRef.current.getValue();
    }
    return initialText;
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

  // Dynamic editor height based on current lines + spacing zones
  const editorHeight = Math.min(Math.max((linesCount + conflicts.length * 1.5) * 20 + 48, 200), 600);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-editor-surface border border-editor-border">
        <div className="flex items-center gap-2">
          {totalConflictsInitial === 0 ? (
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
        {totalConflictsInitial > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <div className="w-24 h-1.5 bg-editor-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${(resolvedCount / totalConflictsInitial) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{resolvedCount}/{totalConflictsInitial}</span>
          </div>
        )}

        {/* Compare Entire Files button */}
        <button
          id="compare-entire-files-btn"
          onClick={() => setCompareInfo({
            current: currentFile ? currentFile.split('\n') : [],
            incoming: incomingFile ? incomingFile.split('\n') : [],
          })}
          className="ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Compare Entire Files
        </button>

        {/* Copy button */}
        <button
          id="copy-result-btn"
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150"
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
          {remaining > 0 && (
            <span className="text-xs text-gray-600 ml-2">— click actions above each conflict block or edit code manually</span>
          )}
        </div>

        <div style={{ height: editorHeight }}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
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
