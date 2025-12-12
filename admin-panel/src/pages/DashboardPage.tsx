import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api, SystemStats, HealthStatus } from '../services/api';
import { 
  Users, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  Activity,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';
import './DashboardPage.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'blue' }) => (
  <div className={`stat-card stat-card-${color}`}>
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-content">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value">{value}</p>
      {trend && <span className="stat-card-trend">{trend}</span>}
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, healthData] = await Promise.all([
        api.getSystemStats(),
        api.getHealthStatus(),
      ]);
      setStats(statsData);
      setHealth(healthData);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <DashboardLayout>
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !stats) {
    return (
      <DashboardLayout>
        <div className="dashboard-error">
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="btn-primary">
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const getHealthColor = (status: string) => {
    if (status === 'healthy' || status === 'ok') return 'green';
    if (status === 'degraded') return 'yellow';
    return 'red';
  };

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">System overview and statistics</p>
          </div>
          <button 
            onClick={fetchDashboardData} 
            className="btn-refresh"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* System Health Status */}
        {health && (
          <div className="health-status">
            <div className={`health-badge health-${getHealthColor(health.status)}`}>
              <Activity size={16} />
              <span>System Status: {health.status.toUpperCase()}</span>
            </div>
            <div className="health-details">
              <span>Database: {health.database}</span>
              {health.sql_server && <span>SQL Server: {health.sql_server}</span>}
              <span>Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="stats-grid">
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={<Users size={24} />}
            color="blue"
          />
          <StatCard
            title="Active Sessions"
            value={stats?.active_sessions || 0}
            icon={<Package size={24} />}
            color="green"
          />
          <StatCard
            title="Total Count Lines"
            value={stats?.total_count_lines || 0}
            icon={<Database size={24} />}
            color="purple"
          />
          <StatCard
            title="Total Variances"
            value={stats?.total_variances || 0}
            icon={<TrendingUp size={24} />}
            color="orange"
            trend={stats?.avg_variance_percentage ? `${stats.avg_variance_percentage.toFixed(1)}% avg` : undefined}
          />
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button className="quick-action-btn">
              <Package size={20} />
              <span>View Sessions</span>
            </button>
            <button className="quick-action-btn">
              <Users size={20} />
              <span>Manage Users</span>
            </button>
            <button className="quick-action-btn">
              <Server size={20} />
              <span>Sync Status</span>
            </button>
            <button className="quick-action-btn">
              <Activity size={20} />
              <span>View Analytics</span>
            </button>
          </div>
        </div>

        {/* Last Update */}
        <div className="dashboard-footer">
          <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
