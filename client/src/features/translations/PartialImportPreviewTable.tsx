import React from 'react';
import { Eye } from 'lucide-react';

export interface MatchedImportItem {
  keyPath: string;
  text: string;
  baseSource: string;
  currentText: string;
  isUntranslated: boolean;
}

interface PartialImportPreviewTableProps {
  totalExtracted: number;
  validCount: number;
  unmatchedCount: number;
  emptyCount: number;
  matched: MatchedImportItem[];
}

export const PartialImportPreviewTable: React.FC<PartialImportPreviewTableProps> = ({
  totalExtracted,
  validCount,
  unmatchedCount,
  emptyCount,
  matched,
}) => {
  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Telemetry Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="bg-[#0D1117] border border-[#30363D] p-2 text-center">
          <div className="text-[#8B949E] text-[10px] uppercase">Keys in JSON</div>
          <div className="font-bold text-[#E6EDF3] text-sm mt-0.5">{totalExtracted}</div>
        </div>
        <div className="bg-[#0D1117] border border-[#3FB950]/50 p-2 text-center">
          <div className="text-[#3FB950] text-[10px] uppercase font-bold">Matching Keys</div>
          <div className="font-bold text-[#3FB950] text-sm mt-0.5">{validCount}</div>
        </div>
        <div className="bg-[#0D1117] border border-[#30363D] p-2 text-center">
          <div className="text-[#8B949E] text-[10px] uppercase">Unmatched Keys</div>
          <div className="font-bold text-[#8B949E] text-sm mt-0.5">{unmatchedCount}</div>
        </div>
        <div className="bg-[#0D1117] border border-[#30363D] p-2 text-center">
          <div className="text-[#8B949E] text-[10px] uppercase">Empty/Skipped</div>
          <div className="font-bold text-[#8B949E] text-sm mt-0.5">{emptyCount}</div>
        </div>
      </div>

      {/* Preview Table */}
      {matched.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#8B949E]">
            <Eye className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>Matching Preview (Showing first {Math.min(matched.length, 8)} of {matched.length})</span>
          </div>
          <div className="bg-[#0D1117] border border-[#30363D] max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#10141D] border-b border-[#30363D] text-[10px] font-bold uppercase text-[#8B949E] sticky top-0">
                <tr>
                  <th className="px-2.5 py-1.5">Key Path</th>
                  <th className="px-2.5 py-1.5">Source Base Text</th>
                  <th className="px-2.5 py-1.5">Current Text</th>
                  <th className="px-2.5 py-1.5">New Imported Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {matched.slice(0, 8).map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#161B22]">
                    <td className="px-2.5 py-1.5 font-bold text-[#5865F2] max-w-[140px] truncate">{m.keyPath}</td>
                    <td className="px-2.5 py-1.5 text-[#8B949E] max-w-[140px] truncate">{m.baseSource}</td>
                    <td className="px-2.5 py-1.5 text-[#8B949E] max-w-[140px] truncate">
                      {m.currentText || <span className="italic text-[#8B949E]/60">[Untranslated]</span>}
                    </td>
                    <td className="px-2.5 py-1.5 text-[#3FB950] font-medium max-w-[160px] truncate">{m.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
