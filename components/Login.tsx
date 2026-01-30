import React, { useState, FormEvent } from 'react';

interface LoginProps {
  onLogin: (password: string) => Promise<boolean>;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const success = await onLogin(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="login-header">
          <div className="login-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="heading-display">Income Verification</h1>
          <p className="text-body mt-sm">
            Enter password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="input"
              style={{
                borderColor: error ? 'var(--color-error)' : undefined
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: 'var(--space-sm)' }}>
              Invalid password
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary btn-full mt-lg"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
