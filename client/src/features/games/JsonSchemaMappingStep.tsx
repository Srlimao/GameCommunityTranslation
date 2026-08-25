import React from 'react';
import { JsonAnalysisResult, JsonSchemaConfig } from '../../types/client_types.ts';
import { Layers, Key, FileText, MessageSquareQuote, FolderTree } from 'lucide-react';

interface JsonSchemaMappingStepProps {
  analysis: JsonAnalysisResult;
  schemaConfig: JsonSchemaConfig;
  onChangeSchema: (newSchema: JsonSchemaConfig) => void;
  onSelectRootPath?: (path: string) => void;
}

export const JsonSchemaMappingStep: React.FC<JsonSchemaMappingStepProps> = ({
  analysis,
  schemaConfig,
  onChangeSchema,
  onSelectRootPath,
}) => {
  const isArrayOrRecord = schemaConfig.mode === 'array_of_objects' || schemaConfig.mode === 'record_map';

  const handleModeChange = (newMode: JsonSchemaConfig['mode']) => {
    onChangeSchema({
      ...schemaConfig,
      mode: newMode,
      textFields: newMode === 'nested_tree' ? [] : (schemaConfig.textFields.length > 0 ? schemaConfig.textFields : analysis.suggestedTextFields),
    });
  };

  const handleToggleTextField = (fieldName: string) => {
    let current = [...schemaConfig.textFields];
    if (current.includes(fieldName)) {
      if (current.length > 1) {
        current = current.filter((f) => f !== fieldName);
      }
    } else {
      current.push(fieldName);
    }
    onChangeSchema({ ...schemaConfig, textFields: current });
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Mode & Root Selector Bar */}
      <div className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#161B22] text-[#5865F2] flex items-center justify-center border border-[#30363D]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">
                Import Structure Mode
              </div>
              <div className="text-xs font-bold text-[#E6EDF3]">
                {analysis.totalItemsCount.toLocaleString()} items found
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={schemaConfig.mode}
              onChange={(e) => handleModeChange(e.target.value as any)}
              className="w-full bg-[#161B22] border border-[#5865F2] px-2.5 py-1 text-xs font-bold text-[#E6EDF3] outline-none"
            >
              <option value="array_of_objects">Array / List of Records</option>
              <option value="grouped_dictionary">Grouped String Tables / Multi-Table Map</option>
              <option value="dictionary_kv">Dictionary / Key-Value Map</option>
              <option value="nested_tree">Standard Nested Tree</option>
            </select>
          </div>
        </div>

        {/* If Array/Object is wrapped */}
        {analysis.detectedListPaths && analysis.detectedListPaths.length > 0 && schemaConfig.mode === 'array_of_objects' && (
          <div className="pt-2 border-t border-[#30363D] flex items-center justify-between gap-2 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 text-[10px] text-[#8B949E] uppercase font-bold">
              <FolderTree className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Target List Property:</span>
            </label>
            <select
              value={schemaConfig.rootPath || analysis.selectedListPath || ''}
              onChange={(e) => {
                const path = e.target.value;
                if (onSelectRootPath) onSelectRootPath(path);
                onChangeSchema({ ...schemaConfig, rootPath: path || undefined });
              }}
              className="bg-[#161B22] border border-[#30363D] px-2 py-0.5 text-xs text-[#E6EDF3] outline-none"
            >
              {analysis.detectedListPaths.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.path} ({p.count.toLocaleString()} items)
                </option>
              ))}
              <option value="">(Root level)</option>
            </select>
          </div>
        )}
      </div>

      {isArrayOrRecord ? (
        <div className="space-y-3 bg-[#0D1117] p-3 border border-[#30363D]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Key / ID Field Selector */}
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                <Key className="w-3 h-3 text-[#5865F2]" />
                <span>1. Identifier / Key Attribute *</span>
              </label>
              <select
                value={schemaConfig.keyField || analysis.suggestedKeyField || '_index'}
                onChange={(e) => onChangeSchema({ ...schemaConfig, keyField: e.target.value })}
                className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              >
                {analysis.availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f} {f === analysis.suggestedKeyField ? '(Recommended Key)' : ''}
                  </option>
                ))}
                <option value="_index">Auto Index ([0], [1]...)</option>
              </select>
            </div>

            {/* Context / Speaker Field Selector */}
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                <MessageSquareQuote className="w-3 h-3 text-[#3FB950]" />
                <span>3. Context / Speaker (Optional)</span>
              </label>
              <select
                value={schemaConfig.contextField || ''}
                onChange={(e) => onChangeSchema({ ...schemaConfig, contextField: e.target.value || undefined })}
                className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              >
                <option value="">None (No extra note)</option>
                {analysis.availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f} {f === analysis.suggestedContextField ? '(Auto Context)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Translatable Text Fields Selector */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1.5">
              <FileText className="w-3 h-3 text-[#3FB950]" />
              <span>2. Translatable Text Attribute(s) *</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {analysis.availableFields.map((field) => {
                const isSelected = schemaConfig.textFields.includes(field);
                const isKey = schemaConfig.keyField === field;

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleToggleTextField(field)}
                    disabled={isKey}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-[#3FB950] text-slate-950 border-[#3FB950]'
                        : isKey
                        ? 'bg-[#161B22] text-[#8B949E] border-[#30363D] opacity-40 cursor-not-allowed'
                        : 'bg-[#161B22] text-[#E6EDF3] border-[#30363D] hover:border-[#5865F2]'
                    }`}
                  >
                    <span>{field}</span>
                    {isSelected && <span className="text-[9px] bg-black/30 text-white px-1">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : schemaConfig.mode === 'grouped_dictionary' ? (
        <div className="bg-[#0D1117] p-3 border border-[#30363D] text-xs text-[#8B949E] space-y-1">
          <div className="text-[#E6EDF3] font-bold">Grouped String Tables / Multi-Table Map</div>
          <div>Top-level keys represent tables/files (e.g. <span className="text-[#5865F2]">.uasset</span> localization tables) containing key-value translation dictionaries. Table names will automatically be provided as context notes.</div>
        </div>
      ) : schemaConfig.mode === 'dictionary_kv' ? (
        <div className="bg-[#0D1117] p-3 border border-[#30363D] text-xs text-[#8B949E]">
          Dictionary Mode: Top-level keys map directly to translation string values.
        </div>
      ) : (
        <div className="bg-[#0D1117] p-3 border border-[#30363D] text-xs text-[#8B949E]">
          Nested Tree Mode: All string leaves will be flattened into dot-separated paths.
        </div>
      )}
    </div>
  );
};
