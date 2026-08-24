import React, { useState, useEffect } from 'react';
import { KeyTranslationItem, TranslationStatus } from '../../types/client_types.ts';
import { Sparkles, Check, CheckCheck, Loader2, MessageSquareQuote } from 'lucide-react';

interface TranslationRowItemProps {
  item: KeyTranslationItem;
  gameId: string;
  onSaveTranslation: (keyId: string, text: string, status?: TranslationStatus) => Promise<void>;
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
        await onSaveTranslation(item.key_id, translatedText, 'manual_translated');
        setHasChanged(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onSaveTranslation(item.key_id, translatedText, 'approved');
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <CheckCheck className="w-3 h-3" /> Approved
          </span>
        );
      case 'ai_translated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/80">
            <Sparkles className="w-3 h-3" /> AI
          </span>
        );
      case 'manual_translated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
            Manual
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Untranslated
          </span>
        );
    }
  };

  return (
    <div className="p-4 border-b border-slate-800 hover:bg-slate-900/60 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-800/40">
            {item.key_path}
          </span>
          {getStatusBadge()}
          {item.context_note && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/70 text-purple-300 border border-purple-800/60 font-mono">
              <MessageSquareQuote className="w-3 h-3 text-purple-400" />
              <span>{item.context_note}</span>
            </span>
          )}
          {item.model_used && (
            <span className="text-[10px] text-slate-500 font-mono">
              ({item.model_used})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTranslateClick}
            disabled={isTranslating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-lg transition-colors disabled:opacity-50"
            title="Translate this key using LM Studio"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Translate (LM Studio)</span>
              </>
            )}
          </button>

          {item.status !== 'approved' && translatedText.trim() && (
            <button
              onClick={handleApprove}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-lg transition-colors"
              title="Mark as approved"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        {/* Source Text Box */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-sm text-slate-300 select-text leading-relaxed font-sans">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
            Reference (Source)
          </div>
          <div className="whitespace-pre-wrap">{item.source_text}</div>
        </div>

        {/* Target Translation Box */}
        <div className="relative">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center justify-between">
            <span>Translation ({item.language_code})</span>
            {hasChanged && <span className="text-amber-400 font-normal">Unsaved changes (auto-saves on blur)</span>}
          </div>
          <textarea
            rows={2}
            value={translatedText}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder="Enter translation..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-100 focus:outline-none transition-colors font-sans leading-relaxed resize-y"
          />
        </div>
      </div>
    </div>
  );
};
