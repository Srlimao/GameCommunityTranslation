import React, { useState, useMemo } from 'react';
import { KeyTranslationItem, TranslationStatus } from '../../types/client_types.ts';
import { TranslationRowItem } from './TranslationRowItem.tsx';
import { KeyTreeExplorer } from './KeyTreeExplorer.tsx';
import { Search, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface TranslationTableProps {
  items: KeyTranslationItem[];
  gameId: string;
  onSaveTranslation: (keyId: string, text: string, status?: TranslationStatus) => Promise<void>;
  onTranslateSingle: (item: KeyTranslationItem) => Promise<string>;
}

const ITEMS_PER_PAGE = 30;

export const TranslationTable: React.FC<TranslationTableProps> = ({
  items,
  gameId,
  onSaveTranslation,
  onTranslateSingle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TranslationStatus>('all');
  const [selectedTreePrefix, setSelectedTreePrefix] = useState<string | null>(null);
  const [showTreeExplorer, setShowTreeExplorer] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter items by search, status, and tree explorer prefix
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tree prefix filter
      if (selectedTreePrefix) {
        let cleanKey = item.key_path;
        if (cleanKey.startsWith('$$$') && cleanKey.endsWith('$$')) {
          cleanKey = cleanKey.slice(3, -2);
        }
        if (!cleanKey.toLowerCase().startsWith(selectedTreePrefix.toLowerCase())) {
          return false;
        }
      }

      // Search filter
      const matchesSearch =
        searchTerm === '' ||
        item.key_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.source_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.translated_text && item.translated_text.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'untranslated' && (!item.translated_text || item.status === 'untranslated')) ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter, selectedTreePrefix]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-[#161B22] border border-[#30363D] font-mono flex flex-col min-h-[600px]">
      {/* Top Controls Bar */}
      <div className="p-3.5 border-b border-[#30363D] bg-[#10141D] flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Tree Explorer Toggle */}
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
            <span className="hidden sm:inline">{showTreeExplorer ? 'Tree' : 'Tree'}</span>
          </button>

          {/* Search Input */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter keys, source, or target text..."
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
              items={items}
              selectedPrefix={selectedTreePrefix}
              onSelectPrefix={(prefix) => {
                setSelectedTreePrefix(prefix);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {/* Rows Container */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#30363D] bg-[#0D1117]/50">
          {paginatedItems.length === 0 ? (
            <div className="p-12 text-center text-[#8B949E]">
              <div className="text-sm font-bold mb-1.5 text-[#E6EDF3]">NO LOCALIZATION KEYS FOUND</div>
              <div className="text-xs text-[#8B949E]">
                {items.length === 0
                  ? 'Import a base reference JSON file to load game keys.'
                  : selectedTreePrefix
                  ? `No keys found matching prefix "${selectedTreePrefix}". Try clearing tree filter.`
                  : 'Adjust search query or filter selection.'}
              </div>
            </div>
          ) : (
            paginatedItems.map((item) => (
              <TranslationRowItem
                key={item.key_id}
                item={item}
                gameId={gameId}
                onSaveTranslation={onSaveTranslation}
                onTranslateSingle={onTranslateSingle}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {filteredItems.length > ITEMS_PER_PAGE && (
        <div className="p-3 bg-[#10141D] border-t border-[#30363D] flex items-center justify-between text-xs text-[#8B949E]">
          <div>
            Showing <strong className="text-[#E6EDF3]">{startIndex + 1}</strong> to{' '}
            <strong className="text-[#E6EDF3]">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)}
            </strong>{' '}
            of <strong className="text-[#E6EDF3]">{filteredItems.length}</strong> keys
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              className="p-1.5 border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              Page {validPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
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
