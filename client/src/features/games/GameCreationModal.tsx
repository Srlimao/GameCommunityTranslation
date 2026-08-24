import React, { useState } from 'react';
import { X, Sparkles, PlusCircle } from 'lucide-react';
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
    'This is a fantasy adventure RPG game set in a mystical realm. Tone is epic, mysterious, and slightly humorous. Characters include knights, wizards, and magical creatures. Magic spells, town names, and weapon names should sound ancient and atmospheric.'
  );
  const [initialJson, setInitialJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Game name is required');
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

      // If initial JSON was provided, import it now
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-100">Add New Game Project</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Game Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chrono Odyssey, Pal Arena"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Base Language
              </label>
              <input
                type="text"
                value={baseLanguage}
                onChange={(e) => setBaseLanguage(e.target.value)}
                placeholder="e.g. en-US"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Short Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the game project..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Big Context & Lore Prompt (Sent to LM Studio & Gemini)</span>
              </label>
            </div>
            <textarea
              rows={4}
              value={contextPrompt}
              onChange={(e) => setContextPrompt(e.target.value)}
              placeholder="Explain the world lore, character voice, tone (e.g. dark fantasy, sci-fi cyberpunk, comedic), setting, and special localization rules..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
            />
            <p className="text-xs text-slate-500 mt-1">
              This context is automatically injected into every translation request to provide the LLM with full context of your game.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Base Translation JSON (Optional - can also import later)
            </label>
            <textarea
              rows={3}
              value={initialJson}
              onChange={(e) => setInitialJson(e.target.value)}
              placeholder='{ "menu": { "play": "Start Game", "options": "Settings" } }'
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {isLoading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
