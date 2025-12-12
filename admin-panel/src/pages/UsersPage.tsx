import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api, User } from '../services/api';
import { Users, Search, UserCheck, UserX, Edit } from 'lucide-react';
import './UsersPage.css';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (username: string, isActive: boolean) => {
    try {
      if (isActive) {
        await api.disableUser(username);
      } else {
        await api.enableUser(username);
      }
      await fetchUsers();
    } catch (err) {
      setError(`Failed to ${isActive ? 'disable' : 'enable'} user`);
      console.error(err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: 'badge-danger',
      supervisor: 'badge-warning',
      staff: 'badge-info',
    };
    return roleClasses[role as keyof typeof roleClasses] || 'badge-default';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="users-loading">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="users-page">
        <div className="users-header">
          <div>
            <h1>Users</h1>
            <p className="users-subtitle">Manage user accounts and permissions</p>
          </div>
        </div>

        {/* Search */}
        <div className="users-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="users-table-container">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>No users found</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id || user.username}>
                    <td className="user-username">{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className={`badge ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleUser(user.username, user.is_active)}
                          title={user.is_active ? 'Disable User' : 'Enable User'}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button className="btn-icon" title="Edit User">
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="users-footer">
          <p>Total: {filteredUsers.length} user(s)</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
