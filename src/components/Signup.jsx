import React, { useState } from 'react';
import { signup } from '../utils/api';

function Signup({ onSignupSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      await signup({ username, password });
      setSuccess('Registration successful! Please log in.');
      setTimeout(onSignupSuccess, 1500); // Switch to login form after success
    } catch (err) {
      setError('Username already taken');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Sign Up</h2>
      {error && <p className={`error ${error ? 'visible' : ''}`}>{error}</p>}
      {success && <p className={`success ${success ? 'visible' : ''}`}>{success}</p>}
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
      <button type="submit" className="btn-auth">Sign Up</button>
    </form>
  );
}

export default Signup;