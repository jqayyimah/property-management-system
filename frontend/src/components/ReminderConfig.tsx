import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getReminderChannels,
  getMessageTemplate,
  getReminderSchedule,
  saveReminderChannels,
  saveReminderSchedule,
  saveMessageTemplate,
  sendTestReminder,
} from '../services/reminderService';
import { ReminderChannel, ReminderScheduleRule } from '../types';

const CHANNEL_OPTIONS: Array<{
  value: ReminderChannel;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'sms',
    label: 'SMS',
    icon: '📩',
    description: 'Fast tenant text reminders using saved phone numbers.',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    description: 'Conversational reminder delivery through WhatsApp.',
  },
  {
    value: 'email',
    label: 'Email',
    icon: '✉️',
    description: 'Best for richer layouts and branded reminder messages.',
  },
  {
    value: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    description: 'Internal in-app reminder logs visible from the platform.',
  },
];

const PREVIEW_VALUES: Record<string, string> = {
  tenant_name: 'Barbie Roberts',
  property_name: 'West End Residences',
  apartment: '2 Bedroom - Flat B2',
  amount: '₦1,000,000.00',
  due_date: '2026-03-31',
};

const formatTemplateForEditor = (message: string) => {
  if (!/<\/?[a-z][\s\S]*>/i.test(message)) {
    return message;
  }

  return message
    .replace(/>\s*</g, '>\n<')
    .replace(/^\s+|\s+$/g, '');
};

export default function ReminderConfig() {
  const { isAdmin } = useAuth();
  const [template, setTemplate] = useState('');
  const [original, setOriginal] = useState('');
  const [channels, setChannels] = useState<ReminderChannel[]>([]);
  const [originalChannels, setOriginalChannels] = useState<ReminderChannel[]>([]);
  const [scheduleRules, setScheduleRules] = useState<ReminderScheduleRule[]>([]);
  const [originalScheduleRules, setOriginalScheduleRules] = useState<ReminderScheduleRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testStatus, setTestStatus] = useState('');

  const previewMessage = template.replace(
    /\{(tenant_name|property_name|apartment|amount|due_date)\}/g,
    (_, key: keyof typeof PREVIEW_VALUES) => PREVIEW_VALUES[key] ?? `{${key}}`
  );
  const previewContainsHtml = /<\/?[a-z][\s\S]*>/i.test(previewMessage);

  useEffect(() => {
    getMessageTemplate().then((msg) => {
      const formatted = formatTemplateForEditor(msg);
      setTemplate(formatted);
      setOriginal(formatted);
    });
    getReminderChannels().then((data) => {
      setChannels(data.channels);
      setOriginalChannels(data.channels);
    });
    getReminderSchedule().then((data) => {
      setScheduleRules(data.rules);
      setOriginalScheduleRules(data.rules);
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
        saveReminderSchedule(scheduleRules),
      ]);
      setOriginal(formatTemplateForEditor(template));
      setOriginalChannels(channels);
      setOriginalScheduleRules(scheduleRules);
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
    channels.join('|') !== originalChannels.join('|') ||
    JSON.stringify(scheduleRules) !== JSON.stringify(originalScheduleRules);

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
      <div className="section-header">
        <div>
          <h2 className="config-title">Reminder Channels</h2>
          <p className="config-hint">
            Choose which channels send rent alerts for this landlord account.
          </p>
        </div>
        <span className="badge badge-vacant">{channels.length} active</span>
      </div>
      <p className="config-hint">
        SMS and WhatsApp use the tenant phone number, Email uses the tenant email,
        and Dashboard creates an in-app record without external delivery.
      </p>

      <div className="toggle-grid">
        {CHANNEL_OPTIONS.map((option) => {
          const checked = channels.includes(option.value);
          return (
            <label
              key={option.value}
              className={`toggle-card ${checked ? 'is-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                style={{ display: 'none' }}
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
              <span className="toggle-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="toggle-content">
                <span className="toggle-title">{option.label}</span>
                <span className="toggle-desc">{option.description}</span>
              </span>
              <span className="toggle-switch" aria-hidden="true" />
            </label>
          );
        })}
      </div>

      <div className="divider" />

      <div className="section-header">
        <div>
          <h2 className="config-title">Reminder Schedule</h2>
          <p className="config-hint">
            Control when each reminder milestone becomes eligible for scheduler delivery.
            All times are in WAT (UTC+1).
          </p>
        </div>
        <span className="badge badge-vacant">
          {scheduleRules.filter((rule) => rule.enabled).length} active
        </span>
      </div>

      <div className="schedule-grid">
        {scheduleRules.map((rule) => (
          <div
            key={rule.reminder_type}
            className={`schedule-card ${rule.enabled ? 'is-active' : ''}`}
          >
            <div className="schedule-card-head">
              <div>
                <div className="toggle-title">{rule.label}</div>
                <div className="toggle-desc">
                  {rule.days_before_due < 0
                    ? 'Triggers once after the due date has passed.'
                    : rule.days_before_due === 0
                      ? 'Triggers on the due date.'
                      : `Triggers ${rule.days_before_due} day${rule.days_before_due === 1 ? '' : 's'} before the due date.`}
                </div>
              </div>
              <label className="schedule-switch">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => {
                    setStatus('idle');
                    setErrorMessage('');
                    setScheduleRules((current) =>
                      current.map((item) =>
                        item.reminder_type === rule.reminder_type
                          ? { ...item, enabled: e.target.checked }
                          : item
                      )
                    );
                  }}
                />
                <span>{rule.enabled ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Trigger Time</label>
              <input
                type="time"
                className="form-input"
                value={rule.trigger_time}
                disabled={!rule.enabled}
                onChange={(e) => {
                  setStatus('idle');
                  setErrorMessage('');
                  setScheduleRules((current) =>
                    current.map((item) =>
                      item.reminder_type === rule.reminder_type
                        ? { ...item, trigger_time: e.target.value }
                        : item
                    )
                  );
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div className="section-header">
        <div>
          <h2 className="config-title">Reminder Message Template</h2>
          <p className="config-hint">
            Write the base message once. Email can render HTML while SMS,
            WhatsApp, and dashboard alerts are converted to clean plain text.
          </p>
        </div>
        <span className="badge badge-occupied">Live preview enabled</span>
      </div>
      <div className="token-list">
        <span className="token-pill">{'{tenant_name}'}</span>
        <span className="token-pill">{'{property_name}'}</span>
        <span className="token-pill">{'{apartment}'}</span>
        <span className="token-pill">{'{amount}'}</span>
        <span className="token-pill">{'{due_date}'}</span>
      </div>

      <div className="template-grid">
        <div>
          <textarea
            className="config-textarea"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setStatus('idle');
            }}
            rows={8}
            placeholder="Loading..."
          />
        </div>
        <div className="preview-card">
          <div className="preview-title">Message Preview</div>
          <div className="preview-subtitle">
            Sample render using placeholder values for a due rent notice.
          </div>
          {previewContainsHtml ? (
            <div
              className="preview-body preview-body-html"
              dangerouslySetInnerHTML={{ __html: previewMessage }}
            />
          ) : (
            <div className="preview-body">{previewMessage}</div>
          )}
        </div>
      </div>

      {status === 'saved' && (
        <div className="config-success">Reminder settings saved successfully.</div>
      )}
      {status === 'error' && (
        <div className="error-msg">
          {errorMessage || 'Failed to save reminder settings.'}
        </div>
      )}

      <div className="config-actions">
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
              setScheduleRules(originalScheduleRules);
              setStatus('idle');
              setErrorMessage('');
            }}
          >
            Discard
          </button>
        )}
        <span className="character-count">{template.length} characters</span>
      </div>

      {isAdmin && (
        <div style={{ marginTop: '2rem' }}>
          <div className="divider" />
          <h2 className="config-title">Test Send Reminder</h2>
          <p className="config-hint">
            Admin only. Send a test reminder using the currently enabled channels
            before the scheduler runs.
          </p>
          <div className="test-send-grid">
            <div className="form-group">
              <label className="form-label">Test Email</label>
              <input
                type="email"
                className="form-input"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Optional for email channel"
              />
              <div className="form-hint">
                Leave blank if email is not one of the selected channels.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Test Phone</label>
              <input
                className="form-input"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Optional for SMS / WhatsApp channels"
              />
              <div className="form-hint">
                Required when testing SMS or WhatsApp delivery.
              </div>
            </div>
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
