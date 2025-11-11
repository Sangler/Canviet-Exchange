import { useEffect, useState } from 'react';

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
};

// Generate receipt hash from referenceID using Web Crypto API
async function generateReceiptHash(referenceID: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(referenceID);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 24);
}

export default function DashboardPage() {
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/requests');
        const json = await res.json();
        const requests = json.requests || [];
        setData(requests);
        
        // Pre-compute all receipt hashes
        const hashMap: Record<string, string> = {};
        for (const req of requests) {
          if (req.referenceID) {
            hashMap[req._id] = await generateReceiptHash(req.referenceID);
          }
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
                      {receiptHash ? (
                        <a href={`/transfers/receipt/${receiptHash}`} style={{ color: '#0369a1', textDecoration: 'underline' }}>
                          {r._id.slice(-6)}
                        </a>
                      ) : (
                        r._id.slice(-6)
                      )}
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
