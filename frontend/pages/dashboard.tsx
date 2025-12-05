import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

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
        const token = getAuthToken();
        const res = await fetch('/api/requests', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
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
      const token = getAuthToken();
      const res = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
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
      <h1 className="mb-4">{isAdmin ? 'All User Requests' : 'Your Requests'}</h1>
      
      {/* Date Filter */}
      {!loading && data.length > 0 && (
        <div className="card mb-3 p-3">
          <div className="row align-items-center">
            <div className="col-auto">
              <label htmlFor="dateFilter" className="form-label mb-0">Filter by Date:</label>
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
                  Clear Filter
                </button>
              </div>
            )}
            <div className="col-auto ms-auto">
              <small className="text-muted">
                Showing {paginatedData.length} of {filteredData.length} requests
              </small>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">Loading…</div>
      ) : data.length === 0 ? (
        <div className="card empty">{isAdmin ? 'No requests found in the system.' : 'No requests yet. Create your first transfer to see it here.'}</div>
      ) : filteredData.length === 0 ? (
        <div className="card empty">No requests found for the selected date.</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Submitted</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Status</th>
                <th>Recipient Name</th>
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
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="completed">Completed</option>
                          <option value="reject">Rejected</option>
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
                Previous
              </button>
              <span className="px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
