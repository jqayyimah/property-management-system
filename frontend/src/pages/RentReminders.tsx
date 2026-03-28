import { useState, useEffect, useCallback } from 'react';
import { ReminderSummary, RentReminderInfo } from '../types';
import {
  getReminderSummary,
  getReminderRents,
  triggerReminders,
} from '../services/reminderService';
import ReminderTable from '../components/ReminderTable';
import ReminderConfig from '../components/ReminderConfig';

type TriggerState = 'idle' | 'loading' | 'success' | 'error';

export default function RentReminders() {
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [rents, setRents] = useState<RentReminderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggerState, setTriggerState] = useState<TriggerState>('idle');
  const [triggerMsg, setTriggerMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([getReminderSummary(), getReminderRents()]);
      setSummary(s);
      setRents(r);
    } catch {
      setError('Failed to load reminder data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      // Refresh summary and table
      load();
    } catch {
      setTriggerMsg('Failed to trigger reminders. Check server logs.');
      setTriggerState('error');
    }
  };

  return (
    <div>
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

      {/* Trigger feedback */}
      {triggerMsg && (
        <div
          className={
            triggerState === 'error' ? 'error-msg' : 'config-success'
          }
          style={{ marginBottom: '1rem' }}
        >
          {triggerMsg}
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {/* Summary cards */}
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

      {/* Rent table */}
      <h2 className="section-title">Rents Requiring Attention</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <ReminderTable rows={rents} />
      )}

      {/* Message template editor */}
      <div style={{ marginTop: '2rem' }}>
        <ReminderConfig variant="template" />
      </div>
    </div>
  );
}
