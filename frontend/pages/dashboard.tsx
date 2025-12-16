import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

type RequestItem = {
  _id: string;
  referenceID?: string;
  createdAt: string;
  fromCurrency: string;
  toCurrency: string;
  amountSent: number;
  amountReceived?: number;
  exchangeRate?: number;
  status: 'pending' | 'approved' | 'reject' | 'completed';
  recipientBank?: {
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
  };
  receiptHash?: string | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [filterDate, setFilterDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/requests', { credentials: 'include' });
        const json = await res.json();
        const requests = json.requests || [];
        setData(requests);
        // Server now provides `receiptHash` on each request when available; store in `hashes` map for backward compatibility
        const hashMap: Record<string, string> = {};
        for (const req of requests) {
          if (req.receiptHash) hashMap[req._id] = req.receiptHash;
        }
        setHashes(hashMap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    setUpdatingStatus(prev => ({ ...prev, [requestId]: true }));
      try {
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update status');
      }
      
      // Update local state
      setData(prev => prev.map(req => 
        req._id === requestId ? { ...req, status: newStatus as any } : req
      ));
    } catch (error: any) {
      alert(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Calculate date range (last 2000 days from today)
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDate = new Date(today.getTime() - 2000 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Filter data by date (input is YYYY-MM-DD from date picker)
  const filteredData = filterDate
    ? data.filter(r => {
        const reqDate = new Date(r.createdAt);
        const reqDateString = reqDate.toISOString().split('T')[0];
        return reqDateString === filterDate;
      })
    : data;

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate]);

  return (
    <div className="container">
      <h1 className="mb-4 text-center">{isAdmin ? t('dashboard.allUserRequests') : t('dashboard.yourRequests')}</h1>
      
      {/* Date Filter */}
      {!loading && data.length > 0 && (
        <div className="card mb-3 p-3">
          <div className="row align-items-center">
            <div className="col-auto">
              <label htmlFor="dateFilter" className="form-label mb-0">{t('dashboard.filterByDate')}</label>
            </div>
            <div className="col-auto">
              <input
                id="dateFilter"
                type="date"
                className="form-control"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                min={minDate}
                max={maxDate}
                style={{ width: '180px' }}
              />
            </div>
            {filterDate && (
              <div className="col-auto">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setFilterDate('')}
                >
                  {t('dashboard.clearFilter')}
                </button>
              </div>
            )}
            <div className="col-auto ms-auto">
              <small className="text-muted">
                {t('dashboard.showing')} {paginatedData.length} {t('dashboard.of')} {filteredData.length} {t('dashboard.requests')}
              </small>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">{t('dashboard.loading')}</div>
      ) : data.length === 0 ? (
        <div className="card empty">{isAdmin ? t('dashboard.noRequests') : t('dashboard.startFirstTransfer')}</div>
      ) : filteredData.length === 0 ? (
        <div className="card empty">{t('dashboard.noRequests')}</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>{t('dashboard.referenceId')}</th>
                <th>{t('dashboard.date')}</th>
                <th>{t('dashboard.amountSent')}</th>
                <th>{t('dashboard.rate')}</th>
                <th>{t('dashboard.status')}</th>
                <th>{t('dashboard.recipient')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(r => {
                const receiptHash = hashes[r._id];
                return (
                  <tr key={r._id}>
                    <td className="mono hidden sm:table-cell">
                      <a href={`/transfers/receipt/${receiptHash}`} className="link-underline">
                        {r._id.slice(-6)}
                      </a>
                    </td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.amountSent} {r.fromCurrency}</td>
                    <td>{r.exchangeRate ?? '-'}</td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r._id, e.target.value)}
                          disabled={updatingStatus[r._id]}
                          className={`form-select form-select-sm ${
                            r.status === 'completed' ? 'text-success' :
                            r.status === 'approved' ? 'text-info' :
                            r.status === 'pending' ? 'text-warning' :
                            r.status === 'reject' ? 'text-danger' :
                            ''
                          }`}
                          style={{ minWidth: '120px' }}
                        >
                          <option value="pending">{t('dashboard.pending')}</option>
                          <option value="approved">{t('dashboard.approved')}</option>
                          <option value="completed">{t('dashboard.completed')}</option>
                          <option value="reject">{t('dashboard.rejected')}</option>
                        </select>
                      ) : (
                        <span className={`badge ${
                          r.status === 'completed' ? 'bg-success' :
                          r.status === 'approved' ? 'bg-info' :
                          r.status === 'pending' ? 'bg-warning' :
                          r.status === 'reject' ? 'bg-danger' :
                          'bg-secondary'
                        }`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      )}
                    </td>
                    <td>{r.recipientBank?.accountHolderName || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                {t('dashboard.pagination.previous')}
              </button>
              <span className="px-3">
                {t('dashboard.pagination.page')} {currentPage} {t('dashboard.of')} {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                {t('dashboard.pagination.next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
