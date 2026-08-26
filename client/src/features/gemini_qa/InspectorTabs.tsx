import React from 'react';
import { ShieldCheck, AlertCircle, BookOpen, CheckCircle2 } from 'lucide-react';

interface InspectorTabsProps {
  activeTab: 'auto_checks' | 'issues' | 'candidates';
  onTabChange: (tab: 'auto_checks' | 'issues' | 'candidates') => void;
  issuesCount: number;
  candidatesCount: number;
  onAddAllCandidates: () => void;
}

export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  activeTab,
  onTabChange,
  issuesCount,
  candidatesCount,
  onAddAllCandidates,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[#30363D] pb-2 flex-wrap gap-2 font-mono">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onTabChange('auto_checks')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
            activeTab === 'auto_checks'
              ? 'bg-[#5865F2] text-white border-[#5865F2]'
              : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>AUTO CHECKS</span>
        </button>

        <button
          onClick={() => onTabChange('issues')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
            activeTab === 'issues'
              ? 'bg-[#5865F2] text-white border-[#5865F2]'
              : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          <span>ISSUES ({issuesCount})</span>
        </button>

        <button
          onClick={() => onTabChange('candidates')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
            activeTab === 'candidates'
              ? 'bg-[#5865F2] text-white border-[#5865F2]'
              : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>CANDIDATES ({candidatesCount})</span>
        </button>
      </div>

      {activeTab === 'candidates' && candidatesCount > 0 && (
        <button
          onClick={onAddAllCandidates}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#3FB950]/20 hover:bg-[#3FB950]/30 text-[#56D364] border border-[#3FB950] transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>ADD ALL TO GLOSSARY</span>
        </button>
      )}
    </div>
  );
};
