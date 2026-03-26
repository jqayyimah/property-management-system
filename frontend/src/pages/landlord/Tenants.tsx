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
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';

const emptyForm: TenantCreate = { full_name: '', email: '', phone: '', apartment_id: 0 };
const ITEMS_PER_PAGE = 10;

export default function Tenants() {
  const { billingRestricted, billingLoading } = useAuth();
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [exitTarget, setExitTarget] = useState<Tenant | null>(null);

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
      setPage(1);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      tenant.full_name.toLowerCase().includes(query) ||
      tenant.email.toLowerCase().includes(query) ||
      (tenant.phone ?? '').toLowerCase().includes(query) ||
      aptLabel(tenant.apartment_id).toLowerCase().includes(query)
    );
  });
  const sortedTenants = [...filteredTenants].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedTenants.length / ITEMS_PER_PAGE));
  const paginatedTenants = sortedTenants.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
      apartment_id: t.apartment_id ?? 0,
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
      void load();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          editTarget ? 'Failed to update tenant' : 'Failed to create tenant'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async () => {
    if (!exitTarget) return;
    setExiting(exitTarget.id);
    setError('');
    try {
      await exitTenant(exitTarget.id);
      setExitTarget(null);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to exit tenant'));
    } finally {
      setExiting(null);
    }
  };

  const vacantApts = apartments.filter((a) => a.is_vacant);

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">People</span>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">
            Keep resident records clean, searchable, and easy to update across
            your occupied apartments.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-occupied">{tenants.length} tenants</span>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            disabled={billingLoading || billingRestricted}
          >
            + Add Tenant
          </button>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading tenants...</div>
      ) : (
        <PlanRestrictedSection restricted={billingRestricted}>
          <div className="toolbar">
            <div>
              <div className="toolbar-title">Tenant Directory</div>
              <div className="toolbar-meta">
                Search by tenant, contact details, or assigned apartment.
              </div>
            </div>
            <div className="toolbar-group">
              <div className="toolbar-search">
                <input
                  className="form-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, email, phone, or apartment"
                />
              </div>
            </div>
          </div>
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
                {sortedTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <strong>
                          {search ? 'No tenants match your search' : 'No tenants yet'}
                        </strong>
                        {search
                          ? 'Try a different name, email, phone number, or apartment.'
                          : 'Add your first tenant to start tracking rent and reminders.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTenants.map((t, index) => (
                    <tr key={t.id}>
                      <td>{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <span className="cell-title">{t.full_name}</span>
                      </td>
                      <td>{t.email}</td>
                      <td>{t.phone ?? '—'}</td>
                      <td>{aptLabel(t.apartment_id)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEdit(t)}
                          >
                            Edit
                          </button>
                          {t.apartment_id && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => setExitTarget(t)}
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </PlanRestrictedSection>
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
              <label className="form-label">Apartment</label>
              <select
                className="form-select"
                value={form.apartment_id || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    apartment_id: e.target.value ? Number(e.target.value) : 0,
                  })
                }
                required
              >
                <option value="" disabled>
                  Select an apartment
                </option>
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

      {exitTarget && (
        <ConfirmDialog
          title="Exit Tenant"
          message={`Exit tenant "${exitTarget.full_name}" from their apartment? The apartment will be marked vacant.`}
          confirmLabel="Exit Tenant"
          tone="warning"
          loading={exiting === exitTarget.id}
          onConfirm={handleExit}
          onClose={() => setExitTarget(null)}
        />
      )}
    </div>
  );
}
