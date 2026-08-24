import React from 'react';
import { GlossaryEntry } from '../../types/client_types.ts';
import { Edit2, Trash2, Tag, Globe2 } from 'lucide-react';

interface GlossaryTableProps {
  entries: GlossaryEntry[];
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (id: string) => void;
}

export const GlossaryTable: React.FC<GlossaryTableProps> = ({ entries, onEdit, onDelete }) => {
  if (entries.length === 0) {
    return (
      <div className="p-10 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D] font-mono">
        <div className="text-xs font-bold mb-1 text-[#E6EDF3]">NO GLOSSARY TERMS FOUND</div>
        <div className="text-[11px] text-[#8B949E]">
          Add terminology pairs or run the Gemini QA Inspector to extract candidate terms.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] border border-[#30363D] font-mono">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#E6EDF3] border-collapse">
          <thead className="bg-[#10141D] border-b border-[#30363D] text-[10px] uppercase font-bold text-[#8B949E]">
            <tr>
              <th className="px-3 py-2.5">Source Term</th>
              <th className="px-3 py-2.5">Target Translation</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Locale</th>
              <th className="px-3 py-2.5">Notes</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#10141D] transition-colors">
                <td className="px-3 py-2 font-bold text-[#E6EDF3]">
                  {entry.source_term}
                </td>
                <td className="px-3 py-2 text-[#3FB950] font-bold">
                  {entry.target_term}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
                    <Tag className="w-2.5 h-2.5" />
                    {entry.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-[#8B949E]">
                  {entry.target_language ? (
                    <span className="flex items-center gap-1 text-[#5865F2]">
                      <Globe2 className="w-3 h-3" />
                      {entry.target_language}
                    </span>
                  ) : (
                    <span className="text-[#8B949E] italic">All Locales</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[11px] text-[#8B949E] max-w-xs truncate">
                  {entry.notes || '-'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1 text-[#8B949E] hover:text-[#5865F2] border border-transparent hover:border-[#5865F2] transition-colors"
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
                      className="p-1 text-[#8B949E] hover:text-[#E5534B] border border-transparent hover:border-[#E5534B] transition-colors"
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
