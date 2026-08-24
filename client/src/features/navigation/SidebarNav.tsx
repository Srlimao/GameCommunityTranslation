import React from 'react';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  Sliders,
  FolderGit2,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';

export type NavView = 'dashboard' | 'context' | 'glossary' | 'style_rules' | 'projects' | 'users' | 'gemini';

interface SidebarNavProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenSettings: () => void;
  hasSelectedGame: boolean;
  gameName?: string;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onSelectView,
  onOpenSettings,
  hasSelectedGame,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavView,
      label: 'Dashboard',
      icon: LayoutDashboard,
      tooltip: 'Context-First Workflow Dashboard',
    },
    {
      id: 'context' as NavView,
      label: 'Context Hub',
      icon: Layers,
      tooltip: 'Global Context Definition Ecosystem',
      requiresGame: true,
    },
    {
      id: 'glossary' as NavView,
      label: 'Glossary',
      icon: BookOpen,
      tooltip: 'Advanced Terminology Glossary',
      requiresGame: true,
    },
    {
      id: 'style_rules' as NavView,
      label: 'Style Rules',
      icon: Sliders,
      tooltip: 'Style Guide & Localization Matrices',
      requiresGame: true,
    },
    {
      id: 'projects' as NavView,
      label: 'Projects',
      icon: FolderGit2,
      tooltip: 'Game Projects Repository',
    },
    {
      id: 'gemini' as NavView,
      label: 'AI QA Audit',
      icon: Sparkles,
      tooltip: 'Gemini QA Inspector & Consistency',
      requiresGame: true,
    },
  ];

  return (
    <aside className="w-16 sm:w-20 bg-[#10141D] border-r border-[#30363D] flex flex-col items-center py-4 select-none shrink-0 z-30 font-mono">
      {/* Brand Icon Badge */}
      <button
        onClick={() => onSelectView('dashboard')}
        className="w-12 h-12 bg-[#161B22] border border-[#5865F2] text-[#5865F2] hover:bg-[#5865F2] hover:text-white flex items-center justify-center transition-all mb-5 shadow-none"
        title="Local Game Translator Console"
      >
        <FolderGit2 className="w-6 h-6" />
      </button>

      {/* Nav Actions */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isDisabled = item.requiresGame && !hasSelectedGame;

          return (
            <button
              key={item.id}
              disabled={isDisabled}
              onClick={() => onSelectView(item.id)}
              title={isDisabled ? `${item.label} (Select a game project first)` : item.tooltip}
              className={`w-12 h-12 flex flex-col items-center justify-center transition-colors relative group ${
                isDisabled
                  ? 'opacity-30 cursor-not-allowed text-[#8B949E]'
                  : isActive
                  ? 'bg-[#5865F2] text-white border border-[#5865F2]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22] border border-transparent hover:border-[#30363D]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-tighter mt-1 font-bold">
                {item.label.split(' ')[0]}
              </span>

              {/* Tooltip on Hover */}
              <span className="absolute left-16 ml-2 px-2.5 py-1 bg-[#161B22] border border-[#30363D] text-[#E6EDF3] text-xs whitespace-nowrap hidden group-hover:block z-50 pointer-events-none shadow-lg">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Settings Bottom Action */}
      <div className="w-full flex flex-col items-center pt-3 border-t border-[#30363D]">
        <button
          onClick={onOpenSettings}
          title="System & AI Settings"
          className="w-12 h-12 flex flex-col items-center justify-center text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22] border border-transparent hover:border-[#30363D] transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-tighter mt-1 font-bold">Config</span>
        </button>
      </div>
    </aside>
  );
};
