import { useState, useEffect } from 'react';
import { Apartment, ApartmentCreate, House, APARTMENT_TYPES } from '../types';
import { getApartments, createApartment } from '../services/apartmentService';
import { getHouses } from '../services/houseService';
import Modal from '../components/Modal';

const emptyForm: ApartmentCreate = { unit_number: '', apartment_type: '', house_id: 0 };

export default function Apartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ApartmentCreate>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const houseMap = Object.fromEntries(houses.map((h) => [h.id, h]));

  const load = async () => {
    try {
      const [apts, hss] = await Promise.all([getApartments(), getHouses()]);
      setApartments(apts);
      setHouses(hss);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createApartment(form);
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create apartment'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getLabel = (apt: Apartment) => {
    const house = houseMap[apt.house_id];
    return `${house?.name ?? 'Unknown'} - ${apt.apartment_type} - ${apt.unit_number}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Apartments</h1>
        <button className="btn btn-primary" onClick={openModal}>
          + Add Apartment
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
                <th>Apartment</th>
                <th>Status</th>
                <th>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {apartments.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">No apartments found</div>
                  </td>
                </tr>
              ) : (
                apartments.map((apt) => (
                  <tr key={apt.id}>
                    <td>{apt.id}</td>
                    <td>{getLabel(apt)}</td>
                    <td>
                      <span
                        className={`badge ${apt.is_vacant ? 'badge-vacant' : 'badge-occupied'}`}
                      >
                        {apt.is_vacant ? 'Vacant' : 'Occupied'}
                      </span>
                    </td>
                    <td>{apt.tenant?.full_name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Apartment" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">House</label>
              <select
                className="form-select"
                value={form.house_id}
                onChange={(e) =>
                  setForm({ ...form, house_id: Number(e.target.value) })
                }
                required
              >
                <option value={0} disabled>
                  Select a house
                </option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Apartment Type</label>
              <select
                className="form-select"
                value={form.apartment_type}
                onChange={(e) =>
                  setForm({ ...form, apartment_type: e.target.value })
                }
                required
              >
                <option value="" disabled>
                  Select a type
                </option>
                {APARTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit Number</label>
              <input
                className="form-input"
                placeholder='e.g. "Unit 1", "Flat 2", "Apt 3"'
                value={form.unit_number}
                onChange={(e) =>
                  setForm({ ...form, unit_number: e.target.value })
                }
                required
              />
            </div>
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
