import React, { useState } from 'react';
import { Cpu, Sparkles, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
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
    <div className="bg-[#0D1117] p-3.5 border border-[#30363D] space-y-3 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 border border-[#30363D] bg-[#161B22] text-[#5865F2]">
            {icon === 'cpu' ? <Cpu className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          </div>
          <div>
            <h3 className="font-bold text-xs text-[#E6EDF3] uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-[#8B949E]">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          className="px-2.5 py-1 text-xs font-bold bg-[#161B22] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors flex items-center gap-1"
        >
          {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          <span>TEST CONNECTION</span>
        </button>
      </div>

      {/* Provider Selector Tabs */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
          AI Provider Architecture
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'openai_compatible', label: 'OpenAI / Local / Ollama', desc: 'LM Studio, vLLM, Groq, DeepSeek' },
            { id: 'gemini', label: 'Google Gemini', desc: 'Official Gemini API' },
            { id: 'anthropic', label: 'Anthropic Claude', desc: 'Official Claude API' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProviderChange(p.id as AIProviderType)}
              className={`p-2 border text-left transition-colors ${
                provider === p.id
                  ? 'bg-[#161B22] border-[#5865F2] text-[#E6EDF3]'
                  : 'bg-[#161B22]/40 border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3]'
              }`}
            >
              <div className="font-bold text-xs truncate">{p.label}</div>
              <div className="text-[9px] text-[#8B949E] truncate">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Presets for OpenAI Compatible */}
      {provider === 'openai_compatible' && (
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="text-[#8B949E] font-bold mr-1">PRESETS:</span>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'http://localhost:1234/v1', model: 'translategemma-12b-it' })}
            className="px-2 py-0.5 bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] text-[#E6EDF3]"
          >
            LM Studio
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'http://localhost:11434/v1', model: 'gemma2:9b' })}
            className="px-2 py-0.5 bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] text-[#E6EDF3]"
          >
            Ollama
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })}
            className="px-2 py-0.5 bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] text-[#E6EDF3]"
          >
            OpenAI
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' })}
            className="px-2 py-0.5 bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] text-[#E6EDF3]"
          >
            Groq (Fast Cloud)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({ provider: 'openai_compatible', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })}
            className="px-2 py-0.5 bg-[#161B22] border border-[#30363D] hover:border-[#5865F2] text-[#E6EDF3]"
          >
            DeepSeek
          </button>
        </div>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {provider === 'openai_compatible' && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder="http://localhost:1234/v1"
              className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-xs font-mono text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
          </div>
        )}

        <div className={provider === 'openai_compatible' ? '' : 'sm:col-span-1'}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
            API Key / Token {provider === 'openai_compatible' ? '(Optional for local)' : '(Required)'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : provider === 'anthropic' ? 'sk-ant-api...' : 'sk-... or empty'}
              className="w-full bg-[#161B22] border border-[#30363D] pl-2.5 pr-8 py-1.5 text-xs font-mono text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3]"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className={provider === 'openai_compatible' ? 'sm:col-span-2' : 'sm:col-span-1'}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
            Model Identifier
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="translategemma-12b-it or gpt-4o-mini"
            className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-xs font-mono text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* Temperature Slider */}
      {onTemperatureChange && typeof temperature === 'number' && (
        <div>
          <div className="flex justify-between text-[10px] text-[#8B949E] mb-1">
            <span className="font-bold uppercase tracking-wider">Temperature ({temperature})</span>
            <span>{temperature < 0.3 ? 'Deterministic' : 'Creative'}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#161B22] border border-[#30363D] appearance-none cursor-pointer accent-[#5865F2]"
          />
        </div>
      )}

      {/* Test Result Feedback */}
      {testResult && (
        <div
          className={`p-2.5 text-xs flex items-start gap-2 border ${
            testResult.success
              ? 'bg-[#3FB950]/10 border-[#3FB950] text-[#56D364]'
              : 'bg-[#E5534B]/10 border-[#E5534B] text-[#F85149]'
          }`}
        >
          {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-bold break-words">{testResult.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};
