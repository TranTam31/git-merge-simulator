import { useEffect, useState } from 'react';
import CaseSidebar from './components/CaseSidebar';
import InputPanel from './components/InputPanel';
import MergeResult from './components/MergeResult';
import { threeWayMerge } from './utils/mergeEngine';

const STORAGE_KEY = 'git-merge-simulator-workspace-v1';
const FIELD_IDS = ['base', 'current', 'incoming'];
const DEFAULT_LANGUAGE = 'javascript';

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createVariant(value = '', name = 'Untitled') {
  return {
    id: createId(),
    name,
    value,
  };
}

function createCase(name = 'Untitled Case') {
  const variants = {
    base: [createVariant()],
    current: [createVariant()],
    incoming: [createVariant()],
  };

  return {
    id: createId(),
    name,
    base: '',
    current: '',
    incoming: '',
    variants,
    selectedVariantIds: {
      base: variants.base[0].id,
      current: variants.current[0].id,
      incoming: variants.incoming[0].id,
    },
  };
}

function cloneCase(source) {
  const variants = {};
  const selectedVariantIds = {};

  FIELD_IDS.forEach((field) => {
    const selectedId = source.selectedVariantIds?.[field];
    variants[field] = (source.variants?.[field] || [createVariant(source[field] || '')]).map((variant) => {
      const cloned = {
        ...variant,
        id: createId(),
      };
      if (variant.id === selectedId) {
        selectedVariantIds[field] = cloned.id;
      }
      return cloned;
    });

    if (!selectedVariantIds[field]) {
      selectedVariantIds[field] = variants[field][0].id;
    }
  });

  return {
    ...source,
    id: createId(),
    name: `${source.name || 'Untitled Case'} fork`,
    variants,
    selectedVariantIds,
  };
}

function normalizeCase(rawCase) {
  const fallback = createCase(rawCase?.name || 'Untitled Case');
  const normalized = {
    ...fallback,
    ...rawCase,
    variants: { ...fallback.variants },
    selectedVariantIds: { ...fallback.selectedVariantIds },
  };

  FIELD_IDS.forEach((field) => {
    const variants = Array.isArray(rawCase?.variants?.[field]) && rawCase.variants[field].length > 0
      ? rawCase.variants[field].map((variant) => ({
          id: variant.id || createId(),
          name: variant.name || 'Untitled',
          value: variant.value || '',
        }))
      : [createVariant(rawCase?.[field] || '')];

    const selectedId = rawCase?.selectedVariantIds?.[field];
    const selectedVariant = variants.find((variant) => variant.id === selectedId) || variants[0];

    normalized.variants[field] = variants;
    normalized.selectedVariantIds[field] = selectedVariant.id;
    normalized[field] = rawCase?.[field] ?? selectedVariant.value;
  });

  return normalized;
}

function loadWorkspace() {
  const fallbackCase = createCase();
  const fallback = {
    cases: [fallbackCase],
    activeCaseId: fallbackCase.id,
    language: DEFAULT_LANGUAGE,
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const cases = Array.isArray(parsed.cases) && parsed.cases.length > 0
      ? parsed.cases.map(normalizeCase)
      : fallback.cases;
    const activeCaseId = cases.some((item) => item.id === parsed.activeCaseId)
      ? parsed.activeCaseId
      : cases[0].id;

    return {
      cases,
      activeCaseId,
      language: parsed.language || DEFAULT_LANGUAGE,
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [initialWorkspace] = useState(() => loadWorkspace());
  const [cases, setCases] = useState(initialWorkspace.cases);
  const [activeCaseId, setActiveCaseId] = useState(initialWorkspace.activeCaseId);
  const [language, setLanguage] = useState(initialWorkspace.language);
  const [hunks, setHunks] = useState(null);
  const [error, setError] = useState(null);

  const activeCase = cases.find((item) => item.id === activeCaseId) || cases[0];
  const base = activeCase?.base || '';
  const current = activeCase?.current || '';
  const incoming = activeCase?.incoming || '';

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cases, activeCaseId, language }));
  }, [cases, activeCaseId, language]);

  function updateActiveCase(updater) {
    setCases((prevCases) => prevCases.map((item) => (
      item.id === activeCaseId ? updater(item) : item
    )));
  }

  function handleFieldChange(field, value) {
    updateActiveCase((item) => {
      const selectedId = item.selectedVariantIds[field];
      return {
        ...item,
        [field]: value,
        variants: {
          ...item.variants,
          [field]: item.variants[field].map((variant) => (
            variant.id === selectedId ? { ...variant, value } : variant
          )),
        },
      };
    });
  }

  function handleSelectVariant(field, variantId) {
    updateActiveCase((item) => {
      const variant = item.variants[field].find((candidate) => candidate.id === variantId);
      if (!variant) return item;

      return {
        ...item,
        [field]: variant.value,
        selectedVariantIds: {
          ...item.selectedVariantIds,
          [field]: variantId,
        },
      };
    });
    setHunks(null);
    setError(null);
  }

  function handleAddVariant(field) {
    updateActiveCase((item) => {
      const variant = createVariant(item[field] || '');
      return {
        ...item,
        selectedVariantIds: {
          ...item.selectedVariantIds,
          [field]: variant.id,
        },
        variants: {
          ...item.variants,
          [field]: [...item.variants[field], variant],
        },
      };
    });
  }

  function handleRenameVariant(field, variantId, name) {
    updateActiveCase((item) => ({
      ...item,
      variants: {
        ...item.variants,
        [field]: item.variants[field].map((variant) => (
          variant.id === variantId ? { ...variant, name } : variant
        )),
      },
    }));
  }

  function handleDeleteVariant(field, variantId) {
    updateActiveCase((item) => {
      if (item.variants[field].length <= 1) return item;

      const variants = item.variants[field].filter((variant) => variant.id !== variantId);
      const selectedVariant = variants.find((variant) => variant.id === item.selectedVariantIds[field]) || variants[0];

      return {
        ...item,
        [field]: selectedVariant.value,
        selectedVariantIds: {
          ...item.selectedVariantIds,
          [field]: selectedVariant.id,
        },
        variants: {
          ...item.variants,
          [field]: variants,
        },
      };
    });
    setHunks(null);
    setError(null);
  }

  function handleClearAll() {
    FIELD_IDS.forEach((field) => handleFieldChange(field, ''));
    setHunks(null);
    setError(null);
  }

  function handleCreateCase() {
    const nextCase = createCase();
    setCases((prevCases) => [...prevCases, nextCase]);
    setActiveCaseId(nextCase.id);
    setHunks(null);
    setError(null);
  }

  function handleForkCase() {
    if (!activeCase) return;
    const nextCase = cloneCase(activeCase);
    setCases((prevCases) => [...prevCases, nextCase]);
    setActiveCaseId(nextCase.id);
    setHunks(null);
    setError(null);
  }

  function handleRenameCase(caseId, name) {
    setCases((prevCases) => prevCases.map((item) => (
      item.id === caseId ? { ...item, name } : item
    )));
  }

  function handleDeleteCase(caseId) {
    setCases((prevCases) => {
      if (prevCases.length <= 1) return prevCases;

      const nextCases = prevCases.filter((item) => item.id !== caseId);
      if (caseId === activeCaseId) {
        setActiveCaseId(nextCases[0].id);
        setHunks(null);
        setError(null);
      }
      return nextCases;
    });
  }

  function handleSelectCase(caseId) {
    setActiveCaseId(caseId);
    setHunks(null);
    setError(null);
  }

  function handleMerge() {
    setError(null);
    try {
      const result = threeWayMerge(base, current, incoming);
      setHunks(result);
    } catch (e) {
      setError(e.message);
    }
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
          <span>Saved locally in this browser</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <CaseSidebar
          cases={cases}
          activeCaseId={activeCaseId}
          onSelectCase={handleSelectCase}
          onCreateCase={handleCreateCase}
          onForkCase={handleForkCase}
          onRenameCase={handleRenameCase}
          onDeleteCase={handleDeleteCase}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto w-full">
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
                variants={activeCase.variants}
                selectedVariantIds={activeCase.selectedVariantIds}
                language={language}
                onLanguageChange={setLanguage}
                onBaseChange={(value) => handleFieldChange('base', value)}
                onCurrentChange={(value) => handleFieldChange('current', value)}
                onIncomingChange={(value) => handleFieldChange('incoming', value)}
                onSelectVariant={handleSelectVariant}
                onAddVariant={handleAddVariant}
                onRenameVariant={handleRenameVariant}
                onDeleteVariant={handleDeleteVariant}
                onClearAll={handleClearAll}
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
                  currentFile={current}
                  incomingFile={incoming}
                  language={language}
                />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-3 border-t border-editor-border bg-editor-surface text-xs text-gray-600 flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Powered by diff3-style 3-way merge - Client-side only - No data sent anywhere
      </footer>
    </div>
  );
}
