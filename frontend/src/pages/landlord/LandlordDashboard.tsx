import { useState, useEffect } from 'react';
import { getLandlordSummary, LandlordSummary } from '../../services/dashboardService';

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusClass(status: string, endDate: string) {
  const isOverdue = new Date(endDate) < new Date() && status !== 'PAID';
  if (isOverdue) return 'badge-unpaid';
  if (status === 'PAID') return 'badge-paid';
  if (status === 'PARTIAL') return 'badge-partial';
  return 'badge-unpaid';
}

function effectiveStatus(status: string, endDate: string) {
  if (status === 'PAID') return 'PAID';
  if (new Date(endDate) < new Date()) return 'OVERDUE';
  return status;
}

export default function LandlordDashboard() {
  const [summary, setSummary] = useState<LandlordSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLandlordSummary()
      .then(setSummary)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return (
    <div style={{ padding: '2rem' }}>
      <div className="error-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{error}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => { setError(''); setLoading(true); getLandlordSummary().then(setSummary).catch(() => setError('Failed to load dashboard')).finally(() => setLoading(false)); }}>Retry</button>
      </div>
    </div>
  );
  if (!summary) return null;

  const { totals, financials, recent_rents, upcoming_due_rents, recent_reminders } = summary;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* ── Overview cards ─────────────────────────────────── */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-value">{totals.properties}</div>
          <div className="summary-card-label">Properties</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{totals.apartments}</div>
          <div className="summary-card-label">Apartments</div>
        </div>
        <div className="summary-card summary-card-success">
          <div className="summary-card-value">{totals.vacant_apartments}</div>
          <div className="summary-card-label">Vacant</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{totals.tenants}</div>
          <div className="summary-card-label">Tenants</div>
        </div>
        <div className="summary-card summary-card-danger">
          <div className="summary-card-value">{totals.overdue_rents}</div>
          <div className="summary-card-label">Overdue Rents</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{totals.upcoming_rents}</div>
          <div className="summary-card-label">Upcoming Rents</div>
        </div>
      </div>

      {/* ── Financial totals ────────────────────────────────── */}
      <h2 className="section-title" style={{ marginTop: '1.5rem' }}>Financial Summary</h2>
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="summary-card">
          <div className="summary-card-value" style={{ fontSize: '1.2rem' }}>
            ₦{fmt(financials.expected_rent)}
          </div>
          <div className="summary-card-label">Expected Rent</div>
        </div>
        <div className="summary-card summary-card-success">
          <div className="summary-card-value" style={{ fontSize: '1.2rem' }}>
            ₦{fmt(financials.paid_rent)}
          </div>
          <div className="summary-card-label">Paid</div>
        </div>
        <div className="summary-card summary-card-danger">
          <div className="summary-card-value" style={{ fontSize: '1.2rem' }}>
            ₦{fmt(financials.outstanding_rent)}
          </div>
          <div className="summary-card-label">Outstanding</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* ── Upcoming due rents ──────────────────────────── */}
        <div>
          <h2 className="section-title">Upcoming Due Rents</h2>
          <div className="table-container">
            {upcoming_due_rents.length === 0 ? (
              <div className="empty-state">No upcoming rents in next 30 days</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Due Date</th>
                    <th>Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming_due_rents.map((r) => (
                    <tr key={r.id}>
                      <td>{r.tenant_name}</td>
                      <td>{r.property_name}</td>
                      <td>{r.end_date}</td>
                      <td>
                        <span
                          className={`badge ${r.days_remaining <= 3 ? 'badge-unpaid' : r.days_remaining <= 7 ? 'badge-partial' : 'badge-vacant'}`}
                        >
                          {r.days_remaining}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Recent rents ────────────────────────────────── */}
        <div>
          <h2 className="section-title">Recent Rents</h2>
          <div className="table-container">
            {recent_rents.length === 0 ? (
              <div className="empty-state">No rent records yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_rents.map((r) => (
                    <tr key={r.id}>
                      <td>{r.tenant_name}</td>
                      <td>{r.property_name}</td>
                      <td>₦{fmt(r.amount)}</td>
                      <td>
                        <span className={`badge ${statusClass(r.status, r.end_date)}`}>
                          {effectiveStatus(r.status, r.end_date)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent reminders ────────────────────────────────── */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 className="section-title">Recent Reminders</h2>
        <div className="table-container">
          {recent_reminders.length === 0 ? (
            <div className="empty-state">No reminders sent yet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {recent_reminders.map((rem) => (
                  <tr key={rem.id}>
                    <td>{rem.tenant_id}</td>
                    <td>{rem.reminder_type.replace('_', ' ')}</td>
                    <td>{rem.channel_used ?? '—'}</td>
                    <td>
                      <span
                        className={`badge ${rem.status === 'SENT' ? 'badge-paid' : 'badge-unpaid'}`}
                      >
                        {rem.status}
                      </span>
                    </td>
                    <td>{new Date(rem.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
