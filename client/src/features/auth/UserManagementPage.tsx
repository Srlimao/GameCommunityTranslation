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
    if (!confirm(`Delete user "@${userToDelete.username}"?`)) return;
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

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#161B22] hover:bg-[#30363D] text-[#E6EDF3] border border-[#30363D] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0D1117] border border-[#30363D] text-[#5865F2] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#E6EDF3]">{users.length}</div>
            <div className="text-[10px] text-[#8B949E] uppercase">Total Registered Users</div>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0D1117] border border-[#30363D] text-[#E5534B] flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#F85149]">{users.filter((u) => u.role === 'admin').length}</div>
            <div className="text-[10px] text-[#8B949E] uppercase">Administrators</div>
          </div>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0D1117] border border-[#30363D] text-[#3FB950] flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#56D364]">{users.filter((u) => u.role === 'translator').length}</div>
            <div className="text-[10px] text-[#8B949E] uppercase">Translators</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-2.5 border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#3FB950]/10 border-[#3FB950] text-[#56D364]'
              : 'bg-[#E5534B]/10 border-[#E5534B] text-[#F85149]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Add New User */}
      <form onSubmit={handleCreateUser} className="bg-[#161B22] border border-[#30363D] p-3.5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">
          <UserPlus className="w-4 h-4 text-[#5865F2]" />
          <span>Add New Collaborator</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input
            type="text"
            required
            placeholder="Username (e.g. alex)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
          <input
            type="password"
            required
            placeholder="Password (min 4 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            className="bg-[#0D1117] border border-[#30363D] px-2.5 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
          />
          <div className="flex gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="bg-[#0D1117] border border-[#30363D] px-2 py-1.5 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2] flex-1"
            >
              <option value="translator">Translator</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isCreating}
              className="px-3 py-1.5 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors flex items-center gap-1 shrink-0"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Create</span>
            </button>
          </div>
        </div>
      </form>

      {/* Users Table */}
      <div className="bg-[#161B22] border border-[#30363D] space-y-3 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">Registered Users</h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D1117] border border-[#30363D] pl-8 pr-2.5 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
            />
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#8B949E] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading user directory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#30363D] text-[#8B949E] font-bold uppercase text-[10px]">
                  <th className="pb-2 px-2">User</th>
                  <th className="pb-2 px-2">Role</th>
                  <th className="pb-2 px-2">Joined Date</th>
                  <th className="pb-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#10141D] transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#0D1117] border border-[#30363D] text-[#5865F2] font-bold text-xs flex items-center justify-center">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#E6EDF3] flex items-center gap-1.5">
                            <span>{u.display_name || u.username}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[9px] bg-[#5865F2]/20 text-[#5865F2] px-1 border border-[#5865F2]/40">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8B949E]">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`bg-[#0D1117] border px-2 py-0.5 text-xs font-bold outline-none ${
                          u.role === 'admin'
                            ? 'text-[#F85149] border-[#E5534B]'
                            : u.role === 'translator'
                            ? 'text-[#5865F2] border-[#5865F2]'
                            : 'text-[#8B949E] border-[#30363D]'
                        }`}
                      >
                        <option value="admin">Administrator</option>
                        <option value="translator">Translator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-2 text-[#8B949E] text-[10px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className="px-2 py-0.5 bg-[#E5534B]/10 hover:bg-[#E5534B]/20 text-[#F85149] border border-[#E5534B] text-[10px] font-bold transition-colors flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Make Admin</span>
                          </button>
                        )}

                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 text-[#8B949E] hover:text-[#E5534B] transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
