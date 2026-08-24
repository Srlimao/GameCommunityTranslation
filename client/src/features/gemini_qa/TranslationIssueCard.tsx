import React from 'react';
import { TranslationIssue } from '../../types/client_types.ts';
import { AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface TranslationIssueCardProps {
  issue: TranslationIssue;
}

const getIssueBadge = (type: TranslationIssue['issue_type']) => {
  switch (type) {
    case 'placeholder_mismatch':
      return {
        label: 'PLACEHOLDER MISMATCH',
        classes: 'bg-[#E5534B]/20 text-[#F85149] border-[#E5534B]',
        icon: AlertCircle,
      };
    case 'formatting_loss':
      return {
        label: 'FORMATTING LOSS',
        classes: 'bg-[#D29922]/20 text-[#E3B341] border-[#D29922]',
        icon: AlertTriangle,
      };
    case 'terminology_inconsistency':
      return {
        label: 'GLOSSARY CONFLICT',
        classes: 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]',
        icon: RefreshCw,
      };
    default:
      return {
        label: 'LINGUISTIC DRIFT',
        classes: 'bg-[#30363D] text-[#8B949E] border-[#30363D]',
        icon: AlertTriangle,
      };
  }
};

export const TranslationIssueCard: React.FC<TranslationIssueCardProps> = ({ issue }) => {
  const badge = getIssueBadge(issue.issue_type);
  const Icon = badge.icon;

  return (
    <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2.5 hover:border-[#5865F2] transition-colors font-mono">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-[#5865F2] bg-[#161B22] px-2 py-0.5 border border-[#30363D]">
          {issue.key_path}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 border ${badge.classes}`}>
          <Icon className="w-2.5 h-2.5" />
          {badge.label}
        </span>
      </div>

      <div className="text-xs text-[#F85149] bg-[#E5534B]/10 p-2 border border-[#E5534B]">
        ⚠️ <strong>Issue:</strong> {issue.message}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-[#161B22] p-2 border border-[#30363D]">
          <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-0.5">Source</div>
          <div className="text-[#E6EDF3]">{issue.source_text}</div>
        </div>
        <div className="bg-[#161B22] p-2 border border-[#30363D]">
          <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-0.5">Current Translation</div>
          <div className="text-[#E6EDF3]">{issue.translated_text}</div>
        </div>
      </div>

      {issue.suggestion && (
        <div className="text-xs text-[#56D364] bg-[#3FB950]/10 p-2 border border-[#3FB950]">
          ✨ <strong>Fix:</strong> "{issue.suggestion}"
        </div>
      )}
    </div>
  );
};
