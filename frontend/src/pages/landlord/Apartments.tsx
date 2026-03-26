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
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getApiErrorMessage } from '../../utils/apiError';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';
const emptyForm: ApartmentCreate = { unit_number: '', apartment_type: '', house_id: 0 };
const ITEMS_PER_PAGE = 10;

export default function Apartments() {
  const { isAdmin, billingRestricted, billingLoading } = useAuth();
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Apartment | null>(null);

  const houseMap = Object.fromEntries(houses.map((h) => [h.id, h]));

  const load = async () => {
    try {
      const [apts, hss] = await Promise.all([getApartments(), getHouses()]);
      setApartments(apts);
      setHouses(hss);
      setPage(1);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = apartments.filter((a) => {
    const matchesHouse = filterHouse ? a.house_id === filterHouse : true;
    const query = search.trim().toLowerCase();
    const house = houseMap[a.house_id];
    const matchesSearch =
      !query ||
      a.unit_number.toLowerCase().includes(query) ||
      a.apartment_type.toLowerCase().includes(query) ||
      house?.name.toLowerCase().includes(query) ||
      a.tenant?.full_name?.toLowerCase().includes(query);
    return matchesHouse && matchesSearch;
  });
  const sortedApartments = [...visible].sort((a, b) => b.id - a.id);
  const totalPages = Math.max(1, Math.ceil(sortedApartments.length / ITEMS_PER_PAGE));
  const paginatedApartments = sortedApartments.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

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
      void load();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          editTarget ? 'Failed to update apartment' : 'Failed to create apartment'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setError('');
    try {
      await deleteApartment(deleteTarget.id);
      setDeleteTarget(null);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to delete apartment'));
    } finally {
      setDeleting(null);
    }
  };

  const getLabel = (apt: Apartment) => {
    const house = houseMap[apt.house_id];
    return `${house?.name ?? 'Unknown'} – ${apt.apartment_type} – ${apt.unit_number}`;
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Units</span>
          <h1 className="page-title">Apartments</h1>
          <p className="page-subtitle">
            Review occupancy, unit types, and which apartments are ready for
            tenant assignment.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">{apartments.length} total</span>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            disabled={billingLoading || billingRestricted}
          >
            + Add Apartment
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
        <div className="loading">Loading apartments...</div>
      ) : (
        <PlanRestrictedSection restricted={billingRestricted}>
          <div className="toolbar">
            <div>
              <div className="toolbar-title">Apartment Inventory</div>
              <div className="toolbar-meta">
                Filter by property and search by unit, type, or tenant.
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
                  placeholder="Search units, property, or tenant"
                />
              </div>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: 220 }}
                value={filterHouse}
                onChange={(e) => {
                  setFilterHouse(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={0}>All Properties</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
                {sortedApartments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">▣</div>
                        <strong>
                          {search
                            ? 'No apartments match your search'
                            : filterHouse
                              ? 'No apartments in this property'
                              : 'No apartments yet'}
                        </strong>
                        {search
                          ? 'Try a different unit number, apartment type, or tenant name.'
                          : 'Create an apartment to begin tracking occupancy.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedApartments.map((apt, index) => (
                    <tr key={apt.id}>
                      <td>{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <span className="cell-title">{getLabel(apt)}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${apt.is_vacant ? 'badge-vacant' : 'badge-occupied'}`}
                        >
                          {apt.is_vacant ? 'Vacant' : 'Occupied'}
                        </span>
                      </td>
                      <td>{apt.tenant?.full_name ?? '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEdit(apt)}
                          >
                            Edit
                          </button>
                          {isAdmin && apt.is_vacant && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteTarget(apt)}
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </PlanRestrictedSection>
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

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Apartment"
          message={`Delete apartment "${
            houseMap[deleteTarget.house_id]?.name ?? '?'
          } - ${deleteTarget.unit_number}"? This cannot be undone.`}
          confirmLabel="Delete Apartment"
          loading={deleting === deleteTarget.id}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
