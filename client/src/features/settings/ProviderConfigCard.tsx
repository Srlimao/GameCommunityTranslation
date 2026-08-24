import React, { useState } from 'react';
import { Cpu, Sparkles, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Radio } from 'lucide-react';
import { AIProviderType } from '../../types/client_types.ts';
import { ApiClient } from '../../services/api_client.ts';

interface ProviderConfigCardProps {
  title: string;
  subtitle: string;
  icon: 'cpu' | 'sparkles';
  provider: AIProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  onProviderChange: (provider: AIProviderType) => void;
  onBaseUrlChange: (url: string) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: string) => void;
  onTemperatureChange?: (temp: number) => void;
}

export const ProviderConfigCard: React.FC<ProviderConfigCardProps> = ({
  title,
  subtitle,
  icon,
  provider,
  baseUrl,
  apiKey,
  model,
  temperature,
  onProviderChange,
  onBaseUrlChange,
  onApiKeyChange,
  onModelChange,
  onTemperatureChange,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models: string[] } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await ApiClient.testProvider({
        provider,
        apiKey,
        baseUrl,
        model,
      });
      setTestResult(res);
      if (res.success && res.models && res.models.length > 0 && !model) {
        onModelChange(res.models[0]);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
        models: [],
      });
    } finally {
      setIsTesting(false);
    }
  };

  const applyPreset = (preset: { provider: AIProviderType; baseUrl: string; model: string }) => {
    onProviderChange(preset.provider);
    onBaseUrlChange(preset.baseUrl);
    onModelChange(preset.model);
  };

  return (
    <div className="bg-slate-950/70 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${icon === 'cpu' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {icon === 'cpu' ? <Cpu className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-200">{title}</h3>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          className="px-3 py-1 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors flex items-center gap-1.5"
        >
          {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          <span>Test & Fetch Models</span>
        </button>
      </div>

      {/* Provider Selector Tabs */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          AI Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'openai_compatible', label: 'OpenAI / Local / Ollama', desc: 'LM Studio, vLLM, Groq, etc.' },
            { id: 'gemini', label: 'Google Gemini', desc: 'Official Gemini API' },
            { id: 'anthropic', label: 'Anthropic Claude', desc: 'Official Claude API' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProviderChange(p.id as AIProviderType)}
              className={`px-3 py-2 rounded-lg border text-left transition-all ${
                provider === p.id
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-xs truncate">{p.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Presets for OpenAI Compatible */}
      {provider === 'openai_compatible' && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 font-medium mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'http://localhost:1234/v1', model: 'translategemma-12b-it' })}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[10px]"
          >
            LM Studio (Local)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'http://localhost:11434/v1', model: 'gemma2:9b' })}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[10px]"
          >
            Ollama
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[10px]"
          >
            OpenAI (Cloud)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' })}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[10px]"
          >
            Groq (Fast Cloud)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })}
            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-slate-300 text-[10px]"
          >
            DeepSeek
          </button>
        </div>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Base URL (if openai_compatible) */}
        {provider === 'openai_compatible' && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://localhost:1234/v1"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* API Key */}
        <div className={provider === 'openai_compatible' ? '' : 'sm:col-span-1'}>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            API Key / Bearer Token {provider === 'openai_compatible' ? '(Optional for local)' : '(Required)'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'anthropic' ? 'sk-ant-api...' : 'sk-... or empty'}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Model Name */}
        <div className={provider === 'openai_compatible' ? 'sm:col-span-2' : 'sm:col-span-1'}>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Model Name
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={
              provider === 'gemini'
                ? 'gemini-2.5-flash'
                : provider === 'anthropic'
                ? 'claude-3-5-haiku-20241022'
                : 'translategemma-12b-it or gpt-4o-mini'
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Temperature Slider if provided */}
      {onTemperatureChange && typeof temperature === 'number' && (
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Temperature ({temperature})</span>
            <span className="text-slate-500">{temperature < 0.3 ? 'Deterministic & Accurate' : 'Creative & Dynamic'}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      )}

      {/* Test Result Feedback */}
      {testResult && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-semibold break-words">{testResult.message}</div>
            {testResult.models?.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-slate-400 mb-1">Available Models (Click to select):</div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {testResult.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onModelChange(m)}
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono transition-colors ${
                        model === m
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
