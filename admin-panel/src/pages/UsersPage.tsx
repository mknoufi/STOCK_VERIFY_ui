import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import './UsersPage.css';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive';
  lastLogin: string;
  verificationsToday: number;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'staff'>('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUsers({
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: searchTerm || undefined,
        limit: 100,
      });
      // Map API response to our User interface
      const mappedUsers: User[] = response.users.map((u) => ({
        id: u._id,
        username: u.username,
        fullName: u.username, // API doesn't have full_name, use username
        email: `${u.username}@company.com`, // API doesn't have email, derive from username
        role: u.role as 'admin' | 'manager' | 'staff',
        status: u.is_active ? 'active' : 'inactive',
        lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
        verificationsToday: 0, // Would need separate API call to get this
      }));
      setUsers(mappedUsers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      console.error('Failed to fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: User['role']) => {
    const badges = {
      admin: 'badge-admin',
      manager: 'badge-manager',
      staff: 'badge-staff',
    };
    return badges[role];
  };

  return (
    <DashboardLayout>
      <div className="users-page">
        <div className="page-header">
          <div className="header-content">
            <h1>Users</h1>
            <p>Manage user accounts and permissions</p>
          </div>
          <button className="add-user-btn">+ Add User</button>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <div className="filters-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="role-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-state">Loading users...</div>
        ) : (
        <div className="users-grid">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">No users found</div>
          ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className={`user-card ${user.status}`}>
              <div className="user-avatar">
                {user.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="user-info">
                <h3>{user.fullName}</h3>
                <p className="username">@{user.username}</p>
                <p className="email">{user.email}</p>
              </div>
              <div className="user-meta">
                <span className={`role-badge ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
                <span className={`status-dot ${user.status}`}></span>
              </div>
              <div className="user-stats">
                <div className="stat">
                  <span className="stat-value">{user.verificationsToday}</span>
                  <span className="stat-label">Today</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{user.lastLogin.split(' ')[1] || '-'}</span>
                  <span className="stat-label">Last Login</span>
                </div>
              </div>
              <div className="user-actions">
                <button className="action-btn">Edit</button>
                <button className="action-btn secondary">
                  {user.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
