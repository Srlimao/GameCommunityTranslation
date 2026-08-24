import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Save } from 'lucide-react';
import { GlossaryEntry } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';

interface GlossaryEntryModalProps {
  isOpen: boolean;
  gameId: string;
  entryToEdit?: GlossaryEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES = ['Character', 'Item', 'Location', 'UI', 'Lore', 'General'] as const;

export const GlossaryEntryModal: React.FC<GlossaryEntryModalProps> = ({
  isOpen,
  gameId,
  entryToEdit,
  onClose,
  onSaved,
}) => {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [category, setCategory] = useState<'Character' | 'Item' | 'Location' | 'UI' | 'Lore' | 'General'>('General');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entryToEdit) {
      setSourceTerm(entryToEdit.source_term);
      setTargetTerm(entryToEdit.target_term);
      setTargetLanguage(entryToEdit.target_language || '');
      setCategory(entryToEdit.category || 'General');
      setNotes(entryToEdit.notes || '');
    } else {
      setSourceTerm('');
      setTargetTerm('');
      setTargetLanguage('');
      setCategory('General');
      setNotes('');
    }
  }, [entryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTerm.trim() || !targetTerm.trim()) {
      setError('Both Source Term and Target Translation are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (entryToEdit) {
        await ApiClient.updateGlossaryEntry(gameId, entryToEdit.id, {
          source_term: sourceTerm.trim(),
          target_term: targetTerm.trim(),
          target_language: targetLanguage.trim(),
          category,
          notes: notes.trim(),
        });
      } else {
        await ApiClient.addGlossaryEntry(gameId, {
          source_term: sourceTerm.trim(),
          target_term: targetTerm.trim(),
          target_language: targetLanguage.trim(),
          category,
          notes: notes.trim(),
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save glossary entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-lg overflow-hidden shadow-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
              {entryToEdit ? 'Edit Glossary Term' : 'Add Glossary Term'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Source Term (Base) *
              </label>
              <input
                type="text"
                value={sourceTerm}
                onChange={(e) => setSourceTerm(e.target.value)}
                placeholder="e.g. Starblade, Lord Malakor"
                required
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Target Translation *
              </label>
              <input
                type="text"
                value={targetTerm}
                onChange={(e) => setTargetTerm(e.target.value)}
                placeholder="e.g. Espada Estelar, 滅びの剣"
                required
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Target Locale (Optional)
              </label>
              <input
                type="text"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                placeholder="Leave blank for all locales, or e.g. es-ES"
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Notes / Context / Usage Rules
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Do not translate as common sword; always capitalize"
              className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !sourceTerm.trim() || !targetTerm.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
            >
              {entryToEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Saving...' : entryToEdit ? 'Save Changes' : 'Add Term'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
