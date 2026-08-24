import React from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { Gamepad2, Languages, KeyRound, ArrowRight, Trash2, BookOpen } from 'lucide-react';

interface GameListCardProps {
  game: GameSummary;
  onSelect: (game: GameSummary) => void;
  onDelete: (gameId: string) => void;
}

export const GameListCard: React.FC<GameListCardProps> = ({ game, onSelect, onDelete }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between group shadow-lg shadow-black/20">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100 group-hover:text-indigo-400 transition-colors">
                {game.name}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Base: {game.base_language}
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
            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
            title="Delete Game"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {game.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-4">
            {game.description}
          </p>
        )}

        {game.context_prompt && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-md mb-4 w-fit">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Big Context Configured</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs text-slate-400">Total Keys</div>
              <div className="text-sm font-semibold text-slate-200">{game.totalKeys || 0}</div>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <Languages className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs text-slate-400">Languages</div>
              <div className="text-sm font-semibold text-slate-200">{game.languages?.length || 0}</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSelect(game)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm shadow-md shadow-indigo-600/20"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
