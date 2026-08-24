import React from 'react';
import { JsonAnalysisResult, JsonSchemaConfig } from '../../types/client_types.ts';
import { Layers, Key, FileText, MessageSquareQuote, Info, FolderTree } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Mode & Root Selector Bar */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Import Structure Mode
              </div>
              <div className="text-sm font-bold text-slate-100">
                Found <strong>{analysis.totalItemsCount.toLocaleString()}</strong> items in file
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={schemaConfig.mode}
              onChange={(e) => handleModeChange(e.target.value as any)}
              className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-3.5 py-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-400"
            >
              <option value="array_of_objects">Array / List of Records (with Key/Value fields)</option>
              <option value="dictionary_kv">Dictionary / Key-Value Map ("key": "value")</option>
              <option value="nested_tree">Standard Nested Tree (Auto-flatten all strings)</option>
            </select>
          </div>
        </div>

        {/* If Array/Object is wrapped inside a property like "Translations": [...] */}
        {analysis.detectedListPaths && analysis.detectedListPaths.length > 0 && schemaConfig.mode === 'array_of_objects' && (
          <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-slate-400">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target List Property:</span>
            </label>
            <select
              value={schemaConfig.rootPath || analysis.selectedListPath || ''}
              onChange={(e) => {
                const path = e.target.value;
                if (onSelectRootPath) onSelectRootPath(path);
                onChangeSchema({ ...schemaConfig, rootPath: path || undefined });
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
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
        <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Key / ID Field Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Identifier / Key Attribute *</span>
              </label>
              <select
                value={schemaConfig.keyField || analysis.suggestedKeyField || '_index'}
                onChange={(e) => onChangeSchema({ ...schemaConfig, keyField: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {analysis.availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f} {f === analysis.suggestedKeyField ? '(Recommended Key)' : ''}
                  </option>
                ))}
                <option value="_index">Auto Index ([0], [1], [2]...)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Property containing the unique localization key (e.g. <code>Key</code> or <code>id</code>).
              </p>
            </div>

            {/* Context / Speaker Field Selector */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5 text-purple-400" />
                <span>3. Context / Speaker (Optional)</span>
              </label>
              <select
                value={schemaConfig.contextField || ''}
                onChange={(e) => onChangeSchema({ ...schemaConfig, contextField: e.target.value || undefined })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (No extra note)</option>
                {analysis.availableFields.map((f) => (
                  <option key={f} value={f}>
                    {f} {f === analysis.suggestedContextField ? '(Auto-Detected Context)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Included in translation prompts to give character/dialogue context to the AI.
              </p>
            </div>
          </div>

          {/* Translatable Text Fields Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Translatable Text Attribute(s) *</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {analysis.availableFields.map((field) => {
                const isSelected = schemaConfig.textFields.includes(field);
                const isKey = schemaConfig.keyField === field;

                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => handleToggleTextField(field)}
                    disabled={isKey}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : isKey
                        ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>{field}</span>
                    {isSelected && <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded">Translate</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Select which property contains the text to be translated (e.g. <code>Value</code> or <code>text</code>). Other properties (e.g. <code>Version</code>) are safely preserved on export.
            </p>
          </div>
        </div>
      ) : schemaConfig.mode === 'dictionary_kv' ? (
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-slate-200">📖 Dictionary / Key-Value Map Mode:</div>
          <p className="text-slate-400">
            Each key in this dictionary maps directly to a string value. Keys are imported verbatim and preserved upon export.
          </p>
        </div>
      ) : (
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
          🌲 <strong>Nested Tree Mode:</strong> All string leaves in this JSON object will be recursively flattened into dot-separated paths (e.g. <code className="text-indigo-400">menu.main.start</code>) and reconstructed upon export.
        </div>
      )}
    </div>
  );
};
