import React from 'react';
import { Eye, ShieldCheck, MessageSquareQuote } from 'lucide-react';

interface PreviewItem {
  keyPath: string;
  sourceText: string;
  contextNote?: string;
  ignoredAttributes?: Record<string, any>;
}

interface JsonPreviewTableProps {
  items: PreviewItem[];
}

export const JsonPreviewTable: React.FC<JsonPreviewTableProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[#8B949E] bg-[#0D1117] border border-[#30363D] font-mono">
        No keys extracted with current mapping. Please ensure at least one valid text field is selected.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 font-mono">
      <div className="flex items-center justify-between text-xs text-[#8B949E]">
        <span className="font-bold flex items-center gap-1.5 text-[#E6EDF3] text-[10px] uppercase">
          <Eye className="w-3.5 h-3.5 text-[#5865F2]" />
          <span>Extraction Preview (First {items.length} keys)</span>
        </span>
      </div>

      <div className="bg-[#0D1117] border border-[#30363D] max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs text-[#E6EDF3] border-collapse">
          <thead className="bg-[#10141D] border-b border-[#30363D] uppercase font-bold text-[10px] text-[#8B949E] sticky top-0">
            <tr>
              <th className="px-3 py-1.5">Key Path</th>
              <th className="px-3 py-1.5">Source Text</th>
              <th className="px-3 py-1.5">Context / Speaker</th>
              <th className="px-3 py-1.5">Preserved Attributes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363D]">
            {items.map((item, idx) => {
              const ignoredKeys = item.ignoredAttributes ? Object.keys(item.ignoredAttributes) : [];

              return (
                <tr key={idx} className="hover:bg-[#161B22]">
                  <td className="px-3 py-1.5 font-bold text-[#5865F2]">
                    {item.keyPath}
                  </td>
                  <td className="px-3 py-1.5 text-[#E6EDF3] max-w-xs truncate">
                    {item.sourceText}
                  </td>
                  <td className="px-3 py-1.5 text-[#8B949E]">
                    {item.contextNote ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#161B22] text-[#8B949E] border border-[#30363D] text-[10px]">
                        <MessageSquareQuote className="w-2.5 h-2.5" />
                        {item.contextNote}
                      </span>
                    ) : (
                      <span className="text-[#8B949E] italic">-</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-[#8B949E] text-[10px]">
                    {ignoredKeys.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#161B22] text-[#8B949E] border border-[#30363D]">
                        <ShieldCheck className="w-2.5 h-2.5 text-[#3FB950]" />
                        {ignoredKeys.join(', ')} (Preserved)
                      </span>
                    ) : (
                      <span className="text-[#8B949E]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
