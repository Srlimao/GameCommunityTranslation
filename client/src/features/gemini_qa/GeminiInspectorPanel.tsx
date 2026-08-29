import React, { useState, useEffect } from 'react';
import { GameSummary, GlossaryCandidate, TranslationIssue } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { GlossaryCandidateCard } from './GlossaryCandidateCard.tsx';
import { AutoCheckSummaryCard } from './AutoCheckSummaryCard.tsx';
import { InspectorHeader } from './InspectorHeader.tsx';
import { InspectorTabs } from './InspectorTabs.tsx';
import { TagWhitelistModal } from './TagWhitelistModal.tsx';
import { BatchAiFixModal } from './BatchAiFixModal.tsx';
import { IssueListView } from './IssueListView.tsx';
import { CodeValidator } from './code_validator.ts';
import { useInspectorStore } from './use_inspector_store.ts';
import { Sparkles, CheckCircle2, ShieldCheck, Save, Loader2 } from 'lucide-react';

interface GeminiInspectorPanelProps {
  game: GameSummary;
  initialLanguageCode?: string;
}

interface PendingFixItem {
  key_path: string;
  key_id?: string;
  language_code: string;
  translated_text: string;
}

export const GeminiInspectorPanel: React.FC<GeminiInspectorPanelProps> = ({
  game,
  initialLanguageCode,
}) => {
  const {
    selectedLangCode, activeTab, candidates, issues, validationSummary,
    setSelectedLangCode, setActiveTab, setCandidates, addOrMergeIssues,
    updateIssueSuggestions, markIssueApplied, markAllApplied, setValidationSummary, clearResults,
  } = useInspectorStore(game.id, initialLanguageCode || game.languages?.[0]?.language_code || '');

  const [languages, setLanguages] = useState(game.languages || []);
  const [whitelistTags, setWhitelistTags] = useState<string[]>(game.whitelist_tags || []);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [isBatchAiModalOpen, setIsBatchAiModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFixes, setPendingFixes] = useState<Map<string, PendingFixItem>>(() => new Map());
  const [isSavingFixes, setIsSavingFixes] = useState(false);
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);

  useEffect(() => {
    if (game.whitelist_tags) setWhitelistTags(game.whitelist_tags);
  }, [game.whitelist_tags]);

  useEffect(() => {
    if (game.languages?.length) {
      setLanguages(game.languages);
      if (!selectedLangCode) setSelectedLangCode(game.languages[0].language_code);
    } else {
      ApiClient.getLanguages(game.id).then((langs) => {
        if (langs?.length) { setLanguages(langs); if (!selectedLangCode) setSelectedLangCode(langs[0].language_code); }
      }).catch(console.error);
    }
  }, [game.id, game.languages, selectedLangCode, setSelectedLangCode]);

  const resolveTargetLang = async (): Promise<string | undefined> => {
    let targetLang = selectedLangCode;
    if (!targetLang) {
      if (languages.length > 0) targetLang = languages[0].language_code;
      else {
        const fetched = await ApiClient.getLanguages(game.id);
        if (fetched?.length) { setLanguages(fetched); targetLang = fetched[0].language_code; }
      }
      if (targetLang) setSelectedLangCode(targetLang);
    }
    return targetLang;
  };

  const handleRunCodeValidator = async () => {
    const targetLang = await resolveTargetLang();
    if (!targetLang) return;
    setIsValidating(true); setError(null);
    try {
      const items = await ApiClient.getTranslations(game.id, targetLang);
      const result = CodeValidator.validateAll(items, whitelistTags);
      setValidationSummary(result.summary);
      addOrMergeIssues(result.issues);
      setInfoMessage(`Code validator completed: ${result.summary.totalChecked} keys scanned, ${result.issues.length} issue(s) detected.`);
    } catch (err: any) {
      setError(err.message || 'Code validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRunAiInspector = async () => {
    const targetLang = await resolveTargetLang();
    if (!targetLang) return;
    setIsAnalyzing(true); setError(null); setInfoMessage(null);
    try {
      const result = await ApiClient.analyzeWithGemini(game.id, targetLang);
      setCandidates(result.candidates || []);
      if (result.issues?.length) addOrMergeIssues(result.issues);
      if (result.message) setInfoMessage(result.message);
    } catch (err: any) {
      setError(err.message || 'Gemini analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyFix = (issue: TranslationIssue, fixedText: string) => {
    markIssueApplied(issue.key_path, issue.issue_type, fixedText);
    setPendingFixes((prev) => {
      const next = new Map(prev);
      next.set(issue.key_path, {
        key_path: issue.key_path,
        key_id: issue.key_id,
        language_code: selectedLangCode,
        translated_text: fixedText,
      });
      return next;
    });
  };

  const handleAiFixSingle = async (issue: TranslationIssue): Promise<string> => {
    const targetLang = await resolveTargetLang();
    const res = await ApiClient.fixSingleIssue({
      gameId: game.id,
      languageCode: targetLang || selectedLangCode,
      issue: { key_path: issue.key_path, source_text: issue.source_text, translated_text: issue.translated_text, issue_type: issue.issue_type, message: issue.message },
    });
    updateIssueSuggestions([{ key_path: issue.key_path, fixed_translation: res.fixed_translation }]);
    return res.fixed_translation;
  };

  const handleApplyAllFixes = () => {
    const fixable = issues.filter((i) => !i.applied && i.suggestion);
    if (fixable.length === 0) return;
    markAllApplied(new Set(fixable.map((i) => `${i.key_path}_${i.issue_type}`)));
    setPendingFixes((prev) => {
      const next = new Map(prev);
      fixable.forEach((i) => {
        if (i.suggestion) {
          next.set(i.key_path, {
            key_path: i.key_path,
            key_id: i.key_id,
            language_code: selectedLangCode,
            translated_text: i.suggestion,
          });
        }
      });
      return next;
    });
  };

  const handleFixAppliedFromModal = (fixes: Array<{ key_path: string; fixed_translation: string }>, autoApply?: boolean) => {
    updateIssueSuggestions(fixes, autoApply);
    if (autoApply) {
      setPendingFixes((prev) => {
        const next = new Map(prev);
        fixes.forEach((f) => {
          next.set(f.key_path, {
            key_path: f.key_path,
            language_code: selectedLangCode,
            translated_text: f.fixed_translation,
          });
        });
        return next;
      });
    }
  };

  const handleSaveAllPendingFixes = async () => {
    if (pendingFixes.size === 0) return;
    setIsSavingFixes(true); setError(null);
    try {
      // Group pending fixes by language to prevent cross-language saving
      const byLang = new Map<string, PendingFixItem[]>();
      for (const item of pendingFixes.values()) {
        const lang = item.language_code || selectedLangCode;
        if (!byLang.has(lang)) byLang.set(lang, []);
        byLang.get(lang)!.push(item);
      }

      let totalSaved = 0;
      for (const [lang, items] of byLang.entries()) {
        const count = await ApiClient.updateMultipleTranslationItems(game.id, lang, items);
        totalSaved += count;
      }
      setPendingFixes(new Map());
      setInfoMessage(`Successfully saved ${totalSaved} fix(es) to cloud storage!`);
    } catch (err: any) {
      setError(err.message || 'Failed to save fixes');
    } finally {
      setIsSavingFixes(false);
    }
  };

  useEffect(() => {
    if (pendingFixes.size === 0 || isBatchAiModalOpen) return;
    const timer = setTimeout(() => { handleSaveAllPendingFixes(); }, 3000);
    return () => clearTimeout(timer);
  }, [pendingFixes, isBatchAiModalOpen]);

  const handleAddSingleCandidate = async (candidate: GlossaryCandidate) => {
    await ApiClient.addGlossaryEntry(game.id, { source_term: candidate.source_term, target_term: candidate.suggested_translation, target_language: selectedLangCode, category: candidate.category, notes: candidate.explanation });
  };

  const handleMarkAsGlossary = async (issue: TranslationIssue) => {
    try {
      await ApiClient.addGlossaryEntry(game.id, {
        source_term: issue.source_text,
        target_term: issue.source_text,
        target_language: selectedLangCode,
        category: 'General',
        notes: 'Do Not Translate',
      });
      markIssueApplied(issue.key_path, issue.issue_type, issue.source_text);
      setInfoMessage(`Added "${issue.source_text.slice(0, 35)}..." to Glossary as Do Not Translate!`);
    } catch (err: any) {
      setError(err.message || 'Failed to add to glossary');
    }
  };

  const handleAddAllCandidates = async () => {
    if (candidates.length === 0) return;
    const entries = candidates.map((c) => ({ source_term: c.source_term, target_term: c.suggested_translation, target_language: selectedLangCode, category: c.category, notes: c.explanation }));
    await ApiClient.batchAddGlossary(game.id, entries);
    setInfoMessage(`Successfully added ${entries.length} terms to the glossary!`);
  };

  const currentLang = languages.find((l) => l.language_code === selectedLangCode);
  const unappliedFixesCount = issues.filter((i) => !i.applied && Boolean(i.suggestion)).length;

  const autoIssues = issues.filter((i) => {
    if (activeKpiFilter) {
      if (activeKpiFilter === 'clean') return false;
      return i.issue_type === activeKpiFilter;
    }
    return ['tag_mismatch', 'placeholder_mismatch', 'tab_mismatch', 'symbol_mismatch', 'formatting_loss', 'identical_to_source'].includes(i.issue_type);
  });

  return (
    <div className="space-y-4 font-mono">
      <InspectorHeader
        selectedLangCode={selectedLangCode} onSelectLangCode={setSelectedLangCode}
        languages={languages} isAnalyzing={isAnalyzing} onRunAiInspector={handleRunAiInspector}
        hasStoredData={Boolean(candidates.length > 0 || issues.length > 0 || validationSummary)}
        onClearResults={clearResults}
      />
      {error && <div className="p-3 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">{error}</div>}
      {infoMessage && <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2] text-[#5865F2] text-xs">ℹ️ {infoMessage}</div>}

      {pendingFixes.size > 0 && (
        <div className="bg-[#10141D] border border-[#5865F2] p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-2 text-[#E6EDF3]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3FB950] animate-pulse" />
            <span><strong>{pendingFixes.size}</strong> fix(es) applied locally</span>
            <span className="text-[#8B949E] text-[11px]">(Autosaving in 3s or save now)</span>
          </div>
          <button onClick={handleSaveAllPendingFixes} disabled={isSavingFixes} className="px-3.5 py-1.5 bg-[#238636] hover:bg-[#2EA043] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {isSavingFixes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>SAVE {pendingFixes.size} FIXES TO CLOUD</span>
          </button>
        </div>
      )}

      <AutoCheckSummaryCard
        summary={validationSummary} isRunning={isValidating}
        onRunCodeValidator={handleRunCodeValidator} onBatchAiFix={() => setIsBatchAiModalOpen(true)} onApplyAllFixes={handleApplyAllFixes}
        hasFixableIssues={unappliedFixesCount > 0} totalIssuesCount={issues.filter(i => !i.applied).length}
        whitelistTagsCount={whitelistTags.length} onOpenWhitelistModal={() => setIsWhitelistModalOpen(true)}
        activeFilter={activeKpiFilter} onSelectFilter={setActiveKpiFilter}
      />

      <InspectorTabs activeTab={activeTab} onTabChange={setActiveTab} issuesCount={issues.length} candidatesCount={candidates.length} onAddAllCandidates={handleAddAllCandidates} />

      {activeTab === 'auto_checks' && (
        <IssueListView
          issues={autoIssues}
          emptyIcon={ShieldCheck}
          emptyTitle="NO CODE PARITY ISSUES FOUND"
          emptyDescription={activeKpiFilter ? `No issues matching filter "${activeKpiFilter.toUpperCase()}".` : 'Tags, tabs, brackets, variables, and formatting match correctly across all scanned keys.'}
          onApplyFix={handleApplyFix}
          onAiFixSingle={handleAiFixSingle}
          onMarkAsGlossary={handleMarkAsGlossary}
        />
      )}

      {activeTab === 'issues' && (
        <IssueListView
          issues={issues}
          emptyIcon={CheckCircle2}
          emptyTitle="NO QUALITY ISSUES DETECTED"
          emptyDescription="Translations adhere to formatting constraints and glossary terms."
          onApplyFix={handleApplyFix}
          onAiFixSingle={handleAiFixSingle}
          onMarkAsGlossary={handleMarkAsGlossary}
        />
      )}

      {activeTab === 'candidates' && (
        <div>
          {candidates.length === 0 ? (
            <div className="p-10 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D]">
              <Sparkles className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
              <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO GLOSSARY CANDIDATES YET</div>
              <div className="text-[11px] text-[#8B949E]">Click "RUN AI INSPECTOR" to analyze translations and extract key terms.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {candidates.map((candidate) => {
                const uniqueKey = `${candidate.source_term}_${candidate.category}_${candidate.suggested_translation}`;
                return (
                  <GlossaryCandidateCard key={uniqueKey} candidate={candidate} onAdd={handleAddSingleCandidate} />
                );
              })}
            </div>
          )}
        </div>
      )}

      <TagWhitelistModal gameId={game.id} isOpen={isWhitelistModalOpen} onClose={() => setIsWhitelistModalOpen(false)} initialTags={whitelistTags} onTagsUpdated={(updated) => setWhitelistTags(updated)} />
      <BatchAiFixModal isOpen={isBatchAiModalOpen} gameId={game.id} gameName={game.name} targetLanguageCode={selectedLangCode} targetLanguageName={currentLang?.language_name || selectedLangCode} issues={issues} onClose={() => setIsBatchAiModalOpen(false)} onFixApplied={handleFixAppliedFromModal} onSaveToCloud={handleSaveAllPendingFixes} />
    </div>
  );
};

