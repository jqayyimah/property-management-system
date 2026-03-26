import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

type ApiErr = { response?: { data?: { detail?: string } } };

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing');
      setLoading(false);
      return;
    }

    verifyEmail(token)
      .then((result) => setSuccess(result.message))
      .catch((err: unknown) => {
        setError(
          (err as ApiErr)?.response?.data?.detail ?? 'Failed to verify email'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Verify Email</h1>
        <p className="login-subtitle">
          Confirming your landlord account email address.
        </p>
        {loading && <div className="loading">Verifying your email...</div>}
        {!loading && error && <div className="error-msg">{error}</div>}
        {!loading && success && <div className="config-success">{success}</div>}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    </div>
  );
}
