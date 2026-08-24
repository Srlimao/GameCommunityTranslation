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
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#161B22] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors"
      >
        <LogIn className="w-3.5 h-3.5 text-[#5865F2]" />
        <span>Sign In</span>
      </button>
    );
  }

  const roleLabels = {
    admin: 'Administrator',
    translator: 'Translator',
    viewer: 'Viewer',
  };

  const roleColors = {
    admin: 'bg-[#E5534B]/20 text-[#F85149] border-[#E5534B]',
    translator: 'bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]',
    viewer: 'bg-[#30363D] text-[#8B949E] border-[#30363D]',
  };

  return (
    <div className="relative font-mono">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 bg-[#161B22] hover:bg-[#30363D] border border-[#30363D] transition-colors"
      >
        <div className="w-5 h-5 bg-[#0D1117] border border-[#30363D] text-[#5865F2] flex items-center justify-center font-bold text-[10px]">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-[#E6EDF3] truncate max-w-[100px]">
            {user.username}
          </span>
          <span className={`text-[8px] uppercase px-1 py-0.2 border font-mono w-fit ${roleColors[user.role]}`}>
            {roleLabels[user.role]}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-[#161B22] border border-[#30363D] shadow-none z-50 py-1 font-mono text-xs">
            <div className="px-3 py-1.5 border-b border-[#30363D]">
              <p className="font-bold text-[#E6EDF3] truncate">{user.display_name || user.username}</p>
              <p className="text-[10px] text-[#8B949E]">@{user.username}</p>
            </div>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenUserManagement();
                }}
                className="w-full text-left px-3 py-1.5 text-[#E6EDF3] hover:bg-[#0D1117] flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-[#5865F2]" />
                <span>Manage Users</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-1.5 text-[#F85149] hover:bg-[#0D1117] flex items-center gap-2"
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
