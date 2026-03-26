import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { AdminLandlord } from '../../types';
import {
  approveLandlord,
  deactivateLandlord,
  deleteLandlord,
  getLandlords,
  updateLandlord,
} from '../../services/adminLandlordService';
import { getApiErrorMessage } from '../../utils/apiError';

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
const ITEMS_PER_PAGE = 10;
const formatBillingStatus = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'Annual Active';
    case 'TRIAL_ACTIVE':
      return 'Trial Active';
    case 'TRIAL_EXPIRED':
      return 'No Active Plan';
    default:
      return status.replace(/_/g, ' ');
  }
};

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

export default function AdminLandlords() {
  const [landlords, setLandlords] = useState<AdminLandlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<AdminLandlord | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminLandlord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminLandlord | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [menuTargetId, setMenuTargetId] = useState<number | null>(null);

  const handleUpgradeRequest = (landlord: AdminLandlord) => {
    const subject = encodeURIComponent('Property Manager upgrade recommendation');
    const body = encodeURIComponent(
      [
        `Hello ${landlord.full_name},`,
        '',
        'We are recommending a billing plan upgrade based on your reminder-service consumption.',
        `Current plan: ${landlord.current_plan_name ?? 'No active plan'}`,
        `Total service cost this cycle: ${formatCurrency(landlord.service_cost_total)}`,
        `SMS sent: ${landlord.sms_sent_count}`,
        `WhatsApp sent: ${landlord.whatsapp_sent_count}`,
        `Email sent: ${landlord.email_sent_count}`,
        '',
        'Please contact support or visit your billing page to upgrade your plan.',
      ].join('\n')
    );
    window.location.href = `mailto:${landlord.email}?subject=${subject}&body=${body}`;
  };

  const load = async () => {
    try {
      setError('');
      setLandlords(await getLandlords());
      setPage(1);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load landlords'));
    } finally {
      setLoading(false);
    }
  };

  const filteredLandlords = landlords.filter((landlord) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (
      landlord.full_name.toLowerCase().includes(query) ||
      landlord.email.toLowerCase().includes(query) ||
      (landlord.phone ?? '').toLowerCase().includes(query) ||
      (landlord.is_active ? 'active' : 'inactive').includes(query) ||
      formatBillingStatus(landlord.billing_status).toLowerCase().includes(query) ||
      (landlord.current_plan_name ?? '').toLowerCase().includes(query)
    );
    const matchesPlan =
      planFilter === 'all'
        ? true
        : planFilter === 'active'
          ? landlord.billing_access_active
          : !landlord.billing_access_active;
    return matchesSearch && matchesPlan;
  });
  const sortedLandlords = [...filteredLandlords].sort((a, b) => b.id - a.id);
  const totalPages = Math.max(1, Math.ceil(sortedLandlords.length / ITEMS_PER_PAGE));
  const paginatedLandlords = sortedLandlords.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const handleWindowClick = () => setMenuTargetId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
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
      setError(getApiErrorMessage(err, 'Failed to approve landlord'));
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
      setError(getApiErrorMessage(err, 'Failed to update landlord'));
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
      setError(getApiErrorMessage(err, 'Failed to deactivate landlord'));
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
      setError(getApiErrorMessage(err, 'Failed to delete landlord'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Admin</span>
          <h1 className="page-title">Landlord Management</h1>
          <p className="page-subtitle">
            Approve, update, deactivate, and remove landlord accounts from a
            single admin control surface.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-paid">
            {landlords.filter((landlord) => landlord.is_active).length} active
          </span>
          <span className="badge badge-occupied">
            {landlords.filter((landlord) => !landlord.is_active).length} inactive
          </span>
          <span className="badge badge-vacant">
            {landlords.filter((landlord) => landlord.billing_access_active).length} on plan
          </span>
          <span className="badge badge-partial">
            {landlords.filter((landlord) => landlord.upgrade_recommended).length} upgrade watch
          </span>
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading landlords...</div>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card-icon">👤</div>
              <div className="summary-card-value">{landlords.length}</div>
              <div className="summary-card-label">Total Landlords</div>
              <div className="summary-card-note">All landlord accounts in the workspace</div>
            </div>
            <div className="summary-card summary-card-success">
              <div className="summary-card-icon">✅</div>
              <div className="summary-card-value">
                {landlords.filter((landlord) => landlord.billing_access_active).length}
              </div>
              <div className="summary-card-label">On Active Plan</div>
              <div className="summary-card-note">Landlords with trial or annual access</div>
            </div>
            <div className="summary-card summary-card-warning">
              <div className="summary-card-icon">📈</div>
              <div className="summary-card-value">
                {landlords.filter((landlord) => landlord.upgrade_recommended).length}
              </div>
              <div className="summary-card-label">Upgrade Watch</div>
              <div className="summary-card-note">Accounts trending toward higher cost usage</div>
            </div>
            <div className="summary-card summary-card-danger">
              <div className="summary-card-icon">⏳</div>
              <div className="summary-card-value">
                {
                  landlords.filter((landlord) => landlord.billing_status === 'TRIAL_EXPIRED').length
                }
              </div>
              <div className="summary-card-label">No Active Plan</div>
              <div className="summary-card-note">Accounts needing billing attention</div>
            </div>
          </div>

          <div className="toolbar">
            <div>
              <div className="toolbar-title">Landlord Directory</div>
              <div className="toolbar-meta">
                Keep this view focused on account actions. Use Consumption for deeper spend analysis.
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
                  placeholder="Search landlord, email, phone, or status"
                />
              </div>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: 180 }}
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value as 'all' | 'active' | 'inactive');
                  setPage(1);
                }}
              >
                <option value="all">All Billing States</option>
                <option value="active">Active Plans</option>
                <option value="inactive">No Active Plan</option>
              </select>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Account</th>
                  <th>Plan Status</th>
                  <th>Risk</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedLandlords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🧾</div>
                        <strong>
                          {search ? 'No landlords match your search' : 'No landlords found'}
                        </strong>
                        {search
                          ? 'Try another name, email address, phone number, or status.'
                          : 'Approved and pending landlord accounts will appear here.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLandlords.map((landlord, index) => (
                    <tr key={landlord.id}>
                      <td>{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                      <td>
                        <span className="cell-title">{landlord.full_name}</span>
                      </td>
                      <td>
                        <div className="cell-title">{landlord.email}</div>
                        <span className="cell-subtitle">{landlord.phone ?? 'No phone number'}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${landlord.is_active ? 'badge-paid' : 'badge-unpaid'}`}
                        >
                          {landlord.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="cell-title">
                          {landlord.current_plan_name ?? '—'}
                        </div>
                        <span
                          className={`badge ${
                            landlord.billing_access_active ? 'badge-vacant' : 'badge-occupied'
                          }`}
                        >
                          {formatBillingStatus(landlord.billing_status)}
                        </span>
                        {landlord.plan_ends_at && (
                          <span className="cell-subtitle">
                            Ends {new Date(landlord.plan_ends_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            landlord.billing_status === 'TRIAL_EXPIRED'
                              ? 'badge-unpaid'
                              : landlord.upgrade_recommended
                                ? 'badge-partial'
                                : 'badge-paid'
                          }`}
                        >
                          {landlord.billing_status === 'TRIAL_EXPIRED'
                            ? 'No Active Plan'
                            : landlord.upgrade_recommended
                              ? 'Upgrade Watch'
                              : 'Healthy'}
                        </span>
                        {landlord.upgrade_recommendation_reason && (
                          <span className="cell-subtitle">
                            {landlord.upgrade_recommendation_reason}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="context-menu-wrap">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuTargetId((current) =>
                                current === landlord.id ? null : landlord.id
                              );
                            }}
                          >
                            Actions
                          </button>
                          {menuTargetId === landlord.id && (
                            <div
                              className="context-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="context-menu-item"
                                onClick={() => {
                                  setDetailTarget(landlord);
                                  setMenuTargetId(null);
                                }}
                              >
                                View Details
                              </button>
                              {!landlord.is_active && (
                                <button
                                  className="context-menu-item"
                                  onClick={() => {
                                    void handleApprove(landlord);
                                    setMenuTargetId(null);
                                  }}
                                  disabled={approvingId === landlord.id || !landlord.user_id}
                                >
                                  {approvingId === landlord.id ? 'Approving...' : 'Approve'}
                                </button>
                              )}
                              {landlord.is_active && (
                                <button
                                  className="context-menu-item"
                                  onClick={() => {
                                    void handleDeactivate(landlord);
                                    setMenuTargetId(null);
                                  }}
                                  disabled={deactivatingId === landlord.id || !landlord.user_id}
                                >
                                  {deactivatingId === landlord.id ? 'Deactivating...' : 'Deactivate'}
                                </button>
                              )}
                              <button
                                className="context-menu-item"
                                onClick={() => {
                                  openEdit(landlord);
                                  setMenuTargetId(null);
                                }}
                              >
                                Edit
                              </button>
                              {landlord.upgrade_recommended && (
                                <button
                                  className="context-menu-item"
                                  onClick={() => {
                                    handleUpgradeRequest(landlord);
                                    setMenuTargetId(null);
                                  }}
                                >
                                  Request Upgrade
                                </button>
                              )}
                              <button
                                className="context-menu-item context-menu-item-danger"
                                onClick={() => {
                                  setDeleteTarget(landlord);
                                  setMenuTargetId(null);
                                }}
                                disabled={deletingId === landlord.id}
                              >
                                {deletingId === landlord.id ? 'Deleting...' : 'Delete'}
                              </button>
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
        </>
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

      {detailTarget && (
        <Modal
          title="Landlord Details"
          onClose={() => setDetailTarget(null)}
          className="modal-side-panel"
          overlayClassName="modal-overlay-right"
        >
          <div className="section-block">
            <div>
              <div className="cell-title">{detailTarget.full_name}</div>
              <div className="cell-subtitle">{detailTarget.email}</div>
              <div className="cell-subtitle">{detailTarget.phone ?? 'No phone number'}</div>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-card-icon">🧾</div>
                <div className="summary-card-value" style={{ fontSize: '1.35rem' }}>
                  {formatCurrency(detailTarget.service_cost_total)}
                </div>
                <div className="summary-card-label">Service Spend</div>
              </div>
              <div className="summary-card">
                <div className="summary-card-icon">📩</div>
                <div className="summary-card-value">{detailTarget.sms_sent_count}</div>
                <div className="summary-card-label">SMS Sends</div>
                <div className="summary-card-note">
                  {formatCurrency(detailTarget.sms_cost_total)}
                </div>
              </div>
              <div className="summary-card summary-card-warning">
                <div className="summary-card-icon">💬</div>
                <div className="summary-card-value">{detailTarget.whatsapp_sent_count}</div>
                <div className="summary-card-label">WhatsApp Sends</div>
                <div className="summary-card-note">
                  {formatCurrency(detailTarget.whatsapp_cost_total)}
                </div>
              </div>
              <div className="summary-card summary-card-success">
                <div className="summary-card-icon">✉️</div>
                <div className="summary-card-value">{detailTarget.email_sent_count}</div>
                <div className="summary-card-label">Email Sends</div>
                <div className="summary-card-note">
                  {formatCurrency(detailTarget.email_cost_total)}
                </div>
              </div>
            </div>

            <div className="toolbar" style={{ padding: '1rem' }}>
              <div>
                <div className="toolbar-title">Plan Snapshot</div>
                <div className="toolbar-meta">
                  {detailTarget.current_plan_name ?? 'No current plan'} · {formatBillingStatus(detailTarget.billing_status)}
                </div>
              </div>
              {detailTarget.plan_ends_at && (
                <span className="badge badge-vacant">
                  Ends {new Date(detailTarget.plan_ends_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {detailTarget.upgrade_recommendation_reason && (
              <div className="info-banner">{detailTarget.upgrade_recommendation_reason}</div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailTarget(null)}
              >
                Close
              </button>
              {detailTarget.upgrade_recommended && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleUpgradeRequest(detailTarget)}
                >
                  Request Upgrade
                </button>
              )}
            </div>
          </div>
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
              className="btn btn-danger btn-sm"
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
