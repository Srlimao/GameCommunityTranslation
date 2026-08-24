import React from 'react';
import { StyleGuideRules } from './types.ts';
import { Sliders, BookOpen, AlertCircle } from 'lucide-react';

interface StyleGuideModuleProps {
  styleGuide: StyleGuideRules;
  onChange: (styleGuide: StyleGuideRules) => void;
}

export const StyleGuideModule: React.FC<StyleGuideModuleProps> = ({ styleGuide, onChange }) => {
  const handleChange = (field: keyof StyleGuideRules, value: any) => {
    onChange({
      ...styleGuide,
      [field]: value,
    });
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-none flex flex-col h-full text-[#E6EDF3]">
      {/* Header */}
      <div className="p-3 border-b border-[#30363D] flex items-center justify-between bg-[#10141D]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#5865F2]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
            Style Guide Engine & Localization Matrices
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#3FB950] bg-[#3FB950]/10 px-2 py-0.5 border border-[#3FB950]/40">
          RULES ACTIVE
        </span>
      </div>

      <div className="p-4 overflow-auto space-y-4 font-mono text-xs">
        {/* Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Grammatical Gender Rules */}
          <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#E6EDF3] uppercase flex items-center gap-1.5">
                <span>1. Grammatical Gender Policy</span>
              </label>
              <span className="text-[9px] text-[#8B949E]">Pronoun/Agreement Matrix</span>
            </div>
            <select
              value={styleGuide.grammaticalGender}
              onChange={(e) => handleChange('grammaticalGender', e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            >
              <option value="neutral_default">Gender-Neutral Default (Avoid male-bias assumption)</option>
              <option value="player_selected_tag">Use Dynamic Tags (e.g. {`{player_gender}`} or slash forms)</option>
              <option value="target_agreed">Grammatical Agreement by Target Language Rules</option>
              <option value="custom">Custom Specified Rules</option>
            </select>
            <input
              type="text"
              value={styleGuide.genderNote || ''}
              onChange={(e) => handleChange('genderNote', e.target.value)}
              placeholder="Specific gender instructions (e.g. use @, x, or epicene phrasing in Spanish)..."
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none px-2 py-1.5 text-[11px] text-[#8B949E] focus:text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
          </div>

          {/* 2. Punctuation Localization */}
          <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#E6EDF3] uppercase flex items-center gap-1.5">
                <span>2. Punctuation & Quotes Convention</span>
              </label>
              <span className="text-[9px] text-[#8B949E]">Locale Quotation Rules</span>
            </div>
            <select
              value={styleGuide.punctuationConvention}
              onChange={(e) => handleChange('punctuationConvention', e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            >
              <option value="standard">Standard Western Quotes ("...", '...')</option>
              <option value="guillemets">Guillemets for European (French/Spanish/Russian «...»)</option>
              <option value="corner_brackets">Asian Corner Brackets (CJK 「...」, 『...』)</option>
              <option value="spanish_inverted">Enforce Inverted Spanish Marks (¿...?, ¡...!)</option>
              <option value="custom">Custom Formatting Matrix</option>
            </select>
            <p className="text-[10px] text-[#8B949E]">
              Dictates quote replacement, ellipsis styling (... vs …), and language-specific question punctuation.
            </p>
          </div>

          {/* 3. Honorifics Policy */}
          <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#E6EDF3] uppercase flex items-center gap-1.5">
                <span>3. Honorifics & Formality Policy</span>
              </label>
              <span className="text-[9px] text-[#8B949E]">T-V & Suffix Protocol</span>
            </div>
            <select
              value={styleGuide.honorificsPolicy}
              onChange={(e) => handleChange('honorificsPolicy', e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            >
              <option value="preserve_original">Preserve Original Suffixes (-san, -sama, Lord, Dame)</option>
              <option value="westernize">Westernize to Equivalent Titles (Mr./Ms./Sir/Lady)</option>
              <option value="omit_unless_royal">Omit Casual Suffixes, Retain Royal & Military Only</option>
              <option value="custom">Custom Formality Suffix Rules</option>
            </select>
            <p className="text-[10px] text-[#8B949E]">
              Controls address forms, German 'Du' vs 'Sie', French 'Tu' vs 'Vous', and Japanese suffixes.
            </p>
          </div>

          {/* 4. UI Length Constraints */}
          <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#E6EDF3] uppercase flex items-center gap-1.5">
                <span>4. UI Expansion & Length Constraints</span>
              </label>
              <span className="text-[9px] text-[#8B949E]">Layout Overflow Protection</span>
            </div>
            <select
              value={styleGuide.uiLengthConstraint}
              onChange={(e) => handleChange('uiLengthConstraint', e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none"
            >
              <option value="approximate_expansion_30">Buffer +30% Length (German/Russian/French Expansion)</option>
              <option value="strict_character_limit">Strict Character Limit (Keep &le; Source Length)</option>
              <option value="unconstrained">Unconstrained (Full narrative freedom)</option>
            </select>
            <p className="text-[10px] text-[#8B949E]">
              Signals to LLM to keep translations concise for buttons, HUD items, and quest dialog boxes.
            </p>
          </div>
        </div>

        {/* Custom Locale Rules & Directives */}
        <div className="bg-[#0D1117] border border-[#30363D] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-[#E6EDF3] uppercase flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Custom Locale Rules & Injection Directives</span>
            </label>
            <span className="text-[10px] text-[#8B949E] font-mono">
              {styleGuide.customLocaleRules.length} chars
            </span>
          </div>
          <textarea
            rows={3}
            value={styleGuide.customLocaleRules}
            onChange={(e) => handleChange('customLocaleRules', e.target.value)}
            placeholder="Add custom locale constraints, e.g. 'Never translate weapon titles containing Starforge; use inverted punctuation in Spanish; keep placeholders %s verbatim'..."
            className="w-full bg-[#161B22] border border-[#30363D] rounded-none p-2.5 text-xs text-[#E6EDF3] font-mono focus:border-[#5865F2] outline-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
