import React, { useState, useEffect } from 'react';
import { KeyTranslationItem, TranslationStatus } from '../../types/client_types.ts';
import { Sparkles, Check, CheckCheck, Loader2, MessageSquareQuote } from 'lucide-react';

interface TranslationRowItemProps {
  item: KeyTranslationItem;
  gameId: string;
  onSaveTranslation: (keyId: string, text: string, status?: TranslationStatus, orderIndex?: number) => Promise<void>;
  onTranslateSingle: (item: KeyTranslationItem) => Promise<string>;
}

export const TranslationRowItem: React.FC<TranslationRowItemProps> = ({
  item,
  onSaveTranslation,
  onTranslateSingle,
}) => {
  const [translatedText, setTranslatedText] = useState(item.translated_text || '');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    setTranslatedText(item.translated_text || '');
    setHasChanged(false);
  }, [item.translated_text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranslatedText(e.target.value);
    setHasChanged(true);
  };

  const handleBlur = async () => {
    if (hasChanged) {
      setIsSaving(true);
      try {
        await onSaveTranslation(item.key_id, translatedText, 'manual_translated', item.order_index);
        setHasChanged(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onSaveTranslation(item.key_id, translatedText, 'approved', item.order_index);
      setHasChanged(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslateClick = async () => {
    setIsTranslating(true);
    try {
      const result = await onTranslateSingle(item);
      setTranslatedText(result);
      setHasChanged(false);
    } catch (err: any) {
      alert(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold font-mono bg-[#3FB950]/20 text-[#56D364] border border-[#3FB950]">
            <CheckCheck className="w-3.5 h-3.5" /> APPROVED
          </span>
        );
      case 'ai_translated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold font-mono bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]">
            <Sparkles className="w-3.5 h-3.5" /> AI
          </span>
        );
      case 'manual_translated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold font-mono bg-[#56D364]/10 text-[#56D364] border border-[#3FB950]/40">
            MANUAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono bg-[#30363D]/40 text-[#8B949E] border border-[#30363D]">
            UNTRANSLATED
          </span>
        );
    }
  };

  return (
    <div className="p-4 border-b border-[#30363D] hover:bg-[#10141D] transition-colors font-mono">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 flex-wrap text-sm">
          <span className="text-sm font-bold text-[#5865F2] bg-[#0D1117] px-2.5 py-1 border border-[#30363D]">
            {item.key_path}
          </span>
          {getStatusBadge()}
          {item.context_note && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs bg-[#0D1117] text-[#8B949E] border border-[#30363D]">
              <MessageSquareQuote className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>{item.context_note}</span>
            </span>
          )}
          {item.model_used && (
            <span className="text-xs text-[#8B949E]">
              ({item.model_used})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTranslateClick}
            disabled={isTranslating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-[#5865F2] border border-[#5865F2] transition-colors disabled:opacity-50"
            title="Translate this key"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>TRANSLATING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI TRANSLATE</span>
              </>
            )}
          </button>

          {item.status !== 'approved' && translatedText.trim() && (
            <button
              onClick={handleApprove}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#3FB950]/20 hover:bg-[#3FB950]/30 text-[#56D364] border border-[#3FB950] transition-colors"
              title="Mark as approved"
            >
              <Check className="w-3.5 h-3.5" />
              <span>APPROVE</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        {/* Source Text Box */}
        <div className="bg-[#0D1117] p-3.5 border border-[#30363D] text-sm text-[#E6EDF3] select-text leading-relaxed">
          <div className="text-xs uppercase font-bold text-[#8B949E] tracking-wider mb-1.5">
            SOURCE ({item.source_text?.length || 0} chars)
          </div>
          <div className="whitespace-pre-wrap min-h-[50px]">{item.source_text}</div>
        </div>

        {/* Target Translation Box */}
        <div className="relative">
          <div className="text-xs uppercase font-bold text-[#8B949E] tracking-wider mb-1.5 flex items-center justify-between">
            <span>TARGET ({item.language_code})</span>
            {hasChanged && <span className="text-[#E5534B] font-normal text-xs">UNSAVED (Auto-saves on blur)</span>}
          </div>
          <textarea
            rows={3}
            value={translatedText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Enter translation..."
            className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#5865F2] p-3.5 text-sm text-[#E6EDF3] outline-none transition-colors leading-relaxed resize-y min-h-[76px]"
          />
        </div>
      </div>
    </div>
  );
};
