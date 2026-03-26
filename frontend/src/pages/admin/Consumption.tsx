import { useEffect, useMemo, useState } from 'react';
import { AdminLandlord, ReminderLogEntry } from '../../types';
import { getLandlords } from '../../services/adminLandlordService';
import { getReminderLogs } from '../../services/reminderService';
import { getApiErrorMessage } from '../../utils/apiError';
import Pagination from '../../components/Pagination';

const formatCurrency = (amount: string | number, currency = 'NGN') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const COST_PER_CALL = [
  { channel: 'SMS', cost: 5 },
  { channel: 'WhatsApp', cost: 12 },
  { channel: 'Email', cost: 2.5 },
];
const ITEMS_PER_PAGE = 10;

export default function AdminConsumption() {
  const [landlords, setLandlords] = useState<AdminLandlord[]>([]);
  const [logs, setLogs] = useState<ReminderLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [landlordPage, setLandlordPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const load = async () => {
    try {
      setError('');
      const [landlordData, logData] = await Promise.all([
        getLandlords(),
        getReminderLogs(150),
      ]);
      setLandlords(landlordData);
      setLogs(logData);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load consumption data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredLandlords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return landlords;
    return landlords.filter((landlord) =>
      landlord.full_name.toLowerCase().includes(query) ||
      landlord.email.toLowerCase().includes(query) ||
      (landlord.current_plan_name ?? '').toLowerCase().includes(query)
    );
  }, [landlords, search]);

  const topLandlords = [...filteredLandlords].sort(
    (a, b) => Number(b.service_cost_total) - Number(a.service_cost_total)
  );
  const landlordTotalPages = Math.max(1, Math.ceil(topLandlords.length / ITEMS_PER_PAGE));
  const paginatedTopLandlords = topLandlords.slice(
    (landlordPage - 1) * ITEMS_PER_PAGE,
    landlordPage * ITEMS_PER_PAGE
  );

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    return (
      (log.landlord_name ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
      (log.tenant_name ?? '').toLowerCase().includes(search.trim().toLowerCase()) ||
      (log.channel_used ?? '').toLowerCase().includes(search.trim().toLowerCase())
    );
  });
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (logPage - 1) * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE
  );

  const totalServiceCost = filteredLandlords.reduce(
    (sum, landlord) => sum + Number(landlord.service_cost_total),
    0
  );
  const totalSmsCalls = filteredLandlords.reduce((sum, landlord) => sum + landlord.sms_sent_count, 0);
  const totalSmsCost = filteredLandlords.reduce(
    (sum, landlord) => sum + Number(landlord.sms_cost_total),
    0
  );
  const totalWhatsAppCalls = filteredLandlords.reduce(
    (sum, landlord) => sum + landlord.whatsapp_sent_count,
    0
  );
  const totalWhatsAppCost = filteredLandlords.reduce(
    (sum, landlord) => sum + Number(landlord.whatsapp_cost_total),
    0
  );
  const totalEmailCalls = filteredLandlords.reduce((sum, landlord) => sum + landlord.email_sent_count, 0);
  const totalEmailCost = filteredLandlords.reduce(
    (sum, landlord) => sum + Number(landlord.email_cost_total),
    0
  );
  const upgradeWatchCount = filteredLandlords.filter((landlord) => landlord.upgrade_recommended).length;

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Admin</span>
          <h1 className="page-title">Service Consumption</h1>
          <p className="page-subtitle">
            Track reminder-service spend, see per-call costs, and spot the landlords
            driving the highest operational usage.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-partial">{upgradeWatchCount} upgrade watch</span>
          <span className="badge badge-vacant">{filteredLandlords.length} landlords</span>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading service consumption...</div>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card summary-card-danger">
              <div className="summary-card-icon">₦</div>
              <div className="summary-card-value" style={{ fontSize: '1.45rem' }}>
                {formatCurrency(totalServiceCost)}
              </div>
              <div className="summary-card-label">Total Service Spend</div>
              <div className="summary-card-note">Across filtered landlords</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-icon">📩</div>
              <div className="summary-card-value">{totalSmsCalls}</div>
              <div className="summary-card-label">SMS Calls</div>
              <div className="summary-card-note">{formatCurrency(totalSmsCost)} total SMS cost</div>
            </div>
            <div className="summary-card summary-card-warning">
              <div className="summary-card-icon">💬</div>
              <div className="summary-card-value">{totalWhatsAppCalls}</div>
              <div className="summary-card-label">WhatsApp Calls</div>
              <div className="summary-card-note">
                {formatCurrency(totalWhatsAppCost)} total WhatsApp cost
              </div>
            </div>
            <div className="summary-card summary-card-success">
              <div className="summary-card-icon">✉️</div>
              <div className="summary-card-value">{totalEmailCalls}</div>
              <div className="summary-card-label">Email Sends</div>
              <div className="summary-card-note">
                {formatCurrency(totalEmailCost)} total email cost
              </div>
            </div>
          </div>

          <div className="section-block">
            <div className="section-header">
              <div>
                <h2 className="section-title">Cost Per Call</h2>
                <p className="section-subtitle">
                  Internal service-rate assumptions used to track cost exposure.
                </p>
              </div>
            </div>
            <div className="pricing-grid">
              {COST_PER_CALL.map((item) => (
                <div key={item.channel} className="pricing-card">
                  <div className="pricing-name">{item.channel}</div>
                  <div className="pricing-price">{formatCurrency(item.cost)}</div>
                  <div className="pricing-meta">Per successful send</div>
                </div>
              ))}
            </div>
          </div>

          <div className="toolbar">
            <div>
              <div className="toolbar-title">Consumption Search</div>
              <div className="toolbar-meta">
                Search landlords, plans, tenants, or channels.
              </div>
            </div>
            <div className="toolbar-group">
              <div className="toolbar-search">
                <input
                  className="form-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLandlordPage(1);
                    setLogPage(1);
                  }}
                  placeholder="Search landlord, plan, tenant, or channel"
                />
              </div>
            </div>
          </div>

          <div className="section-block">
            <div className="section-header">
              <div>
                <h2 className="section-title">Top Spending Landlords</h2>
                <p className="section-subtitle">
                  Ranked by current tracked service spend.
                </p>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Landlord</th>
                    <th>Plan</th>
                    <th>Calls</th>
                    <th>Total Spend</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {topLandlords.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📊</div>
                          <strong>No consumption data found</strong>
                          Try another landlord or plan search term.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTopLandlords.map((landlord, index) => (
                      <tr key={landlord.id}>
                        <td>{(landlordPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td>
                          <span className="cell-title">{landlord.full_name}</span>
                          <span className="cell-subtitle">{landlord.email}</span>
                        </td>
                        <td>
                          <span className="cell-title">{landlord.current_plan_name ?? '—'}</span>
                          <span className="cell-subtitle">{landlord.billing_status.replace(/_/g, ' ')}</span>
                        </td>
                        <td>
                          <span className="cell-title">
                            SMS {landlord.sms_sent_count} · WA {landlord.whatsapp_sent_count} · Email {landlord.email_sent_count}
                          </span>
                        </td>
                        <td>{formatCurrency(landlord.service_cost_total)}</td>
                        <td>
                          <span className={`badge ${landlord.upgrade_recommended ? 'badge-partial' : 'badge-paid'}`}>
                            {landlord.upgrade_recommended ? 'Upgrade Recommended' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={landlordPage}
            totalPages={landlordTotalPages}
            onPageChange={setLandlordPage}
          />
        </div>

          <div className="section-block">
            <div className="section-header">
              <div>
                <h2 className="section-title">Recent Service Calls</h2>
                <p className="section-subtitle">
                  Latest reminder sends showing landlord, channel, and per-call cost.
                </p>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Landlord</th>
                    <th>Tenant</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📬</div>
                          <strong>No service calls found</strong>
                          No reminder usage matches the current search.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.landlord_name ?? '—'}</td>
                        <td>{log.tenant_name ?? '—'}</td>
                        <td>{log.channel_used ?? '—'}</td>
                        <td>
                          <span className={`badge ${log.status === 'SENT' ? 'badge-paid' : 'badge-unpaid'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{formatCurrency(log.service_cost ?? 0, log.cost_currency ?? 'NGN')}</td>
                        <td>{new Date(log.sent_at).toLocaleString()}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={logPage}
            totalPages={logTotalPages}
            onPageChange={setLogPage}
          />
        </div>
        </>
      )}
    </div>
  );
}
