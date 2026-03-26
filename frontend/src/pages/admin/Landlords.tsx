import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { AdminLandlord } from '../../types';
import {
  approveLandlord,
  deactivateLandlord,
  deleteLandlord,
  getLandlords,
  updateLandlord,
} from '../../services/adminLandlordService';

type ApiErr = { response?: { data?: { detail?: string } } };

type EditForm = {
  full_name: string;
  email: string;
  phone: string;
};

const emptyForm: EditForm = {
  full_name: '',
  email: '',
  phone: '',
};

export default function AdminLandlords() {
  const [landlords, setLandlords] = useState<AdminLandlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<AdminLandlord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminLandlord | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setError('');
      setLandlords(await getLandlords());
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to load landlords'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (landlord: AdminLandlord) => {
    setEditTarget(landlord);
    setForm({
      full_name: landlord.full_name,
      email: landlord.email,
      phone: landlord.phone ?? '',
    });
    setError('');
  };

  const handleApprove = async (landlord: AdminLandlord) => {
    if (!landlord.user_id) {
      setError('This landlord is missing a linked user account and cannot be approved.');
      return;
    }

    setApprovingId(landlord.id);
    setError('');

    try {
      await approveLandlord(landlord.user_id);
      await load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to approve landlord'
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setSavingId(editTarget.id);
    setError('');

    try {
      await updateLandlord(editTarget.id, form);
      setEditTarget(null);
      await load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to update landlord'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDeactivate = async (landlord: AdminLandlord) => {
    if (!landlord.user_id) {
      setError('This landlord is missing a linked user account and cannot be deactivated.');
      return;
    }

    setDeactivatingId(landlord.id);
    setError('');

    try {
      await deactivateLandlord(landlord.user_id);
      await load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to deactivate landlord'
      );
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    setError('');

    try {
      await deleteLandlord(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to delete landlord'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Landlords</h1>
      </div>

      {error && (
        <div
          className="error-msg"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading landlords...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {landlords.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">No landlords found</div>
                  </td>
                </tr>
              ) : (
                landlords.map((landlord) => (
                  <tr key={landlord.id}>
                    <td style={{ fontWeight: 500 }}>{landlord.full_name}</td>
                    <td>{landlord.email}</td>
                    <td>{landlord.phone ?? '—'}</td>
                    <td>
                      <span
                        className={`badge ${landlord.is_active ? 'badge-paid' : 'badge-unpaid'}`}
                      >
                        {landlord.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {!landlord.is_active && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(landlord)}
                            disabled={approvingId === landlord.id || !landlord.user_id}
                          >
                            {approvingId === landlord.id ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        {landlord.is_active && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#f59e0b', color: '#fff' }}
                            onClick={() => handleDeactivate(landlord)}
                            disabled={deactivatingId === landlord.id || !landlord.user_id}
                          >
                            {deactivatingId === landlord.id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(landlord)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#ef4444', color: '#fff' }}
                          onClick={() => setDeleteTarget(landlord)}
                          disabled={deletingId === landlord.id}
                        >
                          {deletingId === landlord.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <Modal title="Edit Landlord" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) =>
                  setForm((current) => ({ ...current, full_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) =>
                  setForm((current) => ({ ...current, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) =>
                  setForm((current) => ({ ...current, phone: e.target.value }))
                }
                required
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingId === editTarget.id}
              >
                {savingId === editTarget.id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Landlord" onClose={() => setDeleteTarget(null)}>
          <p>
            Delete <strong>{deleteTarget.full_name}</strong>? This cannot be undone.
          </p>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#ef4444', color: '#fff' }}
              onClick={handleDelete}
              disabled={deletingId === deleteTarget.id}
            >
              {deletingId === deleteTarget.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
