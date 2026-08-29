import React from 'react';
import { TranslationIssue } from '../../types/client_types.ts';
import { TranslationIssueCard } from './TranslationIssueCard.tsx';

interface IssueListViewProps {
  issues: TranslationIssue[];
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  emptyDescription: string;
  onApplyFix?: (issue: TranslationIssue, fixedText: string) => Promise<void> | void;
  onAiFixSingle?: (issue: TranslationIssue) => Promise<string>;
  onMarkAsGlossary?: (issue: TranslationIssue) => Promise<void> | void;
}

export const IssueListView: React.FC<IssueListViewProps> = ({
  issues,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  onApplyFix,
  onAiFixSingle,
  onMarkAsGlossary,
}) => {
  if (issues.length === 0) {
    return (
      <div className="p-8 text-center text-[#8B949E] bg-[#161B22] border border-[#30363D] font-mono">
        <EmptyIcon className="w-8 h-8 text-[#3FB950] mx-auto mb-2" />
        <div className="text-xs font-bold mb-1 text-[#E6EDF3] uppercase">{emptyTitle}</div>
        <div className="text-[11px] text-[#8B949E]">{emptyDescription}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
      {issues.map((issue) => {
        const uniqueKey = `${issue.key_path}_${issue.issue_type}`;
        return (
          <TranslationIssueCard
            key={uniqueKey}
            issue={issue}
            onApplyFix={onApplyFix}
            onAiFixSingle={onAiFixSingle}
            onMarkAsGlossary={onMarkAsGlossary}
          />
        );
      })}
    </div>
  );
};
