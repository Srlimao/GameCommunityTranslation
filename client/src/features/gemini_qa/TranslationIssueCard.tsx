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
        label: 'Placeholder Mismatch',
        classes: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
        icon: AlertCircle,
      };
    case 'formatting_loss':
      return {
        label: 'Formatting Loss',
        classes: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
        icon: AlertTriangle,
      };
    case 'terminology_inconsistency':
      return {
        label: 'Glossary Inconsistency',
        classes: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
        icon: RefreshCw,
      };
    default:
      return {
        label: 'Linguistic Drift',
        classes: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
        icon: AlertTriangle,
      };
  }
};

export const TranslationIssueCard: React.FC<TranslationIssueCardProps> = ({ issue }) => {
  const badge = getIssueBadge(issue.issue_type);
  const Icon = badge.icon;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors shadow-md">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          {issue.key_path}
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.classes}`}>
          <Icon className="w-3 h-3" />
          {badge.label}
        </span>
      </div>

      <div className="text-xs text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/40">
        ⚠️ <strong>Issue:</strong> {issue.message}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Source</div>
          <div className="text-slate-300">{issue.source_text}</div>
        </div>
        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Current Translation</div>
          <div className="text-slate-300">{issue.translated_text}</div>
        </div>
      </div>

      {issue.suggestion && (
        <div className="text-xs text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
          ✨ <strong>Suggested Fix:</strong> "{issue.suggestion}"
        </div>
      )}
    </div>
  );
};
