import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { api, type VerificationRecord } from '../services/api';
import './VerificationsPage.css';

interface Verification {
  id: string;
  itemCode: string;
  itemName: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
  status: 'completed' | 'pending' | 'variance';
  verifiedBy: string;
  verifiedAt: string;
  warehouse: string;
  rack: string;
}

function mapApiToVerification(record: VerificationRecord): Verification {
  const status: Verification['status'] =
    record.variance !== 0 ? 'variance' :
    record.verified_qty !== undefined ? 'completed' : 'pending';

  return {
    id: record._id,
    itemCode: record.item_code,
    itemName: record.item_name,
    expectedQty: record.system_qty,
    countedQty: record.verified_qty || 0,
    variance: record.variance || 0,
    status,
    verifiedBy: record.verified_by || '-',
    verifiedAt: record.verified_at ? new Date(record.verified_at).toLocaleString() : '-',
    warehouse: record.warehouse || '-',
    rack: '-',
  };
}

export function VerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'variance'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getVerifications({
        status: filter === 'all' ? undefined : filter,
        search: searchTerm || undefined,
        limit: 100,
      });
      setVerifications(response.items.map(mapApiToVerification));
      setTotalCount(response.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch verifications';
      setError(message);
      console.error('Failed to fetch verifications:', err);
      setVerifications([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const filteredVerifications = verifications.filter((v) => {
    const matchesFilter = filter === 'all' || v.status === filter;
    const matchesSearch =
      v.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: Verification['status']) => {
    const badges = {
      completed: 'badge-success',
      pending: 'badge-warning',
      variance: 'badge-danger',
    };
    return badges[status];
  };

  return (
    <DashboardLayout>
      <div className="verifications-page">
        <div className="page-header">
          <h1>Verifications</h1>
          <p>View and manage stock verification records</p>
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
              placeholder="Search by item code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${filter === 'variance' ? 'active' : ''}`}
              onClick={() => setFilter('variance')}
            >
              Variances
            </button>
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <p>Loading verifications...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Expected</th>
                  <th>Counted</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Verified By</th>
                  <th>Date/Time</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map((v) => (
                  <tr key={v.id}>
                    <td className="code">{v.itemCode}</td>
                    <td>{v.itemName}</td>
                    <td className="number">{v.expectedQty}</td>
                    <td className="number">{v.countedQty}</td>
                    <td className={`number ${v.variance !== 0 ? 'variance-cell' : ''}`}>
                      {v.variance > 0 ? `+${v.variance}` : v.variance}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>{v.verifiedBy}</td>
                    <td>{v.verifiedAt}</td>
                    <td>{`${v.warehouse} / ${v.rack}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredVerifications.length === 0 && (
            <div className="empty-state">
              <p>No verifications found matching your criteria.</p>
            </div>
          )}
        </div>

        <div className="table-footer">
          <span>Showing {filteredVerifications.length} of {totalCount} records</span>
          <button className="refresh-btn" onClick={fetchVerifications} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
