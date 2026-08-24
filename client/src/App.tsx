import React, { useState, useEffect } from 'react';
import { GameSummary } from './types/client_types.ts';
import { ApiClient } from './services/api_client.ts';
import { SidebarNav, NavView } from './features/navigation/SidebarNav.tsx';
import { ContextFirstDashboard } from './features/dashboard/ContextFirstDashboard.tsx';
import { GameCreationModal } from './features/games/GameCreationModal.tsx';
import { ContextHubWorkspace } from './features/context/ContextHubWorkspace.tsx';
import { TranslationWorkspace } from './features/translations/TranslationWorkspace.tsx';
import { GlossaryManager } from './features/glossary/GlossaryManager.tsx';
import { GeminiInspectorPanel } from './features/gemini_qa/GeminiInspectorPanel.tsx';
import { SettingsModal } from './features/settings/SettingsModal.tsx';
import { LoginModal } from './features/auth/LoginModal.tsx';
import { UserManagementModal } from './features/auth/UserManagementModal.tsx';
import { UserManagementPage } from './features/auth/UserManagementPage.tsx';
import { AppHeader } from './features/games/AppHeader.tsx';

export const App: React.FC = () => {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'users' | 'projects'>('dashboard');
  const [activeTab, setActiveTab] = useState<'translations' | 'context' | 'glossary' | 'gemini' | 'style_rules'>('translations');
  const [contextInitialPane, setContextInitialPane] = useState<'ecosystem' | 'multi' | 'hub' | 'characters' | 'style' | 'synthesizer' | 'glossary'>('ecosystem');
  const [geminiInitialLang, setGeminiInitialLang] = useState<string | undefined>();
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const loadGames = async () => {
    try {
      const data = await ApiClient.getGames();
      setGames(data);
      if (selectedGame) {
        const refreshed = data.find((g) => g.id === selectedGame.id);
        if (refreshed) setSelectedGame(refreshed);
      }
    } catch (err) {
      console.error('Failed to load games:', err);
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

  const handleNavigateToContextModule = (module: 'lore' | 'characters' | 'style' | 'synthesizer' | 'glossary') => {
    if (!selectedGame && games.length > 0) {
      setSelectedGame(games[0]);
    }
    const paneMap: Record<string, any> = {
      lore: 'hub',
      characters: 'characters',
      style: 'style',
      synthesizer: 'synthesizer',
      glossary: 'glossary',
    };
    setContextInitialPane(paneMap[module] || 'ecosystem');
    setActiveTab('context');
    setCurrentView('dashboard');
  };

  const handleSidebarSelectView = (view: NavView) => {
    if (view === 'dashboard') {
      setSelectedGame(null);
      setCurrentView('dashboard');
    } else if (view === 'projects') {
      setSelectedGame(null);
      setCurrentView('dashboard');
    } else if (view === 'context') {
      if (!selectedGame && games.length > 0) setSelectedGame(games[0]);
      setContextInitialPane('ecosystem');
      setActiveTab('context');
      setCurrentView('dashboard');
    } else if (view === 'glossary') {
      if (!selectedGame && games.length > 0) setSelectedGame(games[0]);
      setActiveTab('glossary');
      setCurrentView('dashboard');
    } else if (view === 'style_rules') {
      if (!selectedGame && games.length > 0) setSelectedGame(games[0]);
      setContextInitialPane('style');
      setActiveTab('context');
      setCurrentView('dashboard');
    } else if (view === 'gemini') {
      if (!selectedGame && games.length > 0) setSelectedGame(games[0]);
      setActiveTab('gemini');
      setCurrentView('dashboard');
    } else if (view === 'users') {
      setSelectedGame(null);
      setCurrentView('users');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex font-mono overflow-x-hidden">
      {/* Persistent Left Icon Navigation Rail */}
      <SidebarNav
        activeView={
          selectedGame
            ? activeTab === 'context'
              ? 'context'
              : activeTab === 'glossary'
              ? 'glossary'
              : activeTab === 'gemini'
              ? 'gemini'
              : 'dashboard'
            : currentView === 'users'
            ? 'users'
            : 'dashboard'
        }
        onSelectView={handleSidebarSelectView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasSelectedGame={Boolean(selectedGame || games.length > 0)}
        gameName={selectedGame?.name}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          selectedGame={selectedGame}
          activeTab={activeTab === 'style_rules' ? 'context' : activeTab}
          currentView={currentView === 'projects' ? 'dashboard' : currentView}
          onBackToGames={() => {
            setSelectedGame(null);
            setCurrentView('dashboard');
          }}
          onTabChange={(tab) => {
            if (tab === 'context') setContextInitialPane('ecosystem');
            setActiveTab(tab);
          }}
          onNavigateView={(view) => {
            setSelectedGame(null);
            setCurrentView(view);
          }}
          onOpenCreateGame={() => setIsCreateGameOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1680px] mx-auto p-4 sm:p-6 overflow-y-auto">
          {selectedGame ? (
            <div>
              {activeTab === 'translations' && (
                <TranslationWorkspace
                  game={selectedGame}
                  onRefreshGame={loadGames}
                  onNavigateToGeminiQA={(langCode) => {
                    setGeminiInitialLang(langCode);
                    setActiveTab('gemini');
                  }}
                />
              )}

              {(activeTab === 'context' || activeTab === 'style_rules') && (
                <ContextHubWorkspace
                  game={selectedGame}
                  initialPane={contextInitialPane}
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
            <UserManagementPage onBackToDashboard={() => setCurrentView('dashboard')} />
          ) : (
            <ContextFirstDashboard
              games={games}
              selectedGame={selectedGame}
              onSelectGame={handleSelectGame}
              onDeleteGame={handleDeleteGame}
              onOpenCreateGame={() => setIsCreateGameOpen(true)}
              onNavigateToContextModule={handleNavigateToContextModule}
              onEnterTranslationEditor={handleSelectGame}
            />
          )}
        </main>
      </div>

      {/* Global Dialog Modals */}
      <GameCreationModal
        isOpen={isCreateGameOpen}
        onClose={() => setIsCreateGameOpen(false)}
        onGameCreated={async (newGame) => {
          await loadGames();
          setSelectedGame(newGame);
        }}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <UserManagementModal isOpen={isUserManagementOpen} onClose={() => setIsUserManagementOpen(false)} />
    </div>
  );
};
