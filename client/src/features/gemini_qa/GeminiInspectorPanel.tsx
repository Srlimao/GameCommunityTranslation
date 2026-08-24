import React, { useState } from 'react';
import { GameSummary, GlossaryCandidate, TranslationIssue } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { GlossaryCandidateCard } from './GlossaryCandidateCard.tsx';
import { TranslationIssueCard } from './TranslationIssueCard.tsx';
import { Sparkles, Loader2, AlertTriangle, BookOpen, CheckCircle2 } from 'lucide-react';

interface GeminiInspectorPanelProps {
  game: GameSummary;
  initialLanguageCode?: string;
}

export const GeminiInspectorPanel: React.FC<GeminiInspectorPanelProps> = ({
  game,
  initialLanguageCode,
}) => {
  const [selectedLangCode, setSelectedLangCode] = useState<string>(
    initialLanguageCode || game.languages?.[0]?.language_code || ''
  );
  const [candidates, setCandidates] = useState<GlossaryCandidate[]>([]);
  const [issues, setIssues] = useState<TranslationIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'candidates' | 'issues'>('candidates');

  const handleRunInspector = async () => {
    if (!selectedLangCode) return;
    setIsAnalyzing(true);
    setError(null);
    setInfoMessage(null);

    try {
      const result = await ApiClient.analyzeWithGemini(game.id, selectedLangCode);
      setCandidates(result.candidates || []);
      setIssues(result.issues || []);
      if (result.message) {
        setInfoMessage(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Gemini analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
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
    alert(`Successfully added ${entries.length} terms to the glossary!`);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="bg-[#161B22] border border-[#30363D] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-[#E6EDF3] flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#3FB950]" />
            <span>Google Gemini Terminology & QA Inspector</span>
          </h2>
          <p className="text-xs text-[#8B949E] max-w-2xl leading-relaxed">
            Audits translations against world context. Extracts terminology candidates and detects placeholder mismatches and tone drift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedLangCode}
            onChange={(e) => setSelectedLangCode(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          >
            {game.languages?.map((l) => (
              <option key={l.language_id} value={l.language_code}>
                {l.language_name} ({l.language_code})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunInspector}
            disabled={isAnalyzing || !selectedLangCode}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#3FB950] hover:bg-[#56D364] text-slate-950 border border-[#3FB950] transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>INSPECTING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>RUN QA INSPECTOR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2] text-[#5865F2] text-xs">
          ℹ️ {infoMessage}
        </div>
      )}

      {/* Tabs for Results */}
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
              activeTab === 'candidates'
                ? 'bg-[#5865F2] text-white border-[#5865F2]'
                : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>CANDIDATES ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
              activeTab === 'issues'
                ? 'bg-[#5865F2] text-white border-[#5865F2]'
                : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>ISSUES ({issues.length})</span>
          </button>
        </div>

        {activeTab === 'candidates' && candidates.length > 0 && (
          <button
            onClick={handleAddAllCandidates}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#3FB950]/20 hover:bg-[#3FB950]/30 text-[#56D364] border border-[#3FB950] transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ADD ALL TO GLOSSARY</span>
          </button>
        )}
      </div>

      {/* Results View */}
      {activeTab === 'candidates' && (
        <div>
          {candidates.length === 0 ? (
            <div className="p-10 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D]">
              <Sparkles className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
              <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO GLOSSARY CANDIDATES YET</div>
              <div className="text-[11px] text-[#8B949E]">
                Click "RUN QA INSPECTOR" to analyze translations and extract key terms.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {candidates.map((candidate, idx) => (
                <GlossaryCandidateCard
                  key={idx}
                  candidate={candidate}
                  onAdd={handleAddSingleCandidate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'issues' && (
        <div>
          {issues.length === 0 ? (
            <div className="p-10 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D]">
              <CheckCircle2 className="w-8 h-8 text-[#3FB950] mx-auto mb-2" />
              <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO QUALITY ISSUES DETECTED</div>
              <div className="text-[11px] text-[#8B949E]">
                Translations adhere to formatting constraints and glossary terms.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {issues.map((issue, idx) => (
                <TranslationIssueCard key={idx} issue={issue} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
