import { FormEvent, useState } from 'react';
import { changePassword } from '../services/authService';
import ReminderConfig from '../components/ReminderConfig';
import { useAuth } from '../context/AuthContext';

type ApiErr = { response?: { data?: { detail?: string } } };

export default function ChangePassword() {
  const { isAdmin } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await changePassword(form);
      setSuccess(result.message);
      setPasswordOpen(false);
      setForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to change password'
      );
      setPasswordOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Preferences</span>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Keep your account secure and manage reminder preferences from one
            organized settings panel.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">
            {isAdmin ? 'Security' : 'Security & Reminders'}
          </span>
        </div>
      </div>

      {!isAdmin && (
        <div className="section-block">
          <div className="section-header">
            <div>
              <h2 className="section-title">Reminder Settings</h2>
              <p className="section-subtitle">
                Configure delivery channels, schedule timing, and the reminder
                message template from settings.
              </p>
            </div>
          </div>
          <ReminderConfig variant="settings" />
        </div>
      )}

      <div
        className="card"
        style={{
          maxWidth: 480,
          padding: '0.9rem 0.95rem 0.85rem',
        }}
      >
        <div className="section-header">
          <div>
            <h2 className="section-title">Password & Security</h2>
            <p className="section-subtitle">
              Update your password when needed.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPasswordOpen((current) => !current)}
            >
              {passwordOpen ? 'Hide' : 'Change Password'}
            </button>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="config-success">{success}</div>}
        {!passwordOpen && !error && !success && (
          <div className="form-hint" style={{ marginTop: '0.25rem' }}>
            Keep your password private and update it if you suspect compromise.
          </div>
        )}
        {passwordOpen && (
          <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '0.6rem' }}>
            <div className="form-group" style={{ marginBottom: '0.7rem' }}>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0.7rem' }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                minLength={8}
                required
              />
              <div className="form-hint">
                Use at least 8 characters with a mix of letters and numbers.
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.7rem' }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={form.confirm_password}
                onChange={(e) =>
                  setForm({ ...form, confirm_password: e.target.value })
                }
                minLength={8}
                required
              />
            </div>
            <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
