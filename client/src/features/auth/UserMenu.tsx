import React, { useState } from 'react';
import { User, LogOut, Shield, Users, LogIn } from 'lucide-react';
import { useAuth } from './AuthContext.tsx';

interface UserMenuProps {
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenLogin, onOpenUserManagement }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={onOpenLogin}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
      >
        <LogIn className="w-3.5 h-3.5 text-indigo-400" />
        <span>Sign In</span>
      </button>
    );
  }

  const roleColors = {
    admin: 'bg-rose-950/80 text-rose-300 border-rose-800',
    translator: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
    viewer: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">
            {user.display_name || user.username}
          </span>
          <span className={`text-[9px] uppercase px-1 py-0.2 rounded border font-mono w-fit ${roleColors[user.role]}`}>
            {user.role}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-slate-800/80">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.display_name || user.username}</p>
              <p className="text-[11px] text-slate-400 font-mono">@{user.username}</p>
            </div>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenUserManagement();
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Manage Users</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
