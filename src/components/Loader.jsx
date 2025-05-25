import React from 'react';

function Loader() {
  return (
    <div className="loader-container">
      <div className="loader-spinner">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <p className="loader-text">Loading...</p>
    </div>
  );
}

export default Loader; 