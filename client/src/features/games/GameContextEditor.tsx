import React, { useState } from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { Sparkles, Save, CheckCircle2 } from 'lucide-react';

interface GameContextEditorProps {
  game: GameSummary;
  onGameUpdated: (updated: GameSummary) => void;
}

export const GameContextEditor: React.FC<GameContextEditorProps> = ({ game, onGameUpdated }) => {
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description || '');
  const [contextPrompt, setContextPrompt] = useState(game.context_prompt || '');
  const [baseLanguage, setBaseLanguage] = useState(game.base_language || 'en-US');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updated = await ApiClient.updateGame(game.id, {
        name,
        description,
        context_prompt: contextPrompt,
        base_language: baseLanguage,
      });
      onGameUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Game Information & Big Context</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure the rich background lore, character tones, and rules sent to the LLM.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved successfully!</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Game Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Base Reference Language
            </label>
            <input
              type="text"
              value={baseLanguage}
              onChange={(e) => setBaseLanguage(e.target.value)}
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
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span>Big Context (Game Lore, World Tone, Character Personas & Rules)</span>
            </label>
            <span className="text-xs text-slate-500">{contextPrompt.length} characters</span>
          </div>
          <textarea
            rows={10}
            value={contextPrompt}
            onChange={(e) => setContextPrompt(e.target.value)}
            placeholder="Describe the game setting, tone of voice, faction names, character personalities, formatting requirements (e.g. keep {0} placeholders intact), and stylistic guidelines..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-sans leading-relaxed"
          />
          <div className="mt-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            💡 <strong className="text-slate-300">Pro-Tip for Game Translators:</strong> Include information about character relationships (e.g. formal vs informal pronouns in Spanish/Japanese/German), dialect quirks, inventory item naming patterns, and UI length limits.
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Context & Lore'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
