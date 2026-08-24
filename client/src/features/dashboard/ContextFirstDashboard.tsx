import React from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { ContextRuleCard } from './ContextRuleCard.tsx';
import { GameListCard } from '../games/GameListCard.tsx';
import {
  BookOpen,
  Users2,
  BookmarkCheck,
  Sliders,
  Plus,
  Terminal,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ContextFirstDashboardProps {
  games: GameSummary[];
  selectedGame: GameSummary | null;
  onSelectGame: (game: GameSummary) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenCreateGame: () => void;
  onNavigateToContextModule: (module: 'lore' | 'characters' | 'style' | 'synthesizer' | 'glossary') => void;
  onEnterTranslationEditor: (game: GameSummary) => void;
}

export const ContextFirstDashboard: React.FC<ContextFirstDashboardProps> = ({
  games,
  selectedGame,
  onSelectGame,
  onDeleteGame,
  onOpenCreateGame,
  onNavigateToContextModule,
  onEnterTranslationEditor,
}) => {
  return (
    <div className="space-y-5 font-mono">
      {/* Option 1: Context-First Workflow Hero Panel */}
      <section className="bg-[#161B22] border border-[#30363D] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#30363D] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#5865F2] bg-[#5865F2]/10 px-2 py-0.5 border border-[#5865F2]/40">
                OPTION 1
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#3FB950] bg-[#3FB950]/10 px-2 py-0.5 border border-[#3FB950]/40">
                CONTEXT-FIRST TRANSLATION WORKFLOW
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#E6EDF3] tracking-tight">
              Global Context & Rules Engine
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {selectedGame && (
              <button
                onClick={() => onNavigateToContextModule('lore')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OPEN FULL ECOSYSTEM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onOpenCreateGame}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#0D1117] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Create Game</span>
            </button>
          </div>
        </div>

        {/* 4 Context Hub Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ContextRuleCard
            icon={BookOpen}
            title="Lore Repository"
            subtitle="Content to assist translation in lore"
            description="Structure world history, magic systems, factions, and key narrative concepts."
            badge="Foundation"
            badgeColor="accent"
            onClick={() => onNavigateToContextModule('lore')}
          />

          <ContextRuleCard
            icon={Users2}
            title="Character Voice"
            subtitle="Configure persona speech registers"
            description="Define speech quirks, formality registers (formal/archaic/slang), and sample dialogue lines."
            badge="Dossiers"
            badgeColor="success"
            onClick={() => onNavigateToContextModule('characters')}
          />

          <ContextRuleCard
            icon={BookmarkCheck}
            title="Glossary Terms"
            subtitle="Define context 'before' projects"
            description="Enforce standardized translation terms with style guide references and case overrides."
            badge="Terms"
            badgeColor="accent"
            onClick={() => onNavigateToContextModule('glossary')}
          />

          <ContextRuleCard
            icon={Sliders}
            title="Style Guide Rules"
            subtitle="Context specific AI prompting"
            description="Configure grammatical gender, punctuation marks, honorifics, and UI expansion limits."
            badge="Matrices"
            badgeColor="alert"
            onClick={() => onNavigateToContextModule('style')}
          />
        </div>

        {/* Workflow Principles Summary */}
        <div className="bg-[#0D1117] border border-[#30363D] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] text-[#8B949E]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#5865F2] shrink-0" />
            <span>Define context <strong>before</strong> projects</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#3FB950] shrink-0" />
            <span>Context-specific AI prompting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#5865F2] shrink-0" />
            <span>Define context use game context</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#E5534B] shrink-0" />
            <span>Perform character-specific translation</span>
          </div>
        </div>
      </section>

      {/* Projects Repository Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5865F2]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
              Your Game Projects ({games.length})
            </h3>
          </div>
          <span className="text-[10px] text-[#8B949E]">
            Active Project: {selectedGame ? selectedGame.name : 'None Selected'}
          </span>
        </div>

        {games.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] p-12 text-center">
            <h4 className="text-sm font-bold text-[#E6EDF3] mb-1">NO GAME PROJECTS CONFIGURED</h4>
            <p className="text-xs text-[#8B949E] mb-4 max-w-sm mx-auto">
              Initialize your first game repository to bind lore, characters, and start AI batch translation.
            </p>
            <button
              onClick={onOpenCreateGame}
              className="px-4 py-2 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors"
            >
              CREATE FIRST GAME
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {games.map((g) => (
              <GameListCard
                key={g.id}
                game={g}
                onSelect={() => onEnterTranslationEditor(g)}
                onDelete={() => onDeleteGame(g.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
