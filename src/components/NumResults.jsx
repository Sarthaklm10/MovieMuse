import React from 'react';

function NumResults({ movies }) {
  // Only show results if we have movies and the count is greater than 0
  if (!movies || movies.length === 0) return null;
  
  return (
    <p className="num-results">
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

export default NumResults; 