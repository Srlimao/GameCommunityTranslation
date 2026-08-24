import React, { useState, useMemo, useCallback } from 'react';
import { KeyTranslationItem } from '../../types/client_types.ts';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface KeyTreeExplorerProps {
  items: KeyTranslationItem[];
  selectedPrefix: string | null;
  onSelectPrefix: (prefix: string | null) => void;
}

interface NamespaceNode {
  name: string;
  fullPath: string;
  count: number;
  translatedCount: number;
  subfolders: Record<string, NamespaceNode>;
}

// Memoized single tree row for high performance on large datasets
const TreeRow = React.memo<{
  node: NamespaceNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string | null) => void;
}>(({ node, depth, isExpanded, isSelected, onToggle, onSelect }) => {
  const hasChildren = Object.keys(node.subfolders).length > 0;
  const percent = node.count > 0 ? Math.round((node.translatedCount / node.count) * 100) : 0;
  const isComplete = percent === 100 && node.count > 0;

  return (
    <div
      onClick={() => onSelect(isSelected ? null : node.fullPath)}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      className={`flex items-center justify-between py-2 pr-3 transition-colors cursor-pointer border-l-2 select-none ${
        isSelected
          ? 'bg-[#5865F2]/25 text-white border-[#5865F2] font-bold'
          : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.fullPath);
            }}
            className="p-1 text-[#8B949E] hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-[#5865F2] shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-[#8B949E] shrink-0" />
        )}

        <span className="truncate text-xs sm:text-sm tracking-tight" title={node.name}>
          {node.name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 text-xs">
        {isComplete ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
        ) : percent > 0 ? (
          <span className="text-[#3FB950] font-mono text-xs">{percent}%</span>
        ) : null}
        <span className="px-2 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-xs">
          {node.count}
        </span>
      </div>
    </div>
  );
});

export const KeyTreeExplorer: React.FC<KeyTreeExplorerProps> = ({
  items,
  selectedPrefix,
  onSelectPrefix,
}) => {
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());

  // Aggregate hierarchical namespaces efficiently
  const rootNode = useMemo(() => {
    const root: NamespaceNode = {
      name: 'root',
      fullPath: '',
      count: 0,
      translatedCount: 0,
      subfolders: {},
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      root.count++;
      const isTranslated = Boolean(item.translated_text && item.status !== 'untranslated');
      if (isTranslated) root.translatedCount++;

      let cleanKey = item.key_path;
      if (cleanKey.startsWith('$$$') && cleanKey.endsWith('$$')) {
        cleanKey = cleanKey.slice(3, -2);
      }

      const segments = cleanKey.split(/[.:/]/).filter(Boolean);
      // Group by namespaces (up to 3 levels)
      const folderSegments = segments.length > 1 ? segments.slice(0, -1) : [segments[0]];

      let current = root;
      let currentPath = '';

      for (let s = 0; s < folderSegments.length; s++) {
        const seg = folderSegments[s];
        currentPath = currentPath ? `${currentPath}.${seg}` : seg;

        if (!current.subfolders[seg]) {
          current.subfolders[seg] = {
            name: seg,
            fullPath: currentPath,
            count: 0,
            translatedCount: 0,
            subfolders: {},
          };
        }

        current.subfolders[seg].count++;
        if (isTranslated) {
          current.subfolders[seg].translatedCount++;
        }

        current = current.subfolders[seg];
      }
    }

    return root;
  }, [items]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((path: string | null) => {
    onSelectPrefix(path);
  }, [onSelectPrefix]);

  // Recursively build visible nodes
  const renderTreeBranches = (node: NamespaceNode, depth = 0): React.ReactNode => {
    const childrenKeys = Object.keys(node.subfolders);
    if (childrenKeys.length === 0) return null;

    return childrenKeys.map((key) => {
      const child = node.subfolders[key];
      const isExpanded = expandedPaths.has(child.fullPath) || filterSearch.length > 0;
      const isSelected = selectedPrefix === child.fullPath;

      if (filterSearch) {
        const matchesSelf = child.name.toLowerCase().includes(filterSearch.toLowerCase());
        const matchesChild = Object.values(child.subfolders).some((c) =>
          c.fullPath.toLowerCase().includes(filterSearch.toLowerCase())
        );
        if (!matchesSelf && !matchesChild) return null;
      }

      return (
        <React.Fragment key={child.fullPath}>
          <TreeRow
            node={child}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
          {isExpanded && renderTreeBranches(child, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#10141D] border-r border-[#30363D] font-mono select-none">
      {/* Explorer Header */}
      <div className="p-3 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#E6EDF3] text-sm">
          <Layers className="w-4 h-4 text-[#5865F2]" />
          <span>Tree Explorer</span>
        </div>

        {selectedPrefix && (
          <button
            onClick={() => handleSelect(null)}
            className="text-xs text-[#5865F2] hover:underline font-bold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="p-2.5 border-b border-[#30363D] bg-[#0D1117]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search namespaces..."
            className="w-full bg-[#161B22] border border-[#30363D] pl-9 pr-3 py-1.5 text-xs sm:text-sm text-[#E6EDF3] placeholder:text-[#8B949E] outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* Tree View Container */}
      <div className="flex-1 overflow-y-auto py-1.5 divide-y divide-[#30363D]/20">
        {/* Root 'All Keys' Node */}
        <div
          onClick={() => handleSelect(null)}
          className={`flex items-center justify-between py-2 px-3.5 cursor-pointer border-l-2 transition-colors ${
            selectedPrefix === null
              ? 'bg-[#5865F2]/25 text-white border-[#5865F2] font-bold'
              : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
          }`}
        >
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-[#5865F2]" />
            <span className="text-xs sm:text-sm uppercase tracking-wider">ALL KEYS</span>
          </div>
          <span className="px-2 py-0.5 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-xs">
            {items.length}
          </span>
        </div>

        {/* Hierarchical Namespace Branches */}
        <div>
          {renderTreeBranches(rootNode, 0)}
        </div>
      </div>
    </div>
  );
};
