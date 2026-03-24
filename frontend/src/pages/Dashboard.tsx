import { useState, useEffect } from 'react';
import { House, HouseCreate } from '../types';
import { getHouses, createHouse } from '../services/houseService';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const emptyForm = (landlordId: number | null): HouseCreate => ({
  name: '',
  address: '',
  landlord_id: landlordId ?? 0,
});

export default function Dashboard() {
  const { isAdmin, landlordId } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<HouseCreate>(emptyForm(landlordId));
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setHouses(await getHouses());
    } catch {
      setError('Failed to load houses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setForm(emptyForm(landlordId));
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createHouse(form);
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create house'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Properties (Houses)</h1>
        <button className="btn btn-primary" onClick={openModal}>
          + Add House
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

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
                <th>Landlord ID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {houses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">No houses found</div>
                  </td>
                </tr>
              ) : (
                houses.map((h) => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>{h.name}</td>
                    <td>{h.address}</td>
                    <td>{h.landlord_id}</td>
                    <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add House" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                className="form-input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
            {isAdmin && (
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
