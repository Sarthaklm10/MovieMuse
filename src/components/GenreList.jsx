import React, { useState, useEffect } from 'react';
import { getGenres } from '../utils/tmdbApi';
import './GenreList.css';

const GenreList = ({ onGenreSelect }) => {
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genreData = await getGenres();
        setGenres(genreData.genres);
      } catch (err) {
        setError('Failed to load genres.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  if (isLoading) {
    return <div className="genre-list-loading">Loading genres...</div>;
  }

  if (error) {
    return <div className="genre-list-error">{error}</div>;
  }

  return (
    <div className="genre-list-container">
      <h2 className="genre-list-title">What do you wanna watch today?</h2>
      <div className="genre-list">
        {genres.map((genre) => (
          <button
            key={genre.id}
            className="genre-button"
            onClick={() => onGenreSelect(genre.id, genre.name)}
          >
            {genre.name}
          </button>
        ))}
        <button
          className="genre-button surprise-me-button"
          onClick={() => onGenreSelect('surprise')}
        >
          🎉 Surprise Me!
        </button>
      </div>
    </div>
  );
};

export default GenreList;