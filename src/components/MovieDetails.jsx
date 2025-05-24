import React, { useState, useEffect, useRef } from 'react';
import StarRating from '../StarRating';
import { API_KEY } from '../utils/constants';
import Loader from './Loader';
import useKey from '../hooks/useKey';

function MovieDetails({ selectedId, onCloseMovie, onAddWatched, onRemoveWatched, watched, isWatchedSelected }) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userRating, setUserRating] = useState('');
  const [userReview, setUserReview] = useState('');

  const countRatings = useRef(0);

  useEffect(function () {
    if (userRating) {
      countRatings.current = countRatings.current + 1;
      console.log(countRatings.current);
    }
  }, [userRating]);

  // Find watched movie data if it exists
  const watchedMovie = watched.find(movie => movie.imdbID === selectedId);

  const {
    Title: title,
    Year: year,
    Poster: poster,
    Runtime: runtime,
    imdbRating,
    Plot: plot,
    Released: released,
    Actors: actors,
    Director: director,
    Genre: genre,
  } = movie;

  function handleAdd() {
    const newMovie = {
      imdbID: selectedId,
      Title: title,
      Year: year,
      Poster: poster,
      imdbRating: Number(imdbRating),
      runtime: runtime.split(" ")[0],
      userRating,
      userReview,
      countRatings: countRatings.current
    };

    onAddWatched(newMovie);
    onCloseMovie();
  }

  useKey("Escape", onCloseMovie);
  useEffect(function () {
    async function getMovieDetails() {
      setIsLoading(true);
      const res = await fetch(
        `http://www.omdbapi.com/?apikey=${API_KEY}&i=${selectedId}`
      );
      const data = await res.json();
      setMovie(data);
      setIsLoading(false);
    }
    getMovieDetails();
  }, [selectedId]);

  useEffect(function () {
    if (!title) return;
    document.title = `Movie | ${title}`;
  }, [title]);

  return (
    <div className="details">
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <header>
            <button className="btn-back" onClick={onCloseMovie}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <div className="poster-container">
              <img src={poster} alt={`Poster of ${title}`} />
            </div>
            <div className="details-overview">
              <h2>{title}</h2>
              <p>
                <span>🗓</span>
                {released}
              </p>
              <p>
                <span>⏱</span>
                {runtime}
              </p>
              <p>
                <span>🎭</span>
                {genre}
              </p>
              <div className="rating-imdb">
                <span>⭐️</span>
                <strong>{imdbRating}</strong>
                <span>IMDb rating</span>
              </div>
              {isWatchedSelected && watchedMovie && (
                <div className="rating-user">
                  <span>🌟</span>
                  <strong>{watchedMovie.userRating}</strong>
                  <span>Your rating</span>
                </div>
              )}
            </div>
          </header>
          <section>
            {!isWatchedSelected && (
              <div className="rating">
                <h3>Rate this movie</h3>
                <div className="rating-stars">
                  <StarRating
                    maxRating={10}
                    size={20}
                    onSetRating={setUserRating}
                    color="var(--color-star)"
                  />
                </div>
                {userRating > 0 && (
                  <>
                    <textarea
                      className="review-input"
                      placeholder="Write your review (optional)..."
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                    />
                    <button className="btn-add" onClick={handleAdd}>
                      + Add to list
                    </button>
                  </>
                )}
              </div>
            )}
            {isWatchedSelected && watchedMovie?.userReview && (
              <div className="user-review">
                <h3>Your Review</h3>
                <p>{watchedMovie.userReview}</p>
              </div>
            )}
            <p className="plot">{plot}</p>
            <p className="credits">
              Starring <span>{actors}</span>
            </p>
            <p className="credits">
              Directed by <span>{director}</span>
            </p>
          </section>
        </>
      )}
    </div>
  );
}

export default MovieDetails; 