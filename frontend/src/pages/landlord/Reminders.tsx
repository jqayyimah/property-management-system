import { useState, useEffect, useCallback } from 'react';
import { ReminderSummary, RentReminderInfo, ReminderLogEntry } from '../../types';
import {
  getReminderSummary,
  getReminderRents,
  triggerReminders,
  getReminderLogs,
} from '../../services/reminderService';
import ReminderTable from '../../components/ReminderTable';
import ReminderConfig from '../../components/ReminderConfig';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';

type TriggerState = 'idle' | 'loading' | 'success' | 'error';
const ITEMS_PER_PAGE = 10;

export default function Reminders() {
  const { billingRestricted, billingLoading } = useAuth();
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [rents, setRents] = useState<RentReminderInfo[]>([]);
  const [logs, setLogs] = useState<ReminderLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerState, setTriggerState] = useState<TriggerState>('idle');
  const [triggerMsg, setTriggerMsg] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, r, l] = await Promise.all([
        getReminderSummary(),
        getReminderRents(),
        getReminderLogs(50),
      ]);
      setSummary(s);
      setRents(r);
      setLogs(l);
      setLogPage(1);
    } catch {
      setError('Failed to load reminder data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTrigger = async () => {
    setTriggerState('loading');
    setTriggerMsg('');
    try {
      const result = await triggerReminders();
      setTriggerMsg(
        result.reminders_sent > 0
          ? `${result.reminders_sent} reminder${result.reminders_sent !== 1 ? 's' : ''} sent.`
          : 'No reminders due at this time.'
      );
      setTriggerState('success');
      load();
    } catch {
      setTriggerMsg('Failed to trigger reminders. Check server logs.');
      setTriggerState('error');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const query = logSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      log.reminder_type.toLowerCase().includes(query) ||
      (log.channel_used ?? '').toLowerCase().includes(query) ||
      log.status.toLowerCase().includes(query)
    );
  });
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
  const logTotalPages = Math.max(1, Math.ceil(sortedLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = sortedLogs.slice(
    (logPage - 1) * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE
  );

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Automation</span>
          <h1 className="page-title">Rent Reminders</h1>
          <p className="page-subtitle">
            Review upcoming reminders, refine your message template, and send due
            notices across active channels.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">{logs.length} history entries</span>
          <button
            className="btn btn-primary"
            onClick={handleTrigger}
            disabled={triggerState === 'loading' || billingLoading || billingRestricted}
          >
            {triggerState === 'loading' ? 'Sending...' : 'Send Rent Reminders'}
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className={triggerState === 'error' ? 'error-msg' : 'config-success'}>
          {triggerMsg}
        </div>
      )}

      {error && (
        <div className="error-msg" style={{ justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-icon">🗓️</div>
            <div className="summary-card-value">{summary.total_upcoming}</div>
            <div className="summary-card-label">Upcoming Rents</div>
          </div>
          <div className="summary-card summary-card-danger">
            <div className="summary-card-icon">⚠️</div>
            <div className="summary-card-value">{summary.total_overdue}</div>
            <div className="summary-card-label">Overdue Rents</div>
          </div>
          <div className="summary-card summary-card-success">
            <div className="summary-card-icon">🔔</div>
            <div className="summary-card-value">{summary.total_sent_today}</div>
            <div className="summary-card-label">Reminders Sent Today</div>
          </div>
        </div>
      )}

      <PlanRestrictedSection restricted={billingRestricted}>
      <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Rents Requiring Attention</h2>
            <p className="section-subtitle">
              These rents are the next candidates for reminder delivery.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading reminder candidates...</div>
        ) : (
          <ReminderTable rows={rents} />
        )}
      </div>

      <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Reminder Settings</h2>
            <p className="section-subtitle">
              Configure channels, update the template, and test delivery safely.
            </p>
          </div>
        </div>
        <ReminderConfig />
      </div>

      <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Reminder History</h2>
            <p className="section-subtitle">
              Search the most recent reminder activity across all channels.
            </p>
          </div>
        </div>
        <div className="toolbar">
          <div>
            <div className="toolbar-title">Recent Delivery Log</div>
            <div className="toolbar-meta">
              Showing newest reminder events first.
            </div>
          </div>
          <div className="toolbar-group">
            <div className="toolbar-search">
              <input
                className="form-input"
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                placeholder="Search reminder type, channel, or status"
              />
            </div>
          </div>
        </div>
        <div className="table-container">
          {sortedLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📬</div>
              <strong>
                {logSearch ? 'No reminder logs match your search' : 'No reminders sent yet'}
              </strong>
              {logSearch
                ? 'Try another channel, reminder type, or delivery status.'
                : 'Triggered reminders will appear here once delivery begins.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, index) => (
                  <tr key={log.id}>
                    <td>{(logPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                    <td>{log.reminder_type.replace('_', ' ')}</td>
                    <td>{log.channel_used ?? '—'}</td>
                    <td>
                      <span
                        className={`badge ${log.status === 'SENT' ? 'badge-paid' : 'badge-unpaid'}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>{new Date(log.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          page={logPage}
          totalPages={logTotalPages}
          onPageChange={setLogPage}
        />
      </div>
      </PlanRestrictedSection>
    </div>
  );
}
