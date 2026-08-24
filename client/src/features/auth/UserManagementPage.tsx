import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, Trash2, Search, ArrowLeft, Loader2, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { User, UserRole } from '../../types/client_types.ts';
import { AuthApi } from '../../services/auth_api.ts';
import { useAuth } from './AuthContext.tsx';

interface UserManagementPageProps {
  onBackToDashboard: () => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ onBackToDashboard }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New user state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('translator');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await AuthApi.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load users' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setFeedback(null);
    try {
      await AuthApi.createUser(newUsername, newPassword, newDisplayName);
      if (newRole !== 'translator') {
        const all = await AuthApi.getAllUsers();
        const created = all.find((u) => u.username === newUsername.trim().toLowerCase());
        if (created) await AuthApi.updateUserRole(created.id, newRole);
      }
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setFeedback({ type: 'success', message: `User @${newUsername} created successfully!` });
      await loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create user' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await AuthApi.updateUserRole(userId, role);
      setFeedback({ type: 'success', message: 'User role updated successfully!' });
      await loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update role' });
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!confirm(`Are you sure you want to delete user "@${userToDelete.username}"?`)) return;
    try {
      await AuthApi.deleteUser(userToDelete.id);
      setFeedback({ type: 'success', message: `User @${userToDelete.username} removed.` });
      await loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete user' });
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name && u.display_name.toLowerCase().includes(search.toLowerCase()))
  );

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const translatorCount = users.filter((u) => u.role === 'translator').length;

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{users.length}</div>
            <div className="text-xs text-slate-400">Total Registered Users</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-300">{adminCount}</div>
            <div className="text-xs text-slate-400">Administrators</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-300">{translatorCount}</div>
            <div className="text-xs text-slate-400">Active Translators</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Add New User Card */}
      <form onSubmit={handleCreateUser} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <UserPlus className="w-4 h-4 text-indigo-400" />
          <span>Add New Team Member / Collaborator</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Username (e.g. alex)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <input
            type="password"
            required
            placeholder="Password (min 4 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono flex-1"
            >
              <option value="translator">Translator</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Create</span>
            </button>
          </div>
        </div>
      </form>

      {/* Users List & Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-base text-slate-200">Registered Users</h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading user directory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Joined Date</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{u.display_name || u.username}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-800 font-mono">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none ${
                          u.role === 'admin'
                            ? 'text-rose-300 border-rose-800/80 bg-rose-950/30'
                            : u.role === 'translator'
                            ? 'text-indigo-300 border-indigo-800/80 bg-indigo-950/30'
                            : 'text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="admin">Administrator</option>
                        <option value="translator">Translator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Make Admin</span>
                          </button>
                        )}

                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
