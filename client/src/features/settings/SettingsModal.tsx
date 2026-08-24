import React, { useState, useEffect } from 'react';
import { X, Settings, Sliders, MessageSquareCode, User as UserIcon, Globe, Terminal } from 'lucide-react';
import { ApiClient } from '../../services/api_client.ts';
import { SystemSettings } from '../../types/client_types.ts';
import { ProviderConfigCard } from './ProviderConfigCard.tsx';
import { useAuth } from '../auth/AuthContext.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>({
    translation_provider: 'openai_compatible',
    translation_model: 'translategemma-12b-it',
    translation_base_url: 'http://localhost:1234/v1',
    translation_api_key: '',
    translation_temperature: 0.2,

    qa_provider: 'gemini',
    qa_model: 'gemini-2.5-flash',
    qa_base_url: '',
    qa_api_key: '',

    batch_concurrency: 1,
    request_timeout_ms: 60000,
    custom_system_prompt: '',
  });

  const [activeTab, setActiveTab] = useState<'translation' | 'qa' | 'performance'>('translation');
  const [saveScope, setSaveScope] = useState<'user' | 'system'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await ApiClient.updateSettings(settings, user?.role === 'admin' ? saveScope : 'user');
      onClose();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-3xl overflow-hidden shadow-none my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#5865F2]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">System Configuration</h2>
                {user ? (
                  <span className="text-[10px] bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40 px-1.5 py-0.2 font-mono">
                    @{user.username}
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#30363D] text-[#8B949E] px-1.5 py-0.2 font-mono">
                    GLOBAL
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#30363D] bg-[#0D1117] px-2 pt-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('translation')}
            className={`px-3 py-1.5 text-xs font-bold border-t border-x transition-colors ${
              activeTab === 'translation'
                ? 'bg-[#161B22] text-[#E6EDF3] border-[#30363D]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            1. Translation Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`px-3 py-1.5 text-xs font-bold border-t border-x transition-colors ${
              activeTab === 'qa'
                ? 'bg-[#161B22] text-[#E6EDF3] border-[#30363D]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            2. QA & Glossary Inspector
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1.5 text-xs font-bold border-t border-x transition-colors ${
              activeTab === 'performance'
                ? 'bg-[#161B22] text-[#E6EDF3] border-[#30363D]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            3. Tuning & Rules
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {activeTab === 'translation' && (
            <ProviderConfigCard
              title="Primary Translation Engine"
              subtitle="Generates localized game strings (LM Studio, Ollama, OpenAI, Claude, Groq, DeepSeek)"
              icon="cpu"
              provider={settings.translation_provider}
              baseUrl={settings.translation_base_url}
              apiKey={settings.translation_api_key}
              model={settings.translation_model}
              temperature={settings.translation_temperature}
              onProviderChange={(p) => setSettings({ ...settings, translation_provider: p })}
              onBaseUrlChange={(u) => setSettings({ ...settings, translation_base_url: u })}
              onApiKeyChange={(k) => setSettings({ ...settings, translation_api_key: k })}
              onModelChange={(m) => setSettings({ ...settings, translation_model: m })}
              onTemperatureChange={(t) => setSettings({ ...settings, translation_temperature: t })}
            />
          )}

          {activeTab === 'qa' && (
            <ProviderConfigCard
              title="QA & Glossary Inspector Engine"
              subtitle="Audits translations for consistency and mines key terminology"
              icon="sparkles"
              provider={settings.qa_provider}
              baseUrl={settings.qa_base_url}
              apiKey={settings.qa_api_key}
              model={settings.qa_model}
              onProviderChange={(p) => setSettings({ ...settings, qa_provider: p })}
              onBaseUrlChange={(u) => setSettings({ ...settings, qa_base_url: u })}
              onApiKeyChange={(k) => setSettings({ ...settings, qa_api_key: k })}
              onModelChange={(m) => setSettings({ ...settings, qa_model: m })}
            />
          )}

          {activeTab === 'performance' && (
            <div className="space-y-3.5 bg-[#0D1117] p-4 border border-[#30363D]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                    Batch Queue Concurrency
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.batch_concurrency}
                    onChange={(e) => setSettings({ ...settings, batch_concurrency: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#161B22] border border-[#30363D] px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                  />
                  <p className="text-[10px] text-[#8B949E] mt-1">Recommended: 1-2 for local LLMs; 3-5 for Cloud APIs.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                    Request Timeout (ms)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="10000"
                    max="300000"
                    value={settings.request_timeout_ms}
                    onChange={(e) => setSettings({ ...settings, request_timeout_ms: parseInt(e.target.value) || 60000 })}
                    className="w-full bg-[#161B22] border border-[#30363D] px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                  />
                  <p className="text-[10px] text-[#8B949E] mt-1">Default 60000ms (1 minute per key call).</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                  Global System Instructions (Appended to all prompts)
                </label>
                <textarea
                  rows={3}
                  value={settings.custom_system_prompt || ''}
                  onChange={(e) => setSettings({ ...settings, custom_system_prompt: e.target.value })}
                  placeholder="e.g. Always use standard video game terminology for UI buttons; keep tone formal..."
                  className="w-full bg-[#161B22] border border-[#30363D] p-2.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>
          )}

          {/* Admin Scope Selector */}
          {user?.role === 'admin' && (
            <div className="bg-[#10141D] p-3 border border-[#30363D] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#E6EDF3]">Save Scope</div>
                <div className="text-[10px] text-[#8B949E]">Apply to your account only or set system-wide server defaults</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSaveScope('user')}
                  className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                    saveScope === 'user' ? 'bg-[#5865F2] text-white border-[#5865F2]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D]'
                  }`}
                >
                  MY PROFILE
                </button>
                <button
                  type="button"
                  onClick={() => setSaveScope('system')}
                  className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                    saveScope === 'system' ? 'bg-[#3FB950] text-slate-950 border-[#3FB950]' : 'bg-[#0D1117] text-[#8B949E] border-[#30363D]'
                  }`}
                >
                  GLOBAL SERVER
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] bg-[#0D1117]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
