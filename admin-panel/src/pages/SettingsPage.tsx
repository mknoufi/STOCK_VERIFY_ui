import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import './SettingsPage.css';

interface Settings {
  varianceThreshold: number;
  autoLogoutMinutes: number;
  requirePhotoOnVariance: boolean;
  allowNegativeStock: boolean;
  enableNotifications: boolean;
  defaultWarehouse: string;
  sessionTimeout: number;
  corsOrigins: string;
}

const defaultSettings: Settings = {
  varianceThreshold: 5,
  autoLogoutMinutes: 30,
  requirePhotoOnVariance: true,
  allowNegativeStock: false,
  enableNotifications: true,
  defaultWarehouse: 'WH-001',
  sessionTimeout: 60,
  corsOrigins: 'http://localhost:3000, http://localhost:5173',
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSettings();
      // Map API response to local settings structure
      setSettings({
        varianceThreshold: (response.variance_threshold as number) || defaultSettings.varianceThreshold,
        autoLogoutMinutes: (response.auto_logout_minutes as number) || defaultSettings.autoLogoutMinutes,
        requirePhotoOnVariance: (response.require_photo_on_variance as boolean) ?? defaultSettings.requirePhotoOnVariance,
        allowNegativeStock: (response.allow_negative_stock as boolean) ?? defaultSettings.allowNegativeStock,
        enableNotifications: (response.enable_notifications as boolean) ?? defaultSettings.enableNotifications,
        defaultWarehouse: (response.default_warehouse as string) || defaultSettings.defaultWarehouse,
        sessionTimeout: (response.session_timeout as number) || defaultSettings.sessionTimeout,
        corsOrigins: (response.cors_origins as string) || defaultSettings.corsOrigins,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(message);
      console.error('Failed to fetch settings:', err);
      // Use defaults on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key: keyof Settings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.updateSettings({
        variance_threshold: settings.varianceThreshold,
        auto_logout_minutes: settings.autoLogoutMinutes,
        require_photo_on_variance: settings.requirePhotoOnVariance,
        allow_negative_stock: settings.allowNegativeStock,
        enable_notifications: settings.enableNotifications,
        default_warehouse: settings.defaultWarehouse,
        session_timeout: settings.sessionTimeout,
        cors_origins: settings.corsOrigins,
      });
      setSavedMessage('Settings saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="settings-page">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Configure system preferences and policies</p>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {savedMessage && (
          <div className="success-message">{savedMessage}</div>
        )}

        {loading ? (
          <div className="loading-state">Loading settings...</div>
        ) : (
          <>
        <div className="settings-sections">
          <section className="settings-section">
            <h2>Verification Policies</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="variance-threshold">Variance Threshold (%)</label>
                  <p>Trigger warning when variance exceeds this percentage</p>
                </div>
                <input
                  id="variance-threshold"
                  type="number"
                  value={settings.varianceThreshold}
                  onChange={(e) => handleChange('varianceThreshold', Number(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span id="require-photo-label">Require Photo on Variance</span>
                  <p>Mandatory photo capture when variance is detected</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.requirePhotoOnVariance}
                    onChange={(e) => handleChange('requirePhotoOnVariance', e.target.checked)}
                    aria-labelledby="require-photo-label"
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span id="negative-stock-label">Allow Negative Stock</span>
                  <p>Allow counted quantity to result in negative stock</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.allowNegativeStock}
                    onChange={(e) => handleChange('allowNegativeStock', e.target.checked)}
                    aria-labelledby="negative-stock-label"
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2>Session & Security</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="auto-logout">Auto Logout (minutes)</label>
                  <p>Automatically log out inactive users after this duration</p>
                </div>
                <input
                  id="auto-logout"
                  type="number"
                  value={settings.autoLogoutMinutes}
                  onChange={(e) => handleChange('autoLogoutMinutes', Number(e.target.value))}
                  min="5"
                  max="480"
                />
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="session-timeout">Session Timeout (minutes)</label>
                  <p>JWT token expiration time</p>
                </div>
                <input
                  id="session-timeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange('sessionTimeout', Number(e.target.value))}
                  min="15"
                  max="1440"
                />
              </div>

              <div className="setting-item full-width">
                <div className="setting-info">
                  <label htmlFor="cors-origins">CORS Origins</label>
                  <p>Allowed origins for API requests (comma-separated)</p>
                </div>
                <input
                  id="cors-origins"
                  type="text"
                  value={settings.corsOrigins}
                  onChange={(e) => handleChange('corsOrigins', e.target.value)}
                  className="wide-input"
                />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2>Defaults & Notifications</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <div className="setting-info">
                  <label htmlFor="default-warehouse">Default Warehouse</label>
                  <p>Pre-selected warehouse for new sessions</p>
                </div>
                <select
                  id="default-warehouse"
                  value={settings.defaultWarehouse}
                  onChange={(e) => handleChange('defaultWarehouse', e.target.value)}
                >
                  <option value="WH-001">WH-001 (Main)</option>
                  <option value="WH-002">WH-002 (Secondary)</option>
                  <option value="">None</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span id="notifications-label">Enable Notifications</span>
                  <p>Show push notifications for important events</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                    aria-labelledby="notifications-label"
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="settings-actions">
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="reset-btn" onClick={() => fetchSettings()}>
            Reset
          </button>
        </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
