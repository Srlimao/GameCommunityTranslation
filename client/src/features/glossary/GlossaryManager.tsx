import React, { useState, useEffect } from 'react';
import { GameSummary, GlossaryEntry } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { GlossaryTable } from './GlossaryTable.tsx';
import { GlossaryEntryModal } from './GlossaryEntryModal.tsx';
import { BookOpen, Plus, Search, Filter, Download } from 'lucide-react';

interface GlossaryManagerProps {
  game: GameSummary;
}

export const GlossaryManager: React.FC<GlossaryManagerProps> = ({ game }) => {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null);

  const loadGlossary = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getGlossary(game.id);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load glossary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGlossary();
  }, [game.id]);

  const handleDelete = async (id: string) => {
    await ApiClient.deleteGlossaryEntry(game.id, id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEdit = (entry: GlossaryEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleExportGlossary = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.toLowerCase().replace(/\s+/g, '_')}_glossary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      searchTerm === '' ||
      e.source_term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.target_term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Game Terminology Glossary</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enforce strict, uniform translations for character names, abilities, lore terms, and UI concepts across all LLM requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleExportGlossary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Export Glossary as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Term</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search glossary terms or notes..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
          {['All', 'Character', 'Item', 'Location', 'UI', 'Lore', 'General'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <GlossaryTable
        entries={filteredEntries}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal */}
      <GlossaryEntryModal
        isOpen={isModalOpen}
        gameId={game.id}
        entryToEdit={editingEntry}
        onClose={() => setIsModalOpen(false)}
        onSaved={loadGlossary}
      />
    </div>
  );
};
