import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

interface ContextRuleCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  badgeColor?: 'accent' | 'success' | 'alert' | 'muted';
  onClick: () => void;
}

export const ContextRuleCard: React.FC<ContextRuleCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  description,
  badge,
  badgeColor = 'accent',
  onClick,
}) => {
  const badgeColorClasses = {
    accent: 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]',
    success: 'bg-[#3FB950]/20 text-[#56D364] border-[#3FB950]',
    alert: 'bg-[#E5534B]/20 text-[#F85149] border-[#E5534B]',
    muted: 'bg-[#30363D] text-[#8B949E] border-[#30363D]',
  };

  return (
    <div
      onClick={onClick}
      className="bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] p-3.5 flex flex-col justify-between transition-all cursor-pointer group font-mono relative select-none"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0D1117] border border-[#30363D] group-hover:border-[#5865F2] text-[#5865F2] flex items-center justify-center transition-colors">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold text-[#E6EDF3] group-hover:text-white uppercase tracking-wider">
              {title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${badgeColorClasses[badgeColor]}`}>
                {badge}
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-[#8B949E] group-hover:text-[#5865F2] transition-colors" />
          </div>
        </div>

        <p className="text-[11px] font-semibold text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors line-clamp-1 mb-1">
          {subtitle}
        </p>
        <p className="text-[10px] text-[#8B949E]/80 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      <div className="pt-2.5 mt-2.5 border-t border-[#30363D]/60 flex items-center justify-between text-[9px] text-[#8B949E]">
        <span className="uppercase tracking-wider">Configure In Context Hub</span>
        <span className="text-[#5865F2] font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
      </div>
    </div>
  );
};
