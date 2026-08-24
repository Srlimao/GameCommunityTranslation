import React, { useState } from 'react';
import { X, Globe2, Plus } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onLanguageAdded: () => void;
}

const PRESET_LANGUAGES = [
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-419', name: 'Spanish (Latin America)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'de-DE', name: 'German' },
  { code: 'fr-FR', name: 'French' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'th-TH', name: 'Thai' },
];

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  gameId,
  onClose,
  onLanguageAdded,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: { code: string; name: string }) => {
    setCode(preset.code);
    setName(preset.name);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Both Language Code and Name are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ApiClient.addLanguage(gameId, code.trim(), name.trim());
      onLanguageAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add language');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPresets = PRESET_LANGUAGES.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-100">Add Target Language</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Popular Presets
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets (e.g. Spanish, German, ja-JP)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
            />
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
              {filteredPresets.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                    code === p.code
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {p.name} ({p.code})
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Language Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. es-ES"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Language Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spanish (Spain)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !code.trim() || !name.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{isLoading ? 'Adding...' : 'Add Language'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
