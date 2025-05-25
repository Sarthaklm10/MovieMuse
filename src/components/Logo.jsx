import React from 'react';

function Logo({ onHomeClick }) {
    return (
        <div className="logo" onClick={onHomeClick} style={{ cursor: 'pointer' }} title="Go to homepage">
            <span role="img">🎬</span>
            <h1>MovieMuse</h1>
        </div>
    );
}

export default Logo;