import { useEffect, useState } from 'react';
import { getAuthToken } from '../lib/auth';

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
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hashes, setHashes] = useState<Record<string, string>>({});

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
              {data.map(r => {
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
