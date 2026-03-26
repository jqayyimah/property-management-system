import { Link } from 'react-router-dom';

export default function PlanRestrictedSection({
  restricted,
  title = 'Billing Required',
  description = 'Your free trial has ended or no active annual plan was found. Upgrade your billing plan to unlock detailed records and actions.',
  children,
}: {
  restricted: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  if (!restricted) {
    return <>{children}</>;
  }

  return (
    <div className="restricted-shell">
      <div className="restricted-blur" aria-hidden="true">
        {children}
      </div>
      <div className="restricted-overlay">
        <span className="badge badge-unpaid">Plan Required</span>
        <h2 className="restricted-title">{title}</h2>
        <p className="restricted-copy">{description}</p>
        <Link to="/billing" className="btn btn-primary">
          View Billing Plans
        </Link>
      </div>
    </div>
  );
}
