import React, { useState, useEffect } from 'react';
import { GameSummary } from './types/client_types.ts';
import { ApiClient } from './services/api_client.ts';
import { GameListCard } from './features/games/GameListCard.tsx';
import { GameCreationModal } from './features/games/GameCreationModal.tsx';
import { GameContextEditor } from './features/games/GameContextEditor.tsx';
import { TranslationWorkspace } from './features/translations/TranslationWorkspace.tsx';
import { GlossaryManager } from './features/glossary/GlossaryManager.tsx';
import { GeminiInspectorPanel } from './features/gemini_qa/GeminiInspectorPanel.tsx';
import { SettingsModal } from './features/settings/SettingsModal.tsx';
import { LoginModal } from './features/auth/LoginModal.tsx';
import { UserManagementModal } from './features/auth/UserManagementModal.tsx';
import { UserManagementPage } from './features/auth/UserManagementPage.tsx';
import { AppHeader } from './features/games/AppHeader.tsx';
import { Gamepad2, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'users'>('dashboard');
  const [activeTab, setActiveTab] = useState<'translations' | 'context' | 'glossary' | 'gemini'>('translations');
  const [geminiInitialLang, setGeminiInitialLang] = useState<string | undefined>();
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadGames = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getGames();
      setGames(data);
      if (selectedGame) {
        const refreshed = data.find((g) => g.id === selectedGame.id);
        if (refreshed) setSelectedGame(refreshed);
      }
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleSelectGame = (game: GameSummary) => {
    setSelectedGame(game);
    setActiveTab('translations');
    setCurrentView('dashboard');
  };

  const handleDeleteGame = async (gameId: string) => {
    await ApiClient.deleteGame(gameId);
    if (selectedGame?.id === gameId) setSelectedGame(null);
    await loadGames();
  };

  const handleNavigateToGeminiQA = (langCode: string) => {
    setGeminiInitialLang(langCode);
    setActiveTab('gemini');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader
        selectedGame={selectedGame}
        activeTab={activeTab}
        currentView={currentView}
        onBackToGames={() => {
          setSelectedGame(null);
          setCurrentView('dashboard');
        }}
        onTabChange={setActiveTab}
        onNavigateView={(view) => {
          setSelectedGame(null);
          setCurrentView(view);
        }}
        onOpenCreateGame={() => setIsCreateGameOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {selectedGame ? (
          /* Selected Game Active Tab */
          <div>
            {activeTab === 'translations' && (
              <TranslationWorkspace
                game={selectedGame}
                onRefreshGame={loadGames}
                onNavigateToGeminiQA={handleNavigateToGeminiQA}
              />
            )}

            {activeTab === 'context' && (
              <GameContextEditor
                game={selectedGame}
                onGameUpdated={(updated) => {
                  setSelectedGame(updated);
                  loadGames();
                }}
              />
            )}

            {activeTab === 'glossary' && (
              <GlossaryManager game={selectedGame} />
            )}

            {activeTab === 'gemini' && (
              <GeminiInspectorPanel
                game={selectedGame}
                initialLanguageCode={geminiInitialLang}
              />
            )}
          </div>
        ) : currentView === 'users' ? (
          /* Dedicated User Management View */
          <UserManagementPage onBackToDashboard={() => setCurrentView('dashboard')} />
        ) : (
          /* Games Dashboard */
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Universal AI Video Game Localization</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                  Translate with Context. Enforce Consistency with AI.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Provide your game's rich lore and world setting to any modern LLM (LM Studio, Ollama, Google Gemini, OpenAI, Claude, Groq, DeepSeek) for natural character dialogue translations, and audit consistency with automated QA.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Your Game Projects ({games.length})</h3>
              <button
                onClick={() => setIsCreateGameOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Game</span>
              </button>
            </div>

            {games.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200 mb-1">No Games Added Yet</h4>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  Create your first game project, configure the game's lore, and upload a base reference JSON to begin.
                </p>
                <button
                  onClick={() => setIsCreateGameOpen(true)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
                >
                  Add Your First Game
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {games.map((g) => (
                  <GameListCard
                    key={g.id}
                    game={g}
                    onSelect={handleSelectGame}
                    onDelete={handleDeleteGame}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals */}
      <GameCreationModal
        isOpen={isCreateGameOpen}
        onClose={() => setIsCreateGameOpen(false)}
        onGameCreated={async (newGame) => {
          await loadGames();
          setSelectedGame(newGame);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />
    </div>
  );
};
