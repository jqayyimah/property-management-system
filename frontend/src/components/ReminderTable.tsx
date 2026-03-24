import { RentReminderInfo } from '../types';

interface Props {
  rows: RentReminderInfo[];
}

function reminderTypeBadge(type: string | null) {
  if (!type) return <span className="badge badge-vacant">None sent</span>;
  const map: Record<string, string> = {
    '7_DAYS': 'badge-vacant',
    '3_DAYS': 'badge-partial',
    DUE_TODAY: 'badge-unpaid',
    OVERDUE: 'badge-unpaid',
  };
  return (
    <span className={`badge ${map[type] ?? 'badge-occupied'}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PAID: 'badge-paid',
    PARTIAL: 'badge-partial',
    UNPAID: 'badge-unpaid',
  };
  return (
    <span className={`badge ${map[status] ?? 'badge-occupied'}`}>{status}</span>
  );
}

export default function ReminderTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">No unpaid rents found</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Property</th>
            <th>Apartment</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Rent Status</th>
            <th>Last Reminder</th>
            <th>Sent At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rent_id}>
              <td>{r.tenant_name}</td>
              <td>{r.property_name}</td>
              <td>{r.apartment}</td>
              <td>{r.end_date}</td>
              <td>
                {Number(r.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td>{statusBadge(r.status)}</td>
              <td>{reminderTypeBadge(r.last_reminder_type)}</td>
              <td>
                {r.last_reminder_sent_at
                  ? new Date(r.last_reminder_sent_at).toLocaleString()
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
