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
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Brand / Back Navigation */}
        <div className="flex items-center gap-3.5">
          {selectedGame ? (
            <button
              onClick={onBackToGames}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#8B949E] hover:text-[#E6EDF3] px-3 py-1.5 border border-[#30363D] bg-[#161B22] transition-colors"
              title="Back to All Games"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">PROJECTS</span>
            </button>
          ) : null}

          <div
            onClick={() => onNavigateView?.('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 bg-[#161B22] border border-[#30363D] flex items-center justify-center text-[#5865F2]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-[#E6EDF3] flex items-center gap-2">
                <span>GAME COMMUNITY TRANSLATION</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40">
                  DEV-CONSOLE
                </span>
              </h1>
              {selectedGame && (
                <p className="text-xs text-[#3FB950] font-bold truncate max-w-sm">
                  :: {selectedGame.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* User Management Button (for Admins) */}
          {user?.is_admin && onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView(currentView === 'users' ? 'dashboard' : 'users')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold border transition-colors ${
                currentView === 'users'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>USERS</span>
            </button>
          )}

          {/* New Game Button */}
          {!selectedGame && currentView === 'dashboard' && (
            <button
              onClick={onOpenCreateGame}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>NEW GAME</span>
            </button>
          )}

          {/* Settings Cog */}
          <button
            onClick={onOpenSettings}
            className="p-2 bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] transition-colors"
            title="LLM Settings & API Keys"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Menu */}
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
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-1.5">
            <button
              onClick={() => onTabChange('translations')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold border transition-colors ${
                activeTab === 'translations'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span>TRANSLATIONS</span>
            </button>

            <button
              onClick={() => onTabChange('context')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold border transition-colors ${
                activeTab === 'context'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>BIG CONTEXT & LORE</span>
            </button>

            <button
              onClick={() => onTabChange('glossary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold border transition-colors ${
                activeTab === 'glossary'
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>GLOSSARY</span>
            </button>

            <button
              onClick={() => onTabChange('gemini')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold border transition-colors ${
                activeTab === 'gemini'
                  ? 'bg-[#3FB950] text-slate-950 border-[#3FB950]'
                  : 'bg-[#161B22] text-[#3FB950] hover:text-[#56D364] border-[#30363D]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI QA & INSPECTOR</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
