import React from 'react';

const LoggedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 18.75a8.967 8.967 0 0 1 15 0h-.75a6.75 6.75 0 0 0-13.5 0h-.75Z" />
  </svg>
);

const LoggedOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 18.75a8.967 8.967 0 0 1 15 0h-.75a6.75 6.75 0 0 0-13.5 0h-.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21L3 3" />
  </svg>
);


function UserStatus({ isAuthenticated, onLogout, username, onLoginClick }) {
  const handleClick = () => {
    if (isAuthenticated) {
      onLogout();
    } else {
      onLoginClick();
    }
  };

  return (
    <div className="user-status-container">
      <button
        className="user-status-toggle"
        onClick={handleClick}
        title={isAuthenticated ? `Logged in as ${username}` : "Login or Signup"}
      >
        {isAuthenticated ? <LoggedInIcon /> : <LoggedOutIcon />}
      </button>
      {isAuthenticated && <span className="username-display">{username}</span>}
    </div>
  );
}

export default UserStatus;