import React, { useState } from 'react';
import { X, Lock, User as UserIcon, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, displayName);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-md overflow-hidden shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or translator_alex"
                className="w-full bg-[#0D1117] border border-[#30363D] pl-8 pr-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
              <UserIcon className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex (Localization Lead)"
                className="w-full bg-[#0D1117] border border-[#30363D] px-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0D1117] border border-[#30363D] pl-8 pr-3 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
              <Lock className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
            {mode === 'login' && (
              <p className="text-[10px] text-[#8B949E] mt-1">
                Default: <span className="text-[#E6EDF3]">admin</span> / <span className="text-[#E6EDF3]">admin123</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-3.5 h-3.5" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            <span>{mode === 'login' ? 'Sign In' : 'Register Account'}</span>
          </button>

          <div className="pt-2.5 border-t border-[#30363D] text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-[11px] text-[#5865F2] hover:underline"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
