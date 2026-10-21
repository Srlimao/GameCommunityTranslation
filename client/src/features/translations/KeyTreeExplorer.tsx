import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { TreeKeyItem, KeyTranslationItem } from '../../types/client_types.ts';
import { isItemTranslated } from '../../services/translation_chunk_manager.ts';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  CheckCircle2,
  ListFilter,
  ChevronsDown,
  ChevronsUp,
  Loader2,
} from 'lucide-react';

interface KeyTreeExplorerProps {
  items: (TreeKeyItem | KeyTranslationItem)[];
  selectedPrefix: string | null;
  onSelectPrefix: (prefix: string | null) => void;
  isLoadingTree?: boolean;
}

interface NamespaceNode {
  name: string;
  fullPath: string;
  count: number;
  translatedCount: number;
  subfolders: Record<string, NamespaceNode>;
}

// Memoized tree row for smooth 60fps scrolling on large tree hierarchies
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
      className={`flex items-center justify-between py-1.5 pr-2.5 transition-colors cursor-pointer border-l-2 select-none text-xs ${
        isSelected
          ? 'bg-[#5865F2]/25 text-white border-[#5865F2] font-bold'
          : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.fullPath);
            }}
            className="p-0.5 text-[#8B949E] hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {isExpanded ? (
          <FolderOpen className="w-3.5 h-3.5 text-[#5865F2] shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-[#8B949E] shrink-0" />
        )}

        <span className="truncate tracking-tight" title={node.fullPath}>
          {node.name}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-[11px]">
        {isComplete ? (
          <CheckCircle2 className="w-3 h-3 text-[#3FB950]" />
        ) : percent > 0 ? (
          <span className="text-[#3FB950] font-mono text-[10px]">{percent}%</span>
        ) : null}
        <span className="px-1.5 py-0.2 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-[10px]">
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
  isLoadingTree = false,
}) => {
  const [filterSearch, setFilterSearch] = useState('');
  const deferredSearch = useDeferredValue(filterSearch.trim().toLowerCase());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());

  // Aggregate dynamic N-level hierarchical namespaces
  const rootNode = useMemo(() => {
    const root: NamespaceNode = { name: 'root', fullPath: '', count: 0, translatedCount: 0, subfolders: {} };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      root.count++;
      const isTranslated = isItemTranslated(item);
      if (isTranslated) root.translatedCount++;

      let key = item.key_path;
      if (key.startsWith('$$$') && key.endsWith('$$')) key = key.slice(3, -2);

      // Split into path segments by standard delimiters . / :
      const parts = key.split(/[./:]/).filter(Boolean);
      if (parts.length === 0) continue;

      let current = root;
      let currentPath = '';

      // Walk up to parts.length - 1 for directory tree, or all parts if depth is small
      const limit = parts.length > 1 ? parts.length - 1 : 1;
      for (let p = 0; p < limit; p++) {
        const seg = parts[p];
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
        current = current.subfolders[seg];
        current.count++;
        if (isTranslated) current.translatedCount++;
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

  const handleExpandAll = useCallback(() => {
    const allPaths = new Set<string>();
    const collect = (node: NamespaceNode) => {
      Object.values(node.subfolders).forEach((c) => {
        allPaths.add(c.fullPath);
        collect(c);
      });
    };
    collect(rootNode);
    setExpandedPaths(allPaths);
  }, [rootNode]);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  // Recursive tree node matching for search
  const checkNodeMatches = useCallback((node: NamespaceNode, q: string): boolean => {
    if (node.name.toLowerCase().includes(q) || node.fullPath.toLowerCase().includes(q)) return true;
    return Object.values(node.subfolders).some((child) => checkNodeMatches(child, q));
  }, []);

  // Recursively render branches
  const renderTreeBranches = (node: NamespaceNode, depth = 0): React.ReactNode => {
    const childrenKeys = Object.keys(node.subfolders);
    if (childrenKeys.length === 0) return null;

    return childrenKeys.map((key) => {
      const child = node.subfolders[key];
      const isExpanded = expandedPaths.has(child.fullPath) || deferredSearch.length > 0;
      const isSelected = selectedPrefix === child.fullPath;

      if (deferredSearch && !checkNodeMatches(child, deferredSearch)) {
        return null;
      }

      return (
        <React.Fragment key={child.fullPath}>
          <TreeRow
            node={child}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggle={handleToggle}
            onSelect={onSelectPrefix}
          />
          {isExpanded && renderTreeBranches(child, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#10141D] border-r border-[#30363D] font-mono select-none">
      {/* Explorer Header */}
      <div className="p-2.5 border-b border-[#30363D] bg-[#161B22] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E6EDF3] text-xs">
          <Layers className="w-3.5 h-3.5 text-[#5865F2]" />
          <span>Tree Explorer</span>
          {isLoadingTree && <Loader2 className="w-3 h-3 animate-spin text-[#5865F2] ml-1" />}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            className="p-1 text-[#8B949E] hover:text-white transition-colors"
            title="Expand All"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-1 text-[#8B949E] hover:text-white transition-colors"
            title="Collapse All"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
          {selectedPrefix && (
            <button
              onClick={() => onSelectPrefix(null)}
              className="text-[11px] text-[#5865F2] hover:underline font-bold ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div className="p-2 border-b border-[#30363D] bg-[#0D1117]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search namespaces..."
            className="w-full bg-[#161B22] border border-[#30363D] pl-8 pr-2.5 py-1 text-xs text-[#E6EDF3] placeholder:text-[#8B949E] outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* Tree View Container */}
      <div className="flex-1 overflow-y-auto py-1 divide-y divide-[#30363D]/20">
        {/* Root 'All Keys' Node */}
        <div
          onClick={() => onSelectPrefix(null)}
          className={`flex items-center justify-between py-1.5 px-3 cursor-pointer border-l-2 transition-colors text-xs ${
            selectedPrefix === null
              ? 'bg-[#5865F2]/25 text-white border-[#5865F2] font-bold'
              : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ListFilter className="w-3.5 h-3.5 text-[#5865F2]" />
            <span className="uppercase tracking-wider">ALL KEYS</span>
          </div>
          <span className="px-1.5 py-0.2 bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-[10px]">
            {items.length}
          </span>
        </div>

        {/* Hierarchical Namespace Branches */}
        <div>{renderTreeBranches(rootNode, 0)}</div>
      </div>
    </div>
  );
};

