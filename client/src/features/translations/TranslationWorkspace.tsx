import React, { useState, useEffect, useMemo } from 'react';
import { GameSummary, KeyTranslationItem, TranslationStatus, BatchProgressData, LanguageProgress } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { SseTranslationStream } from '../../services/sse_translation_stream.ts';
import { ContextSerializer } from '../context/contextSerializer.ts';
import { TranslationProgressBar } from './TranslationProgressBar.tsx';
import { TranslationTable } from './TranslationTable.tsx';
import { TranslationTopBar } from './TranslationTopBar.tsx';
import { AiInheritancePanel } from './AiInheritancePanel.tsx';
import { LanguageSelectorModal } from './LanguageSelectorModal.tsx';
import { BatchTranslateModal } from './BatchTranslateModal.tsx';
import { JsonImportModal } from '../games/JsonImportModal.tsx';
import { PartialTranslationImportModal } from './PartialTranslationImportModal.tsx';
import { EmptyLanguageState } from './EmptyLanguageState.tsx';
import { Trash2, RefreshCw } from 'lucide-react';

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
  const [selectedLangCode, setSelectedLangCode] = useState<string>(game.languages?.[0]?.language_code || '');
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState<{ loaded: number; total: number } | null>(null);
  const [isAddLangOpen, setIsAddLangOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [isImportPartialOpen, setIsImportPartialOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchProgressData | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState<number>(0);
  const [glossaryCount, setGlossaryCount] = useState<number>(game.glossaryCount || 0);
  const contextData = useMemo(() => ContextSerializer.parse(game.context_prompt), [game.context_prompt]);

  const currentLang = game.languages?.find((l) => l.language_code === selectedLangCode);
  const [liveProgress, setLiveProgress] = useState<LanguageProgress | undefined>(currentLang);

  useEffect(() => {
    if (!selectedLangCode && game.languages?.length > 0) {
      setSelectedLangCode(game.languages[0].language_code);
    }
  }, [game.languages, selectedLangCode]);

  useEffect(() => {
    if (currentLang) {
      setLiveProgress({ ...currentLang });
    } else {
      setLiveProgress(undefined);
    }
  }, [currentLang?.language_code, currentLang?.translated_keys, currentLang?.approved_keys, currentLang?.total_keys]);

  useEffect(() => {
    if (game.id) {
      ApiClient.getGlossary(game.id, selectedLangCode)
        .then((entries) => setGlossaryCount(entries.length))
        .catch(() => {});
    }
  }, [game.id, selectedLangCode, game.glossaryCount]);

  const loadTranslations = async () => {
    if (!selectedLangCode) return;
    setIsLoading(true);
    try {
      await ApiClient.syncTranslations(game.id, selectedLangCode, (sync) => {
        setBackgroundSync(sync);
      });
      const updatedGame = await ApiClient.getGame(game.id);
      const targetLang = updatedGame?.languages?.find((l) => l.language_code === selectedLangCode);
      if (targetLang) setLiveProgress(targetLang);
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to sync translations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const existing = SseTranslationStream.getActiveJob(game.id, selectedLangCode) || SseTranslationStream.getActiveJob();
    if (existing && (existing.status === 'running' || existing.status === 'paused')) setActiveBatch(existing);

    const unsubProgress = SseTranslationStream.onProgress((data) => {
      if (data.status === 'running' || data.status === 'paused') {
        setActiveBatch(data);
      } else if (['completed', 'cancelled', 'error'].includes(data.status)) {
        setActiveBatch(null);
        onRefreshGame();
      }
    });

    return () => { unsubProgress(); };
  }, [game.id, selectedLangCode]);

  const handlePauseBatch = () => {
    const targetJobId = activeBatch?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) SseTranslationStream.pauseJob(targetJobId);
  };

  const handleResumeBatch = () => {
    const targetJobId = activeBatch?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) SseTranslationStream.resumeJob(targetJobId);
  };

  const handleStopActiveBatch = async () => {
    const targetJobId = activeBatch?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) {
      try { await ApiClient.cancelBatch(targetJobId); } catch (err) { console.error(err); }
      setActiveBatch(null);
      await onRefreshGame();
    }
  };

  const handleSaveTranslation = async (keyId: string, text: string, status?: TranslationStatus, orderIndex?: number) => {
    if (!currentLang) return;
    const finalStatus = status || (text.trim() ? 'manual_translated' : 'untranslated');

    const res = await ApiClient.updateTranslationItem({
      key_id: keyId, language_id: currentLang.language_id, game_id: game.id,
      language_code: selectedLangCode, order_index: orderIndex,
      translated_text: text, status: finalStatus,
    });
    if (res.langProgress) setLiveProgress(res.langProgress);
  };

  const handleTranslateSingle = async (item: KeyTranslationItem): Promise<string> => {
    return await ApiClient.translateSingleKey({
      gameId: game.id, languageCode: selectedLangCode, keyId: item.key_id,
      keyPath: item.key_path, sourceText: item.source_text,
    });
  };

  const handleDeleteLanguage = async (languageId: string, langName: string) => {
    if (confirm(`Delete ${langName}? All translations for this locale will be removed.`)) {
      await ApiClient.deleteLanguage(game.id, languageId);
      await onRefreshGame();
      if (selectedLangCode === currentLang?.language_code) {
        setSelectedLangCode(game.languages.filter((l) => l.language_id !== languageId)[0]?.language_code || '');
      }
    }
  };

  const handleExportJson = async () => {
    if (!selectedLangCode || isExporting) return;
    setIsExporting(true);
    try {
      const localizedJson = await ApiClient.exportJsonWithStructure(game.id, selectedLangCode);
      const { ClientJsonExporter } = await import('../games/utils/client_json_exporter.ts');
      ClientJsonExporter.downloadJsonFile(localizedJson, `${game.name}_${selectedLangCode}.json`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export JSON: ' + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const totalKeysCount = liveProgress?.total_keys || game.totalKeys || 0;

  const untranslatedCount = useMemo(() => {
    if (!liveProgress) return 0;
    return Math.max(0, totalKeysCount - (liveProgress.translated_keys || 0));
  }, [liveProgress, totalKeysCount]);

  return (
    <div className="space-y-3 font-mono">
      <TranslationTopBar
        game={game}
        selectedLangCode={selectedLangCode}
        onSelectLangCode={setSelectedLangCode}
        onOpenAddLang={() => setIsAddLangOpen(true)}
        onOpenImportJson={() => setIsImportJsonOpen(true)}
        onOpenImportPartialJson={() => setIsImportPartialOpen(true)}
        onExportJson={handleExportJson}
        isExporting={isExporting}
        onNavigateToGeminiQA={onNavigateToGeminiQA}
        onOpenBatch={() => setIsBatchOpen(true)}
        activeBatch={activeBatch}
        onStopBatch={handleStopActiveBatch}
        onPauseBatch={handlePauseBatch}
        onResumeBatch={handleResumeBatch}
      />

      <AiInheritancePanel contextData={contextData} glossaryCount={glossaryCount} />

      {selectedLangCode && currentLang ? (
        <div className="space-y-3">
          {liveProgress && (
            <TranslationProgressBar progress={liveProgress} totalKeys={liveProgress.total_keys || game.totalKeys || 0} />
          )}

          <div className="flex items-center justify-between text-xs text-[#8B949E] px-1">
            <div className="flex items-center gap-3">
              <button
                onClick={loadTranslations}
                disabled={isLoading}
                className="flex items-center gap-1 hover:text-[#E6EDF3] transition-colors"
                title="Reload from storage"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5865F2]' : ''}`} />
                <span>SYNC KEYS</span>
              </button>
              {backgroundSync && backgroundSync.loaded < backgroundSync.total && (
                <span className="text-[10px] text-[#5865F2] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Caching: {backgroundSync.loaded}/{backgroundSync.total} chunks
                </span>
              )}
            </div>

            <button
              onClick={() => handleDeleteLanguage(currentLang.language_id, currentLang.language_name)}
              className="flex items-center gap-1 text-[#8B949E] hover:text-[#F85149] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE {currentLang.language_name.toUpperCase()}</span>
            </button>
          </div>

          <TranslationTable
            gameId={game.id}
            languageCode={selectedLangCode}
            totalKeys={totalKeysCount}
            refreshKey={tableRefreshKey}
            onSaveTranslation={handleSaveTranslation}
            onTranslateSingle={handleTranslateSingle}
            onProgressReconciled={(reconciled) => {
              if (reconciled) setLiveProgress(reconciled);
            }}
          />
        </div>
      ) : (
        <EmptyLanguageState onOpenAddLang={() => setIsAddLangOpen(true)} />
      )}

      <LanguageSelectorModal
        isOpen={isAddLangOpen}
        gameId={game.id}
        onClose={() => setIsAddLangOpen(false)}
        onLanguageAdded={async (code) => {
          await onRefreshGame();
          if (code) setSelectedLangCode(code);
          setIsAddLangOpen(false);
        }}
      />

      {currentLang && (
        <BatchTranslateModal
          isOpen={isBatchOpen}
          gameId={game.id}
          gameName={game.name}
          languageCode={selectedLangCode}
          languageName={currentLang.language_name}
          untranslatedCount={untranslatedCount}
          totalCount={liveProgress?.total_keys || game.totalKeys || 0}
          onClose={() => setIsBatchOpen(false)}
          onBatchFinished={onRefreshGame}
        />
      )}

      <JsonImportModal
        isOpen={isImportJsonOpen}
        gameId={game.id}
        gameName={game.name}
        onClose={() => setIsImportJsonOpen(false)}
        onImportSuccess={() => { onRefreshGame(); }}
      />

      {currentLang && (
        <PartialTranslationImportModal
          isOpen={isImportPartialOpen}
          game={game}
          languageCode={selectedLangCode}
          languageName={currentLang.language_name}
          onClose={() => setIsImportPartialOpen(false)}
          onImportSuccess={() => { onRefreshGame(); }}
        />
      )}
    </div>
  );
};

