import { useState, useEffect } from 'react';
import { AdminLandlord, House, HouseCreate } from '../../types';
import {
  getHouses,
  createHouse,
  updateHouse,
  deleteHouse,
} from '../../services/houseService';
import { getLandlords as getAdminLandlords } from '../../services/adminLandlordService';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getApiErrorMessage } from '../../utils/apiError';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';
const ITEMS_PER_PAGE = 10;

const emptyForm = (landlordId: number | null): HouseCreate => ({
  name: '',
  address: '',
  landlord_id: landlordId ?? 0,
});

export default function Properties() {
  const { isAdmin, landlordId, billingRestricted, billingLoading } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [landlords, setLandlords] = useState<AdminLandlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<House | null>(null);
  const [form, setForm] = useState<HouseCreate>(emptyForm(landlordId));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<House | null>(null);
  const [menuTargetId, setMenuTargetId] = useState<number | null>(null);

  const load = async () => {
    try {
      const [houseData, landlordData] = await Promise.all([
        getHouses(),
        isAdmin ? getAdminLandlords() : Promise.resolve([] as AdminLandlord[]),
      ]);
      setHouses(houseData);
      setLandlords(landlordData);
      setPage(1);
    } catch {
      setError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filteredHouses = houses.filter((house) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      house.name.toLowerCase().includes(query) ||
      house.address.toLowerCase().includes(query)
    );
  });
  const sortedHouses = [...filteredHouses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedHouses.length / ITEMS_PER_PAGE));
  const paginatedHouses = sortedHouses.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const handleWindowClick = () => setMenuTargetId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

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
      void load();
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          editTarget ? 'Failed to update property' : 'Failed to create property'
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
      await deleteHouse(deleteTarget.id);
      setDeleteTarget(null);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to delete property'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Portfolio</span>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">
            Organize the buildings in your portfolio and keep each property easy
            to manage.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">{houses.length} total</span>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            disabled={billingLoading || billingRestricted}
          >
            + Add Property
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
        <div className="loading">Loading properties...</div>
      ) : (
        <PlanRestrictedSection restricted={billingRestricted}>
          <div className="toolbar">
            <div>
              <div className="toolbar-title">Property Directory</div>
              <div className="toolbar-meta">
                Sorted by newest first with quick search across names and addresses.
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
                  placeholder="Search properties or address"
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
                  <th>Address</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedHouses.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🏠</div>
                        <strong>
                          {search ? 'No properties match your search' : 'No properties yet'}
                        </strong>
                        {search
                          ? 'Try a different property name or address.'
                          : 'Add your first property to get started.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedHouses.map((h, index) => (
                    <tr key={h.id}>
                      <td>{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <span className="cell-title">{h.name}</span>
                      </td>
                      <td>
                        <span>{h.address}</span>
                      </td>
                      <td>{new Date(h.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="context-menu-wrap">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuTargetId((current) => (current === h.id ? null : h.id));
                            }}
                          >
                            Actions
                          </button>
                          {menuTargetId === h.id && (
                            <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="context-menu-item"
                                onClick={() => {
                                  openEdit(h);
                                  setMenuTargetId(null);
                                }}
                              >
                                Edit
                              </button>
                              {isAdmin && (
                                <button
                                  className="context-menu-item context-menu-item-danger"
                                  onClick={() => {
                                    setDeleteTarget(h);
                                    setMenuTargetId(null);
                                  }}
                                  disabled={deleting === h.id}
                                >
                                  {deleting === h.id ? 'Deleting...' : 'Delete'}
                                </button>
                              )}
                            </div>
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
                <label className="form-label">Landlord</label>
                <select
                  className="form-input"
                  value={form.landlord_id || ''}
                  onChange={(e) =>
                    setForm({ ...form, landlord_id: Number(e.target.value) })
                  }
                  required
                >
                  <option value="" disabled>
                    Select a landlord
                  </option>
                  {landlords.map((landlord) => (
                    <option key={landlord.id} value={landlord.id}>
                      {landlord.full_name} - {landlord.email}
                    </option>
                  ))}
                </select>
                <div className="form-hint">
                  The new property will be assigned to the selected landlord.
                </div>
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

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Property"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete Property"
          loading={deleting === deleteTarget.id}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
