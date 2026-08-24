import React, { useState, useEffect } from 'react';
import { GameSummary, GlossaryEntry } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { GlossaryTable } from './GlossaryTable.tsx';
import { GlossaryEntryModal } from './GlossaryEntryModal.tsx';
import { Layers, Plus, Search, Filter, Download } from 'lucide-react';

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
    <div className="space-y-4 font-mono">
      {/* Header & Action Bar */}
      <div className="bg-[#161B22] border border-[#30363D] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#E6EDF3] flex items-center gap-2 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#5865F2]" />
            <span>Game Terminology Glossary ({entries.length})</span>
          </h2>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Enforce strict term pairs for characters, abilities, items, and UI across all LLM translation requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleExportGlossary}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors"
              title="Export Glossary as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD TERM</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search glossary terms or notes..."
            className="w-full bg-[#0D1117] border border-[#30363D] pl-8 pr-3 py-1.5 text-xs text-[#E6EDF3] placeholder:text-[#8B949E] outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Character', 'Item', 'Location', 'UI', 'Lore', 'General'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              {cat.toUpperCase()}
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
