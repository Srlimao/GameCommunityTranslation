import React, { useState, useEffect, useCallback, useDeferredValue } from 'react';
import { KeyTranslationItem, TreeKeyItem, TranslationStatus } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';
import { TranslationRowItem } from './TranslationRowItem.tsx';
import { KeyTreeExplorer } from './KeyTreeExplorer.tsx';
import { Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';

interface TranslationTableProps {
  gameId: string;
  languageCode: string;
  totalKeys?: number;
  onSaveTranslation: (keyId: string, text: string, status?: TranslationStatus, orderIndex?: number) => Promise<void>;
  onTranslateSingle: (item: KeyTranslationItem) => Promise<string>;
}

const PAGE_SIZE_OPTIONS = [30, 50, 100, 200];

export const TranslationTable: React.FC<TranslationTableProps> = ({
  gameId,
  languageCode,
  totalKeys,
  onSaveTranslation,
  onTranslateSingle,
}) => {
  const [pageItems, setPageItems] = useState<KeyTranslationItem[]>([]);
  const [treeItems, setTreeItems] = useState<TreeKeyItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [totalCount, setTotalCount] = useState(totalKeys || 0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<'all' | TranslationStatus>('all');
  const [selectedTreePrefix, setSelectedTreePrefix] = useState<string | null>(null);
  const [showTreeExplorer, setShowTreeExplorer] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Load complete lightweight key tree across the entire dataset
  const loadTree = useCallback(async () => {
    if (!gameId || !languageCode) return;
    setIsLoadingTree(true);
    try {
      const items = await ApiClient.getTreeItems(gameId, languageCode);
      setTreeItems(items);
    } catch (err) {
      console.error('Failed to load tree items:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [gameId, languageCode]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Load top-50 (or paginated slice) for the active selected prefix / filters
  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getPaginatedTranslations({
        gameId,
        langCode: languageCode,
        page: currentPage,
        pageSize,
        status: statusFilter,
        search: deferredSearch,
        prefix: selectedTreePrefix,
      });
      setPageItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to load translations page:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, languageCode, currentPage, pageSize, statusFilter, deferredSearch, selectedTreePrefix]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleSave = async (keyId: string, text: string, status?: TranslationStatus, orderIndex?: number) => {
    const finalStatus = status || (text.trim() ? 'manual_translated' : 'untranslated');
    // Instant optimistic update of visible page items (<1ms)
    setPageItems((prev) =>
      prev.map((it) => (it.key_id === keyId ? { ...it, translated_text: text, status: finalStatus } : it))
    );
    // Instant optimistic update of tree items state so tree percentages update immediately
    setTreeItems((prev) =>
      prev.map((it) => (it.key_id === keyId || it.key_path === keyId ? { ...it, translated_text: text, status: finalStatus } : it))
    );
    await onSaveTranslation(keyId, text, finalStatus, orderIndex);
  };

  const handleSingle = async (item: KeyTranslationItem) => {
    const res = await onTranslateSingle(item);
    setPageItems((prev) =>
      prev.map((it) => (it.key_id === item.key_id ? { ...it, translated_text: res, status: 'ai_translated' } : it))
    );
    setTreeItems((prev) =>
      prev.map((it) => (it.key_id === item.key_id ? { ...it, translated_text: res, status: 'ai_translated' } : it))
    );
    return res;
  };

  const startIndex = (currentPage - 1) * pageSize;

  return (
    <div className="bg-[#161B22] border border-[#30363D] font-mono flex flex-col min-h-[600px]">
      {/* Top Controls Bar */}
      <div className="p-3.5 border-b border-[#30363D] bg-[#10141D] flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowTreeExplorer(!showTreeExplorer)}
            className={`p-2 border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              showTreeExplorer
                ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]'
                : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
            title={showTreeExplorer ? 'Hide Tree Explorer' : 'Show Tree Explorer'}
          >
            {showTreeExplorer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">Tree</span>
          </button>

          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter keys, source, or target..."
              className="w-full bg-[#0D1117] border border-[#30363D] pl-9 pr-3 py-1.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] outline-none focus:border-[#5865F2]"
            />
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'untranslated', 'ai_translated', 'manual_translated', 'approved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap border transition-colors ${
                statusFilter === st
                  ? 'bg-[#5865F2] text-white border-[#5865F2]'
                  : 'bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] border-[#30363D]'
              }`}
            >
              {st === 'all'
                ? 'ALL'
                : st === 'untranslated'
                ? 'UNTRANSLATED'
                : st === 'ai_translated'
                ? 'AI TRANSLATED'
                : st === 'manual_translated'
                ? 'MANUAL'
                : 'APPROVED'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Body: Tree Explorer (Left) + Translation Rows (Right) */}
      <div className="flex-1 flex overflow-hidden min-h-[500px]">
        {showTreeExplorer && (
          <div className="w-64 sm:w-72 shrink-0 border-r border-[#30363D] overflow-y-auto">
            <KeyTreeExplorer
              items={treeItems}
              selectedPrefix={selectedTreePrefix}
              isLoadingTree={isLoadingTree}
              onSelectPrefix={(prefix) => {
                setSelectedTreePrefix(prefix);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {/* Rows Container (Top 50 from selected tree node) */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#30363D] bg-[#0D1117]/50 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-[#0D1117]/40 backdrop-blur-[1px] flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#5865F2]" />
            </div>
          )}

          {pageItems.length === 0 && !isLoading ? (
            <div className="p-12 text-center text-[#8B949E]">
              <div className="text-sm font-bold mb-1.5 text-[#E6EDF3]">NO LOCALIZATION KEYS FOUND</div>
              <div className="text-xs text-[#8B949E]">
                {totalCount === 0
                  ? 'Import a base reference JSON file to load game keys.'
                  : selectedTreePrefix
                  ? `No keys found matching prefix "${selectedTreePrefix}". Try clearing tree filter.`
                  : 'Adjust search query or filter selection.'}
              </div>
            </div>
          ) : (
            pageItems.map((item) => (
              <TranslationRowItem
                key={item.key_id}
                item={item}
                gameId={gameId}
                onSaveTranslation={handleSave}
                onTranslateSingle={handleSingle}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {totalCount > 0 && (
        <div className="p-3 bg-[#10141D] border-t border-[#30363D] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B949E]">
          <div className="flex items-center gap-3">
            <div>
              Showing <strong className="text-[#E6EDF3]">{startIndex + 1}</strong>–
              <strong className="text-[#E6EDF3]">{Math.min(startIndex + pageSize, totalCount)}</strong> of{' '}
              <strong className="text-[#E6EDF3]">{totalCount}</strong> keys
              {selectedTreePrefix && (
                <span className="ml-1.5 text-[#5865F2] font-semibold">
                  (branch: {selectedTreePrefix})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#8B949E]">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0D1117] border border-[#30363D] text-[#E6EDF3] px-1.5 py-0.5 text-xs outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

