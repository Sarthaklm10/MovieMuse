import React, { useState } from 'react';
import { login } from '../utils/api';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // login() should return an object containing `token` and optionally `user`
      const res = await login({ username, password });
      const token = res?.token ?? res; // handle utils that return token directly
      if (!token) throw new Error('No token returned from login');

      // store token and expiry (8 hours)
      const expiryTime = Date.now() + 8 * 60 * 60 * 1000; // 8 hours in ms
      localStorage.setItem('token', token);
      localStorage.setItem('token_expiry', String(expiryTime));

      localStorage.setItem('username', username);

      // Save username
      if (typeof onLoginSuccess === 'function')
        onLoginSuccess(username);
    }
    catch (err) {
      console.error('Login failed:', err);
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" className="btn-auth">Login</button>
    </form>
  );
}

export default Login;