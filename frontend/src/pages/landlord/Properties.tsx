import { useState, useEffect } from 'react';
import { House, HouseCreate } from '../../types';
import {
  getHouses,
  createHouse,
  updateHouse,
  deleteHouse,
} from '../../services/houseService';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

type ApiErr = { response?: { data?: { detail?: string } } };

const emptyForm = (landlordId: number | null): HouseCreate => ({
  name: '',
  address: '',
  landlord_id: landlordId ?? 0,
});

export default function Properties() {
  const { isAdmin, landlordId } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<House | null>(null);
  const [form, setForm] = useState<HouseCreate>(emptyForm(landlordId));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    try {
      setHouses(await getHouses());
    } catch {
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm(landlordId));
    setError('');
    setShowModal(true);
  };

  const openEdit = (house: House) => {
    setEditTarget(house);
    setForm({ name: house.name, address: house.address, landlord_id: house.landlord_id });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editTarget) {
        await updateHouse(editTarget.id, { name: form.name, address: form.address });
      } else {
        await createHouse(form);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ??
          (editTarget ? 'Failed to update property' : 'Failed to create property')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (house: House) => {
    if (!confirm(`Delete "${house.name}"? This cannot be undone.`)) return;
    setDeleting(house.id);
    setError('');
    try {
      await deleteHouse(house.id);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to delete property');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Properties</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Property
        </button>
      </div>

      {error && (
        <div className="error-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Address</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {houses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      No properties yet. Add your first property to get started.
                    </div>
                  </td>
                </tr>
              ) : (
                houses.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td>{h.address}</td>
                    <td>{new Date(h.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(h)}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#ef4444', color: '#fff' }}
                            onClick={() => handleDelete(h)}
                            disabled={deleting === h.id}
                          >
                            {deleting === h.id ? '...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editTarget ? 'Edit Property' : 'Add Property'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="form-label">Property Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sunrise Apartments"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                className="form-input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full address"
                required
              />
            </div>
            {isAdmin && !editTarget && (
              <div className="form-group">
                <label className="form-label">Landlord ID</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.landlord_id}
                  onChange={(e) =>
                    setForm({ ...form, landlord_id: Number(e.target.value) })
                  }
                  required
                />
              </div>
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editTarget ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
