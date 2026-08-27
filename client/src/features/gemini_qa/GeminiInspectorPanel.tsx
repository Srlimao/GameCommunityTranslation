import React, { useState } from 'react';
import { GameSummary, GlossaryCandidate, TranslationIssue } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { GlossaryCandidateCard } from './GlossaryCandidateCard.tsx';
import { TranslationIssueCard } from './TranslationIssueCard.tsx';
import { AutoCheckSummaryCard } from './AutoCheckSummaryCard.tsx';
import { InspectorHeader } from './InspectorHeader.tsx';
import { InspectorTabs } from './InspectorTabs.tsx';
import { TagWhitelistModal } from './TagWhitelistModal.tsx';
import { CodeValidator } from './code_validator.ts';
import { useInspectorStore } from './use_inspector_store.ts';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface GeminiInspectorPanelProps {
  game: GameSummary;
  initialLanguageCode?: string;
}

export const GeminiInspectorPanel: React.FC<GeminiInspectorPanelProps> = ({
  game,
  initialLanguageCode,
}) => {
  const {
    selectedLangCode,
    activeTab,
    candidates,
    issues,
    validationSummary,
    setSelectedLangCode,
    setActiveTab,
    setCandidates,
    addOrMergeIssues,
    markIssueApplied,
    markAllApplied,
    setValidationSummary,
    clearResults,
  } = useInspectorStore(game.id, initialLanguageCode || game.languages?.[0]?.language_code || '');

  const [languages, setLanguages] = useState(game.languages || []);
  const [whitelistTags, setWhitelistTags] = useState<string[]>(game.whitelist_tags || []);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (game.whitelist_tags) setWhitelistTags(game.whitelist_tags);
  }, [game.whitelist_tags]);

  React.useEffect(() => {
    if (game.languages?.length) {
      setLanguages(game.languages);
      if (!selectedLangCode) setSelectedLangCode(game.languages[0].language_code);
    } else {
      ApiClient.getLanguages(game.id).then((langs) => {
        if (langs?.length) {
          setLanguages(langs);
          if (!selectedLangCode) setSelectedLangCode(langs[0].language_code);
        }
      }).catch(console.error);
    }
  }, [game.id, game.languages, selectedLangCode, setSelectedLangCode]);

  const currentLang = languages.find((l) => l.language_code === selectedLangCode);

  const resolveTargetLang = async (): Promise<string | undefined> => {
    let targetLang = selectedLangCode;
    if (!targetLang) {
      if (languages.length > 0) {
        targetLang = languages[0].language_code;
      } else {
        const fetched = await ApiClient.getLanguages(game.id);
        if (fetched?.length) {
          setLanguages(fetched);
          targetLang = fetched[0].language_code;
        }
      }
      if (targetLang) setSelectedLangCode(targetLang);
    }
    return targetLang;
  };

  const handleRunCodeValidator = async () => {
    const targetLang = await resolveTargetLang();
    if (!targetLang) return;
    setIsValidating(true);
    setError(null);
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
    setIsAnalyzing(true);
    setError(null);
    setInfoMessage(null);

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

  const handleApplyFix = async (issue: TranslationIssue, fixedText: string) => {
    let keyId = issue.key_id;
    let langId = issue.language_id || currentLang?.language_id;

    if (!keyId || !langId) {
      const items = await ApiClient.getTranslations(game.id, selectedLangCode);
      const match = items.find((i) => i.key_path === issue.key_path);
      if (match) {
        keyId = match.key_id;
        langId = match.language_id;
      }
    }

    if (!keyId || !langId) throw new Error(`Could not find key ID for ${issue.key_path}`);

    await ApiClient.updateTranslationItem({
      key_id: keyId,
      language_id: langId,
      translated_text: fixedText,
      status: 'manual_translated',
    });

    markIssueApplied(issue.key_path, issue.issue_type, fixedText);
  };

  const handleApplyAllFixes = async () => {
    const fixable = issues.filter((i) => !i.applied && i.suggestion);
    if (fixable.length === 0) return;

    const items = await ApiClient.getTranslations(game.id, selectedLangCode);
    const keyMap = new Map(items.map((i) => [i.key_path, i]));
    const appliedKeys = new Set<string>();

    for (const issue of fixable) {
      const keyInfo = keyMap.get(issue.key_path);
      const keyId = issue.key_id || keyInfo?.key_id;
      const langId = issue.language_id || keyInfo?.language_id || currentLang?.language_id;

      if (keyId && langId && issue.suggestion) {
        try {
          await ApiClient.updateTranslationItem({
            key_id: keyId,
            language_id: langId,
            translated_text: issue.suggestion,
            status: 'manual_translated',
          });
          appliedKeys.add(`${issue.key_path}_${issue.issue_type}`);
        } catch (e) {
          console.error(`Failed to apply fix for ${issue.key_path}:`, e);
        }
      }
    }

    markAllApplied(appliedKeys);
    setInfoMessage(`Successfully applied ${appliedKeys.size} translation fixes to the database!`);
  };

  const handleAddSingleCandidate = async (candidate: GlossaryCandidate) => {
    await ApiClient.addGlossaryEntry(game.id, {
      source_term: candidate.source_term,
      target_term: candidate.suggested_translation,
      target_language: selectedLangCode,
      category: candidate.category,
      notes: candidate.explanation,
    });
  };

  const handleAddAllCandidates = async () => {
    if (candidates.length === 0) return;
    const entries = candidates.map((c) => ({
      source_term: c.source_term,
      target_term: c.suggested_translation,
      target_language: selectedLangCode,
      category: c.category,
      notes: c.explanation,
    }));
    await ApiClient.batchAddGlossary(game.id, entries);
    setInfoMessage(`Successfully added ${entries.length} terms to the glossary!`);
  };

  const unappliedFixesCount = issues.filter((i) => !i.applied && Boolean(i.suggestion)).length;

  return (
    <div className="space-y-4 font-mono">
      <InspectorHeader
        selectedLangCode={selectedLangCode}
        onSelectLangCode={setSelectedLangCode}
        languages={languages}
        isAnalyzing={isAnalyzing}
        onRunAiInspector={handleRunAiInspector}
        hasStoredData={Boolean(candidates.length > 0 || issues.length > 0 || validationSummary)}
        onClearResults={clearResults}
      />

      {error && <div className="p-3 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">{error}</div>}
      {infoMessage && <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2] text-[#5865F2] text-xs">ℹ️ {infoMessage}</div>}

      <AutoCheckSummaryCard
        summary={validationSummary}
        isRunning={isValidating}
        onRunCodeValidator={handleRunCodeValidator}
        onApplyAllFixes={handleApplyAllFixes}
        hasFixableIssues={unappliedFixesCount > 0}
        whitelistTagsCount={whitelistTags.length}
        onOpenWhitelistModal={() => setIsWhitelistModalOpen(true)}
      />

      <InspectorTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issuesCount={issues.length}
        candidatesCount={candidates.length}
        onAddAllCandidates={handleAddAllCandidates}
      />

      {activeTab === 'auto_checks' && (() => {
        const autoIssues = issues.filter((i) =>
          ['tag_mismatch', 'placeholder_mismatch', 'tab_mismatch', 'symbol_mismatch', 'formatting_loss'].includes(i.issue_type)
        );
        return (
          <div className="space-y-3">
            {autoIssues.length === 0 ? (
              <div className="p-8 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D]">
                <ShieldCheck className="w-8 h-8 text-[#3FB950] mx-auto mb-2" />
                <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO CODE PARITY ISSUES FOUND</div>
                <div className="text-[11px] text-[#8B949E]">
                  Tags, tabs, brackets, variables, and formatting match correctly across all scanned keys.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {autoIssues.map((issue, idx) => (
                  <TranslationIssueCard key={idx} issue={issue} onApplyFix={handleApplyFix} />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'issues' && (
        <div>
          {issues.length === 0 ? (
            <div className="p-10 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D]">
              <CheckCircle2 className="w-8 h-8 text-[#3FB950] mx-auto mb-2" />
              <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO QUALITY ISSUES DETECTED</div>
              <div className="text-[11px] text-[#8B949E]">Translations adhere to formatting constraints and glossary terms.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {issues.map((issue, idx) => (
                <TranslationIssueCard key={idx} issue={issue} onApplyFix={handleApplyFix} />
              ))}
            </div>
          )}
        </div>
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
              {candidates.map((candidate, idx) => (
                <GlossaryCandidateCard key={idx} candidate={candidate} onAdd={handleAddSingleCandidate} />
              ))}
            </div>
          )}
        </div>
      )}

      <TagWhitelistModal
        gameId={game.id}
        isOpen={isWhitelistModalOpen}
        onClose={() => setIsWhitelistModalOpen(false)}
        initialTags={whitelistTags}
        onTagsUpdated={(updated) => setWhitelistTags(updated)}
      />
    </div>
  );
};
