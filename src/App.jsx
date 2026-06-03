import { useState } from 'react';
import InputPanel from './components/InputPanel';
import MergeResult from './components/MergeResult';
import { threeWayMerge } from './utils/mergeEngine';

export default function App() {
  const [base, setBase] = useState('');
  const [current, setCurrent] = useState('');
  const [incoming, setIncoming] = useState('');
  const [hunks, setHunks] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [error, setError] = useState(null);

  function handleMerge() {
    setError(null);
    try {
      const result = threeWayMerge(base, current, incoming);
      setHunks(result);
      setResolutions({});
    } catch (e) {
      setError(e.message);
    }
  }

  function handleResolve(hunkIndex, resolvedLines) {
    setResolutions(prev => ({ ...prev, [hunkIndex]: resolvedLines }));
  }

  return (
    <div className="min-h-screen bg-editor-bg text-gray-100 font-sans flex flex-col">
      {/* Top nav */}
      <header className="flex items-center gap-3 px-6 py-3 bg-editor-surface border-b border-editor-border shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Git branch icon */}
          <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10m10-10v4a4 4 0 01-4 4H7m10-8a2 2 0 100-4 2 2 0 000 4zM7 7a2 2 0 100-4 2 2 0 000 4zm0 10a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="font-bold text-base text-gray-100 tracking-tight">Git Merge Conflict Simulator</span>
        </div>

        <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-green-900/30 border border-green-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-soft" />
          <span className="text-xs text-green-400">3-way merge</span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No git required — runs entirely in browser</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
        {/* How it works banner */}
        {!hunks && (
          <div className="flex gap-4 items-start p-4 rounded-lg bg-editor-surface border border-editor-border animate-fade-in">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">How 3-way merge works</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-400">BASE</strong> is the common ancestor (where both branches diverged from).{' '}
                <strong className="text-green-400">CURRENT</strong> is your branch (HEAD).{' '}
                <strong className="text-blue-400">INCOMING</strong> is the branch being merged in.
                The engine auto-resolves changes made by only one side, and flags conflicts where both sides changed the same line differently.
              </p>
            </div>
          </div>
        )}

        {/* Input panel */}
        <section aria-label="Input editors">
          <InputPanel
            base={base}
            current={current}
            incoming={incoming}
            onBaseChange={setBase}
            onCurrentChange={setCurrent}
            onIncomingChange={setIncoming}
            onMerge={handleMerge}
          />
        </section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-sm animate-fade-in">
            <span className="font-bold">Error: </span>{error}
          </div>
        )}

        {/* Merge result */}
        {hunks && (
          <section aria-label="Merge result">
            <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
              <span className="flex-1 h-px bg-editor-border" />
              Merge Output
              <span className="flex-1 h-px bg-editor-border" />
            </h2>
            <MergeResult
              hunks={hunks}
              resolutions={resolutions}
              onResolve={handleResolve}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-3 border-t border-editor-border bg-editor-surface text-xs text-gray-600 flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Powered by LCS-based 3-way merge algorithm (diff-match-patch) · Client-side only · No data sent anywhere
      </footer>
    </div>
  );
}
