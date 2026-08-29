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
import { ContextWorkspaceHeader, ContextPaneType } from './ContextWorkspaceHeader.tsx';

interface ContextHubWorkspaceProps {
  game: GameSummary;
  onGameUpdated: (updated: GameSummary) => void;
  initialPane?: ContextPaneType;
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

  const [activePane, setActivePane] = useState<ContextPaneType>(initialPane);
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
      <ContextWorkspaceHeader
        name={name}
        onNameChange={setName}
        baseLanguage={baseLanguage}
        onBaseLanguageChange={setBaseLanguage}
        activePane={activePane}
        onPaneChange={setActivePane}
        loreCount={contextData.loreElements.length}
        characterCount={contextData.characters.length}
        showRawNotes={showRawNotes}
        onToggleRawNotes={() => setShowRawNotes(!showRawNotes)}
        isSaving={isSaving}
        savedSuccess={savedSuccess}
        onSave={handleSave}
      />

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
