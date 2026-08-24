import React from 'react';
import { GlossaryEntry } from '../../types/client_types.ts';
import { Edit2, Trash2, Tag, Globe2 } from 'lucide-react';

interface GlossaryTableProps {
  entries: GlossaryEntry[];
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (id: string) => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Character':
      return 'bg-purple-950/80 text-purple-300 border-purple-800/80';
    case 'Item':
      return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
    case 'Location':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
    case 'UI':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
    case 'Lore':
      return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

export const GlossaryTable: React.FC<GlossaryTableProps> = ({ entries, onEdit, onDelete }) => {
  if (entries.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="text-sm font-semibold mb-1 text-slate-300">No glossary terms found</div>
        <div className="text-xs text-slate-500">
          Add terminology pairs manually or run the Google Gemini AI Inspector to mine terms from translated text.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
            <tr>
              <th className="px-4 py-3.5">Source Term</th>
              <th className="px-4 py-3.5">Target Translation</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Language</th>
              <th className="px-4 py-3.5">Notes</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-950/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {entry.source_term}
                </td>
                <td className="px-4 py-3 text-indigo-300 font-medium font-sans">
                  {entry.target_term}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(
                      entry.category
                    )}`}
                  >
                    <Tag className="w-3 h-3" />
                    {entry.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                  {entry.target_language ? (
                    <span className="flex items-center gap-1">
                      <Globe2 className="w-3 h-3 text-indigo-400" />
                      {entry.target_language}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">All Languages</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                  {entry.notes || '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-md hover:bg-slate-800 transition-colors"
                      title="Edit Term"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete glossary term "${entry.source_term}"?`)) {
                          onDelete(entry.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
                      title="Delete Term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
