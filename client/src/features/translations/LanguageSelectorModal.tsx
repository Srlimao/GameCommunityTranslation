import React, { useState } from 'react';
import { X, Globe2, Plus } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onLanguageAdded: (newCode?: string) => void;
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
      onLanguageAdded(code.trim());
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-lg overflow-hidden shadow-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">Add Target Language</h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Popular Presets
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search presets (e.g. Spanish, German, ja-JP)..."
              className="w-full bg-[#0D1117] border border-[#30363D] px-2.5 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2] mb-2"
            />
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 bg-[#0D1117] border border-[#30363D]">
              {filteredPresets.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-[11px] px-2 py-0.5 border transition-colors font-bold ${
                    code === p.code
                      ? 'bg-[#5865F2] text-white border-[#5865F2]'
                      : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
                  }`}
                >
                  {p.name} ({p.code})
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                  Language Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. es-ES"
                  required
                  className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                  Language Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spanish (Spain)"
                  required
                  className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#30363D]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !code.trim() || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Adding...' : 'Add Language'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
