import React, { useState, useEffect, useRef, useCallback } from 'react';
import StarRating from '../StarRating';
import Loader from './Loader';
import { getMovieDetails, getSimilarMovies, convertTMDBMovie, formatMovieDetails } from '../utils/tmdbApi';

// Simple cache to store previously fetched movie details
const movieCache = {};

// Cache for similar movies
const similarMoviesCache = {};

function MovieDetails({ selectedId, onCloseMovie, onAddWatched, onRemoveWatched, watched, isWatchedSelected, onSelectMovie }) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userRating, setUserRating] = useState('');
  const [userReview, setUserReview] = useState('');
  const [fadeIn, setFadeIn] = useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const controllerRef = useRef(null);

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
    Writer: writer,
    Language: language,
    Country: country,
    Awards: awards,
    Metascore,
    Ratings,
    vote_count,
    vote_average,
    audienceScore,
    original_imdb_id,
    tagline,
    budget,
    revenue,
    production_companies,
    homepage,
    status
  } = movie;

  // Extract TMDB rating from the Ratings array if available
  const tmdbRating = Ratings?.find(rating => rating.Source === 'TMDB Rating')?.Value || 'N/A';

  // Fetch similar movies using TMDB API
  const fetchSimilarMovies = useCallback(async () => {
    if (!movie.tmdbId) return;  // No ID, no search
    
    setIsLoadingSimilar(true);
    
    try {
      // Check cache first
      if (similarMoviesCache[movie.tmdbId]) {
        setSimilarMovies(similarMoviesCache[movie.tmdbId]);
        setIsLoadingSimilar(false);
        return;
      }
      
      // Get similar movies from TMDB
      const tmdbSimilarMovies = await getSimilarMovies(movie.tmdbId);
      const formattedMovies = tmdbSimilarMovies
        .map(convertTMDBMovie)
        .filter(Boolean) // Remove null entries
        .slice(0, 6);  // Limit to 6 similar movies
      
      // Cache the results
      if (formattedMovies.length > 0) {
        similarMoviesCache[movie.tmdbId] = formattedMovies;
      }
      
      setSimilarMovies(formattedMovies);
    } catch (err) {
      console.error("Error fetching similar movies:", err);
    } finally {
      setIsLoadingSimilar(false);
    }
  }, [movie.tmdbId]);

  // Reset states when new movie is selected
  useEffect(() => {
    setUserRating(watchedMovie?.userRating || '');
    setUserReview(watchedMovie?.userReview || '');
    setIsReviewSubmitted(!!watchedMovie);
    // Set loading state immediately on selectedId change
    setIsLoading(true);
    setFadeIn(false);
    
    // Only scroll to top when switching movies, not when submitting review
    if (detailsContainerRef.current) {
      // First scroll to top of component
      detailsContainerRef.current.scrollIntoView({ 
        behavior: 'auto', 
        block: 'start' 
      });
      
      // Then add additional scroll to position it better (scrolls up by 60px)
      setTimeout(() => {
        window.scrollBy({
          top: -60,
          behavior: 'smooth'
        });
      }, 50);
    }
  }, [selectedId]);
  
  // Separate effect for watchedMovie updates to avoid resetting loading state
  useEffect(() => {
    if (watchedMovie) {
      setUserRating(watchedMovie.userRating || '');
      setUserReview(watchedMovie.userReview || '');
      setIsReviewSubmitted(true);
    }
  }, [watchedMovie]);

  // Fetch similar movies when movie data is available
  useEffect(() => {
    if (movie.tmdbId) {
      fetchSimilarMovies();
    }
  }, [movie.tmdbId, fetchSimilarMovies]);

  useEffect(() => {
    const callback = (e) => {
      if (e.key === "Escape") {
        onCloseMovie();
      }
    };
    document.addEventListener("keydown", callback);
    return () => {
      document.removeEventListener("keydown", callback);
    };
  }, [onCloseMovie]);

  useEffect(() => {
    // Check if we already have this movie in cache
    if (movieCache[selectedId]) {
      setMovie(movieCache[selectedId]);
      // Even with cache, maintain a minimum loading time for consistent UX
      setTimeout(() => {
        setIsLoading(false);
        setTimeout(() => setFadeIn(true), 10);
      }, 300);
      return;
    }

    // Clean up previous requests
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Create new abort controller
    controllerRef.current = new AbortController();

    async function getMovieDetailsData() {
      try {
        // For IDs starting with tmdb-, remove prefix
        const movieId = selectedId.startsWith('tmdb-') ? 
          selectedId.replace('tmdb-', '') : selectedId;
          
        // Get movie details from TMDB API
        const tmdbDetails = await getMovieDetails(movieId);
        
        if (!tmdbDetails) {
          throw new Error("Failed to fetch movie details");
        }
        
        // Format the TMDB data to match our app's expected structure
        const formattedData = formatMovieDetails(tmdbDetails);
        
        // Cache the result
        movieCache[selectedId] = formattedData;
        setMovie(formattedData);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching movie details:", err);
        }
      } finally {
        if (!controllerRef.current.signal.aborted) {
          setTimeout(() => {
            setIsLoading(false);
            setTimeout(() => setFadeIn(true), 10);
          }, 300);
        }
      }
    }

    getMovieDetailsData();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [selectedId]);

  useEffect(() => {
    if (!title) return;
    document.title = `Movie | ${title}`;

    return () => {
      document.title = "MovieMuse";
    };
  }, [title]);

  // Handle similar movie clicks
  function handleSimilarMovieClick(movieId) {
    // Set fadeIn to false to start the transition
    setFadeIn(false);
    
    // Direct transition to the selected movie
    setTimeout(() => {
      onSelectMovie(movieId, false, true);
    }, 100);
  }

  // Preload similar movie posters for better UX
  useEffect(() => {
    if (similarMovies.length > 0) {
      // Preload all movie posters
      similarMovies.forEach(movie => {
        if (movie.Poster && movie.Poster !== "N/A") {
          const img = new Image();
          img.src = movie.Poster;
        }
      });
    }
  }, [similarMovies]);

  // Add a reference to scroll to top
  const detailsContainerRef = useRef(null);

  const handleAdd = useCallback(() => {
    // Check if we're updating an existing rating
    const isUpdating = watched.some(movie => movie.imdbID === selectedId);
    
    const newMovie = {
      imdbID: selectedId,
      Title: title,
      Year: year,
      Poster: poster,
      imdbRating: Number(imdbRating),
      runtime: runtime?.split(" ")[0],
      userRating,
      userReview,
      Genre: genre // Store the genre for better recommendations
    };
    onAddWatched(newMovie);

    // Mark review as submitted to hide the review form
    setIsReviewSubmitted(true);

    // Scroll to position showing the movie header (title and poster)
    if (detailsContainerRef.current) {
      const headerOffset = 80; // Adjust to show movie title and top of poster
      const elementPosition = detailsContainerRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [selectedId, title, year, poster, imdbRating, runtime, userRating, userReview, onAddWatched, genre, watched]);

  // Add height reservation for similar movies section to prevent layout shifts
  const similarMoviesSectionStyle = {
    minHeight: isLoadingSimilar ? '250px' : 'auto'
  };

  // Skeleton component to maintain consistency
  const SkeletonLoader = () => (
    <div className="skeleton-details">
      <header>
        <div className="skeleton-poster"></div>
        <div className="skeleton-overview">
          <div className="skeleton-title"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-text"></div>
          <div className="skeleton-rating"></div>
        </div>
      </header>
      
      <div className="skeleton-plot">
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
      </div>
      
      <div className="skeleton-section">
        <div className="skeleton-heading"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
      </div>
    </div>
  );

  // Force minimum loading duration for consistency
  useEffect(() => {
    if (isLoading) {
      // Ensure skeleton always shows for at least 800ms
      const minLoadingTimer = setTimeout(() => {
        if (movie && Object.keys(movie).length > 0) {
          setIsLoading(false);
          setTimeout(() => setFadeIn(true), 10);
        }
      }, 800);
      
      return () => clearTimeout(minLoadingTimer);
    }
  }, [isLoading, movie]);

  // For loading state
  if (isLoading) return <SkeletonLoader />;

  return (
    <div className={`details ${fadeIn ? 'fade-in' : ''}`} ref={detailsContainerRef}>
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
              d="M6 18L18 6M6 6l12 12"
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

          <div className="details-meta">
            {language && <span className="meta-item">📢 {language}</span>}
            {country && country !== 'N/A' && <span className="meta-item">🌍 {country}</span>}
            {awards && awards !== "N/A" && <span className="meta-item">🏆 {awards}</span>}
          </div>

          <div className="ratings-cards">
            <div className="rating-card tmdb-card">
              <div className="rating-content">
                <div className="rating-icon">⭐</div>
                <div className="rating-info">
                  <div className="rating-value">{imdbRating}</div>
                  <div className="rating-label">TMDB rating</div>
                  {vote_count && (
                    <div className="rating-votes">{vote_count} votes</div>
                  )}
                </div>
              </div>
            </div>

            {audienceScore && audienceScore !== 'N/A' && (
              <div className="rating-card audience-card">
                <div className="rating-content">
                  <div className="rating-icon">🍅</div>
                  <div className="rating-info">
                    <div className="rating-value">{audienceScore}%</div>
                    <div className="rating-label">Audience Score</div>
                  </div>
                </div>
              </div>
            )}

            {watchedMovie && (
              <div className="rating-card user-card">
                <div className="rating-content">
                  <div className="rating-icon">🌟</div>
                  <div className="rating-info">
                    <div className="rating-value">{watchedMovie.userRating}</div>
                    <div className="rating-label">Your rating</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="plot-container">
        {plot ? (
          <p className="plot">{plot}</p>
        ) : (
          <p className="plot">No plot description available for this movie.</p>
        )}
        {tagline && <p className="tagline">"{tagline}"</p>}
      </div>

      <div className="credits-section">
        <h3>Movie Credits</h3>
        <p className="credits">
          <strong>Starring:</strong> <span>{actors}</span>
        </p>
        <p className="credits">
          <strong>Directed by:</strong> <span>{director}</span>
        </p>
        {writer && writer !== "N/A" && (
          <p className="credits">
            <strong>Written by:</strong> <span>{writer}</span>
          </p>
        )}
        {production_companies && production_companies.length > 0 && (
          <p className="credits">
            <strong>Production:</strong> <span>{production_companies.join(", ")}</span>
          </p>
        )}
      </div>

      {/* Additional Information Section */}
      {(homepage || (budget > 0) || (revenue > 0) || (status && status !== "Released")) && (
        <div className="additional-info">
          <h3>Additional Information</h3>

          <div className="info-grid">
            {budget > 0 && (
              <div className="info-item">
                <div className="info-icon">💰</div>
                <div className="info-content">
                  <div className="info-label">Budget</div>
                  <div className="info-value">${new Intl.NumberFormat('en-US').format(budget)}</div>
                </div>
              </div>
            )}
            {revenue > 0 && (
              <div className="info-item">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <div className="info-label">Box Office</div>
                  <div className="info-value">${new Intl.NumberFormat('en-US').format(revenue)}</div>
                </div>
              </div>
            )}
            {status && status !== "Released" && (
              <div className="info-item">
                <div className="info-icon">🎬</div>
                <div className="info-content">
                  <div className="info-label">Status</div>
                  <div className="info-value">{status}</div>
                </div>
              </div>
            )}
            {homepage && (
              <div className="info-item">
                <div className="info-icon">🌐</div>
                <div className="info-content">
                  <div className="info-label">Official Website</div>
                  <div className="info-value">
                    <a href={homepage} target="_blank" rel="noopener noreferrer" className="movie-link">
                      Visit Website
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Similar Movies Section */}
      <div className="similar-movies-section" style={similarMoviesSectionStyle}>
        <h3>Similar Movies</h3>
        
        {isLoadingSimilar ? (
          <div className="similar-movies-loading">
            <span className="spinner-small"></span>
            <span>Finding similar movies...</span>
          </div>
        ) : similarMovies.length > 0 ? (
          <div className="similar-movies-grid">
            {similarMovies.map(movie => (
              <div 
                key={movie.imdbID} 
                className="similar-movie"
                onClick={() => handleSimilarMovieClick(movie.imdbID)}
              >
                {movie.Poster && movie.Poster !== "N/A" ? (
                  <img src={movie.Poster} alt={`Poster of ${movie.Title}`} />
                ) : (
                  <div className="no-poster">No poster available</div>
                )}
                <h4>{movie.Title}</h4>
                <p>{movie.Year}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <section>
        <div className="rating">
          <h3>{watchedMovie ? "Edit your rating" : "Rate this movie"}</h3>
          <div className="rating-stars">
            <StarRating
              maxRating={10}
              size={window.innerWidth < 480 ? 20 : 24}
              onSetRating={setUserRating}
              color="var(--color-star)"
              defaultRating={watchedMovie?.userRating}
              className="star-rating-component"
            />
          </div>
          {(userRating > 0 || watchedMovie) && (
            <>
              <textarea
                className="review-input"
                placeholder="Write your review (optional)..."
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
              />
              <button className="btn-add" onClick={handleAdd}>
                {watchedMovie ? "Update rating" : "+ Add to list"}
              </button>
            </>
          )}
        </div>
        {watchedMovie?.userReview && (
          <div className="user-review">
            <h3>Your Review</h3>
            <p>{watchedMovie.userReview}</p>
            <button 
              className="btn-edit-review" 
              onClick={() => setIsReviewSubmitted(false)}
            >
              Edit Review
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default MovieDetails;