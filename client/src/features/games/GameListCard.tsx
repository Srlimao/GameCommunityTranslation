import React from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { Terminal, Languages, KeyRound, ArrowRight, Trash2, BookOpen } from 'lucide-react';

interface GameListCardProps {
  game: GameSummary;
  onSelect: (game: GameSummary) => void;
  onDelete: (gameId: string) => void;
}

export const GameListCard: React.FC<GameListCardProps> = ({ game, onSelect, onDelete }) => {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-4 hover:border-[#5865F2] transition-colors flex flex-col justify-between group font-mono">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0D1117] text-[#5865F2] flex items-center justify-center border border-[#30363D]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#E6EDF3] group-hover:text-[#5865F2] transition-colors">
                {game.name}
              </h3>
              <span className="text-[10px] text-[#8B949E]">
                BASE: <strong className="text-[#3FB950]">{game.base_language}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${game.name}" and all its translations?`)) {
                onDelete(game.id);
              }
            }}
            className="text-[#8B949E] hover:text-[#E5534B] p-1 border border-transparent hover:border-[#E5534B] transition-colors"
            title="Delete Game"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {game.description && (
          <p className="text-xs text-[#8B949E] line-clamp-2 mb-3">
            {game.description}
          </p>
        )}

        {game.context_prompt && (
          <div className="flex items-center gap-1 text-[10px] text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950]/40 px-2 py-0.5 mb-3 w-fit">
            <BookOpen className="w-3 h-3" />
            <span>CONTEXT ENGINE LOADED</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#30363D]">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[#0D1117] p-2 border border-[#30363D] flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-[#5865F2]" />
            <div>
              <div className="text-[9px] text-[#8B949E] uppercase">Keys</div>
              <div className="text-xs font-bold text-[#E6EDF3]">{game.totalKeys || 0}</div>
            </div>
          </div>
          <div className="bg-[#0D1117] p-2 border border-[#30363D] flex items-center gap-2">
            <Languages className="w-3.5 h-3.5 text-[#3FB950]" />
            <div>
              <div className="text-[9px] text-[#8B949E] uppercase">Locales</div>
              <div className="text-xs font-bold text-[#E6EDF3]">{game.languages?.length || 0}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSelect(game)}
          className="w-full flex items-center justify-center gap-1.5 bg-[#5865F2] hover:bg-[#4C6EF5] text-white font-bold py-1.5 px-3 border border-[#5865F2] transition-colors text-xs"
        >
          <span>OPEN WORKSPACE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
