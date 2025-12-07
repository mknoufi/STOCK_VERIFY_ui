import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api, type SystemStats } from '../services/api';
import './DashboardPage.css';

interface DashboardStats {
  totalVerifications: number;
  variances: number;
  activeUsers: number;
  completedToday: number;
}

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVerifications: 0,
    variances: 0,
    activeUsers: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const systemStats: SystemStats = await api.getSystemStats();

      setStats({
        totalVerifications: systemStats.total_sessions || 0,
        variances: 0, // Will be populated from variance endpoint
        activeUsers: systemStats.active_sessions || 0,
        completedToday: systemStats.running_services || 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(message);
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const widgets = [
    {
      id: 'verifications',
      icon: '📦',
      title: 'Total Verifications',
      value: stats.totalVerifications,
      trend: '+12%',
      trendType: 'positive' as const,
      footer: 'All time count',
      variant: 'widget-primary',
    },
    {
      id: 'variances',
      icon: '⚠️',
      title: 'Variances',
      value: stats.variances,
      trend: stats.variances > 0 ? `${stats.variances} pending` : 'None',
      trendType: stats.variances > 0 ? 'negative' as const : 'positive' as const,
      footer: 'Requires attention',
      variant: 'widget-warning',
    },
    {
      id: 'users',
      icon: '👥',
      title: 'Active Users',
      value: stats.activeUsers,
      trend: 'Online now',
      trendType: 'neutral' as const,
      footer: 'Currently active',
      variant: 'widget-success',
    },
    {
      id: 'completed',
      icon: '✅',
      title: 'Completed Today',
      value: stats.completedToday,
      trend: '+5%',
      trendType: 'positive' as const,
      footer: 'Today\'s progress',
      variant: 'widget-info',
    },
  ];

  const quickActions = [
    { to: '/verifications', icon: '📋', title: 'New Verification', desc: 'Start a stock check' },
    { to: '/reports', icon: '📊', title: 'View Reports', desc: 'Analytics & insights' },
    { to: '/users', icon: '👤', title: 'Manage Users', desc: 'Team permissions' },
    { to: '/settings', icon: '⚙️', title: 'Settings', desc: 'Configure system' },
  ];

  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <h1 className="page-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's an overview of your stock verification system.
        </p>

        {error && (
          <div className="dashboard-error">
            <span>⚠️ {error}</span>
            <button onClick={fetchStats}>Retry</button>
          </div>
        )}

        <div className="dashboard-widgets">
          {widgets.map((widget, index) => (
            <div
              key={widget.id}
              className={`widget ${widget.variant} ${loading ? 'loading' : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="widget-header">
                <div className="widget-icon">{widget.icon}</div>
                <span className={`widget-trend ${widget.trendType}`}>
                  {widget.trendType === 'positive' && '↑'}
                  {widget.trendType === 'negative' && '↓'}
                  {widget.trend}
                </span>
              </div>
              <div className="widget-content">
                <h3>{widget.title}</h3>
                <p className="widget-value">
                  {loading ? '---' : widget.value.toLocaleString()}
                </p>
              </div>
              <div className="widget-footer">
                <span>{widget.footer}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-actions">
          <button className="refresh-btn" onClick={fetchStats} disabled={loading}>
            <RefreshIcon />
            {loading ? 'Refreshing...' : 'Refresh Stats'}
          </button>
        </div>

        <div className="quick-actions">
          <h3 className="quick-actions-title">Quick Actions</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <Link to={action.to} key={action.to} className="quick-action-card">
                <div className="quick-action-icon">{action.icon}</div>
                <div className="quick-action-text">
                  <h4>{action.title}</h4>
                  <p>{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
