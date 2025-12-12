import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api, Session } from '../services/api';
import { Package, Search, Filter, Download, Eye } from 'lucide-react';
import './SessionsPage.css';

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await api.getSessions(params);
      setSessions(data);
    } catch (err) {
      setError('Failed to load sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.created_by.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'badge-success',
      completed: 'badge-info',
      cancelled: 'badge-danger',
    };
    return statusClasses[status as keyof typeof statusClasses] || 'badge-default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="sessions-loading">
          <div className="spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="sessions-page">
        <div className="sessions-header">
          <div>
            <h1>Sessions</h1>
            <p className="sessions-subtitle">Manage stock verification sessions</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="sessions-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search by name, location, or creator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <Filter size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Sessions Table */}
        <div className="sessions-table-container">
          {filteredSessions.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <p>No sessions found</p>
            </div>
          ) : (
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Count Lines</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="session-name">{session.name}</td>
                    <td>{session.location}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td>{session.created_by}</td>
                    <td>{session.count_lines_count}</td>
                    <td>{formatDate(session.created_at)}</td>
                    <td>
                      <button className="btn-icon" title="View Details">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="sessions-footer">
          <p>Total: {filteredSessions.length} session(s)</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SessionsPage;
