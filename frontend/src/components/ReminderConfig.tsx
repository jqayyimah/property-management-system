import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReminderChannels,
  getMessageTemplate,
  saveReminderChannels,
  saveMessageTemplate,
  sendTestReminder,
} from '../services/reminderService';
import { ReminderChannel } from '../types';

const CHANNEL_OPTIONS: Array<{ value: ReminderChannel; label: string }> = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'dashboard', label: 'Dashboard' },
];

export default function ReminderConfig() {
  const { isAdmin } = useAuth();
  const [template, setTemplate] = useState('');
  const [original, setOriginal] = useState('');
  const [channels, setChannels] = useState<ReminderChannel[]>([]);
  const [originalChannels, setOriginalChannels] = useState<ReminderChannel[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    getMessageTemplate().then((msg) => {
      setTemplate(msg);
      setOriginal(msg);
    });
    getReminderChannels().then((data) => {
      setChannels(data.channels);
      setOriginalChannels(data.channels);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      if (channels.length === 0) {
        setStatus('error');
        setErrorMessage('Select at least one reminder channel.');
        return;
      }

      await Promise.all([
        saveMessageTemplate(template),
        saveReminderChannels(channels),
      ]);
      setOriginal(template);
      setOriginalChannels(channels);
      setStatus('saved');
      setErrorMessage('');
    } catch {
      setStatus('error');
      setErrorMessage('Failed to save reminder settings.');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    template !== original ||
    channels.join('|') !== originalChannels.join('|');

  const handleTestSend = async () => {
    setSendingTest(true);
    setTestStatus('');
    setErrorMessage('');

    try {
      const result = await sendTestReminder({
        email: testEmail || undefined,
        phone: testPhone || undefined,
      });
      setTestStatus(
        `${result.message} via ${result.sent_channels.join(', ')}.`
      );
    } catch {
      setErrorMessage('Failed to send test reminder.');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="config-card">
      <h2 className="config-title">Reminder Channels</h2>
      <p className="config-hint">
        Choose where due reminders should be delivered.
      </p>
      <p className="config-hint">
        SMS and WhatsApp use the tenant phone number, Email uses the tenant email,
        and Dashboard logs an in-app notification without external delivery.
      </p>

      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        {CHANNEL_OPTIONS.map((option) => {
          const checked = channels.includes(option.value);
          return (
            <label
              key={option.value}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  setStatus('idle');
                  setErrorMessage('');
                  setChannels((current) =>
                    e.target.checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value)
                  );
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>

      <h2 className="config-title">Reminder Message Template</h2>
      <p className="config-hint">
        Supported variables:{' '}
        <code>
          {'{tenant_name}'} {'{property_name}'} {'{apartment}'} {'{amount}'}{' '}
          {'{due_date}'}
        </code>
      </p>
      <p className="config-hint">
        HTML is supported for email rendering. SMS, WhatsApp, and dashboard reminders
        are automatically converted to clean plain text.
      </p>

      <textarea
        className="config-textarea"
        value={template}
        onChange={(e) => {
          setTemplate(e.target.value);
          setStatus('idle');
        }}
        rows={6}
        placeholder="Loading..."
      />

      {status === 'saved' && (
        <div className="config-success">Template saved.</div>
      )}
      {status === 'error' && (
        <div className="error-msg">{errorMessage || 'Failed to save reminder settings.'}</div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {isDirty && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setTemplate(original);
              setChannels(originalChannels);
              setStatus('idle');
              setErrorMessage('');
            }}
          >
            Discard
          </button>
        )}
      </div>

      {isAdmin && (
        <div style={{ marginTop: '2rem' }}>
          <h2 className="config-title">Test Send Reminder</h2>
          <p className="config-hint">
            Admin only. Send a test reminder using the currently enabled channels.
          </p>
          <div className="form-group">
            <label className="form-label">Test Email</label>
            <input
              type="email"
              className="form-input"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Optional for email channel"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Test Phone</label>
            <input
              className="form-input"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Optional for SMS / WhatsApp channels"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestSend}
            disabled={sendingTest}
          >
            {sendingTest ? 'Sending test...' : 'Send Test Reminder'}
          </button>
          {testStatus && (
            <div className="config-success" style={{ marginTop: '0.75rem' }}>
              {testStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
