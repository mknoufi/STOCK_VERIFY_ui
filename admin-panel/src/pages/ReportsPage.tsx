import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import { FileText, Download, Calendar } from 'lucide-react';
import './ReportsPage.css';

export const ReportsPage: React.FC = () => {
  const [exportType, setExportType] = useState<'sessions' | 'count_lines' | 'variances'>('sessions');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      const blob = await api.exportData(exportFormat, exportType);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export data');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="reports-page">
        <div className="reports-header">
          <div>
            <h1>Reports</h1>
            <p className="reports-subtitle">Export data and generate reports</p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <div className="reports-content">
          <div className="export-card">
            <div className="export-card-header">
              <FileText size={24} />
              <h2>Data Export</h2>
            </div>
            
            <div className="export-form">
              <div className="form-group">
                <label>Export Type</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="form-select"
                >
                  <option value="sessions">Sessions</option>
                  <option value="count_lines">Count Lines</option>
                  <option value="variances">Variances</option>
                </select>
              </div>

              <div className="form-group">
                <label>Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="form-select"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-export"
              >
                <Download size={18} />
                {exporting ? 'Exporting...' : 'Export Data'}
              </button>
            </div>
          </div>

          <div className="reports-info">
            <h3>Available Reports</h3>
            <ul className="reports-list">
              <li>
                <strong>Sessions:</strong> All stock verification sessions with details
              </li>
              <li>
                <strong>Count Lines:</strong> Individual verification records
              </li>
              <li>
                <strong>Variances:</strong> Items with quantity discrepancies
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
