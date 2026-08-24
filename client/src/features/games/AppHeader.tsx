import React from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { UserMenu } from '../auth/UserMenu.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import {
  Settings,
  Plus,
  ArrowLeft,
  Languages,
  BookOpen,
  Sparkles,
  Layers,
  Users,
  Gamepad2,
  Terminal,
} from 'lucide-react';

interface AppHeaderProps {
  selectedGame: GameSummary | null;
  activeTab: 'translations' | 'context' | 'glossary' | 'gemini';
  currentView?: 'dashboard' | 'users';
  onBackToGames: () => void;
  onTabChange: (tab: 'translations' | 'context' | 'glossary' | 'gemini') => void;
  onNavigateView?: (view: 'dashboard' | 'users') => void;
  onOpenCreateGame: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  selectedGame,
  activeTab,
  currentView = 'dashboard',
  onBackToGames,
  onTabChange,
  onNavigateView,
  onOpenCreateGame,
  onOpenSettings,
  onOpenLogin,
  onOpenUserManagement,
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#10141D] border-b border-[#30363D] font-mono">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedGame ? (
            <button
              onClick={onBackToGames}
              className="flex items-center gap-1.5 text-xs font-bold text-[#8B949E] hover:text-[#E6EDF3] p-1.5 border border-[#30363D] bg-[#161B22] transition-colors"
              title="Back to All Games"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PROJECTS</span>
            </button>
          ) : null}

          <div
            onClick={() => onNavigateView?.('dashboard')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#161B22] border border-[#30363D] flex items-center justify-center text-[#5865F2]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-[#E6EDF3] flex items-center gap-2">
                <span>LOCAL TRANSLATOR</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40">
                  DEV-CONSOLE
                </span>
              </h1>
              {selectedGame && (
                <p className="text-[11px] text-[#3FB950] font-bold truncate max-w-xs">
                  :: {selectedGame.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!selectedGame && onNavigateView && (
            <div className="hidden sm:flex items-center bg-[#0D1117] p-0.5 border border-[#30363D]">
              <button
                type="button"
                onClick={() => onNavigateView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-[#5865F2] text-white'
                    : 'text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
              >
                <Gamepad2 className="w-3 h-3" />
                <span>PROJECTS</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('users')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all ${
                  currentView === 'users'
                    ? 'bg-[#5865F2] text-white'
                    : 'text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>USERS</span>
              </button>
            </div>
          )}

          {!selectedGame && currentView === 'dashboard' && (
            <button
              onClick={onOpenCreateGame}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW GAME</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] transition-colors"
            title="LLM Settings & API Keys"
          >
            <Settings className="w-4 h-4" />
          </button>

          <UserMenu
            onOpenLogin={onOpenLogin}
            onOpenUserManagement={() => {
              if (onNavigateView) {
                onNavigateView('users');
              } else {
                onOpenUserManagement();
              }
            }}
          />
        </div>
      </div>

      {/* Tab Navigation when Game is Selected */}
      {selectedGame && (
        <div className="border-t border-[#30363D] bg-[#0D1117]">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => onTabChange('translations')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
                activeTab === 'translations'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>TRANSLATIONS</span>
            </button>

            <button
              onClick={() => onTabChange('context')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
                activeTab === 'context'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>BIG CONTEXT & LORE</span>
            </button>

            <button
              onClick={() => onTabChange('glossary')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
                activeTab === 'glossary'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>GLOSSARY</span>
            </button>

            <button
              onClick={() => onTabChange('gemini')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border transition-colors ${
                activeTab === 'gemini'
                  ? 'bg-[#3FB950] text-slate-950 border-[#3FB950]'
                  : 'bg-[#161B22] text-[#3FB950] hover:text-[#56D364] border-[#30363D]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI QA & INSPECTOR</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
