import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api } from '../services/api';
import './AnalyticsPage.css';

interface VarianceTrend {
  date: string;
  variance: number;
  count: number;
}

interface StaffPerformance {
  username: string;
  verifications: number;
  accuracy: number;
  avgTime: number;
}

export function AnalyticsPage() {
  const [varianceTrends, setVarianceTrends] = useState<VarianceTrend[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [trendsResponse, staffResponse] = await Promise.allSettled([
        api.getVarianceTrends({ days: timeRange }),
        api.getStaffPerformance(),
      ]);

      const errors: string[] = [];

      if (trendsResponse.status === 'fulfilled') {
        const data = trendsResponse.value;
        setVarianceTrends(
          data.dates.map((date, i) => ({
            date,
            variance: data.variances[i] || 0,
            count: data.counts[i] || 0,
          }))
        );
      } else {
        errors.push('Failed to load variance trends');
        setVarianceTrends([]);
      }

      if (staffResponse.status === 'fulfilled') {
        setStaffPerformance(staffResponse.value);
      } else {
        errors.push('Failed to load staff performance');
        setStaffPerformance([]);
      }

      if (errors.length > 0) {
        setError(errors.join('. '));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      console.error('Failed to fetch analytics:', err);
      setVarianceTrends([]);
      setStaffPerformance([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totalVariances = varianceTrends.reduce((sum, t) => sum + t.variance, 0);
  const totalVerifications = varianceTrends.reduce((sum, t) => sum + t.count, 0);
  const avgVarianceRate = totalVerifications > 0
    ? ((totalVariances / totalVerifications) * 100).toFixed(2)
    : '0.00';

  const maxVariance = Math.max(...varianceTrends.map(t => t.variance), 1);
  const maxCount = Math.max(...varianceTrends.map(t => t.count), 1);

  return (
    <DashboardLayout>
      <div className="analytics-page">
        <div className="page-header">
          <h1>📊 Analytics</h1>
          <p>Variance trends and staff performance metrics</p>
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <div className="time-range-selector">
          <button
            className={timeRange === 7 ? 'active' : ''}
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </button>
          <button
            className={timeRange === 14 ? 'active' : ''}
            onClick={() => setTimeRange(14)}
          >
            14 Days
          </button>
          <button
            className={timeRange === 30 ? 'active' : ''}
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Loading analytics...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <h3>Total Variances</h3>
                <p className="value">{totalVariances}</p>
                <span className="label">Last {timeRange} days</span>
              </div>
              <div className="summary-card">
                <h3>Total Verifications</h3>
                <p className="value">{totalVerifications.toLocaleString()}</p>
                <span className="label">Last {timeRange} days</span>
              </div>
              <div className="summary-card">
                <h3>Variance Rate</h3>
                <p className="value">{avgVarianceRate}%</p>
                <span className="label">Avg per verification</span>
              </div>
              <div className="summary-card">
                <h3>Active Staff</h3>
                <p className="value">{staffPerformance.length}</p>
                <span className="label">With activity</span>
              </div>
            </div>

            {/* Variance Trend Chart (Simple Bar Chart) */}
            <section className="analytics-section">
              <h2>📈 Variance Trend</h2>
              <div className="chart-container">
                <div className="bar-chart">
                  {varianceTrends.map((trend, i) => (
                    <div key={i} className="bar-group">
                      <div className="bars">
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div
                          className="bar variance-bar"
                          style={{ height: `${(trend.variance / maxVariance) * 100}%` }}
                          title={`Variances: ${trend.variance}`}
                        >
                          <span className="bar-value">{trend.variance}</span>
                        </div>
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div
                          className="bar count-bar"
                          style={{ height: `${(trend.count / maxCount) * 100}%` }}
                          title={`Verifications: ${trend.count}`}
                        >
                          <span className="bar-value">{trend.count}</span>
                        </div>
                      </div>
                      <span className="bar-label">
                        {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-color variance"></span> Variances
                  </span>
                  <span className="legend-item">
                    <span className="legend-color count"></span> Verifications
                  </span>
                </div>
              </div>
            </section>

            {/* Staff Performance Table */}
            <section className="analytics-section">
              <h2>👥 Staff Performance</h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Verifications</th>
                      <th>Accuracy</th>
                      <th>Avg Time (sec)</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffPerformance
                      .sort((a, b) => b.verifications - a.verifications)
                      .map((staff) => (
                        <tr key={staff.username}>
                          <td className="staff-name">{staff.username}</td>
                          <td className="number">{staff.verifications}</td>
                          <td className="number">
                            <span className={`accuracy ${staff.accuracy >= 98 ? 'high' : staff.accuracy >= 95 ? 'medium' : 'low'}`}>
                              {staff.accuracy.toFixed(1)}%
                            </span>
                          </td>
                          <td className="number">{staff.avgTime.toFixed(1)}s</td>
                          <td>
                            <div className="performance-bar">
                              {/* eslint-disable-next-line react/forbid-dom-props */}
                              <div
                                className={`performance-fill ${staff.accuracy >= 98 ? 'accuracy-high' : staff.accuracy >= 95 ? 'accuracy-medium' : 'accuracy-low'}`}
                                style={{
                                  width: `${Math.min(100, (staff.verifications / 350) * 100)}%`
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <div className="analytics-actions">
          <button className="refresh-btn" onClick={fetchAnalytics} disabled={loading}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
