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
        } else if (newSchema.mode === 'grouped_dictionary' && typeof parsed === 'object' && parsed !== null) {
          const updatedPreview: any[] = [];
          for (const [groupKey, groupVal] of Object.entries(parsed)) {
            if (updatedPreview.length >= 8) break;
            if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
              for (const [k, v] of Object.entries(groupVal)) {
                if (updatedPreview.length >= 8) break;
                if (typeof v === 'string') {
                  updatedPreview.push({
                    keyPath: `${groupKey}.${k}`,
                    sourceText: v,
                    contextNote: groupKey,
                    ignoredAttributes: {},
                  });
                }
              }
            }
          }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-3xl overflow-hidden shadow-none my-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#5865F2]" />
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
                {step === 'input' ? 'Import Base Reference JSON' : 'Schema & Key Mapping'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-[#3FB950]/10 border border-[#3FB950] text-[#56D364] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                  Upload JSON File
                </label>
                <label className="flex flex-col items-center justify-center border border-dashed border-[#30363D] hover:border-[#5865F2] p-4 cursor-pointer bg-[#0D1117] transition-colors">
                  <Upload className="w-5 h-5 text-[#8B949E] mb-1" />
                  <span className="text-xs font-bold text-[#E6EDF3]">Click to browse or drop JSON file</span>
                  <span className="text-[10px] text-[#8B949E] mt-0.5">Supports dialogue arrays, object records, or nested trees</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                    Or Paste JSON Content
                  </label>
                  <span className="text-[10px] text-[#8B949E]">{jsonText.length} chars</span>
                </div>
                <textarea
                  rows={8}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setError(null);
                  }}
                  placeholder='[ { "id": "quest_01", "speaker": "Elder", "text": "Take this sword.", "audio_id": 101 } ]'
                  className="w-full bg-[#0D1117] border border-[#30363D] p-2.5 text-xs text-[#E6EDF3] focus:border-[#5865F2] font-mono outline-none"
                />
              </div>
            </div>
          ) : (
            analysis && (
              <div className="space-y-4">
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
          <div className="flex items-center justify-between pt-3 border-t border-[#30363D]">
            {step === 'mapping' ? (
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to JSON Input</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
              >
                Cancel
              </button>
            )}

            {step === 'input' ? (
              <button
                type="button"
                onClick={handleAnalyzeAndProceed}
                disabled={isLoading || !jsonText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Next: Configure Structure & Mapping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isLoading || schemaConfig.textFields.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Confirm & Import Keys</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
