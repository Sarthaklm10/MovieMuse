import React, { useEffect, useRef } from 'react';
import useKey from '../hooks/useKey';

function Search({ query, setQuery }) {
  const inputEl = useRef(null);

  // Focus input when component mounts
  useEffect(function () {
    inputEl.current.focus();
  }, []);

  // Use the useKey hook to handle Enter key press
  useKey("Enter", function() {
    if (document.activeElement === inputEl.current) return;
    inputEl.current.focus();
    setQuery("");
  });

  return (
    <input
      ref={inputEl}
      className="search"
      type="text"
      placeholder="Search movies..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}

export default Search; 