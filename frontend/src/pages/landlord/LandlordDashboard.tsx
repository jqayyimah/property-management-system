import { useState, useEffect } from 'react';
import { getLandlordSummary, LandlordSummary } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';

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
  const { billingRestricted } = useAuth();
  const [summary, setSummary] = useState<LandlordSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = () => {
    setLoading(true);
    setError('');
    getLandlordSummary()
      .then(setSummary)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading)
    return (
      <div className="page-shell">
        <div className="page-hero">
          <div className="page-hero-content">
            <span className="page-kicker">Portfolio overview</span>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Loading your latest property performance, collections, and reminder
              activity.
            </p>
          </div>
        </div>
        <div className="loading-grid">
          <div className="loading-skeleton" />
          <div className="loading-skeleton" />
          <div className="loading-skeleton" />
          <div className="loading-skeleton" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="page-shell">
        <div className="page-hero">
          <div className="page-hero-content">
            <span className="page-kicker">Portfolio overview</span>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Monitor rent health, upcoming due dates, and reminder activity in
              one place.
            </p>
          </div>
        </div>
        <div className="error-msg" style={{ justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={loadSummary}>
            Retry
          </button>
        </div>
      </div>
    );
  if (!summary) return null;

  const { totals, financials, recent_rents, upcoming_due_rents, recent_reminders } = summary;

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Portfolio overview</span>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Track occupancy, collections, and reminder activity across your rental
            portfolio.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">{totals.properties} properties</span>
          <span className="badge badge-occupied">{totals.tenants} active tenants</span>
        </div>
      </div>

      {billingRestricted && (
        <div className="error-msg" style={{ alignItems: 'center', gap: '0.85rem' }}>
          <span className="badge badge-unpaid">Billing Required</span>
          <span style={{ flex: 1 }}>
            Your billing plan has expired. Renew your plan to restore access to financial details,
            reminders, and operational records.
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              window.location.href = '/billing';
            }}
          >
            View Billing Plans
          </button>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-icon">🏠</div>
          <div className="summary-card-value">{totals.properties}</div>
          <div className="summary-card-label">Properties</div>
          <div className="summary-card-note">Portfolio buildings under management</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">▣</div>
          <div className="summary-card-value">{totals.apartments}</div>
          <div className="summary-card-label">Apartments</div>
          <div className="summary-card-note">Units currently tracked in the system</div>
        </div>
        <div className="summary-card summary-card-success">
          <div className="summary-card-icon">✨</div>
          <div className="summary-card-value">{totals.vacant_apartments}</div>
          <div className="summary-card-label">Vacant</div>
          <div className="summary-card-note">Ready for new tenant placement</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">👥</div>
          <div className="summary-card-value">{totals.tenants}</div>
          <div className="summary-card-label">Tenants</div>
          <div className="summary-card-note">Current occupied accounts</div>
        </div>
        <div className="summary-card summary-card-danger">
          <div className="summary-card-icon">⚠️</div>
          <div className="summary-card-value">{totals.overdue_rents}</div>
          <div className="summary-card-label">Overdue Rents</div>
          <div className="summary-card-note">Requires follow-up or reminders</div>
        </div>
        <div className="summary-card summary-card-warning">
          <div className="summary-card-icon">🗓️</div>
          <div className="summary-card-value">{totals.upcoming_rents}</div>
          <div className="summary-card-label">Upcoming Rents</div>
          <div className="summary-card-note">Due in the next 30 days</div>
        </div>
      </div>

      <PlanRestrictedSection restricted={billingRestricted}>
        <div className="section-block">
          <div className="section-header">
            <div>
              <h2 className="section-title">Financial Summary</h2>
              <p className="section-subtitle">
                A quick view of expected collections and outstanding balances.
              </p>
            </div>
          </div>
        </div>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-icon">💳</div>
            <div className="summary-card-value" style={{ fontSize: '1.35rem' }}>
              ₦{fmt(financials.expected_rent)}
            </div>
            <div className="summary-card-label">Expected Rent</div>
          </div>
          <div className="summary-card summary-card-success">
            <div className="summary-card-icon">✅</div>
            <div className="summary-card-value" style={{ fontSize: '1.35rem' }}>
              ₦{fmt(financials.paid_rent)}
            </div>
            <div className="summary-card-label">Paid</div>
          </div>
          <div className="summary-card summary-card-danger">
            <div className="summary-card-icon">📌</div>
            <div className="summary-card-value" style={{ fontSize: '1.35rem' }}>
              ₦{fmt(financials.outstanding_rent)}
            </div>
            <div className="summary-card-label">Outstanding</div>
          </div>
        </div>

        <div className="dashboard-grid">
        <div className="section-block">
          <div className="section-header">
            <div>
              <h2 className="section-title">Upcoming Due Rents</h2>
              <p className="section-subtitle">
                Focus on leases that need reminders soon.
              </p>
            </div>
          </div>
          <div className="table-container">
            {upcoming_due_rents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🗓️</div>
                <strong>No upcoming rents</strong>
                No rents are due in the next 30 days.
              </div>
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
                          className={`badge ${
                            r.days_remaining <= 3
                              ? 'badge-unpaid'
                              : r.days_remaining <= 7
                                ? 'badge-partial'
                                : 'badge-vacant'
                          }`}
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

        <div className="section-block">
          <div className="section-header">
            <div>
              <h2 className="section-title">Recent Rents</h2>
              <p className="section-subtitle">
                Latest rent records and payment progress.
              </p>
            </div>
          </div>
          <div className="table-container">
            {recent_rents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💰</div>
                <strong>No rent records yet</strong>
                New rent entries will appear here as you create them.
              </div>
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
        <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Recent Reminders</h2>
            <p className="section-subtitle">
              Delivery history across SMS, WhatsApp, email, and dashboard.
            </p>
          </div>
        </div>
        <div className="table-container">
          {recent_reminders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <strong>No reminders sent yet</strong>
              Once reminders are triggered, delivery activity will show here.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {recent_reminders.map((rem) => (
                  <tr key={rem.id}>
                    <td>{rem.tenant_name ?? `#${rem.tenant_id}`}</td>
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
      </PlanRestrictedSection>
    </div>
  );
}
