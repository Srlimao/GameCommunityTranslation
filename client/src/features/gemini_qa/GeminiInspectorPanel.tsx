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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-900/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Google Gemini Terminology & QA Inspector</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Leverages <strong>Google Gemini</strong> to audit your translations against the game's Big Context. It automatically mines proper nouns, weapon names, and mechanics for your glossary, while detecting placeholder mismatches and tone drift.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedLangCode}
              onChange={(e) => setSelectedLangCode(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-purple-500"
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inspecting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Inspector</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-800/60 text-indigo-300 text-sm">
          ℹ️ {infoMessage}
        </div>
      )}

      {/* Tabs for Results */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'candidates'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Glossary Candidates ({candidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'issues'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>QA Issues ({issues.length})</span>
          </button>
        </div>

        {activeTab === 'candidates' && candidates.length > 0 && (
          <button
            onClick={handleAddAllCandidates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/70 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Add All to Glossary</span>
          </button>
        )}
      </div>

      {/* Results View */}
      {activeTab === 'candidates' && (
        <div>
          {candidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold mb-1 text-slate-300">No Glossary Candidates Yet</div>
              <div className="text-xs text-slate-500">
                Click "Run AI Inspector" above to analyze translated text and extract terminology pairs.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-600/60 mx-auto mb-2" />
              <div className="text-sm font-semibold mb-1 text-slate-300">No Quality Issues Detected</div>
              <div className="text-xs text-slate-500">
                Translations look consistent and placeholders match.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
