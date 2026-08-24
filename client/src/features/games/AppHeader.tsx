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
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedGame ? (
            <button
              onClick={onBackToGames}
              className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Back to All Games"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Games</span>
            </button>
          ) : null}

          <div
            onClick={() => onNavigateView?.('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30 text-white font-bold">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-2">
                <span>Local Game Translator</span>
                <span className="hidden md:inline text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Universal AI
                </span>
              </h1>
              {selectedGame && (
                <p className="text-xs text-indigo-400 font-semibold font-mono truncate max-w-xs">
                  {selectedGame.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!selectedGame && onNavigateView && (
            <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 mr-2">
              <button
                type="button"
                onClick={() => onNavigateView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === 'users'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users & Team</span>
              </button>
            </div>
          )}

          {!selectedGame && currentView === 'dashboard' && (
            <button
              onClick={onOpenCreateGame}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Game</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
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
        <div className="border-t border-slate-800/60 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2">
            <button
              onClick={() => onTabChange('translations')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'translations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Translations</span>
            </button>

            <button
              onClick={() => onTabChange('context')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'context'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Big Context & Lore</span>
            </button>

            <button
              onClick={() => onTabChange('glossary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'glossary'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Glossary</span>
            </button>

            <button
              onClick={() => onTabChange('gemini')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'gemini'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-purple-300 hover:text-purple-100 hover:bg-purple-950/40 border border-purple-900/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI QA & Inspector</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
