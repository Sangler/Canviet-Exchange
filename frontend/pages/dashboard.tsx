import { useEffect, useState } from 'react';

type RequestItem = {
  _id: string;
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
};

export default function DashboardPage() {
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/requests');
        const json = await res.json();
        setData(json.requests || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container">
      <h1 className="mb-4">Your Requests</h1>
      {loading ? (
        <div className="card">Loading…</div>
      ) : data.length === 0 ? (
        <div className="card empty">No requests yet. Create your first transfer to see it here.</div>
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
              {data.map(r => (
                <tr key={r._id}>
                  <td className="mono hidden sm:table-cell">{r._id.slice(-6)}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.amountSent} {r.fromCurrency}</td>
                  <td>{r.exchangeRate ?? '-'}</td>
                  <td>
                    <span className={`badge ${
                      r.status === 'completed' ? 'bg-success' :
                      r.status === 'approved' ? 'bg-info' :
                      r.status === 'pending' ? 'bg-warning' :
                      r.status === 'reject' ? 'bg-danger' :
                      'bg-secondary'
                    }`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td>{r.recipientBank?.accountHolderName || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
