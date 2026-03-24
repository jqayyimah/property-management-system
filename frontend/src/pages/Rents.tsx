import { useState, useEffect } from 'react';
import { Rent, RentCreate, Tenant } from '../types';
import { getRents, createRent, payRent } from '../services/rentService';
import { getTenants } from '../services/tenantService';
import Modal from '../components/Modal';

const currentYear = new Date().getFullYear();

const emptyForm: RentCreate = {
  tenant_id: 0,
  year: currentYear,
  start_date: '',
  end_date: '',
  amount: 0,
};

type ApiErr = { response?: { data?: { detail?: string } } };

export default function Rents() {
  const [rents, setRents] = useState<Rent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRent, setSelectedRent] = useState<Rent | null>(null);
  const [form, setForm] = useState<RentCreate>(emptyForm);
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError('');
    setShowCreateModal(true);
  };

  const openPay = (rent: Rent) => {
    setSelectedRent(rent);
    setPayAmount('');
    setShowPayModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createRent(form);
      setShowCreateModal(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to create rent'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;
    setSubmitting(true);
    try {
      await payRent(selectedRent.id, Number(payAmount));
      setShowPayModal(false);
      setSelectedRent(null);
      load();
    } catch (err: unknown) {
      setError(
        (err as ApiErr)?.response?.data?.detail ?? 'Failed to record payment'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass = (status: string) => {
    if (status === 'PAID') return 'badge-paid';
    if (status === 'PARTIAL') return 'badge-partial';
    return 'badge-unpaid';
  };

  const fmt = (n: string) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rents</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Rent
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
                <th>Tenant ID</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rents.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">No rents found</div>
                  </td>
                </tr>
              ) : (
                rents.map((r) => (
                  <tr key={r.id}>
                    <td>{r.tenant_id}</td>
                    <td>{r.property.name}</td>
                    <td>{fmt(r.amount)}</td>
                    <td>{fmt(r.paid_amount)}</td>
                    <td>
                      <span className={`badge ${statusClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>
                      {r.status !== 'PAID' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openPay(r)}
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Rent Modal */}
      {showCreateModal && (
        <Modal title="Add Rent" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Tenant</label>
              <select
                className="form-select"
                value={form.tenant_id}
                onChange={(e) =>
                  setForm({ ...form, tenant_id: Number(e.target.value) })
                }
                required
              >
                <option value={0} disabled>
                  Select a tenant
                </option>
                {tenants.map((t) => (
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
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
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
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-input"
                value={form.amount || ''}
                onChange={(e) =>
                  setForm({ ...form, amount: Number(e.target.value) })
                }
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

      {/* Pay Rent Modal */}
      {showPayModal && selectedRent && (
        <Modal
          title={`Record Payment — ${selectedRent.property.name}`}
          onClose={() => setShowPayModal(false)}
        >
          <form onSubmit={handlePay}>
            <p className="pay-info">
              Total: {fmt(selectedRent.amount)} &nbsp;|&nbsp; Paid:{' '}
              {fmt(selectedRent.paid_amount)} &nbsp;|&nbsp; Outstanding:{' '}
              {(
                Number(selectedRent.amount) - Number(selectedRent.paid_amount)
              ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <div className="form-group">
              <label className="form-label">Payment Amount</label>
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
              <button
                type="submit"
                className="btn btn-success"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
