import React, { useState, useMemo } from 'react';
import { X, FileUp, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { GameSummary, JsonSchemaConfig, KeyTranslationItem, TranslationStatus } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { ClientJsonParser } from '../games/utils/client_json_parser.ts';
import { PartialImportPreviewTable, MatchedImportItem } from './PartialImportPreviewTable.tsx';

interface PartialTranslationImportModalProps {
  isOpen: boolean;
  game: GameSummary;
  languageCode: string;
  languageName: string;
  existingItems?: KeyTranslationItem[];
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export const PartialTranslationImportModal: React.FC<PartialTranslationImportModalProps> = ({
  isOpen,
  game,
  languageCode,
  languageName,
  existingItems = [],
  onClose,
  onImportSuccess,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [markStatus, setMarkStatus] = useState<TranslationStatus>('manual_translated');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const existingMap = useMemo(() => new Map(existingItems.map((i) => [i.key_path, i])), [existingItems]);

  const parsedData = useMemo(() => {
    if (!jsonText.trim()) return null;
    try {
      const parsed = JSON.parse(jsonText);
      let schemaConfig: JsonSchemaConfig | undefined = undefined;
      if (game.schema_config) {
        schemaConfig = typeof game.schema_config === 'string'
          ? JSON.parse(game.schema_config)
          : game.schema_config;
      }
      const flattened = ClientJsonParser.flattenWithConfig(parsed, schemaConfig);
      const validEntries: Array<{ keyPath: string; text: string }> = [];
      const matchedPreview: MatchedImportItem[] = [];
      let emptyCount = 0;

      for (let i = 0; i < flattened.length; i++) {
        const item = flattened[i];
        const textVal = String(item.sourceText ?? '');
        if (!textVal.trim()) {
          emptyCount++;
          continue;
        }
        validEntries.push({ keyPath: item.keyPath, text: textVal });

        if (matchedPreview.length < 10) {
          const existing = existingMap.get(item.keyPath);
          matchedPreview.push({
            keyPath: item.keyPath,
            text: textVal,
            baseSource: existing?.source_text || '[Base Key]',
            currentText: existing?.translated_text || '',
            isUntranslated: !existing || existing.status === 'untranslated' || !existing.translated_text?.trim(),
          });
        }
      }

      return {
        totalExtracted: flattened.length,
        validEntries,
        matched: matchedPreview,
        validCount: validEntries.length,
        unmatchedCount: 0,
        emptyCount,
      };
    } catch (err: any) {
      return { parseError: err.message || 'Invalid JSON format' };
    }
  }, [jsonText, game.schema_config, existingMap]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText((event.target?.result as string) || '');
      setError(null);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!parsedData || ('parseError' in parsedData) || parsedData.validEntries.length === 0) {
      setError('No valid translation keys found in the provided JSON.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgressStatus('Initializing import...');

    try {
      const res = await ApiClient.importPartialTranslations(
        game.id,
        languageCode,
        parsedData.validEntries,
        {
          overwriteExisting,
          status: markStatus,
          onProgress: (completed, total) => {
            const percent = Math.round((completed / total) * 100);
            setProgressStatus(`Saving chunk ${completed} of ${total} (${percent}%)...`);
          },
        }
      );

      setSuccessMessage(`Successfully updated ${res.updatedCount} keys for ${languageName}!`);
      setTimeout(() => {
        onImportSuccess(res.updatedCount);
        onClose();
        setJsonText('');
        setSuccessMessage(null);
        setProgressStatus(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to import translations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-3xl overflow-hidden my-8 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <FileUp className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
              Import Translated JSON &mdash; {languageName} ({languageCode})
            </h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-[#2EA043]/10 border border-[#2EA043] text-[#3FB950] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload Drop Area */}
          <div className="border border-dashed border-[#30363D] bg-[#0D1117] p-5 text-center hover:border-[#5865F2] transition-colors relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileUp className="w-6 h-6 text-[#8B949E] mx-auto mb-1.5" />
            <p className="text-xs text-[#E6EDF3] font-bold">Click to upload or drop JSON file</p>
            <p className="text-[11px] text-[#8B949E] mt-0.5">
              Matches the same JSON format as your main base JSON
            </p>
          </div>

          {/* JSON Text Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#8B949E]">
              <span>OR PASTE TRANSLATED JSON CODE</span>
              {jsonText && <span>{jsonText.length} characters</span>}
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={`{\n  "namespace": "Dialogues",\n  "key": "hero_greet",\n  "value": "Hola viajero"\n}`}
              className="w-full h-32 bg-[#0D1117] border border-[#30363D] p-2.5 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2] resize-y"
            />
          </div>

          {/* Validation & Matched Preview */}
          {parsedData && !('parseError' in parsedData) && (
            <PartialImportPreviewTable
              totalExtracted={parsedData.totalExtracted}
              validCount={parsedData.validCount}
              unmatchedCount={parsedData.unmatchedCount}
              emptyCount={parsedData.emptyCount}
              matched={parsedData.matched}
            />
          )}

          {parsedData && 'parseError' in parsedData && (
            <div className="p-2 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">
              JSON Parse Error: {parsedData.parseError}
            </div>
          )}

          {/* Import Settings */}
          <div className="bg-[#10141D] border border-[#30363D] p-3 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="accent-[#5865F2] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#E6EDF3] font-medium">Overwrite already-translated keys</span>
            </label>

            <div className="flex items-center justify-between pt-1 border-t border-[#30363D]/50 text-[11px]">
              <span className="text-[#8B949E]">SET STATUS:</span>
              <select
                value={markStatus}
                onChange={(e) => setMarkStatus(e.target.value as TranslationStatus)}
                className="bg-[#0D1117] border border-[#30363D] text-[#E6EDF3] px-2 py-1 outline-none text-xs"
              >
                <option value="manual_translated">Manual Translated</option>
                <option value="ai_translated">AI Translated</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363D] bg-[#10141D]">
          <div className="text-[11px] text-[#8B949E]">
            {progressStatus ? (
              <span className="text-[#5865F2] flex items-center gap-1.5 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progressStatus}
              </span>
            ) : parsedData && !('parseError' in parsedData) ? (
              <span className="text-[#3FB950] font-bold">Ready to import {parsedData.validCount} keys</span>
            ) : (
              <span>Upload or paste translated JSON to begin</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isLoading || !parsedData || ('parseError' in parsedData) || parsedData.validCount === 0}
              className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Confirm Import</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
