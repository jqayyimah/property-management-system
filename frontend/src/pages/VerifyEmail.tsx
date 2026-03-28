import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';

type ApiErr = { response?: { data?: { detail?: string } } };

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(6);

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

  useEffect(() => {
    if (!success) return;
    if (secondsLeft <= 0) {
      navigate('/login', { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [navigate, secondsLeft, success]);

  const stateClass = loading ? 'is-loading' : error ? 'is-error' : 'is-success';
  const stateIcon = loading ? '...' : error ? '!' : 'OK';
  const title = loading
    ? 'Verifying your email'
    : error
      ? 'Verification link issue'
      : 'Email verified successfully';
  const subtitle = loading
    ? 'Please wait while we confirm your landlord account.'
    : error
      ? 'This link is missing, invalid, or has already expired.'
      : 'Your account email has been confirmed. You can continue to sign in once your access is active.';

  return (
    <div className="login-container verify-page">
      <div className={`login-card verify-card ${stateClass}`}>
        <div className={`verify-icon ${stateClass}`} aria-hidden="true">
          {stateIcon}
        </div>
        <h1 className="login-title">{title}</h1>
        <p className="login-subtitle">{subtitle}</p>

        {loading && <div className="loading">Verifying your email...</div>}
        {!loading && error && <div className="error-msg">{error}</div>}
        {!loading && success && (
          <div className="config-success">
            <div>{success}</div>
            <div style={{ marginTop: '0.35rem' }}>
              Redirecting to login in {secondsLeft}s.
            </div>
          </div>
        )}

        <div className="verify-actions">
          <Link className="btn btn-primary" to="/login">
            Go to Login
          </Link>
          {error && (
            <Link className="btn btn-secondary" to="/signup">
              Back to Signup
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
