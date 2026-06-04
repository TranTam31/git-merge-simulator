export default function CaseSidebar({
  cases,
  activeCaseId,
  onSelectCase,
  onCreateCase,
  onForkCase,
  onRenameCase,
  onDeleteCase,
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-editor-border bg-editor-surface flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-editor-border">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Cases</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCreateCase}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-xs text-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
            </svg>
            New
          </button>
          <button
            onClick={onForkCase}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-editor-hover hover:bg-gray-700 border border-editor-border text-xs text-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8m-7 5h6M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
            </svg>
            Fork
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-2">
        {cases.map((testCase, index) => {
          const isActive = testCase.id === activeCaseId;
          return (
            <div
              key={testCase.id}
              className={`group flex items-center gap-2 rounded-md border px-2 py-2 mb-2 transition-colors ${
                isActive
                  ? 'bg-editor-hover border-green-700/60'
                  : 'bg-editor-bg/40 border-transparent hover:border-editor-border hover:bg-editor-hover/60'
              }`}
            >
              <button
                onClick={() => onSelectCase(testCase.id)}
                className="shrink-0 w-6 h-6 rounded bg-editor-line border border-editor-border text-[10px] text-gray-500 hover:text-gray-200"
                aria-label={`Open case ${testCase.name || 'Untitled Case'}`}
              >
                {index + 1}
              </button>

              <input
                value={testCase.name}
                onChange={(event) => onRenameCase(testCase.id, event.target.value)}
                onFocus={() => onSelectCase(testCase.id)}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-600"
                placeholder="Untitled Case"
              />

              <button
                onClick={() => onDeleteCase(testCase.id)}
                disabled={cases.length <= 1}
                className="shrink-0 p-1 rounded text-gray-600 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:bg-transparent transition-colors"
                aria-label={`Delete case ${testCase.name || 'Untitled Case'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12m-9 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 14h8l1-14" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-editor-border text-[11px] text-gray-600 leading-relaxed">
        Stored in localStorage for this browser profile.
      </div>
    </aside>
  );
}
