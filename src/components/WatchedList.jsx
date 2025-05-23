import React from 'react';
import WatchedMovie from './WatchedMovie';

function WatchedList({ watched, onSelectMovie, onRemoveWatched }) {
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie
          movie={movie}
          key={movie.imdbID}
          onSelectMovie={onSelectMovie}
          onRemoveWatched={onRemoveWatched}
        />
      ))}
    </ul>
  );
}

export default WatchedList; 