import React, { useState, useEffect } from 'react';
import { GameSummary, KeyTranslationItem, TranslationStatus, BatchProgressData } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { SseTranslationStream } from '../../services/sse_translation_stream.ts';
import { TranslationProgressBar } from './TranslationProgressBar.tsx';
import { TranslationTable } from './TranslationTable.tsx';
import { LanguageSelectorModal } from './LanguageSelectorModal.tsx';
import { BatchTranslateModal } from './BatchTranslateModal.tsx';
import { JsonImportModal } from '../games/JsonImportModal.tsx';
import {
  Sparkles,
  Download,
  Upload,
  Plus,
  Globe2,
  Trash2,
  RefreshCw,
  Loader2,
  StopCircle,
} from 'lucide-react';

interface TranslationWorkspaceProps {
  game: GameSummary;
  onRefreshGame: () => Promise<void>;
  onNavigateToGeminiQA: (languageCode: string) => void;
}

export const TranslationWorkspace: React.FC<TranslationWorkspaceProps> = ({
  game,
  onRefreshGame,
  onNavigateToGeminiQA,
}) => {
  const [selectedLangCode, setSelectedLangCode] = useState<string>(
    game.languages?.[0]?.language_code || ''
  );
  const [items, setItems] = useState<KeyTranslationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddLangOpen, setIsAddLangOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchProgressData | null>(null);

  // Sync selected language if languages change
  useEffect(() => {
    if (!selectedLangCode && game.languages?.length > 0) {
      setSelectedLangCode(game.languages[0].language_code);
    }
  }, [game.languages, selectedLangCode]);

  const loadTranslations = async () => {
    if (!selectedLangCode) return;
    setIsLoading(true);
    try {
      const data = await ApiClient.getTranslations(game.id, selectedLangCode);
      setItems(data);
    } catch (err) {
      console.error('Failed to load translations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTranslations();
  }, [game.id, selectedLangCode]);

  // Subscribe to real-time SSE progress & completed keys
  useEffect(() => {
    const existing = SseTranslationStream.getActiveJob(game.id, selectedLangCode) || SseTranslationStream.getActiveJob();
    if (existing && existing.status === 'running') {
      setActiveBatch(existing);
    }

    const unsubProgress = SseTranslationStream.onProgress((data) => {
      if (data.status === 'running') {
        setActiveBatch(data);
      } else if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'error') {
        setActiveBatch(null);
        loadTranslations();
        onRefreshGame();
      }
    });

    const unsubKey = SseTranslationStream.onKeyDone((data) => {
      setItems((prev) =>
        prev.map((it) =>
          it.key_id === data.keyId
            ? { ...it, translated_text: data.translatedText, status: 'ai_translated' }
            : it
        )
      );
    });

    return () => {
      unsubProgress();
      unsubKey();
    };
  }, [game.id, selectedLangCode]);

  const handleStopActiveBatch = async () => {
    const targetJobId = activeBatch?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) {
      try {
        await ApiClient.cancelBatch(targetJobId);
      } catch (err: any) {
        console.error('Failed to cancel batch:', err);
      }
      setActiveBatch(null);
      await loadTranslations();
      await onRefreshGame();
    }
  };

  const currentLang = game.languages?.find((l) => l.language_code === selectedLangCode);

  const handleSaveTranslation = async (keyId: string, text: string, status?: TranslationStatus) => {
    if (!currentLang) return;
    await ApiClient.updateTranslationItem({
      key_id: keyId,
      language_id: currentLang.language_id,
      translated_text: text,
      status,
    });
    // Update local state
    setItems((prev) =>
      prev.map((it) => (it.key_id === keyId ? { ...it, translated_text: text, status: status || it.status } : it))
    );
    await onRefreshGame();
  };

  const handleTranslateSingle = async (item: KeyTranslationItem): Promise<string> => {
    const result = await ApiClient.translateSingleKey({
      gameId: game.id,
      languageCode: selectedLangCode,
      keyId: item.key_id,
      keyPath: item.key_path,
      sourceText: item.source_text,
    });
    // Update local state
    setItems((prev) =>
      prev.map((it) => (it.key_id === item.key_id ? { ...it, translated_text: result, status: 'ai_translated' } : it))
    );
    await onRefreshGame();
    return result;
  };

  const handleDeleteLanguage = async (languageId: string, langName: string) => {
    if (confirm(`Are you sure you want to delete ${langName}? All translations for this language will be removed.`)) {
      await ApiClient.deleteLanguage(game.id, languageId);
      await onRefreshGame();
      if (selectedLangCode === currentLang?.language_code) {
        setSelectedLangCode(game.languages.filter(l => l.language_id !== languageId)[0]?.language_code || '');
      }
    }
  };

  const handleExportJson = () => {
    if (!selectedLangCode) return;
    window.open(`/api/games/${game.id}/export-json/${selectedLangCode}`, '_blank');
  };

  const untranslatedCount = items.filter((i) => !i.translated_text || i.status === 'untranslated').length;

  return (
    <div className="space-y-6">
      {/* Top Language Bar & Main Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Language Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Globe2 className="w-4 h-4 text-indigo-400" />
            <span>Target:</span>
          </div>

          {game.languages?.map((lang) => (
            <div key={lang.language_id} className="flex items-center">
              <button
                onClick={() => setSelectedLangCode(lang.language_code)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedLangCode === lang.language_code
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <span>{lang.language_name}</span>
                <span className="font-mono text-[10px] opacity-80">({lang.language_code})</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-black/30">
                  {lang.progress_percentage}%
                </span>
              </button>
            </div>
          ))}

          <button
            onClick={() => setIsAddLangOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Language</span>
          </button>
        </div>

        {/* Global Game Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportJsonOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Import or update base reference JSON"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Base JSON</span>
          </button>

          {selectedLangCode && (
            <>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                title="Download translated JSON file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => onNavigateToGeminiQA(selectedLangCode)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-200 border border-purple-500/40 rounded-lg transition-colors cursor-pointer"
                title="Inspect translations with Google Gemini 2.0 Flash"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Gemini AI Inspector</span>
              </button>

              <button
                onClick={() => setIsBatchOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeBatch?.status === 'running'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                {activeBatch?.status === 'running' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      Translating... ({activeBatch.total > 0 ? Math.round((activeBatch.completed / activeBatch.total) * 100) : 0}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Translate All (LM Studio)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Batch Floating Banner Alert */}
      {activeBatch && activeBatch.status === 'running' && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900 border border-indigo-500/40 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  LM Studio Batch in Progress
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {activeBatch.completed} / {activeBatch.total} ({activeBatch.total > 0 ? Math.round((activeBatch.completed / activeBatch.total) * 100) : 0}%)
                </span>
              </div>
              {activeBatch.currentKey && (
                <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                  Translating: <span className="text-indigo-300 font-semibold">{activeBatch.currentKey}</span>
                </p>
              )}
              {/* Mini Progress Bar */}
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{
                    width: `${activeBatch.total > 0 ? Math.round((activeBatch.completed / activeBatch.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStopActiveBatch}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop Batch</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBatchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <span>View Details</span>
            </button>
          </div>
        </div>
      )}

      {/* Language Selected Content */}
      {selectedLangCode && currentLang ? (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TranslationProgressBar
              progress={currentLang}
              totalKeys={game.totalKeys || items.length}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={loadTranslations}
                className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Key List</span>
              </button>
            </div>
            <button
              onClick={() => handleDeleteLanguage(currentLang.language_id, currentLang.language_name)}
              className="text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {currentLang.language_name}</span>
            </button>
          </div>

          <TranslationTable
            items={items}
            gameId={game.id}
            onSaveTranslation={handleSaveTranslation}
            onTranslateSingle={handleTranslateSingle}
          />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Globe2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">No Target Language Selected</h3>
          <p className="text-xs text-slate-400 mb-4">
            Add a target language (like Spanish, Japanese, German) to start translating.
          </p>
          <button
            onClick={() => setIsAddLangOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Target Language</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <LanguageSelectorModal
        isOpen={isAddLangOpen}
        gameId={game.id}
        onClose={() => setIsAddLangOpen(false)}
        onLanguageAdded={async () => {
          await onRefreshGame();
        }}
      />

      {currentLang && (
        <BatchTranslateModal
          isOpen={isBatchOpen}
          gameId={game.id}
          gameName={game.name}
          languageCode={currentLang.language_code}
          languageName={currentLang.language_name}
          untranslatedCount={untranslatedCount}
          totalCount={items.length}
          onClose={() => setIsBatchOpen(false)}
          onBatchFinished={async () => {
            await loadTranslations();
            await onRefreshGame();
          }}
        />
      )}

      <JsonImportModal
        isOpen={isImportJsonOpen}
        gameId={game.id}
        gameName={game.name}
        onClose={() => setIsImportJsonOpen(false)}
        onImportSuccess={async () => {
          await onRefreshGame();
          await loadTranslations();
        }}
      />
    </div>
  );
};
