import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { RemoteJsonDb, RemoteDbConfig } from '../../services/remote_json_db.ts';

export const StorageConfigCard: React.FC = () => {
  const [config, setConfig] = useState<RemoteDbConfig>(RemoteJsonDb.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    setConfig(RemoteJsonDb.getConfig());
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMsg(null);
    try {
      RemoteJsonDb.setConfig(config);
      const ok = await RemoteJsonDb.healthCheck();
      if (ok) {
        setStatusMsg({ success: true, text: 'Connected to GCP JSON DB (db.dunhas.com).' });
      } else {
        setStatusMsg({ success: false, text: 'Could not reach db.dunhas.com /health endpoint.' });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: `Connection failed: ${err.message || err}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    RemoteJsonDb.setConfig(config);
    setStatusMsg({ success: true, text: 'GCP DB Configuration saved locally.' });
  };

  return (
    <div className="bg-[#0D1117] p-4 border border-[#30363D] space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#5865F2]" />
          <div>
            <span className="font-bold text-xs text-[#E6EDF3] uppercase tracking-wider">
              GCP Server JSON Database (db.dunhas.com)
            </span>
            <p className="text-[10px] text-[#8B949E]">
              Direct remote persistence for game libraries, glossaries, and translation chunks.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting}
          className="px-2.5 py-1 text-[11px] font-bold bg-[#161B22] hover:bg-[#21262D] text-[#E6EDF3] border border-[#30363D] transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'TESTING...' : 'TEST DB'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
            GCP DB Base URL
          </label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="https://db.dunhas.com/api"
            className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
            GCP API Key (x-api-key)
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="1b4a19fdc1eda3f..."
            className="w-full bg-[#161B22] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-2 border flex items-center gap-2 text-[11px] ${
            statusMsg.success
              ? 'bg-[#238636]/10 border-[#238636]/40 text-[#3FB950]'
              : 'bg-[#DA3633]/10 border-[#DA3633]/40 text-[#F85149]'
          }`}
        >
          {statusMsg.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};
