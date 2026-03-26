import { useState, useEffect } from 'react';
import { Rent, RentCreate, Tenant } from '../../types';
import {
  getRents,
  createRent,
  updateRent,
  payRent,
} from '../../services/rentService';
import { getTenants } from '../../services/tenantService';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { getApiErrorMessage, isValidCurrencyInput } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import PlanRestrictedSection from '../../components/PlanRestrictedSection';

const ITEMS_PER_PAGE = 10;

const currentYear = new Date().getFullYear();

const emptyForm: RentCreate = {
  tenant_id: 0,
  year: currentYear,
  start_date: '',
  end_date: '',
  amount: 0,
};

function effectiveStatus(status: string, endDate: string): string {
  if (status === 'PAID') return 'PAID';
  if (new Date(endDate) < new Date()) return 'OVERDUE';
  return status;
}

function statusClass(status: string, endDate: string): string {
  const eff = effectiveStatus(status, endDate);
  if (eff === 'PAID') return 'badge-paid';
  if (eff === 'PARTIAL') return 'badge-partial';
  return 'badge-unpaid'; // UNPAID or OVERDUE
}

const fmt = (n: string | number) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

function validateCreateRentForm(form: RentCreate, amount: string): string | null {
  if (!form.tenant_id) {
    return 'Select a tenant before creating rent.';
  }

  if (!form.start_date || !form.end_date) {
    return 'Choose both start date and end date.';
  }

  const startDate = new Date(form.start_date);
  const endDate = new Date(form.end_date);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Enter valid rent dates.';
  }

  if (startDate >= endDate) {
    return 'Start date must be earlier than end date.';
  }

  if (startDate.getFullYear() !== Number(form.year)) {
    return 'Rent year must match the start date year.';
  }

  if (!isValidCurrencyInput(amount) || Number(amount) <= 0) {
    return 'Amount must be a valid currency value with up to 10 digits and 2 decimal places.';
  }

  return null;
}

export default function Rents() {
  const { billingRestricted, billingLoading } = useAuth();
  const [rents, setRents] = useState<Rent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRent, setSelectedRent] = useState<Rent | null>(null);
  const [form, setForm] = useState<RentCreate>(emptyForm);
  const [createAmount, setCreateAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]));

  const load = async () => {
    try {
      const [rntList, tntList] = await Promise.all([getRents(), getTenants()]);
      setRents(rntList);
      setTenants(tntList);
      setPage(1);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRents = rents.filter((rent) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const tenant = tenantMap[rent.tenant_id];
    return (
      tenant?.full_name?.toLowerCase().includes(query) ||
      tenant?.email?.toLowerCase().includes(query) ||
      rent.property?.name?.toLowerCase().includes(query) ||
      String(rent.year).includes(query) ||
      effectiveStatus(rent.status, rent.end_date).toLowerCase().includes(query)
    );
  });
  const sortedRents = [...filteredRents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sortedRents.length / ITEMS_PER_PAGE));
  const paginatedRents = sortedRents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setCreateAmount('');
    setError('');
    setShowCreateModal(true);
  };

  const openPay = (rent: Rent) => {
    setSelectedRent(rent);
    setPayAmount('');
    setError('');
    setShowPayModal(true);
  };

  const openEdit = (rent: Rent) => {
    setSelectedRent(rent);
    setEditAmount(String(rent.amount));
    setError('');
    setShowEditModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const validationError = validateCreateRentForm(form, createAmount);
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }
    try {
      await createRent({ ...form, amount: Number(createAmount) });
      setShowCreateModal(false);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create rent'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;
    setSubmitting(true);
    setError('');
    if (!isValidCurrencyInput(payAmount) || Number(payAmount) <= 0) {
      setError('Payment amount must be a valid currency value with up to 10 digits and 2 decimal places.');
      setSubmitting(false);
      return;
    }
    try {
      await payRent(selectedRent.id, Number(payAmount));
      setShowPayModal(false);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to record payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;
    setSubmitting(true);
    setError('');
    if (!isValidCurrencyInput(editAmount) || Number(editAmount) <= 0) {
      setError('Rent amount must be a valid currency value with up to 10 digits and 2 decimal places.');
      setSubmitting(false);
      return;
    }
    try {
      await updateRent(selectedRent.id, { amount: Number(editAmount) });
      setShowEditModal(false);
      void load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update rent'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-hero">
        <div className="page-hero-content">
          <span className="page-kicker">Collections</span>
          <h1 className="page-title">Rents</h1>
          <p className="page-subtitle">
            Review rent cycles, outstanding balances, and payment progress in one
            clean workspace.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-vacant">{rents.length} rent records</span>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            disabled={billingLoading || billingRestricted}
          >
            + Add Rent
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
        <div className="loading">Loading rent records...</div>
      ) : (
        <PlanRestrictedSection restricted={billingRestricted}>
          <div className="toolbar">
            <div>
              <div className="toolbar-title">Rent Register</div>
              <div className="toolbar-meta">
                Search by tenant, property, year, or payment status. Latest entries
                appear first.
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
                  placeholder="Search tenant, property, year, or status"
                />
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Year</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRents.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">
                        <div className="empty-state-icon">💰</div>
                        <strong>
                          {search ? 'No rent records match your search' : 'No rent records yet'}
                        </strong>
                        {search
                          ? 'Try another tenant, property, or status keyword.'
                          : 'Create a rent record to begin tracking payments and due dates.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRents.map((r, index) => {
                    const tenant = tenantMap[r.tenant_id];
                    const outstanding = Number(r.amount) - Number(r.paid_amount);
                    const eff = effectiveStatus(r.status, r.end_date);
                    return (
                      <tr key={r.id}>
                        <td>{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td>
                          <span className="cell-title">
                            {tenant?.full_name ?? `#${r.tenant_id}`}
                          </span>
                        </td>
                        <td>{r.property?.name ?? '—'}</td>
                        <td>{r.year}</td>
                        <td>₦{fmt(r.amount)}</td>
                        <td>₦{fmt(r.paid_amount)}</td>
                        <td>₦{fmt(outstanding)}</td>
                        <td>
                          <span className={`badge ${statusClass(r.status, r.end_date)}`}>
                            {eff}
                          </span>
                        </td>
                        <td>{r.end_date}</td>
                        <td>
                          <div className="table-actions">
                            {r.status !== 'PAID' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => openPay(r)}
                              >
                                Pay
                              </button>
                            )}
                            {r.status !== 'PAID' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEdit(r)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </PlanRestrictedSection>
      )}

      {/* Create Rent Modal */}
      {showCreateModal && (
        <Modal title="Add Rent" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="form-label">Tenant</label>
              <select
                className="form-select"
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: Number(e.target.value) })}
                required
              >
                <option value={0} disabled>
                  Select a tenant
                </option>
                {tenants
                  .filter((t) => t.apartment_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.email})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-input"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                min={2000}
                max={2100}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₦)</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                placeholder="e.g. 1500000.00"
                required
              />
              <div className="form-hint">
                Use up to 10 digits and 2 decimal places.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showPayModal && selectedRent && (
        <Modal
          title={`Record Payment — ${selectedRent.property?.name ?? 'Rent'}`}
          onClose={() => setShowPayModal(false)}
        >
          <form onSubmit={handlePay}>
            {error && <div className="error-msg">{error}</div>}
            <p className="pay-info">
              Total: ₦{fmt(selectedRent.amount)} &nbsp;|&nbsp; Paid: ₦
              {fmt(selectedRent.paid_amount)} &nbsp;|&nbsp; Outstanding: ₦
              {fmt(Number(selectedRent.amount) - Number(selectedRent.paid_amount))}
            </p>
            <div className="form-group">
              <label className="form-label">Payment Amount (₦)</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 500000.00"
                required
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPayModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success" disabled={submitting}>
                {submitting ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Rent Modal */}
      {showEditModal && selectedRent && (
        <Modal title="Update Rent Amount" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit}>
            {error && <div className="error-msg">{error}</div>}
            <p className="pay-info">
              Tenant: {tenantMap[selectedRent.tenant_id]?.full_name ?? `#${selectedRent.tenant_id}`}
              &nbsp;|&nbsp; Year: {selectedRent.year}
            </p>
            <div className="form-group">
              <label className="form-label">Rent Amount (₦)</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="e.g. 1500000.00"
                required
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
