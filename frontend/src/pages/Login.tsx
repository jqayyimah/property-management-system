import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ApiErr = { response?: { data?: { detail?: string } } };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const apiMessage = (err as ApiErr)?.response?.data?.detail;

      if (apiMessage === 'User account is inactive') {
        setError(
          'Your landlord account is pending admin approval. You will be able to sign in once an administrator activates it.'
        );
      } else if (apiMessage === 'Please verify your email address before logging in') {
        setError(
          'Your email address has not been verified yet. Check your inbox and click the verification link before signing in.'
        );
      } else if (apiMessage) {
        setError(apiMessage);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Property Manager</h1>
        <p className="login-subtitle">Sign in to your account</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', textAlign: 'center' }}>
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/signup">Create landlord account</Link>
        </div>
      </div>
    </div>
  );
}
