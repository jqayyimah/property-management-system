import { useState, useEffect } from 'react';
import {
  getMessageTemplate,
  saveMessageTemplate,
} from '../services/reminderService';

export default function ReminderConfig() {
  const [template, setTemplate] = useState('');
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    getMessageTemplate().then((msg) => {
      setTemplate(msg);
      setOriginal(msg);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await saveMessageTemplate(template);
      setOriginal(template);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = template !== original;

  return (
    <div className="config-card">
      <h2 className="config-title">Reminder Message Template</h2>
      <p className="config-hint">
        Supported variables:{' '}
        <code>
          {'{tenant_name}'} {'{property_name}'} {'{apartment}'} {'{amount}'}{' '}
          {'{due_date}'}
        </code>
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
        <div className="error-msg">Failed to save template.</div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
        {isDirty && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setTemplate(original);
              setStatus('idle');
            }}
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
