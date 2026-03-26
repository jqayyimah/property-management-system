import { FormEvent, useState } from 'react';
import { changePassword } from '../services/authService';

type ApiErr = { response?: { data?: { detail?: string } } };

export default function ChangePassword() {
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
      setForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to change password'
      );
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
            Keep your account secure by updating your password from a single
            protected settings panel.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">Security</span>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">Change Password</h2>
            <p className="section-subtitle">
              Use a strong password with at least 8 characters.
            </p>
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="config-success">{success}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={form.old_password}
              onChange={(e) => setForm({ ...form, old_password: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
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
              Choose something memorable and hard to guess.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="page-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
