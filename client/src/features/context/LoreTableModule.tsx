import React, { useState } from 'react';
import { LoreElement, ImportanceWeight, InjectionTarget } from './types.ts';
import { Plus, Trash2, Search, Filter, ShieldAlert, Sparkles } from 'lucide-react';

interface LoreTableModuleProps {
  elements: LoreElement[];
  onChange: (elements: LoreElement[]) => void;
}

export const LoreTableModule: React.FC<LoreTableModuleProps> = ({ elements, onChange }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  const [newCategory, setNewCategory] = useState<LoreElement['category']>('World');
  const [newConcept, setNewConcept] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImportance, setNewImportance] = useState<ImportanceWeight>('high');
  const [newTarget, setNewTarget] = useState<InjectionTarget>('system_prompt');

  const filtered = elements.filter((el) => {
    const matchesSearch =
      el.concept.toLowerCase().includes(search.toLowerCase()) ||
      el.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || el.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim() || !newDescription.trim()) return;

    const newItem: LoreElement = {
      id: `lore-${Date.now()}`,
      category: newCategory,
      concept: newConcept.trim(),
      description: newDescription.trim(),
      importance: newImportance,
      target: newTarget,
    };
    onChange([newItem, ...elements]);
    setNewConcept('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleUpdate = (id: string, updates: Partial<LoreElement>) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const handleDelete = (id: string) => {
    onChange(elements.filter((el) => el.id !== id));
  };

  const getImportanceBadge = (imp: ImportanceWeight) => {
    switch (imp) {
      case 'critical':
        return 'bg-[#E5534B]/20 text-[#F85149] border-[#E5534B]';
      case 'high':
        return 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]';
      case 'medium':
        return 'bg-[#3FB950]/20 text-[#56D364] border-[#3FB950]';
      default:
        return 'bg-[#30363D] text-[#8B949E] border-[#30363D]';
    }
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-none flex flex-col h-full text-[#E6EDF3]">
      {/* Header */}
      <div className="p-3 border-b border-[#30363D] flex flex-wrap items-center justify-between gap-2 bg-[#10141D]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5865F2]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
            Global Context Hub (Lore Elements: {elements.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white rounded-none border border-[#5865F2] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'CANCEL' : 'ADD LORE ELEMENT'}</span>
        </button>
      </div>

      {/* Inline Add Drawer */}
      {isAdding && (
        <form onSubmit={handleAdd} className="p-3 bg-[#0D1117] border-b border-[#30363D] space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              >
                <option value="World">World</option>
                <option value="Faction">Faction</option>
                <option value="Magic/Tech">Magic/Tech</option>
                <option value="History">History</option>
                <option value="Terminology">Terminology</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Concept / Title</label>
              <input
                type="text"
                value={newConcept}
                onChange={(e) => setNewConcept(e.target.value)}
                placeholder="e.g. Aethelgard Realm or Mana Core"
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Weight</label>
              <select
                value={newImportance}
                onChange={(e) => setNewImportance(e.target.value as any)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              >
                <option value="critical">CRITICAL (Always)</option>
                <option value="high">HIGH (Core)</option>
                <option value="medium">MEDIUM (Normal)</option>
                <option value="low">LOW (Minor)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Description & Guidelines</label>
            <textarea
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Provide background lore, naming rules, pronunciation, and contextual nuance..."
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-[#8B949E] uppercase">Injection Target:</label>
              <select
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value as any)}
                className="bg-[#161B22] border border-[#30363D] rounded-none px-2 py-0.5 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              >
                <option value="system_prompt">System Prompt</option>
                <option value="pre_context">Pre-Context Section</option>
                <option value="user_task">User Task Segment</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1 bg-[#3FB950] hover:bg-[#56D364] text-slate-950 font-mono font-bold text-xs rounded-none transition-colors"
            >
              SAVE ELEMENT
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="p-2 border-b border-[#30363D] flex items-center gap-2 bg-[#161B22]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#8B949E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts, lore, rules..."
            className="w-full bg-[#0D1117] border border-[#30363D] rounded-none pl-7 pr-2 py-1 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2]"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-[#8B949E]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#8B949E] font-mono outline-none"
          >
            <option value="all">ALL CATEGORIES</option>
            <option value="World">World</option>
            <option value="Faction">Faction</option>
            <option value="Magic/Tech">Magic/Tech</option>
            <option value="History">History</option>
            <option value="Terminology">Terminology</option>
          </select>
        </div>
      </div>

      {/* Structured Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#10141D] border-b border-[#30363D] text-[#8B949E] uppercase text-[10px]">
              <th className="p-2 w-28">Category</th>
              <th className="p-2 w-44">Concept</th>
              <th className="p-2">Description / Directive</th>
              <th className="p-2 w-24">Weight</th>
              <th className="p-2 w-32">Target</th>
              <th className="p-2 w-12 text-center">Del</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#8B949E]">
                  No lore elements found. Add your first element above.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#10141D] transition-colors group">
                  <td className="p-2 align-top">
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#30363D]/60 text-[#E6EDF3] border border-[#30363D]">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-2 align-top font-bold text-[#E6EDF3]">{item.concept}</td>
                  <td className="p-2 align-top text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors">
                    {item.description}
                  </td>
                  <td className="p-2 align-top">
                    <select
                      value={item.importance}
                      onChange={(e) => handleUpdate(item.id, { importance: e.target.value as any })}
                      className={`px-1.5 py-0.5 text-[10px] uppercase font-bold border rounded-none bg-[#0D1117] ${getImportanceBadge(
                        item.importance
                      )}`}
                    >
                      <option value="critical">CRITICAL</option>
                      <option value="high">HIGH</option>
                      <option value="medium">MEDIUM</option>
                      <option value="low">LOW</option>
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <select
                      value={item.target}
                      onChange={(e) => handleUpdate(item.id, { target: e.target.value as any })}
                      className="bg-[#0D1117] border border-[#30363D] text-[10px] text-[#8B949E] px-1.5 py-0.5 rounded-none outline-none"
                    >
                      <option value="system_prompt">System Prompt</option>
                      <option value="pre_context">Pre-Context</option>
                      <option value="user_task">User Task</option>
                    </select>
                  </td>
                  <td className="p-2 align-top text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-[#8B949E] hover:text-[#E5534B] transition-colors"
                      title="Delete Lore Element"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
