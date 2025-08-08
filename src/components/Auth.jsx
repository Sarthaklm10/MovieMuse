import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import './Auth.css';

function Auth({ onLogin }) {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="logo auth-logo">
          <span role="img">🎬</span>
          <h1>MovieMuse</h1>
        </div>
        {showLogin ? (
          <Login onLoginSuccess={onLogin} />
        ) : (
          <Signup onSignupSuccess={() => setShowLogin(true)} />
        )}
        <button className="toggle-auth" onClick={() => setShowLogin(!showLogin)}>
          {showLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
        </button>
      </div>
    </div>
  );
}

export default Auth;