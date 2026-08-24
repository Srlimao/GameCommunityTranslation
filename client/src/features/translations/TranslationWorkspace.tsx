import React, { useState, useEffect } from 'react';
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
import { Globe2, Plus, Trash2, RefreshCw } from 'lucide-react';

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

  const contextData = React.useMemo(() => ContextSerializer.parse(game.context_prompt), [game.context_prompt]);

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

  const handleExportJson = () => {
    if (!selectedLangCode) return;
    window.open(`/api/games/${game.id}/export-json/${selectedLangCode}`, '_blank');
  };

  const untranslatedCount = items.filter((i) => !i.translated_text || i.status === 'untranslated').length;

  return (
    <div className="space-y-3 font-mono">
      <TranslationTopBar
        game={game}
        selectedLangCode={selectedLangCode}
        onSelectLangCode={setSelectedLangCode}
        onOpenAddLang={() => setIsAddLangOpen(true)}
        onOpenImportJson={() => setIsImportJsonOpen(true)}
        onExportJson={handleExportJson}
        onNavigateToGeminiQA={onNavigateToGeminiQA}
        onOpenBatch={() => setIsBatchOpen(true)}
        activeBatch={activeBatch}
        onStopBatch={handleStopActiveBatch}
      />

      {/* AI Inheritance Panel (Option 2) */}
      <AiInheritancePanel
        contextData={contextData}
        glossaryCount={game.glossaryCount || 0}
      />

      {/* Language Content */}
      {selectedLangCode && currentLang ? (
        <div className="space-y-3">
          <TranslationProgressBar
            progress={currentLang}
            totalKeys={game.totalKeys || items.length}
          />

          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <button
              onClick={loadTranslations}
              className="flex items-center gap-1 hover:text-[#E6EDF3] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>SYNC KEYS</span>
            </button>
            <button
              onClick={() => handleDeleteLanguage(currentLang.language_id, currentLang.language_name)}
              className="text-[#8B949E] hover:text-[#E5534B] flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE {currentLang.language_name.toUpperCase()}</span>
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
        <div className="bg-[#161B22] border border-[#30363D] p-12 text-center">
          <Globe2 className="w-10 h-10 text-[#8B949E] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#E6EDF3] mb-1">NO TARGET LOCALE SELECTED</h3>
          <p className="text-xs text-[#8B949E] mb-4">
            Add a target language (Spanish, Japanese, German, French) to begin.
          </p>
          <button
            onClick={() => setIsAddLangOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ADD TARGET LOCALE</span>
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
