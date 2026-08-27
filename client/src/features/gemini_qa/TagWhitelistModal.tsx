import React, { useState } from 'react';
import { ApiClient } from '../../services/api_client.ts';
import { Tag, RefreshCw, Plus, X, Check, Loader2, Code2 } from 'lucide-react';

interface TagWhitelistModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  initialTags?: string[];
  onTagsUpdated: (tags: string[]) => void;
}

export const TagWhitelistModal: React.FC<TagWhitelistModalProps> = ({
  gameId,
  isOpen,
  onClose,
  initialTags = [],
  onTagsUpdated,
}) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  React.useEffect(() => {
    setTags(initialTags || []);
  }, [initialTags]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      const updated = [...tags, trimmed].sort();
      setTags(updated);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleDiscoverFromBase = async () => {
    setIsScanning(true);
    setStatusMessage(null);
    try {
      const res = await ApiClient.discoverGameTags(gameId);
      setTags(res.tags);
      onTagsUpdated(res.tags);
      setStatusMessage({ text: res.message || `Discovered ${res.tags.length} unique tags from base keys!` });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to scan base keys', isError: true });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const saved = await ApiClient.updateTagWhitelist(gameId, tags);
      onTagsUpdated(saved);
      setStatusMessage({ text: 'Tag whitelist saved successfully!' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to save tag whitelist', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] max-w-lg w-full p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#F778BA]/20 border border-[#F778BA] text-[#F778BA]">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">
                Code Block & Tag Whitelist
              </h3>
              <p className="text-[11px] text-[#8B949E]">
                Valid markup tags for this game (e.g. &lt;b&gt;, &lt;/&gt;, &lt;color=...&gt;)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-2.5 text-xs border ${
              statusMessage.isError
                ? 'bg-[#E5534B]/10 border-[#E5534B] text-[#F85149]'
                : 'bg-[#238636]/10 border-[#238636] text-[#3FB950]'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Scan / Discovery Button */}
        <div className="flex items-center justify-between gap-2 bg-[#0D1117] p-2.5 border border-[#30363D]">
          <div className="text-[11px] text-[#8B949E]">
            Auto-scan all base keys to detect existing game engine tags:
          </div>
          <button
            onClick={handleDiscoverFromBase}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#1F6FEB] hover:bg-[#388BFD] text-white border border-[#1F6FEB] disabled:opacity-50 shrink-0"
          >
            {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>RE-SCAN BASE</span>
          </button>
        </div>

        {/* Add Tag Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add custom tag (e.g. <b>, </>, <rare>)"
            className="flex-1 bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
          <button
            onClick={handleAddTag}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#238636] hover:bg-[#2EA043] text-white border border-[#238636]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        </div>

        {/* Tag List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E]">
            <span>Whitelisted Tags ({tags.length})</span>
            {tags.length > 0 && (
              <button
                onClick={() => setTags([])}
                className="text-[#F85149] hover:underline text-[10px]"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="bg-[#0D1117] border border-[#30363D] p-3 max-h-48 overflow-y-auto flex flex-wrap gap-1.5 min-h-[80px]">
            {tags.length === 0 ? (
              <div className="text-center w-full py-4 text-[#8B949E] text-xs">
                No tags whitelisted yet. Click "RE-SCAN BASE" to discover tags automatically.
              </div>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-[#161B22] border border-[#F778BA]/40 text-[#F778BA] px-2 py-0.5 text-xs"
                >
                  <Tag className="w-2.5 h-2.5 text-[#F778BA]" />
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[#8B949E] hover:text-[#F85149] ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363D]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D]"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#238636] hover:bg-[#2EA043] text-white border border-[#238636] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>SAVE WHITELIST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
