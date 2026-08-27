import React, { useState } from 'react';
import { TranslationIssue } from '../../types/client_types.ts';
import { AlertTriangle, AlertCircle, RefreshCw, Check, Loader2, ArrowRight, Terminal } from 'lucide-react';

interface TranslationIssueCardProps {
  issue: TranslationIssue;
  onApplyFix?: (issue: TranslationIssue, fixedText: string) => Promise<void>;
}

const getIssueBadge = (type: TranslationIssue['issue_type']) => {
  switch (type) {
    case 'tab_mismatch':
      return {
        label: 'TAB MISMATCH [\\t]',
        classes: 'bg-[#1F6FEB]/20 text-[#58A6FF] border-[#1F6FEB]',
        icon: Terminal,
      };
    case 'symbol_mismatch':
      return {
        label: 'SYMBOL MISMATCH',
        classes: 'bg-[#A371F7]/20 text-[#BC8CFF] border-[#A371F7]',
        icon: AlertCircle,
      };
    case 'tag_mismatch':
      return {
        label: 'TAG PARITY MISMATCH <></>',
        classes: 'bg-[#F778BA]/20 text-[#F778BA] border-[#F778BA]',
        icon: AlertCircle,
      };
    case 'placeholder_mismatch':
      return {
        label: 'PLACEHOLDER ERROR',
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

export const TranslationIssueCard: React.FC<TranslationIssueCardProps> = ({ issue, onApplyFix }) => {
  const badge = getIssueBadge(issue.issue_type);
  const Icon = badge.icon;
  const [isApplying, setIsApplying] = useState(false);
  const [editedSuggestion, setEditedSuggestion] = useState(issue.suggestion || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleApply = () => {
    if (!onApplyFix || !editedSuggestion) return;
    onApplyFix(issue, editedSuggestion);
  };

  return (
    <div className={`bg-[#0D1117] border p-3.5 space-y-3 transition-colors font-mono ${
      issue.applied ? 'border-[#238636]/60 bg-[#161B22]/60' : 'border-[#30363D] hover:border-[#5865F2]'
    }`}>
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-[#5865F2] bg-[#161B22] px-2 py-0.5 border border-[#30363D] truncate max-w-[280px]">
          {issue.key_path}
        </span>
        <div className="flex items-center gap-2">
          {issue.applied && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border bg-[#238636]/20 text-[#3FB950] border-[#238636]">
              <Check className="w-3 h-3" />
              APPLIED
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 border ${badge.classes}`}>
            <Icon className="w-2.5 h-2.5" />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Diagnostics / Problem Message */}
      <div className="text-xs text-[#F85149] bg-[#E5534B]/10 p-2.5 border border-[#E5534B]/60 leading-relaxed">
        <strong>Issue:</strong> {issue.message}
      </div>

      {/* Source vs Current Translation comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-[#161B22] p-2.5 border border-[#30363D] overflow-hidden">
          <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-1">Source Text</div>
          <div className="text-[#E6EDF3] whitespace-pre-wrap break-words">{issue.source_text}</div>
        </div>
        <div className="bg-[#161B22] p-2.5 border border-[#30363D] overflow-hidden">
          <div className="text-[9px] uppercase font-bold text-[#8B949E] mb-1">Current Translation</div>
          <div className="text-[#E6EDF3] whitespace-pre-wrap break-words">{issue.translated_text}</div>
        </div>
      </div>

      {/* Suggested Fix and Apply Action */}
      {issue.suggestion && (
        <div className="bg-[#161B22] border border-[#30363D] p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] uppercase font-bold text-[#56D364] flex items-center gap-1">
              ✨ Suggested Fix
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[10px] text-[#8B949E] hover:text-[#E6EDF3] underline"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Fix'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={editedSuggestion}
              onChange={(e) => setEditedSuggestion(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] p-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2] resize-none h-16"
            />
          ) : (
            <div className="text-xs text-[#56D364] bg-[#3FB950]/10 p-2 border border-[#3FB950]/30 whitespace-pre-wrap break-words">
              "{editedSuggestion}"
            </div>
          )}

          {onApplyFix && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleApply}
                disabled={isApplying || issue.applied}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors border ${
                  issue.applied
                    ? 'bg-[#238636]/20 text-[#3FB950] border-[#238636] cursor-default'
                    : 'bg-[#238636] hover:bg-[#2EA043] text-white border-[#3FB950]'
                }`}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>APPLYING...</span>
                  </>
                ) : issue.applied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>FIX APPLIED</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <span>APPLY FIX</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
