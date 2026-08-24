import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';
import { JsonAnalysisResult, JsonSchemaConfig } from '../../types/client_types.ts';
import { JsonSchemaMappingStep } from './JsonSchemaMappingStep.tsx';
import { JsonPreviewTable } from './JsonPreviewTable.tsx';

interface JsonImportModalProps {
  isOpen: boolean;
  gameId: string;
  gameName: string;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  gameId,
  gameName,
  onClose,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<'input' | 'mapping'>('input');
  const [jsonText, setJsonText] = useState('');
  const [analysis, setAnalysis] = useState<JsonAnalysisResult | null>(null);
  const [schemaConfig, setSchemaConfig] = useState<JsonSchemaConfig>({
    mode: 'nested_tree',
    textFields: [],
  });
  const [previewItems, setPreviewItems] = useState<JsonAnalysisResult['samplePreview']>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleAnalyzeAndProceed = async () => {
    if (!jsonText.trim()) {
      setError('Please paste or upload JSON content first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await ApiClient.analyzeJson(gameId, jsonText);
      setAnalysis(result);

      const initialSchema: JsonSchemaConfig = {
        mode: result.structureType,
        rootPath: result.selectedListPath,
        keyField: result.suggestedKeyField,
        textFields: result.suggestedTextFields.length > 0 ? result.suggestedTextFields : [result.availableFields[0]],
        contextField: result.suggestedContextField,
      };

      setSchemaConfig(initialSchema);
      setPreviewItems(result.samplePreview);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to parse and analyze JSON');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSchema = (newSchema: JsonSchemaConfig) => {
    setSchemaConfig(newSchema);
    if (analysis && jsonText) {
      try {
        const parsed = JSON.parse(jsonText);
        let sample: any[] = [];

        if (newSchema.rootPath && parsed && typeof parsed === 'object' && Array.isArray(parsed[newSchema.rootPath])) {
          sample = parsed[newSchema.rootPath].slice(0, 8);
        } else if (Array.isArray(parsed)) {
          sample = parsed.slice(0, 8);
        }

        if (sample.length > 0 && newSchema.mode === 'array_of_objects') {
          const updatedPreview: any[] = [];
          sample.forEach((item, index) => {
            if (!item || typeof item !== 'object') return;
            const idVal = newSchema.keyField && newSchema.keyField !== '_index' && item[newSchema.keyField] !== undefined
              ? String(item[newSchema.keyField])
              : `item[${index}]`;

            const contextNote = newSchema.contextField && item[newSchema.contextField] !== undefined
              ? String(item[newSchema.contextField])
              : undefined;

            const ignored: Record<string, any> = {};
            for (const [k, v] of Object.entries(item)) {
              if (k !== newSchema.keyField && !newSchema.textFields.includes(k) && k !== newSchema.contextField) {
                ignored[k] = v;
              }
            }

            for (const tf of newSchema.textFields) {
              if (item[tf] !== undefined) {
                const keyPath = newSchema.textFields.length === 1 && newSchema.keyField && newSchema.keyField !== '_index'
                  ? idVal
                  : `${idVal}.${tf}`;
                updatedPreview.push({
                  keyPath,
                  sourceText: String(item[tf]),
                  contextNote,
                  ignoredAttributes: ignored,
                });
              }
            }
          });
          setPreviewItems(updatedPreview);
        } else if (newSchema.mode === 'dictionary_kv' && typeof parsed === 'object' && parsed !== null) {
          setPreviewItems(
            Object.entries(parsed).slice(0, 8).map(([k, v]) => ({
              keyPath: k,
              sourceText: String(v),
              contextNote: '',
              ignoredAttributes: {},
            }))
          );
        }
      } catch {}
    }
  };

  const handleConfirmImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await ApiClient.importBaseJson(gameId, jsonText, schemaConfig);
      setSuccessMessage(res.message);
      onImportSuccess(res.importedCount);
      setTimeout(() => {
        onClose();
        setStep('input');
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">
                {step === 'input' ? 'Import Base Reference JSON' : 'Schema & Key Mapping'}
              </h2>
              <p className="text-xs text-slate-400">Game: {gameName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Upload JSON File
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-5 cursor-pointer bg-slate-950/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-300">Click to browse or drop JSON file</span>
                  <span className="text-xs text-slate-500 mt-0.5">Supports any structure: array of dialogue objects, item lists, or nested trees</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Or Paste JSON Content
                  </label>
                  <span className="text-xs text-slate-500">{jsonText.length} characters</span>
                </div>
                <textarea
                  rows={8}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setError(null);
                  }}
                  placeholder='[ { "id": "quest_01", "speaker": "Elder", "text": "Take this sword.", "audio_id": 101 } ]'
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>
            </div>
          ) : (
            analysis && (
              <div className="space-y-5">
                <JsonSchemaMappingStep
                  analysis={analysis}
                  schemaConfig={schemaConfig}
                  onChangeSchema={handleChangeSchema}
                />

                <JsonPreviewTable items={previewItems} />
              </div>
            )
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step === 'mapping' ? (
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to JSON Input</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 'input' ? (
              <button
                type="button"
                onClick={handleAnalyzeAndProceed}
                disabled={isLoading || !jsonText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Next: Configure Structure & Mapping</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isLoading || schemaConfig.textFields.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Confirm & Import Keys</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
