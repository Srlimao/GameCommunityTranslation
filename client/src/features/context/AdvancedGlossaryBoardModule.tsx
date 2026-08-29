import React, { useState, useEffect } from 'react';
import { GameSummary, GlossaryEntry } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { BookOpen, Plus, Search, CheckSquare, Square, Trash2, Loader2, Sparkles } from 'lucide-react';

interface AdvancedGlossaryBoardModuleProps {
  game: GameSummary;
  onOpenEntryModal?: () => void;
}

export const AdvancedGlossaryBoardModule: React.FC<AdvancedGlossaryBoardModuleProps> = ({
  game,
  onOpenEntryModal,
}) => {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [termEn, setTermEn] = useState('');
  const [termTarget, setTermTarget] = useState('');
  const [definition, setDefinition] = useState('');
  const [styleGuideRef, setStyleGuideRef] = useState('G1.0');
  const [caseSensitive, setCaseSensitive] = useState(true);

  useEffect(() => {
    loadGlossary();
  }, [game.id]);

  const loadGlossary = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getGlossary(game.id);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load glossary in board module:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termEn.trim()) return;
    try {
      await ApiClient.addGlossaryEntry(game.id, {
        source_term: termEn.trim(),
        target_term: termTarget.trim() || termEn.trim(),
        target_language: game.languages?.[0]?.language_code || '',
        category: 'General',
        notes: definition.trim() || undefined,
      });
      setTermEn('');
      setTermTarget('');
      setDefinition('');
      setShowAddForm(false);
      await loadGlossary();
    } catch (err) {
      console.error('Failed to create glossary entry:', err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await ApiClient.deleteGlossaryEntry(game.id, id);
      await loadGlossary();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const filtered = entries.filter((e) =>
    e.source_term.toLowerCase().includes(search.toLowerCase()) ||
    (e.target_term && e.target_term.toLowerCase().includes(search.toLowerCase())) ||
    (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-[#161B22] border border-[#30363D] p-3 space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
          <BookOpen className="w-3.5 h-3.5 text-[#5865F2]" />
          <span>Advanced Glossary Tool</span>
          <span className="text-[10px] text-[#8B949E]">({entries.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Glossary Form</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter glossary terms..."
          className="w-full bg-[#0D1117] border border-[#30363D] pl-7 pr-2.5 py-1 text-[11px] text-[#E6EDF3] outline-none focus:border-[#5865F2]"
        />
        <Search className="w-3 h-3 text-[#8B949E] absolute left-2 top-1/2 -translate-y-1/2" />
      </div>

      {/* Inline Form */}
      {showAddForm && (
        <form onSubmit={handleAddEntry} className="bg-[#0D1117] p-2.5 border border-[#5865F2]/50 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Term (en) *"
              value={termEn}
              onChange={(e) => setTermEn(e.target.value)}
              className="bg-[#161B22] border border-[#30363D] p-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
            <input
              type="text"
              placeholder="Target Translation"
              value={termTarget}
              onChange={(e) => setTermTarget(e.target.value)}
              className="bg-[#161B22] border border-[#30363D] p-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
          </div>
          <input
            type="text"
            placeholder="Context / Definition"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            className="w-full bg-[#161B22] border border-[#30363D] p-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#8B949E]">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="accent-[#5865F2]"
              />
              <span>Exact Case Override</span>
            </label>
            <button
              type="submit"
              className="px-2.5 py-0.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2]"
            >
              Add Term
            </button>
          </div>
        </form>
      )}

      {/* Dense Table */}
      <div className="bg-[#0D1117] border border-[#30363D] max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#10141D] border-b border-[#30363D] text-[9px] uppercase font-bold text-[#8B949E] sticky top-0">
            <tr>
              <th className="p-1.5">Term (en)</th>
              <th className="p-1.5">Target Term</th>
              <th className="p-1.5">Context/Definition</th>
              <th className="p-1.5">Ref</th>
              <th className="p-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-[10px] text-[#8B949E]">
                  {isLoading ? 'Loading glossary...' : 'No glossary terms found.'}
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[#161B22]">
                  <td className="p-1.5 font-bold text-[#5865F2] text-[11px]">{item.source_term}</td>
                  <td className="p-1.5 text-[#E6EDF3] text-[11px]">{item.target_term || '-'}</td>
                  <td className="p-1.5 text-[#8B949E] text-[10px] max-w-[120px] truncate">{item.notes || '-'}</td>
                  <td className="p-1.5 text-[#3FB950] text-[9px] font-bold">G1.{idx + 1}</td>
                  <td className="p-1.5 text-right">
                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="text-[#8B949E] hover:text-[#E5534B] p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
