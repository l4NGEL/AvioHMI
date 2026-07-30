import { useState, type FormEvent, type ReactNode } from 'react';

const SESSION_KEY = 'aviohmi.demoAuthenticated';

// Demo-only UX gate for the "ops center" feel — NOT real authentication.
// There is no backend check, no password hashing, no session token; the
// credentials are shown right on the screen. Never reuse this pattern for
// anything that handles real credentials or real access control.
const DEMO_USERNAME = 'operator';
const DEMO_PASSWORD = 'aviohmi';

export function LoginGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authenticated) return <>{children}</>;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read straight from the form (not React state) at submit time: some
    // browsers' autofill/password-manager sets the DOM value without firing
    // the input events React listens to, which left the controlled state
    // stale and made a correctly-autofilled login report "Invalid credentials".
    const formData = new FormData(e.currentTarget);
    const enteredUsername = String(formData.get('username') ?? '').trim();
    const enteredPassword = String(formData.get('password') ?? '');
    if (enteredUsername === DEMO_USERNAME && enteredPassword === DEMO_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthenticated(true);
    } else {
      setError('Invalid credentials');
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>AvioHMI</h1>
        <p className="login-subtitle">Ground Control — operator sign-in</p>
        <input
          name="username"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          name="password"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit">Sign in</button>
        <p className="login-hint">Demo credentials: operator / aviohmi</p>
      </form>
    </div>
  );
}
