import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import './SyncPage.css';

export const SyncPage: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setError(null);
      const status = await api.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError('Failed to load sync status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await api.triggerSync();
      await fetchSyncStatus();
      alert(`Sync completed. ${result.synced_count} items synced.`);
    } catch (err) {
      setError('Failed to trigger sync');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success' || status === 'completed') {
      return <CheckCircle size={20} className="status-icon success" />;
    }
    if (status === 'error' || status === 'failed') {
      return <XCircle size={20} className="status-icon error" />;
    }
    return <Clock size={20} className="status-icon pending" />;
  };

  if (loading && !syncStatus) {
    return (
      <DashboardLayout>
        <div className="sync-loading">
          <div className="spinner"></div>
          <p>Loading sync status...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="sync-page">
        <div className="sync-header">
          <div>
            <h1>Sync</h1>
            <p className="sync-subtitle">Manage data synchronization with ERPNext</p>
          </div>
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="btn-sync"
          >
            <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
            {syncing ? 'Syncing...' : 'Trigger Sync'}
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="sync-content">
          {syncStatus && (
            <div className="sync-status-card">
              <div className="sync-status-header">
                <h2>Sync Status</h2>
                {getStatusIcon(syncStatus.status)}
              </div>
              
              <div className="sync-status-details">
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className={`status-value status-${syncStatus.status}`}>
                    {syncStatus.status}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Last Sync:</span>
                  <span className="status-value">
                    {syncStatus.last_sync 
                      ? new Date(syncStatus.last_sync).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Items Synced:</span>
                  <span className="status-value">
                    {syncStatus.items_synced || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="sync-info">
            <h3>About Synchronization</h3>
            <p>
              Synchronization keeps your stock verification data in sync with ERPNext.
              You can trigger a manual sync or wait for the scheduled automatic sync.
            </p>
            <ul className="sync-features">
              <li>Bidirectional data sync with ERPNext</li>
              <li>Automatic conflict detection and resolution</li>
              <li>Real-time sync status monitoring</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SyncPage;
