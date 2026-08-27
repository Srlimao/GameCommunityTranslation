import React, { useState, useEffect, useMemo } from 'react';
import { GameSummary, KeyTranslationItem, TranslationStatus, BatchProgressData } from '../../types/client_types.ts';
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
  const [items, setItems] = useState<KeyTranslationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState<{ loaded: number; total: number } | null>(null);
  const [isAddLangOpen, setIsAddLangOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [isImportPartialOpen, setIsImportPartialOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchProgressData | null>(null);
  const [glossaryCount, setGlossaryCount] = useState<number>(game.glossaryCount || 0);
  const contextData = useMemo(() => ContextSerializer.parse(game.context_prompt), [game.context_prompt]);

  useEffect(() => {
    if (!selectedLangCode && game.languages?.length > 0) {
      setSelectedLangCode(game.languages[0].language_code);
    }
  }, [game.languages, selectedLangCode]);

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
      const data = await ApiClient.getTranslations(game.id, selectedLangCode, undefined, (sync) => {
        setBackgroundSync(sync);
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to load translations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTranslations(); }, [game.id, selectedLangCode]);

  useEffect(() => {
    const existing = SseTranslationStream.getActiveJob(game.id, selectedLangCode) || SseTranslationStream.getActiveJob();
    if (existing?.status === 'running') setActiveBatch(existing);

    const unsubProgress = SseTranslationStream.onProgress((data) => {
      if (data.status === 'running') setActiveBatch(data);
      else if (['completed', 'cancelled', 'error'].includes(data.status)) {
        setActiveBatch(null);
        loadTranslations();
        onRefreshGame();
      }
    });

    const unsubKey = SseTranslationStream.onKeyDone((data) => {
      setItems((prev) =>
        prev.map((it) => (it.key_id === data.keyId ? { ...it, translated_text: data.translatedText, status: 'ai_translated' } : it))
      );
    });

    return () => { unsubProgress(); unsubKey(); };
  }, [game.id, selectedLangCode]);

  const handleStopActiveBatch = async () => {
    const targetJobId = activeBatch?.jobId || SseTranslationStream.getActiveJob()?.jobId;
    if (targetJobId) {
      try { await ApiClient.cancelBatch(targetJobId); } catch (err) { console.error(err); }
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
    setItems((prev) =>
      prev.map((it) => (it.key_id === item.key_id ? { ...it, translated_text: result, status: 'ai_translated' } : it))
    );
    await onRefreshGame();
    return result;
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
    if (!selectedLangCode) return;
    try {
      const exportMap = await ApiClient.getTranslations(game.id, selectedLangCode).then((list) => {
        const map: Record<string, string> = {};
        for (const item of list) map[item.key_path] = item.translated_text || item.source_text;
        return map;
      });
      const rawTemplate = game.raw_json_template || '';
      const { ClientJsonExporter } = await import('../games/utils/client_json_exporter.ts');
      const localizedJson = ClientJsonExporter.unflattenWithTemplate(exportMap, rawTemplate, game.schema_config);
      ClientJsonExporter.downloadJsonFile(localizedJson, `${game.name}_${selectedLangCode}.json`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export JSON: ' + (err.message || err));
    }
  };

  // Compute live progress from currentLang without expensive full array iterations on 100k+ keys
  const liveProgress = useMemo(() => {
    if (!currentLang) return undefined;
    return {
      ...currentLang,
      total_keys: currentLang.total_keys || game.totalKeys || items.length,
      translated_keys: currentLang.translated_keys || 0,
      approved_keys: currentLang.approved_keys || 0,
      progress_percentage: currentLang.progress_percentage || 0,
    };
  }, [currentLang, game.totalKeys, items.length]);

  const untranslatedCount = useMemo(() => {
    if (!currentLang) return 0;
    const total = currentLang.total_keys || game.totalKeys || 0;
    const translated = currentLang.translated_keys || 0;
    return Math.max(0, total - translated);
  }, [currentLang, game.totalKeys]);

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
        onNavigateToGeminiQA={onNavigateToGeminiQA}
        onOpenBatch={() => setIsBatchOpen(true)}
        activeBatch={activeBatch}
        onStopBatch={handleStopActiveBatch}
      />

      <AiInheritancePanel contextData={contextData} glossaryCount={glossaryCount} />

      {selectedLangCode && currentLang ? (
        <div className="space-y-3">
          {liveProgress && <TranslationProgressBar progress={liveProgress} />}

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
            totalKeys={currentLang.total_keys || game.totalKeys}
            onSaveTranslation={handleSaveTranslation}
            onTranslateSingle={handleTranslateSingle}
          />
        </div>
      ) : (
        <EmptyLanguageState onOpenAddLang={() => setIsAddLangOpen(true)} />
      )}

      <LanguageSelectorModal
        isOpen={isAddLangOpen}
        existingLanguages={game.languages || []}
        onClose={() => setIsAddLangOpen(false)}
        onAddLanguage={async (code, name) => {
          await ApiClient.addLanguage(game.id, code, name);
          await onRefreshGame();
          setSelectedLangCode(code);
          setIsAddLangOpen(false);
        }}
      />

      {currentLang && (
        <BatchTranslateModal
          isOpen={isBatchOpen}
          gameId={game.id}
          languageCode={selectedLangCode}
          languageName={currentLang.language_name}
          contextPrompt={game.context_prompt}
          untranslatedCount={untranslatedCount}
          onClose={() => setIsBatchOpen(false)}
          onStartBatch={loadTranslations}
        />
      )}

      <JsonImportModal
        isOpen={isImportJsonOpen}
        gameId={game.id}
        gameName={game.name}
        onClose={() => setIsImportJsonOpen(false)}
        onImportSuccess={() => { onRefreshGame(); loadTranslations(); }}
      />

      {currentLang && (
        <PartialTranslationImportModal
          isOpen={isImportPartialOpen}
          game={game}
          languageCode={selectedLangCode}
          languageName={currentLang.language_name}
          existingItems={items}
          onClose={() => setIsImportPartialOpen(false)}
          onImportSuccess={() => { onRefreshGame(); loadTranslations(); }}
        />
      )}
    </div>
  );
};
