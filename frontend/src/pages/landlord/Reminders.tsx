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

type TriggerState = 'idle' | 'loading' | 'success' | 'error';

export default function Reminders() {
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [rents, setRents] = useState<RentReminderInfo[]>([]);
  const [logs, setLogs] = useState<ReminderLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerState, setTriggerState] = useState<TriggerState>('idle');
  const [triggerMsg, setTriggerMsg] = useState('');

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

  return (
    <div>
      {/* ── Header & trigger ──────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">Rent Reminders</h1>
        <button
          className="btn btn-primary"
          onClick={handleTrigger}
          disabled={triggerState === 'loading'}
        >
          {triggerState === 'loading' ? 'Sending...' : 'Send Rent Reminders'}
        </button>
      </div>

      {triggerMsg && (
        <div
          className={triggerState === 'error' ? 'error-msg' : 'config-success'}
          style={{ marginBottom: '1rem' }}
        >
          {triggerMsg}
        </div>
      )}

      {error && (
        <div className="error-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {/* ── A: Summary cards ─────────────────────────────── */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-value">{summary.total_upcoming}</div>
            <div className="summary-card-label">Upcoming Rents</div>
          </div>
          <div className="summary-card summary-card-danger">
            <div className="summary-card-value">{summary.total_overdue}</div>
            <div className="summary-card-label">Overdue Rents</div>
          </div>
          <div className="summary-card summary-card-success">
            <div className="summary-card-value">{summary.total_sent_today}</div>
            <div className="summary-card-label">Reminders Sent Today</div>
          </div>
        </div>
      )}

      {/* ── B: Rents requiring attention ─────────────────── */}
      <h2 className="section-title">Rents Requiring Attention</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <ReminderTable rows={rents} />
      )}

      {/* ── D, E, F: Config (channels, test, template) ───── */}
      <div style={{ marginTop: '2rem' }}>
        <ReminderConfig />
      </div>

      {/* ── G: Reminder history ───────────────────────────── */}
      <div style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Reminder History</h2>
        <div className="table-container">
          {logs.length === 0 ? (
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
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.tenant_id}</td>
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
      </div>
    </div>
  );
}
