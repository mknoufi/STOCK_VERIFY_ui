import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import './ReportsPage.css';

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
}

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAvailableReports();
      setReports(response.reports);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(message);
      console.error('Failed to fetch reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = reports.filter(
    (r) => selectedCategory === 'all' || r.category === selectedCategory
  );

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      users: '👥',
      system: '⚙️',
      sync: '🔄',
      logs: '📝',
      audit: '📋',
    };
    return icons[category] || '📄';
  };

  const handleGenerate = async (reportId: string) => {
    setGeneratingId(reportId);
    try {
      const data = await api.generateReport({
        reportId,
        format: 'json',
      });
      console.log('Report generated:', data);
      alert('Report generated successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      alert(`Error: ${message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownload = async (reportId: string, format: 'csv' | 'excel') => {
    setGeneratingId(reportId);
    try {
      const blob = await api.generateReport({
        reportId,
        format,
      });
      if (blob instanceof Blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportId}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download report';
      alert(`Error: ${message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const categories = ['all', ...new Set(reports.map((r) => r.category))];

  return (
    <DashboardLayout>
      <div className="reports-page">
        <div className="page-header">
          <h1>Reports</h1>
          <p>Generate and download system reports</p>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading reports...</div>
        ) : (
          <>
            <div className="report-types">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`type-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Reports' : `${getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
                </button>
              ))}
            </div>

            <div className="reports-grid">
              {filteredReports.length === 0 ? (
                <div className="empty-state">No reports available</div>
              ) : (
                filteredReports.map((report) => (
                  <div key={report.id} className="report-card">
                    <div className="report-icon">{getCategoryIcon(report.category)}</div>
                    <div className="report-content">
                      <h3>{report.name}</h3>
                      <p>{report.description}</p>
                      <div className="report-meta">
                        <span className="meta-item">
                          <strong>Category:</strong> {report.category}
                        </span>
                      </div>
                    </div>
                    <div className="report-actions">
                      <button
                        className="generate-btn"
                        onClick={() => handleGenerate(report.id)}
                        disabled={generatingId === report.id}
                      >
                        {generatingId === report.id ? 'Generating...' : 'Generate'}
                      </button>
                      <button
                        className="download-btn"
                        onClick={() => handleDownload(report.id, 'csv')}
                        disabled={generatingId === report.id}
                      >
                        CSV
                      </button>
                      <button
                        className="download-btn"
                        onClick={() => handleDownload(report.id, 'excel')}
                        disabled={generatingId === report.id}
                      >
                        Excel
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
