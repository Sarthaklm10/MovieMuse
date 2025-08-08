import React, { useEffect } from "react";
import "./Auth.css"; // We will reuse some styles

function LoginPrompt({ onTimeout }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTimeout();
    }, 2000); // Display for 2 seconds

    return () => clearTimeout(timer);
  }, [onTimeout]);

  return (
    <div className="prompt-container">
      <div className="prompt-box">
        <h3>Please Log In</h3>
        <p>You need to be logged in to save movies to your watchlist.</p>
      </div>
    </div>
  );
}

export default LoginPrompt;
