import React, { useState } from 'react';
import { KeyTranslationItem, TranslationStatus } from '../../types/client_types.ts';
import { TranslationRowItem } from './TranslationRowItem.tsx';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.key_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.translated_text && item.translated_text.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'untranslated' && (!item.translated_text || item.status === 'untranslated')) ||
      item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search key path, source or translated text..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
          {(['all', 'untranslated', 'ai_translated', 'manual_translated', 'approved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {st === 'all'
                ? 'All'
                : st === 'untranslated'
                ? 'Untranslated'
                : st === 'ai_translated'
                ? 'AI Translated'
                : st === 'manual_translated'
                ? 'Manual'
                : 'Approved'}
            </button>
          ))}
        </div>
      </div>

      {/* Rows Container */}
      <div className="divide-y divide-slate-800">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-sm font-semibold mb-1 text-slate-300">No keys found</div>
            <div className="text-xs text-slate-500">
              {items.length === 0
                ? 'Please import a base reference JSON file to populate keys.'
                : 'Try adjusting your search query or filter selection.'}
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

      {/* Pagination Footer */}
      {filteredItems.length > ITEMS_PER_PAGE && (
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{startIndex + 1}</span> to{' '}
            <span className="font-semibold text-slate-200">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-200">{filteredItems.length}</span> keys
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono">
              Page {validPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
