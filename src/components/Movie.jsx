import React from 'react';

function Movie({ movie, onSelectMovie }) {
  const poster = movie.Poster || movie.poster;
  const title = movie.Title || movie.title;
  const year = movie.Year || movie.year;

  return (
    <li onClick={() => onSelectMovie(movie.imdbID)} data-movie-id={movie.imdbID}>
      {poster === "N/A" ? (
        <div className="no-poster">{title}</div>
      ) : (
        <img src={poster} alt={`${title} poster`} />
      )}
      <h3>{title}</h3>
      <div>
        <p>
          <span>🗓</span>
          <span>{year}</span>
        </p>
      </div>
    </li>
  );
}

export default Movie; 