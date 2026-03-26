import { useState, useEffect } from 'react';
import { Tenant, TenantCreate, Apartment, House } from '../../types';
import {
  getTenants,
  createTenant,
  updateTenant,
  exitTenant,
} from '../../services/tenantService';
import { getApartments } from '../../services/apartmentService';
import { getHouses } from '../../services/houseService';
import Modal from '../../components/Modal';

type ApiErr = { response?: { data?: { detail?: string } } };

const emptyForm: TenantCreate = { full_name: '', email: '', phone: '', apartment_id: undefined };

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantCreate>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState<number | null>(null);

  const houseMap = Object.fromEntries(houses.map((h) => [h.id, h]));
  const apartmentMap = Object.fromEntries(apartments.map((a) => [a.id, a]));

  const aptLabel = (aptId: number | null | undefined) => {
    if (!aptId) return '—';
    const apt = apartmentMap[aptId];
    if (!apt) return '—';
    const house = houseMap[apt.house_id];
    return `${house?.name ?? '?'} – ${apt.apartment_type} – ${apt.unit_number}`;
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

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditTarget(t);
    setForm({
      full_name: t.full_name,
      email: t.email,
      phone: t.phone ?? '',
      apartment_id: t.apartment_id ?? undefined,
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
        await updateTenant(editTarget.id, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
        });
      } else {
        await createTenant(form);
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ??
          (editTarget ? 'Failed to update tenant' : 'Failed to create tenant')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async (tenant: Tenant) => {
    if (
      !confirm(
        `Exit tenant "${tenant.full_name}" from their apartment? The apartment will be marked vacant.`
      )
    )
      return;
    setExiting(tenant.id);
    setError('');
    try {
      await exitTenant(tenant.id);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to exit tenant');
    } finally {
      setExiting(null);
    }
  };

  const vacantApts = apartments.filter((a) => a.is_vacant);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tenants</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Tenant
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
                <th>Email</th>
                <th>Phone</th>
                <th>Apartment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No tenants yet</div>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td style={{ fontWeight: 500 }}>{t.full_name}</td>
                    <td>{t.email}</td>
                    <td>{t.phone ?? '—'}</td>
                    <td>{aptLabel(t.apartment_id)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(t)}
                        >
                          Edit
                        </button>
                        {t.apartment_id && (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#f59e0b', color: '#fff' }}
                            onClick={() => handleExit(t)}
                            disabled={exiting === t.id}
                          >
                            {exiting === t.id ? '...' : 'Exit'}
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
          title={editTarget ? 'Edit Tenant' : 'Add Tenant'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
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
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required={!editTarget}
              />
            </div>
            {!editTarget && (
              <div className="form-group">
                <label className="form-label">Apartment (optional)</label>
                <select
                  className="form-select"
                  value={form.apartment_id ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      apartment_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">— None —</option>
                  {vacantApts.map((a) => {
                    const house = houseMap[a.house_id];
                    return (
                      <option key={a.id} value={a.id}>
                        {`${house?.name ?? '?'} – ${a.apartment_type} – ${a.unit_number}`}
                      </option>
                    );
                  })}
                </select>
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
