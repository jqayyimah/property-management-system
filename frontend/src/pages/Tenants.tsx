import { useState, useEffect } from 'react';
import { Tenant, TenantCreate, Apartment, House } from '../types';
import { getTenants, createTenant } from '../services/tenantService';
import { getApartments } from '../services/apartmentService';
import { getHouses } from '../services/houseService';
import Modal from '../components/Modal';

const emptyForm: TenantCreate = {
  full_name: '',
  email: '',
  phone: '',
  apartment_id: undefined,
};

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TenantCreate>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const houseMap = Object.fromEntries(houses.map((h) => [h.id, h]));
  const apartmentMap = Object.fromEntries(apartments.map((a) => [a.id, a]));

  const getApartmentLabel = (aptId: number | null | undefined) => {
    if (!aptId) return '—';
    const apt = apartmentMap[aptId];
    if (!apt) return '—';
    const house = houseMap[apt.house_id];
    return `${house?.name ?? '?'} - ${apt.apartment_type} - ${apt.unit_number}`;
  };

  const load = async () => {
    try {
      const [tnts, apts, hss] = await Promise.all([
        getTenants(),
        getApartments(),
        getHouses(),
      ]);
      setTenants(tnts);
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
      await createTenant(form);
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create tenant'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const vacantApartments = apartments.filter((a) => a.is_vacant);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tenants</h1>
        <button className="btn btn-primary" onClick={openModal}>
          + Add Tenant
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
                <th>Email</th>
                <th>Phone</th>
                <th>Apartment</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">No tenants found</div>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.full_name}</td>
                    <td>{t.email}</td>
                    <td>{t.phone ?? '—'}</td>
                    <td>{getApartmentLabel(t.apartment_id)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Tenant" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Apartment (optional)</label>
              <select
                className="form-select"
                value={form.apartment_id ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    apartment_id: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              >
                <option value="">— None —</option>
                {vacantApartments.map((a) => {
                  const house = houseMap[a.house_id];
                  return (
                    <option key={a.id} value={a.id}>
                      {`${house?.name ?? '?'} - ${a.apartment_type} - ${a.unit_number}`}
                    </option>
                  );
                })}
              </select>
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
