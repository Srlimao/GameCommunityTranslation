import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Save } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-100">
              {entryToEdit ? 'Edit Glossary Term' : 'Add Glossary Term'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Source Term (Base) *
              </label>
              <input
                type="text"
                value={sourceTerm}
                onChange={(e) => setSourceTerm(e.target.value)}
                placeholder="e.g. Starblade, Lord Malakor"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Translation *
              </label>
              <input
                type="text"
                value={targetTerm}
                onChange={(e) => setTargetTerm(e.target.value)}
                placeholder="e.g. Espada Estelar, 滅びの剣"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Language (Optional)
              </label>
              <input
                type="text"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                placeholder="Leave blank for all languages, or e.g. es-ES"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes / Context / Usage Rules
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Do not translate as common sword; always capitalize"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
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
              disabled={isLoading || !sourceTerm.trim() || !targetTerm.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {entryToEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isLoading ? 'Saving...' : entryToEdit ? 'Save Changes' : 'Add Term'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
