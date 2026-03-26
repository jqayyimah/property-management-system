import { useState, useEffect } from 'react';
import { Apartment, ApartmentCreate, House, APARTMENT_TYPES } from '../../types';
import {
  getApartments,
  createApartment,
  updateApartment,
  deleteApartment,
} from '../../services/apartmentService';
import { getHouses } from '../../services/houseService';
import Modal from '../../components/Modal';

type ApiErr = { response?: { data?: { detail?: string } } };
const emptyForm: ApartmentCreate = { unit_number: '', apartment_type: '', house_id: 0 };

export default function Apartments() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterHouse, setFilterHouse] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Apartment | null>(null);
  const [form, setForm] = useState<ApartmentCreate>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

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

  useEffect(() => { load(); }, []);

  const visible = filterHouse
    ? apartments.filter((a) => a.house_id === filterHouse)
    : apartments;

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (apt: Apartment) => {
    setEditTarget(apt);
    setForm({
      unit_number: apt.unit_number,
      apartment_type: apt.apartment_type,
      house_id: apt.house_id,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editTarget) {
        await updateApartment(editTarget.id, {
          unit_number: form.unit_number,
          apartment_type: form.apartment_type,
        });
      } else {
        await createApartment(form);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ??
          (editTarget ? 'Failed to update apartment' : 'Failed to create apartment')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (apt: Apartment) => {
    const house = houseMap[apt.house_id];
    const label = `${house?.name ?? '?'} - ${apt.unit_number}`;
    if (!confirm(`Delete apartment "${label}"? This cannot be undone.`)) return;
    setDeleting(apt.id);
    setError('');
    try {
      await deleteApartment(apt.id);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to delete apartment');
    } finally {
      setDeleting(null);
    }
  };

  const getLabel = (apt: Apartment) => {
    const house = houseMap[apt.house_id];
    return `${house?.name ?? 'Unknown'} – ${apt.apartment_type} – ${apt.unit_number}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Apartments</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Apartment
        </button>
      </div>

      {error && (
        <div className="error-msg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {/* Filter by property */}
      <div style={{ marginBottom: '1rem' }}>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 220 }}
          value={filterHouse}
          onChange={(e) => setFilterHouse(Number(e.target.value))}
        >
          <option value={0}>All Properties</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      {filterHouse
                        ? 'No apartments in this property'
                        : 'No apartments yet'}
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((apt) => (
                  <tr key={apt.id}>
                    <td>{apt.id}</td>
                    <td style={{ fontWeight: 500 }}>{getLabel(apt)}</td>
                    <td>
                      <span
                        className={`badge ${apt.is_vacant ? 'badge-vacant' : 'badge-occupied'}`}
                      >
                        {apt.is_vacant ? 'Vacant' : 'Occupied'}
                      </span>
                    </td>
                    <td>{apt.tenant?.full_name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(apt)}
                        >
                          Edit
                        </button>
                        {apt.is_vacant && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#ef4444', color: '#fff' }}
                            onClick={() => handleDelete(apt)}
                            disabled={deleting === apt.id}
                          >
                            {deleting === apt.id ? '...' : 'Delete'}
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
          title={editTarget ? 'Edit Apartment' : 'Add Apartment'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
            {!editTarget && (
              <div className="form-group">
                <label className="form-label">Property</label>
                <select
                  className="form-select"
                  value={form.house_id}
                  onChange={(e) =>
                    setForm({ ...form, house_id: Number(e.target.value) })
                  }
                  required
                >
                  <option value={0} disabled>
                    Select a property
                  </option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                placeholder='e.g. "Unit 1", "Flat 2"'
                value={form.unit_number}
                onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
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
