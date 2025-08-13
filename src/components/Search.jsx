import { useEffect, useRef } from "react";

function Search({ query, setQuery, onManualSearch }) {
  const inputRef = useRef(null);

  function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);
  }

  function handleKeyPress(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      onManualSearch();
    }
  }

  function handleSearchClick(e) {
    e.preventDefault();
    onManualSearch();
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    onManualSearch();
  }

  // Focus input when component mounts
  useEffect(function () {
    inputRef.current.focus();
  }, []);

  return (
    <form className="search-container" onSubmit={handleFormSubmit}>
      <input
        className="search"
        type="text"
        placeholder="Search movies..."
        value={query}
        onChange={handleSearch}
        onKeyPress={handleKeyPress}
        ref={inputRef}
      />
      <button
        className="search-button"
        onClick={handleSearchClick}
        type="submit"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </button>
    </form>
  );
}

export default Search;
