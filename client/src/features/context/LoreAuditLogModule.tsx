import React from 'react';
import { LoreElement } from './types.ts';
import { History, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoreAuditLogModuleProps {
  elements: LoreElement[];
}

export const LoreAuditLogModule: React.FC<LoreAuditLogModuleProps> = ({ elements }) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-3 space-y-2.5 font-mono">
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
          <History className="w-3.5 h-3.5 text-[#5865F2]" />
          <span>Lore Audit Log</span>
        </div>
        <span className="text-[9px] text-[#3FB950] bg-[#3FB950]/10 px-1.5 py-0.2 border border-[#3FB950]/30 font-bold uppercase">
          SYNCHRONIZED
        </span>
      </div>

      <div className="max-h-36 overflow-y-auto divide-y divide-[#30363D]/60 text-xs">
        {elements.length === 0 ? (
          <div className="py-4 text-center text-[10px] text-[#8B949E]">
            No lore elements registered yet for audit tracking.
          </div>
        ) : (
          elements.slice(0, 5).map((el) => (
            <div key={el.id} className="py-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#E6EDF3] text-[11px] truncate">{el.concept}</span>
                  <span className="text-[9px] text-[#8B949E] px-1 bg-[#0D1117] border border-[#30363D]">
                    {el.category}
                  </span>
                </div>
                <p className="text-[10px] text-[#8B949E] truncate">{el.description}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-[9px]">
                <ShieldCheck className="w-3 h-3 text-[#3FB950]" />
                <span className="font-bold uppercase text-[#3FB950]">{el.importance}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
