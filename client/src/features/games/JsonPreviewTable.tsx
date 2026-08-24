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
      <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
        No keys extracted with current mapping. Please ensure at least one valid text field is selected.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold flex items-center gap-1.5 text-slate-300">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>Extraction Preview (First {items.length} keys)</span>
        </span>
        <span className="text-[11px] text-slate-500">Live preview of keys to be imported</span>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 border-b border-slate-800 uppercase font-semibold text-slate-400 sticky top-0">
            <tr>
              <th className="px-3.5 py-2">Generated Key Path</th>
              <th className="px-3.5 py-2">Source Text</th>
              <th className="px-3.5 py-2">Context / Speaker</th>
              <th className="px-3.5 py-2">Ignored Attributes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {items.map((item, idx) => {
              const ignoredKeys = item.ignoredAttributes ? Object.keys(item.ignoredAttributes) : [];

              return (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="px-3.5 py-2 font-mono text-indigo-400 font-medium">
                    {item.keyPath}
                  </td>
                  <td className="px-3.5 py-2 text-slate-200 max-w-xs truncate">
                    {item.sourceText}
                  </td>
                  <td className="px-3.5 py-2 text-slate-400 font-mono">
                    {item.contextNote ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[11px]">
                        <MessageSquareQuote className="w-3 h-3" />
                        {item.contextNote}
                      </span>
                    ) : (
                      <span className="text-slate-600 italic">-</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-slate-500 text-[11px]">
                    {ignoredKeys.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        <ShieldCheck className="w-3 h-3 text-amber-400" />
                        {ignoredKeys.join(', ')} (Preserved)
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
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
