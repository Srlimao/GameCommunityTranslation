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
    if (!confirm('Delete this user?')) return;
    try {
      await AuthApi.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono overflow-y-auto">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-2xl overflow-hidden shadow-none my-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5865F2]" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">User Management</h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-[#E5534B]/10 border border-[#E5534B] text-[#F85149] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Create User Form */}
          <form onSubmit={handleCreateUser} className="bg-[#0D1117] p-3 border border-[#30363D] space-y-2.5">
            <div className="font-bold text-[10px] uppercase tracking-wider text-[#5865F2] flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Collaborator</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-[#161B22] border border-[#30363D] px-2 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#161B22] border border-[#30363D] px-2 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="bg-[#161B22] border border-[#30363D] px-2 py-1 text-xs text-[#E6EDF3] outline-none focus:border-[#5865F2]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 py-1 text-xs font-bold bg-[#5865F2] hover:bg-[#4C6EF5] text-white border border-[#5865F2] transition-colors flex items-center gap-1"
              >
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                <span>Add User</span>
              </button>
            </div>
          </form>

          {/* User List */}
          <div className="space-y-2">
            <div className="font-bold text-[10px] uppercase tracking-wider text-[#8B949E]">Current Users ({users.length})</div>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-[#8B949E] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="divide-y divide-[#30363D] border border-[#30363D] bg-[#0D1117]">
                {users.map((u) => (
                  <div key={u.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#E6EDF3] flex items-center gap-2">
                        <span>{u.display_name || u.username}</span>
                        <span className="text-[10px] text-[#8B949E]">@{u.username}</span>
                      </div>
                      <div className="text-[10px] text-[#8B949E]">Joined: {new Date(u.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={u.id === currentUser?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="bg-[#161B22] border border-[#30363D] px-2 py-0.5 text-[11px] text-[#E6EDF3] outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="translator">Translator</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-[#8B949E] hover:text-[#E5534B] transition-colors"
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
