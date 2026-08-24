import React, { useState } from 'react';
import { GameSummary } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { StructuredGameContext } from './types.ts';
import { ContextSerializer } from './contextSerializer.ts';
import { LoreTableModule } from './LoreTableModule.tsx';
import { CharacterBinderModule } from './CharacterBinderModule.tsx';
import { StyleGuideModule } from './StyleGuideModule.tsx';
import { ContextSynthesizerModule } from './ContextSynthesizerModule.tsx';
import { LoreAuditLogModule } from './LoreAuditLogModule.tsx';
import { AdvancedGlossaryBoardModule } from './AdvancedGlossaryBoardModule.tsx';
import {
  Sparkles,
  Save,
  CheckCircle2,
  Sliders,
  UserCheck,
  Terminal,
  Grid,
  FileText,
  Layers,
  BookOpen
} from 'lucide-react';

interface ContextHubWorkspaceProps {
  game: GameSummary;
  onGameUpdated: (updated: GameSummary) => void;
  initialPane?: 'ecosystem' | 'multi' | 'hub' | 'characters' | 'style' | 'synthesizer' | 'glossary';
}

export const ContextHubWorkspace: React.FC<ContextHubWorkspaceProps> = ({
  game,
  onGameUpdated,
  initialPane = 'ecosystem',
}) => {
  const [name, setName] = useState(game.name);
  const [baseLanguage, setBaseLanguage] = useState(game.base_language || 'en-US');
  const [contextData, setContextData] = useState<StructuredGameContext>(() =>
    ContextSerializer.parse(game.context_prompt)
  );

  const [activePane, setActivePane] = useState<'ecosystem' | 'multi' | 'hub' | 'characters' | 'style' | 'synthesizer' | 'glossary'>(initialPane);
  const [showRawNotes, setShowRawNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const serializedContext = ContextSerializer.serialize(contextData);
      const updated = await ApiClient.updateGame(game.id, {
        name,
        context_prompt: serializedContext,
        base_language: baseLanguage,
      });
      onGameUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save context configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Console Top Toolbar */}
      <div className="bg-[#161B22] border border-[#30363D] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#10141D] border border-[#30363D] px-2.5 py-1 flex items-center gap-2 text-[#E6EDF3]">
            <span className="text-[10px] text-[#8B949E] uppercase">PROJECT:</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#E6EDF3] outline-none border-b border-transparent focus:border-[#5865F2]"
            />
          </div>
          <div className="bg-[#10141D] border border-[#30363D] px-2.5 py-1 flex items-center gap-2 text-[#E6EDF3]">
            <span className="text-[10px] text-[#8B949E] uppercase">BASE LANG:</span>
            <input
              type="text"
              value={baseLanguage}
              onChange={(e) => setBaseLanguage(e.target.value)}
              className="bg-transparent text-xs text-[#56D364] font-bold w-16 outline-none border-b border-transparent focus:border-[#5865F2]"
            />
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center border border-[#30363D] bg-[#0D1117] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActivePane('ecosystem')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'ecosystem' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ECOSYSTEM (4-COL)</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('multi')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'multi' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>MULTI-PANE</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('hub')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'hub' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>LORE ({contextData.loreElements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('characters')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'characters' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>CHARACTERS ({contextData.characters.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('glossary')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'glossary' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>GLOSSARY</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('style')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'style' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>STYLE GUIDE</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePane('synthesizer')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors ${
              activePane === 'synthesizer' ? 'bg-[#5865F2] text-white' : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SYNTHESIZER</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1 text-[11px] text-[#3FB950] bg-[#3FB950]/10 border border-[#3FB950] px-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SAVED</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowRawNotes(!showRawNotes)}
            className="p-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]"
            title="Toggle Raw Notes"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5865F2] hover:bg-[#4C6EF5] text-white text-xs font-bold border border-[#5865F2] transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'SAVING...' : 'COMMIT CONTEXT'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] text-xs font-mono">
          {error}
        </div>
      )}

      {showRawNotes && (
        <div className="bg-[#161B22] border border-[#30363D] p-3 space-y-2">
          <label className="text-[10px] text-[#8B949E] uppercase font-bold">
            Supplemental Raw Context Notes (Injected into System Prompt)
          </label>
          <textarea
            rows={4}
            value={contextData.rawNotes || ''}
            onChange={(e) => setContextData({ ...contextData, rawNotes: e.target.value })}
            placeholder="Add unstructured notes, developer commentary, lore snippets..."
            className="w-full bg-[#0D1117] border border-[#30363D] p-2 text-xs text-[#E6EDF3] font-mono outline-none focus:border-[#5865F2]"
          />
        </div>
      )}

      {/* Main Workspace Area */}
      {activePane === 'ecosystem' ? (
        /* Top Diagram: 4-Column Project Contextualization Ecosystem */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Column 1: Lore Repository & Lore Audit Log */}
          <div className="space-y-3 flex flex-col">
            <LoreTableModule
              elements={contextData.loreElements}
              onChange={(loreElements) => setContextData({ ...contextData, loreElements })}
            />
            <LoreAuditLogModule elements={contextData.loreElements} />
          </div>

          {/* Column 2: Character Binder */}
          <div className="flex flex-col">
            <CharacterBinderModule
              characters={contextData.characters}
              onChange={(characters) => setContextData({ ...contextData, characters })}
            />
          </div>

          {/* Column 3: Advanced Glossary Tool & LLM Synthesizer Pipeline */}
          <div className="space-y-3 flex flex-col">
            <AdvancedGlossaryBoardModule game={game} />
            <ContextSynthesizerModule
              context={contextData}
              gameName={name}
              baseLanguage={baseLanguage}
            />
          </div>

          {/* Column 4: Style Guide Engine */}
          <div className="flex flex-col">
            <StyleGuideModule
              styleGuide={contextData.styleGuide}
              onChange={(styleGuide) => setContextData({ ...contextData, styleGuide })}
            />
          </div>
        </div>
      ) : activePane === 'multi' ? (
        /* Multi-Pane (2x2) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[640px]">
          <div className="space-y-3">
            <LoreTableModule
              elements={contextData.loreElements}
              onChange={(loreElements) => setContextData({ ...contextData, loreElements })}
            />
            <CharacterBinderModule
              characters={contextData.characters}
              onChange={(characters) => setContextData({ ...contextData, characters })}
            />
          </div>
          <div className="space-y-3">
            <StyleGuideModule
              styleGuide={contextData.styleGuide}
              onChange={(styleGuide) => setContextData({ ...contextData, styleGuide })}
            />
            <ContextSynthesizerModule
              context={contextData}
              gameName={name}
              baseLanguage={baseLanguage}
            />
          </div>
        </div>
      ) : (
        /* Single Module Focused View */
        <div className="min-h-[580px]">
          {activePane === 'hub' && (
            <LoreTableModule
              elements={contextData.loreElements}
              onChange={(loreElements) => setContextData({ ...contextData, loreElements })}
            />
          )}
          {activePane === 'characters' && (
            <CharacterBinderModule
              characters={contextData.characters}
              onChange={(characters) => setContextData({ ...contextData, characters })}
            />
          )}
          {activePane === 'glossary' && (
            <AdvancedGlossaryBoardModule game={game} />
          )}
          {activePane === 'style' && (
            <StyleGuideModule
              styleGuide={contextData.styleGuide}
              onChange={(styleGuide) => setContextData({ ...contextData, styleGuide })}
            />
          )}
          {activePane === 'synthesizer' && (
            <ContextSynthesizerModule
              context={contextData}
              gameName={name}
              baseLanguage={baseLanguage}
            />
          )}
        </div>
      )}
    </div>
  );
};
