import { useState } from 'react';
import Editor from '@monaco-editor/react';
import CompareDiff from './CompareDiff';

const LABELS = {
  base: { title: 'BASE', subtitle: 'Common ancestor', color: 'text-gray-400', border: 'border-gray-600', badge: 'bg-gray-700 text-gray-300', dot: 'bg-gray-400' },
  current: { title: 'CURRENT', subtitle: 'HEAD (your branch)', color: 'text-green-400', border: 'border-green-700', badge: 'bg-green-900/50 text-green-300', dot: 'bg-green-400' },
  incoming: { title: 'INCOMING', subtitle: 'Branch to merge in', color: 'text-blue-400', border: 'border-blue-700', badge: 'bg-blue-900/50 text-blue-300', dot: 'bg-blue-400' },
};

const MONACO_OPTIONS = {
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line',
  padding: { top: 8, bottom: 8 },
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
};

function EditorPane({
  id,
  value,
  onChange,
  variants,
  selectedVariantId,
  onSelectVariant,
  onAddVariant,
  onRenameVariant,
  onDeleteVariant,
}) {
  const meta = LABELS[id];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];

  function handleEditorDidMount(editor, monaco) {
    // Define a custom dark theme matching our design
    monaco.editor.defineTheme('merge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#d4d4d4',
      },
    });
    monaco.editor.setTheme('merge-dark');
  }

  return (
    <div className={`flex flex-col flex-1 min-w-0 rounded-lg border ${meta.border} bg-editor-surface overflow-hidden`}>
      {/* Header */}
      <div className={`flex flex-col gap-2 px-3 py-2 bg-editor-line border-b ${meta.border}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-xs font-bold font-mono tracking-widest ${meta.color}`}>{meta.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.subtitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedVariantId}
            onChange={(event) => onSelectVariant(id, event.target.value)}
            className="min-w-0 flex-1 rounded bg-editor-bg border border-editor-border px-2 py-1 text-xs text-gray-300 outline-none focus:border-gray-500"
            aria-label={`${meta.title} variant`}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name || 'Untitled'}
              </option>
            ))}
          </select>

          <input
            value={selectedVariant?.name || ''}
            onChange={(event) => onRenameVariant(id, selectedVariantId, event.target.value)}
            className="w-28 rounded bg-editor-bg border border-editor-border px-2 py-1 text-xs text-gray-300 outline-none placeholder:text-gray-600 focus:border-gray-500"
            placeholder="Untitled"
            aria-label={`${meta.title} variant name`}
          />

          <button
            onClick={() => onAddVariant(id)}
            className="shrink-0 p-1.5 rounded bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-colors"
            aria-label={`Add ${meta.title} variant`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
            </svg>
          </button>

          <button
            onClick={() => onDeleteVariant(id, selectedVariantId)}
            disabled={variants.length <= 1}
            className="shrink-0 p-1.5 rounded bg-editor-hover hover:bg-red-900/30 border border-editor-border text-gray-500 hover:text-red-300 disabled:opacity-30 disabled:hover:text-gray-500 disabled:hover:bg-editor-hover transition-colors"
            aria-label={`Delete ${meta.title} variant`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 14h8l1-14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={value}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={MONACO_OPTIONS}
          loading={
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Loading editor…
            </div>
          }
        />
      </div>
    </div>
  );
}

export default function InputPanel({
  base,
  current,
  incoming,
  variants,
  selectedVariantIds,
  onBaseChange,
  onCurrentChange,
  onIncomingChange,
  onSelectVariant,
  onAddVariant,
  onRenameVariant,
  onDeleteVariant,
  onClearAll,
  onMerge,
}) {
  const [compareInfo, setCompareInfo] = useState(null);

  function clearAll() {
    onClearAll();
  }

  function openBaseCompare(target) {
    setCompareInfo({
      current: base ? base.split('\n') : [],
      incoming: target.value ? target.value.split('\n') : [],
      originalLabel: 'Base',
      modifiedLabel: target.label,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button
          id="compare-current-base-btn"
          onClick={() => openBaseCompare({ label: 'Current (HEAD)', value: current })}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Compare Base - Current
        </button>
        <button
          id="compare-incoming-base-btn"
          onClick={() => openBaseCompare({ label: 'Incoming', value: incoming })}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Compare Base - Incoming
        </button>
        <button
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-editor-hover"
        >
          Clear all
        </button>
      </div>

      {/* Three panes */}
      <div className="flex gap-3 h-80">
        <EditorPane
          id="base"
          value={base}
          onChange={onBaseChange}
          variants={variants.base}
          selectedVariantId={selectedVariantIds.base}
          onSelectVariant={onSelectVariant}
          onAddVariant={onAddVariant}
          onRenameVariant={onRenameVariant}
          onDeleteVariant={onDeleteVariant}
        />
        <EditorPane
          id="current"
          value={current}
          onChange={onCurrentChange}
          variants={variants.current}
          selectedVariantId={selectedVariantIds.current}
          onSelectVariant={onSelectVariant}
          onAddVariant={onAddVariant}
          onRenameVariant={onRenameVariant}
          onDeleteVariant={onDeleteVariant}
        />
        <EditorPane
          id="incoming"
          value={incoming}
          onChange={onIncomingChange}
          variants={variants.incoming}
          selectedVariantId={selectedVariantIds.incoming}
          onSelectVariant={onSelectVariant}
          onAddVariant={onAddVariant}
          onRenameVariant={onRenameVariant}
          onDeleteVariant={onDeleteVariant}
        />
      </div>

      {/* Run button */}
      <div className="flex justify-center">
        <button
          id="run-merge-btn"
          onClick={onMerge}
          className="group relative flex items-center gap-3 px-8 py-3 rounded-lg bg-gradient-to-r from-green-700 to-blue-700 hover:from-green-600 hover:to-blue-600 text-white font-semibold text-sm tracking-wide shadow-lg shadow-green-900/30 transition-all duration-200 hover:shadow-green-700/40 hover:scale-105 active:scale-95"
        >
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Run Merge
          <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 group-hover:ring-white/20 transition-all" />
        </button>
      </div>

      {compareInfo && (
        <CompareDiff
          currentLines={compareInfo.current}
          incomingLines={compareInfo.incoming}
          originalLabel={compareInfo.originalLabel}
          modifiedLabel={compareInfo.modifiedLabel}
          onClose={() => setCompareInfo(null)}
        />
      )}
    </div>
  );
}
