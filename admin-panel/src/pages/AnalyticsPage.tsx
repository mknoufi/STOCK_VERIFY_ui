import React, { useState, useEffect, useCallback } from 'react';
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

export const AnalyticsPage: React.FC = () => {
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

      if (trendsResponse.status === 'fulfilled') {
        const data = trendsResponse.value;
        setVarianceTrends(
          data.dates.map((date: string, i: number) => ({
            date,
            variance: data.variances[i] || 0,
            count: data.counts[i] || 0,
          }))
        );
      } else {
        console.error('Failed to load variance trends');
      }

      if (staffResponse.status === 'fulfilled') {
        setStaffPerformance(staffResponse.value.staff);
      } else {
        console.error('Failed to load staff performance');
      }
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchAnalytics}>Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="analytics-page">
        <div className="page-header">
          <h1>Analytics Dashboard</h1>
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
        </div>

        <div className="analytics-grid">
          <div className="card variance-chart">
            <h3>Variance Trends</h3>
            <div className="chart-container">
              {/* Placeholder for chart - in a real app use Recharts or Chart.js */}
              <div className="chart-placeholder">
                {varianceTrends.map((trend, i) => (
                  <div key={i} className="chart-bar-group">
                    <div
                      className="bar variance"
                      style={{ height: `${Math.min(trend.variance * 10, 100)}%` }}
                      title={`Variance: ${trend.variance}`}
                    ></div>
                    <div
                      className="bar count"
                      style={{ height: `${Math.min(trend.count * 5, 100)}%` }}
                      title={`Count: ${trend.count}`}
                    ></div>
                    <span className="label">{trend.date.slice(5)}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span className="legend-item variance">Variance</span>
                <span className="legend-item count">Total Counts</span>
              </div>
            </div>
          </div>

          <div className="card staff-performance">
            <h3>Staff Performance</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Verifications</th>
                    <th>Accuracy</th>
                    <th>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerformance.map((staff) => (
                    <tr key={staff.username}>
                      <td>{staff.username}</td>
                      <td>{staff.verifications}</td>
                      <td>
                        <span className={`badge ${staff.accuracy >= 95 ? 'success' : staff.accuracy >= 80 ? 'warning' : 'danger'}`}>
                          {staff.accuracy}%
                        </span>
                      </td>
                      <td>{staff.avgTime}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
