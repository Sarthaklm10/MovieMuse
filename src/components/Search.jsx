import { useEffect, useRef } from "react";
import useKey from '../hooks/useKey';

function Search({ query, setQuery }) {
  const inputRef = useRef(null);

  function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);
  }

  // Focus input when component mounts
  useEffect(function () {
    inputRef.current.focus();
  }, []);

  // Use the useKey hook to handle Enter key press
  useKey("Enter", function() {
    if (document.activeElement === inputRef.current) return;
    inputRef.current.focus();
    setQuery("");
  });

  return (
    <div className="search-container">
      <input
        className="search"
        type="text"
        placeholder="Search movies..."
        value={query}
        onChange={handleSearch}
        ref={inputRef}
      />
    </div>
  );
}

export default Search; 