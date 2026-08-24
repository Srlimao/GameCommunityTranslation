import React, { useState, useEffect } from 'react';
import { X, Settings, Sliders, MessageSquareCode, User as UserIcon, Globe } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-100">AI & System Configuration</h2>
                {user ? (
                  <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <span>Personal Profile: @{user.username}</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>Global Defaults</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Configure your personal AI providers, model preferences, and execution limits</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Scope Toggle */}
        {user?.role === 'admin' && (
          <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Configuration Scope:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setSaveScope('user')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  saveScope === 'user'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My User Account
              </button>
              <button
                type="button"
                onClick={() => setSaveScope('system')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  saveScope === 'system'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Server Global Defaults
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('translation')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'translation'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Translation Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'qa'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. QA & Glossary Inspector
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'performance'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Tuning & Rules
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'translation' && (
            <ProviderConfigCard
              title="Translation Engine"
              subtitle="Primary model used for translating game text strings and dialogue"
              icon="cpu"
              provider={settings.translation_provider}
              baseUrl={settings.translation_base_url}
              apiKey={settings.translation_api_key}
              model={settings.translation_model}
              temperature={settings.translation_temperature}
              onProviderChange={(p) => setSettings({ ...settings, translation_provider: p })}
              onBaseUrlChange={(url) => setSettings({ ...settings, translation_base_url: url })}
              onApiKeyChange={(key) => setSettings({ ...settings, translation_api_key: key })}
              onModelChange={(m) => setSettings({ ...settings, translation_model: m })}
              onTemperatureChange={(t) => setSettings({ ...settings, translation_temperature: t })}
            />
          )}

          {activeTab === 'qa' && (
            <ProviderConfigCard
              title="QA & Glossary Inspector"
              subtitle="Audits translations for consistency, broken placeholders, and extracts glossary terms"
              icon="sparkles"
              provider={settings.qa_provider}
              baseUrl={settings.qa_base_url}
              apiKey={settings.qa_api_key}
              model={settings.qa_model}
              onProviderChange={(p) => setSettings({ ...settings, qa_provider: p })}
              onBaseUrlChange={(url) => setSettings({ ...settings, qa_base_url: url })}
              onApiKeyChange={(key) => setSettings({ ...settings, qa_api_key: key })}
              onModelChange={(m) => setSettings({ ...settings, qa_model: m })}
            />
          )}

          {activeTab === 'performance' && (
            <div className="space-y-5">
              <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Batch Queue Concurrency</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Concurrent Workers: <strong className="text-emerald-400 font-mono">{settings.batch_concurrency}</strong></span>
                    <span className="text-slate-500 text-[11px]">{settings.batch_concurrency === 1 ? '1 request at a time (Best for local GPUs)' : `${settings.batch_concurrency} parallel requests (Best for cloud APIs)`}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.batch_concurrency}
                    onChange={(e) => setSettings({ ...settings, batch_concurrency: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
                  <MessageSquareCode className="w-4 h-4 text-indigo-400" />
                  <span>Global System Instructions</span>
                </div>
                <p className="text-xs text-slate-400">
                  Custom instructions injected into every translation prompt.
                </p>
                <textarea
                  rows={4}
                  value={settings.custom_system_prompt || ''}
                  onChange={(e) => setSettings({ ...settings, custom_system_prompt: e.target.value })}
                  placeholder="e.g. Always use standard gaming industry terminology."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md shadow-indigo-600/20"
            >
              {isSaving ? 'Saving...' : user?.role === 'admin' && saveScope === 'system' ? 'Save System Defaults' : 'Save User Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
