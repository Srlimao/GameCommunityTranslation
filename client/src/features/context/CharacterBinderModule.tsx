import React, { useState } from 'react';
import { CharacterDossier, CharacterRegister } from './types.ts';
import { UserCheck, Plus, Trash2, Mic, UserPlus } from 'lucide-react';

interface CharacterBinderModuleProps {
  characters: CharacterDossier[];
  onChange: (characters: CharacterDossier[]) => void;
}

export const CharacterBinderModule: React.FC<CharacterBinderModuleProps> = ({ characters, onChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [speechPatterns, setSpeechPatterns] = useState('');
  const [register, setRegister] = useState<CharacterRegister>('neutral');
  const [sampleLine, setSampleLine] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newChar: CharacterDossier = {
      id: `char-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || 'NPC',
      speechPatterns: speechPatterns.trim() || 'Standard dialogue voice',
      register,
      sampleLines: sampleLine.trim() ? [sampleLine.trim()] : [],
    };
    onChange([...characters, newChar]);
    setName('');
    setRole('');
    setSpeechPatterns('');
    setSampleLine('');
    setIsAdding(false);
  };

  const handleUpdate = (id: string, updates: Partial<CharacterDossier>) => {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleDelete = (id: string) => {
    onChange(characters.filter((c) => c.id !== id));
  };

  const handleAddSampleLine = (id: string, line: string) => {
    if (!line.trim()) return;
    const char = characters.find((c) => c.id === id);
    if (char) {
      handleUpdate(id, { sampleLines: [...char.sampleLines, line.trim()] });
    }
  };

  const getRegisterBadge = (reg: CharacterRegister) => {
    switch (reg) {
      case 'formal':
        return 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]';
      case 'polite_honorific':
        return 'bg-[#3FB950]/20 text-[#56D364] border-[#3FB950]';
      case 'archaic':
        return 'bg-[#D29922]/20 text-[#E3B341] border-[#D29922]';
      case 'rude_slang':
        return 'bg-[#E5534B]/20 text-[#F85149] border-[#E5534B]';
      case 'casual':
        return 'bg-[#30363D] text-[#E6EDF3] border-[#30363D]';
      default:
        return 'bg-[#161B22] text-[#8B949E] border-[#30363D]';
    }
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-none flex flex-col h-full text-[#E6EDF3]">
      {/* Module Header */}
      <div className="p-3 border-b border-[#30363D] flex items-center justify-between bg-[#10141D]">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#5865F2]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
            Character Binder & Voice Dossiers ({characters.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white rounded-none border border-[#5865F2] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'CANCEL' : 'ADD CHARACTER'}</span>
        </button>
      </div>

      {/* Inline Create Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="p-3 bg-[#0D1117] border-b border-[#30363D] space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Character Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lady Katherine or Grimjaw"
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Role / Archetype</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Royal High Mage or Smuggler"
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">Speech Register</label>
              <select
                value={register}
                onChange={(e) => setRegister(e.target.value as any)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
              >
                <option value="formal">FORMAL (High Dignity)</option>
                <option value="neutral">NEUTRAL (Standard)</option>
                <option value="casual">CASUAL (Informal / Friendly)</option>
                <option value="archaic">ARCHAIC (Thou / Ye / Old)</option>
                <option value="polite_honorific">HONORIFIC (Polite / Respect)</option>
                <option value="rude_slang">RUDE / SLANG (Gritty / Low)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">
              Speech Quirks & Translation Directives
            </label>
            <input
              type="text"
              value={speechPatterns}
              onChange={(e) => setSpeechPatterns(e.target.value)}
              placeholder="e.g. Uses seafaring metaphors, speaks in short staccato bursts, never uses contractions..."
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-[#8B949E] uppercase mb-1">
              Sample Voice Line (Reference Dialogue)
            </label>
            <input
              type="text"
              value={sampleLine}
              onChange={(e) => setSampleLine(e.target.value)}
              placeholder="e.g. 'By the celestial tides, hold the perimeter!'"
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3 py-1 bg-[#3FB950] hover:bg-[#56D364] text-slate-950 font-mono font-bold text-xs rounded-none transition-colors"
            >
              SAVE CHARACTER DOSSIER
            </button>
          </div>
        </form>
      )}

      {/* Character Cards Grid */}
      <div className="flex-1 p-3 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-3">
        {characters.length === 0 ? (
          <div className="col-span-2 p-8 border border-dashed border-[#30363D] text-center text-[#8B949E] font-mono text-xs">
            No character dossiers configured yet. Add characters to ensure consistent voice and register.
          </div>
        ) : (
          characters.map((char) => (
            <div
              key={char.id}
              className="bg-[#0D1117] border border-[#30363D] p-3 rounded-none flex flex-col justify-between space-y-2 group hover:border-[#5865F2] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-mono font-bold text-sm text-[#E6EDF3] flex items-center gap-2">
                      <span>{char.name}</span>
                    </h4>
                    <p className="text-[11px] font-mono text-[#8B949E]">{char.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border uppercase ${getRegisterBadge(
                        char.register
                      )}`}
                    >
                      {char.register.replace(/_/g, ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(char.id)}
                      className="text-[#8B949E] hover:text-[#E5534B] p-1 transition-colors"
                      title="Delete Character"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#161B22] p-2 border border-[#30363D] text-[11px] font-mono text-[#8B949E]">
                  <strong className="text-[#E6EDF3]">Speech Quirks:</strong> {char.speechPatterns}
                </div>

                {char.sampleLines && char.sampleLines.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#8B949E] flex items-center gap-1">
                      <Mic className="w-3 h-3 text-[#5865F2]" />
                      <span>Sample Dialogue:</span>
                    </span>
                    {char.sampleLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] font-mono italic text-[#E6EDF3] bg-[#161B22]/60 px-2 py-1 border-l-2 border-[#5865F2]"
                      >
                        "{line}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
