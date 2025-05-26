import React, { useState, useRef } from 'react';

// Extract SVG icons into separate components
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const WatchlistIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Z"></path>
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
);

function Box({ children, title }) {
  const [isOpen, setIsOpen] = useState(true);
  const contentRef = useRef(null);
  
  // Get appropriate icon based on title
  const getBoxIcon = () => {
    if (title.includes('Search')) return <SearchIcon />;
    if (title.includes('Watch')) return <WatchlistIcon />;
    return null;
  };
  
  const toggleBox = () => setIsOpen(open => !open);
  
  return (
    <div className={`box ${isOpen ? 'box-open' : 'box-closed'}`}>
      <div className="box-header">
        {!isOpen && (
          <div className="box-preview">
            {getBoxIcon()}
            <h3>{title}</h3>
          </div>
        )}
        <button
          className="btn-toggle"
          onClick={toggleBox}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <MinusIcon /> : <PlusIcon />}
        </button>
      </div>
      <div 
        className="box-content" 
        style={{ display: isOpen ? 'block' : 'none' }}
        ref={contentRef}
      >
        {children}
      </div>
    </div>
  );
}

export default Box; 