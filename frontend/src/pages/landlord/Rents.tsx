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

type ApiErr = { response?: { data?: { detail?: string } } };

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

export default function Rents() {
  const [rents, setRents] = useState<Rent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRent, setSelectedRent] = useState<Rent | null>(null);
  const [form, setForm] = useState<RentCreate>(emptyForm);
  const [payAmount, setPayAmount] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t]));

  const load = async () => {
    try {
      const [rntList, tntList] = await Promise.all([getRents(), getTenants()]);
      setRents(rntList);
      setTenants(tntList);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
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
    try {
      await createRent(form);
      setShowCreateModal(false);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to create rent');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;
    setSubmitting(true);
    setError('');
    try {
      await payRent(selectedRent.id, Number(payAmount));
      setShowPayModal(false);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;
    setSubmitting(true);
    setError('');
    try {
      await updateRent(selectedRent.id, { amount: Number(editAmount) });
      setShowEditModal(false);
      load();
    } catch (err: unknown) {
      setError((err as ApiErr)?.response?.data?.detail ?? 'Failed to update rent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rents</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Rent
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
              {rents.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">No rent records yet</div>
                  </td>
                </tr>
              ) : (
                rents.map((r) => {
                  const tenant = tenantMap[r.tenant_id];
                  const outstanding = Number(r.amount) - Number(r.paid_amount);
                  const eff = effectiveStatus(r.status, r.end_date);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>
                        {tenant?.full_name ?? `#${r.tenant_id}`}
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
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
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
                type="number"
                className="form-input"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                min={1}
                step={0.01}
                required
              />
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
                type="number"
                className="form-input"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min={0.01}
                step={0.01}
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
                type="number"
                className="form-input"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min={0.01}
                step={0.01}
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
