import React, { useState, useMemo } from 'react';
import { X, FileUp, CheckCircle2, AlertCircle, Loader2, Layers } from 'lucide-react';
import { GlossaryEntry } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';

interface GlossaryImportModalProps {
  isOpen: boolean;
  gameId: string;
  defaultLanguageCode?: string;
  onClose: () => void;
  onImported: () => void;
}

const VALID_CATEGORIES = ['Character', 'Item', 'Location', 'UI', 'Lore', 'General'];

function normalizeCategory(raw?: string): string {
  if (!raw) return 'General';
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  if (match) return match;
  const lower = raw.toLowerCase();
  if (lower.includes('char') || lower.includes('faction') || lower.includes('being')) return 'Character';
  if (lower.includes('item') || lower.includes('material')) return 'Item';
  if (lower.includes('loc') || lower.includes('room') || lower.includes('world')) return 'Location';
  if (lower.includes('ui') || lower.includes('stat') || lower.includes('mechanic')) return 'UI';
  if (lower.includes('lore') || lower.includes('magic') || lower.includes('school')) return 'Lore';
  return 'General';
}

function parseGlossaryJson(rawText: string, fallbackLang: string): Partial<GlossaryEntry>[] {
  const data = JSON.parse(rawText);
  const results: Partial<GlossaryEntry>[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const source = String(
        item.source_term ?? item.source ?? item.term ?? item.en ?? item.key ?? ''
      ).trim();
      const target = String(
        item.target_term ?? item.target ?? item.translation ?? item.pt ?? item.value ?? ''
      ).trim();
      if (!source) continue;

      results.push({
        source_term: source,
        target_term: target || source,
        target_language: String(item.target_language ?? item.language ?? fallbackLang).trim(),
        category: normalizeCategory(item.category),
        notes: item.notes ?? item.context ?? item.definition ?? '',
      });
    }
    return results;
  }

  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string') {
        const source = key.trim();
        if (!source) continue;
        results.push({
          source_term: source,
          target_term: val.trim() || source,
          target_language: fallbackLang,
          category: 'General',
          notes: '',
        });
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        const cat = normalizeCategory(key);
        for (const [innerKey, innerVal] of Object.entries(val as Record<string, any>)) {
          if (typeof innerVal === 'string') {
            const source = innerKey.trim();
            if (!source) continue;
            results.push({
              source_term: source,
              target_term: innerVal.trim() || source,
              target_language: fallbackLang,
              category: cat,
              notes: key,
            });
          }
        }
      }
    }
  }

  return results;
}

export const GlossaryImportModal: React.FC<GlossaryImportModalProps> = ({
  isOpen,
  gameId,
  defaultLanguageCode = 'pt-BR',
  onClose,
  onImported,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [defaultLang, setDefaultLang] = useState(defaultLanguageCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const parsedPreview = useMemo(() => {
    if (!jsonText.trim()) return null;
    try {
      const items = parseGlossaryJson(jsonText, defaultLang);
      return { items, error: null };
    } catch (err: any) {
      return { items: [], error: err.message || 'Invalid JSON format' };
    }
  }, [jsonText, defaultLang]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText((ev.target?.result as string) || '');
      setError(null);
      setSuccessMsg(null);
    };
    reader.onerror = () => setError('Failed to read glossary JSON file');
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!parsedPreview || parsedPreview.error || parsedPreview.items.length === 0) {
      setError('No valid glossary entries found to import.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const count = await ApiClient.batchAddGlossary(gameId, parsedPreview.items, overwriteExisting);
      setSuccessMsg(`Successfully imported/updated ${count} glossary terms!`);
      setTimeout(() => {
        onImported();
        onClose();
        setJsonText('');
        setSuccessMsg(null);
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to import glossary entries');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-2xl overflow-hidden my-8 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
              Import Glossary JSON
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

          {successMsg && (
            <div className="p-2.5 bg-[#2EA043]/10 border border-[#2EA043] text-[#3FB950] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="border border-dashed border-[#30363D] bg-[#0D1117] p-5 text-center hover:border-[#5865F2] transition-colors relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileUp className="w-6 h-6 text-[#8B949E] mx-auto mb-1.5" />
            <p className="text-xs text-[#E6EDF3] font-bold">Click to upload or drop Glossary JSON</p>
            <p className="text-[11px] text-[#8B949E] mt-0.5">
              Supports LocalTranslator Glossary Array, Flat Key-Value Dict, or Grouped Category Dict
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#8B949E]">
              <span>OR PASTE GLOSSARY JSON</span>
              {parsedPreview && !parsedPreview.error && (
                <span className="text-[#3FB950] font-bold">{parsedPreview.items.length} terms detected</span>
              )}
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder={`[\n  { "source_term": "Underschool", "target_term": "Subescola", "category": "Location" }\n]`}
              className="w-full h-28 bg-[#0D1117] border border-[#30363D] p-2.5 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2] resize-y"
            />
          </div>

          {parsedPreview?.error && (
            <div className="p-2 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs">
              JSON Parse Error: {parsedPreview.error}
            </div>
          )}

          {parsedPreview && !parsedPreview.error && parsedPreview.items.length > 0 && (
            <div className="bg-[#0D1117] border border-[#30363D] max-h-44 overflow-y-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#10141D] border-b border-[#30363D] text-[10px] uppercase text-[#8B949E] sticky top-0">
                  <tr>
                    <th className="p-2">Source Term</th>
                    <th className="p-2">Target Term</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Lang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {parsedPreview.items.slice(0, 15).map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#161B22]">
                      <td className="p-2 font-bold text-[#5865F2]">{item.source_term}</td>
                      <td className="p-2 text-[#3FB950] font-bold">{item.target_term}</td>
                      <td className="p-2 text-[#8B949E]">{item.category}</td>
                      <td className="p-2 text-[#8B949E]">{item.target_language || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-[#10141D] border border-[#30363D] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="accent-[#5865F2] w-4 h-4 cursor-pointer"
              />
              <span className="text-[#E6EDF3]">Overwrite existing duplicate terms</span>
            </label>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-[#8B949E]">DEFAULT LANG:</span>
              <input
                type="text"
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                placeholder="pt-BR"
                className="w-20 bg-[#0D1117] border border-[#30363D] px-2 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#30363D] bg-[#10141D]">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={isLoading || !parsedPreview || !!parsedPreview.error || parsedPreview.items.length === 0}
            className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import {parsedPreview?.items.length || 0} Terms</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
