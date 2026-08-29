import { useState, useEffect, useCallback } from 'react';
import { GlossaryCandidate, TranslationIssue } from '../../types/client_types.ts';
import { CodeValidationSummary } from './code_validator.ts';

export interface InspectorState {
  selectedLangCode: string;
  activeTab: 'auto_checks' | 'issues' | 'candidates';
  candidates: GlossaryCandidate[];
  issues: TranslationIssue[];
  validationSummary: CodeValidationSummary | null;
  lastRunTime: string | null;
}

const STORAGE_PREFIX = 'local_translator_inspector_state_';

function getStorageKey(gameId: string, langCode: string): string {
  return `${STORAGE_PREFIX}${gameId}_${langCode || 'default'}`;
}

function loadSavedState(gameId: string, langCode: string): InspectorState {
  const key = getStorageKey(gameId, langCode);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        selectedLangCode: langCode || parsed.selectedLangCode || '',
        activeTab: parsed.activeTab || 'auto_checks',
        candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        validationSummary: parsed.validationSummary || null,
        lastRunTime: parsed.lastRunTime || null,
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved inspector state:', e);
  }
  return {
    selectedLangCode: langCode || '',
    activeTab: 'auto_checks',
    candidates: [],
    issues: [],
    validationSummary: null,
    lastRunTime: null,
  };
}

export function useInspectorStore(gameId: string, initialLangCode: string) {
  const [currentLang, setCurrentLang] = useState<string>(initialLangCode || '');

  // Initialize from language-scoped localStorage
  const [state, setState] = useState<InspectorState>(() => loadSavedState(gameId, initialLangCode));

  // Sync initial language if needed
  useEffect(() => {
    if (initialLangCode && initialLangCode !== currentLang && !currentLang) {
      setCurrentLang(initialLangCode);
      setState(loadSavedState(gameId, initialLangCode));
    }
  }, [gameId, initialLangCode, currentLang]);

  // Debounced save to localStorage whenever state changes
  useEffect(() => {
    if (!state.selectedLangCode) return;
    const key = getStorageKey(gameId, state.selectedLangCode);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to persist inspector state:', e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [gameId, state]);

  const setSelectedLangCode = useCallback((code: string) => {
    if (!code || code === state.selectedLangCode) return;
    setCurrentLang(code);
    setState(loadSavedState(gameId, code));
  }, [gameId, state.selectedLangCode]);

  const setActiveTab = useCallback((tab: 'auto_checks' | 'issues' | 'candidates') => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setCandidates = useCallback((candidates: GlossaryCandidate[]) => {
    setState((prev) => ({
      ...prev,
      candidates,
      lastRunTime: new Date().toISOString(),
    }));
  }, []);

  const setIssues = useCallback((issues: TranslationIssue[]) => {
    setState((prev) => ({
      ...prev,
      issues,
      lastRunTime: new Date().toISOString(),
    }));
  }, []);

  const addOrMergeIssues = useCallback((newIssues: TranslationIssue[]) => {
    setState((prev) => {
      // deduplicate by key_path + issue_type
      const existingMap = new Map(prev.issues.map((i) => [`${i.key_path}_${i.issue_type}`, i]));
      for (const iss of newIssues) {
        existingMap.set(`${iss.key_path}_${iss.issue_type}`, iss);
      }
      return {
        ...prev,
        issues: Array.from(existingMap.values()),
        lastRunTime: new Date().toISOString(),
      };
    });
  }, []);

  const markIssueApplied = useCallback((keyPath: string, issueType: string, fixedText?: string) => {
    setState((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) =>
        iss.key_path === keyPath && iss.issue_type === issueType
          ? { ...iss, applied: true, translated_text: fixedText || iss.suggestion || iss.translated_text }
          : iss
      ),
    }));
  }, []);

  const markAllApplied = useCallback((appliedKeys: Set<string>) => {
    setState((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) =>
        appliedKeys.has(`${iss.key_path}_${iss.issue_type}`) || appliedKeys.has(iss.key_path)
          ? { ...iss, applied: true, translated_text: iss.suggestion || iss.translated_text }
          : iss
      ),
    }));
  }, []);

  const setValidationSummary = useCallback((summary: CodeValidationSummary | null) => {
    setState((prev) => ({ ...prev, validationSummary: summary }));
  }, []);

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      candidates: [],
      issues: [],
      validationSummary: null,
      lastRunTime: null,
    }));
    try {
      const key = getStorageKey(gameId, state.selectedLangCode);
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to clear inspector state:', e);
    }
  }, [gameId, state.selectedLangCode]);

  const updateIssueSuggestions = useCallback((fixes: Array<{ key_path: string; fixed_translation: string }>, autoApply: boolean = false) => {
    const fixMap = new Map(fixes.map((f) => [f.key_path, f.fixed_translation]));
    setState((prev) => ({
      ...prev,
      issues: prev.issues.map((iss) => {
        const fixed = fixMap.get(iss.key_path);
        if (fixed) {
          return {
            ...iss,
            suggestion: fixed,
            ...(autoApply ? { applied: true, translated_text: fixed } : {}),
          };
        }
        return iss;
      }),
    }));
  }, []);

  return {
    ...state,
    setSelectedLangCode,
    setActiveTab,
    setCandidates,
    setIssues,
    addOrMergeIssues,
    updateIssueSuggestions,
    markIssueApplied,
    markAllApplied,
    setValidationSummary,
    clearResults,
  };
}
