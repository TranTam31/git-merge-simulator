import { useState } from 'react';
import CompareDiff from './CompareDiff';

/**
 * ConflictBlock — Renders a single conflict hunk with VSCode-style UI
 */
export default function ConflictBlock({ hunkIndex, currentLines, incomingLines, onResolve }) {
  const [showCompare, setShowCompare] = useState(false);

  function handleAcceptCurrent() {
    onResolve(hunkIndex, currentLines);
  }

  function handleAcceptIncoming() {
    onResolve(hunkIndex, incomingLines);
  }

  function handleAcceptBoth() {
    onResolve(hunkIndex, [...currentLines, ...incomingLines]);
  }

  return (
    <>
      <div
        className="rounded-md border border-editor-border overflow-hidden animate-fade-in my-1"
        role="region"
        aria-label={`Conflict block ${hunkIndex + 1}`}
      >
        {/* Action bar (like VSCode codelens) */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-editor-line border-b border-editor-border flex-wrap">
          <span className="text-xs text-gray-500 mr-1 font-mono">⚡</span>

          <button
            id={`accept-current-${hunkIndex}`}
            onClick={handleAcceptCurrent}
            className="text-xs px-2.5 py-1 rounded bg-conflict-currentBg hover:bg-green-800 border border-conflict-currentBorder text-green-300 hover:text-green-100 transition-all duration-150 font-medium flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Accept Current
          </button>

          <button
            id={`accept-incoming-${hunkIndex}`}
            onClick={handleAcceptIncoming}
            className="text-xs px-2.5 py-1 rounded bg-conflict-incomingBg hover:bg-blue-900 border border-conflict-incomingBorder text-blue-300 hover:text-blue-100 transition-all duration-150 font-medium flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            Accept Incoming
          </button>

          <button
            id={`accept-both-${hunkIndex}`}
            onClick={handleAcceptBoth}
            className="text-xs px-2.5 py-1 rounded bg-btn-both hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 hover:text-purple-100 transition-all duration-150 font-medium flex items-center gap-1.5"
          >
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            </span>
            Accept Both
          </button>

          <button
            id={`compare-${hunkIndex}`}
            onClick={() => setShowCompare(true)}
            className="text-xs px-2.5 py-1 rounded bg-editor-hover hover:bg-gray-700 border border-editor-border text-gray-400 hover:text-gray-200 transition-all duration-150 font-medium flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Compare Changes
          </button>

          <span className="ml-auto text-xs text-gray-600 font-mono">
            {currentLines.length}↑ / {incomingLines.length}↓ lines
          </span>
        </div>

        {/* <<<<<<< HEAD marker */}
        <div className="px-3 py-0.5 bg-conflict-currentHeader/60 border-b border-conflict-currentBorder/30 flex items-center gap-2">
          <span className="font-mono text-xs text-conflict-markerText select-none">{'<<<<<<< HEAD'}</span>
          <span className="text-xs text-green-500/70 italic">Current Change</span>
        </div>

        {/* Current lines */}
        <div className="bg-conflict-currentBg/80">
          {currentLines.map((line, i) => (
            <div key={i} className="flex items-start px-3 py-0 font-mono text-sm leading-5 hover:bg-green-900/20 transition-colors group">
              <span className="select-none text-gray-600 text-xs w-8 text-right mr-3 mt-0.5 group-hover:text-gray-400">{i + 1}</span>
              <span className="text-gray-100 whitespace-pre-wrap break-all">{line || ' '}</span>
            </div>
          ))}
        </div>

        {/* ======= separator */}
        <div className="px-3 py-0.5 bg-editor-line flex items-center gap-2 border-y border-editor-border">
          <span className="font-mono text-xs text-conflict-markerText select-none">{'======='}</span>
        </div>

        {/* Incoming lines */}
        <div className="bg-conflict-incomingBg/80">
          {incomingLines.map((line, i) => (
            <div key={i} className="flex items-start px-3 py-0 font-mono text-sm leading-5 hover:bg-blue-900/20 transition-colors group">
              <span className="select-none text-gray-600 text-xs w-8 text-right mr-3 mt-0.5 group-hover:text-gray-400">{i + 1}</span>
              <span className="text-gray-100 whitespace-pre-wrap break-all">{line || ' '}</span>
            </div>
          ))}
        </div>

        {/* >>>>>>> Incoming marker */}
        <div className="px-3 py-0.5 bg-conflict-incomingHeader/60 border-t border-conflict-incomingBorder/30 flex items-center gap-2">
          <span className="font-mono text-xs text-conflict-markerText select-none">{'>>>>>>> Incoming Change'}</span>
          <span className="text-xs text-blue-500/70 italic">Incoming Change</span>
        </div>
      </div>

      {showCompare && (
        <CompareDiff
          currentLines={currentLines}
          incomingLines={incomingLines}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}
