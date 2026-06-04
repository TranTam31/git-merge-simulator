import { useEffect } from 'react';
import { DiffEditor } from '@monaco-editor/react';

/**
 * CompareDiff — Monaco DiffEditor in a modal overlay.
 * Uses red for deletions and green for additions.
 */
export default function CompareDiff({
  currentLines,
  incomingLines,
  onClose,
  originalLabel = 'Current (HEAD)',
  modifiedLabel = 'Incoming',
  language = 'javascript',
}) {
  const curText = currentLines.join('\n');
  const incText = incomingLines.join('\n');

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleEditorDidMount(editor, monaco) {
    monaco.editor.defineTheme('diff-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        // Red for removed (current/original side)
        'diffEditor.removedTextBackground': '#6e1a1a90',
        'diffEditor.removedLineBackground': '#4b181840',
        // Green for added (incoming/modified side)
        'diffEditor.insertedTextBackground': '#1c6e1c90',
        'diffEditor.insertedLineBackground': '#1c4a1c40',
      },
    });
    monaco.editor.setTheme('diff-dark');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Compare Changes"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl h-[75vh] flex flex-col rounded-xl border border-editor-border bg-editor-surface shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-editor-line border-b border-editor-border shrink-0">
          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-sm font-semibold text-gray-200">Compare Changes</span>
          <span className="text-xs text-gray-500 ml-1">— side-by-side diff</span>

          {/* Column labels */}
          <div className="ml-auto flex items-center gap-4 mr-2">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 font-medium">{originalLabel} — removed</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 font-medium">{modifiedLabel} — added</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors p-1 rounded hover:bg-editor-hover"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Monaco Diff Editor */}
        <div className="flex-1 min-h-0">
          <DiffEditor
            height="100%"
            language={language}
            original={curText}
            modified={incText}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              readOnly: true,
              renderSideBySide: true,
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
              lineNumbersMinChars: 3,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
            loading={
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Loading diff viewer…
              </div>
            }
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 bg-editor-line border-t border-editor-border shrink-0">
          <span className="text-xs text-gray-600">
            Press <kbd className="px-1.5 py-0.5 rounded bg-editor-border text-gray-400 font-mono text-[10px]">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
