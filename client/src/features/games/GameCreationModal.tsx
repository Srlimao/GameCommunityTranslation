import React, { useState } from 'react';
import { X, Sparkles, PlusCircle, Terminal } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';
import { GameSummary } from '../../types/client_types.ts';

interface GameCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: (game: GameSummary) => void;
}

export const GameCreationModal: React.FC<GameCreationModalProps> = ({ isOpen, onClose, onGameCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseLanguage, setBaseLanguage] = useState('en-US');
  const [contextPrompt, setContextPrompt] = useState(
    'This is a fantasy adventure RPG game set in a mystical realm. Tone is epic, mysterious, and slightly humorous. Characters include knights, wizards, and magical creatures.'
  );
  const [initialJson, setInitialJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Game title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const created = await ApiClient.createGame({
        name: name.trim(),
        description: description.trim(),
        context_prompt: contextPrompt.trim(),
        base_language: baseLanguage.trim(),
      });

      if (initialJson.trim()) {
        try {
          await ApiClient.importBaseJson(created.id, initialJson);
        } catch (jsonErr: any) {
          console.warn('Game created, but initial JSON import failed:', jsonErr);
        }
      }

      const refreshed = await ApiClient.getGame(created.id);
      onGameCreated(refreshed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-2xl overflow-hidden shadow-none my-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
              Add New Game Project
            </h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Game Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chrono Odyssey, Pal Arena"
                required
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Base Language
              </label>
              <input
                type="text"
                value={baseLanguage}
                onChange={(e) => setBaseLanguage(e.target.value)}
                placeholder="e.g. en-US"
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#3FB950] font-bold outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the game project..."
              className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-2 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5865F2]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Initial Context & World Lore</span>
              </label>
            </div>
            <textarea
              rows={3}
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              placeholder="Explain the world lore, character voice, tone, setting, and special localization rules..."
              className="w-full bg-[#0D1117] border border-[#30363D] p-2.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Initial Base Translation JSON (Optional)
            </label>
            <textarea
              rows={3}
              value={initialJson}
              onChange={(e) => setInitialJson(e.target.value)}
              placeholder='{ "menu": { "play": "Start Game", "options": "Settings" } }'
              className="w-full bg-[#0D1117] border border-[#30363D] p-2.5 text-xs text-[#8B949E] focus:text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
