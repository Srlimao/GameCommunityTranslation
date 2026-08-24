import React, { useState, useEffect } from 'react';
import { X, Users, Shield, Trash2, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../../types/client_types.ts';
import { AuthApi } from '../../services/auth_api.ts';
import { useAuth } from './AuthContext.tsx';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('translator');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AuthApi.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      await AuthApi.createUser(newUsername, newPassword, newDisplayName);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await AuthApi.updateUserRole(userId, role);
      await loadUsers();
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await AuthApi.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-base text-slate-100">Team & User Management</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create User Form */}
          <form onSubmit={handleCreateUser} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New Collaborator</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
              >
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                <span>Add User</span>
              </button>
            </div>
          </form>

          {/* User List */}
          <div className="space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-400">Current Users ({users.length})</div>
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
                {users.map((u) => (
                  <div key={u.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>{u.display_name || u.username}</span>
                        <span className="text-[10px] text-slate-500 font-mono">@{u.username}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Joined: {new Date(u.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="translator">Translator</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
