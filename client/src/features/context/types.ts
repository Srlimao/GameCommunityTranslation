export type ImportanceWeight = 'low' | 'medium' | 'high' | 'critical';

export type InjectionTarget = 'system_prompt' | 'pre_context' | 'user_task';

export interface LoreElement {
  id: string;
  category: 'World' | 'Faction' | 'Magic/Tech' | 'History' | 'Terminology' | 'Custom';
  concept: string;
  description: string;
  importance: ImportanceWeight;
  target: InjectionTarget;
}

export type CharacterRegister = 'formal' | 'neutral' | 'casual' | 'archaic' | 'polite_honorific' | 'rude_slang';

export interface CharacterDossier {
  id: string;
  name: string;
  role: string;
  speechPatterns: string;
  register: CharacterRegister;
  sampleLines: string[];
}

export interface StyleGuideRules {
  grammaticalGender: 'neutral_default' | 'player_selected_tag' | 'target_agreed' | 'custom';
  genderNote?: string;
  punctuationConvention: 'standard' | 'guillemets' | 'corner_brackets' | 'spanish_inverted' | 'custom';
  honorificsPolicy: 'preserve_original' | 'westernize' | 'omit_unless_royal' | 'custom';
  uiLengthConstraint: 'strict_character_limit' | 'approximate_expansion_30' | 'unconstrained';
  customLocaleRules: string;
}

export interface StructuredGameContext {
  loreElements: LoreElement[];
  characters: CharacterDossier[];
  styleGuide: StyleGuideRules;
  rawNotes?: string;
}
