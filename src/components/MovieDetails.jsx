import React, { useState, useEffect, useRef, useCallback } from 'react';
import StarRating from '../StarRating';
import { API_KEY, OMDB_BASE_URL } from '../utils/constants';
import Loader from './Loader';
import { findTMDBId, getSimilarMovies, convertTMDBMovie } from '../utils/tmdbApi';

// Simple cache to store previously fetched movie details
const movieCache = {};

// Cache for TMDB IDs
const tmdbIdCache = {};
// Cache for similar movies from TMDB
const similarMoviesCache = {};

function MovieDetails({ selectedId, onCloseMovie, onAddWatched, onRemoveWatched, watched, isWatchedSelected, onSelectMovie }) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userRating, setUserRating] = useState('');
  const [userReview, setUserReview] = useState('');
  const [fadeIn, setFadeIn] = useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);
  const [isFullPlot, setIsFullPlot] = useState(false);
  const [fullPlotText, setFullPlotText] = useState('');
  const [isLoadingFullPlot, setIsLoadingFullPlot] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const controllerRef = useRef(null);

  // TMDB ID for current movie
  const [tmdbId, setTmdbId] = useState(null);

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
    Ratings
  } = movie;

  // Extract Rotten Tomatoes rating from the Ratings array if available
  const rottenTomatoesRating = Ratings?.find(rating => rating.Source === 'Rotten Tomatoes')?.Value || 'N/A';

  // Fetch similar movies using TMDB API
  const fetchSimilarMovies = useCallback(async () => {
    if (!title) return;  // No title, no search
    
    setIsLoadingSimilar(true);
    
    try {
      // Step 1: Get TMDB ID (from cache or API)
      let movieTmdbId = tmdbIdCache[selectedId] || await findTMDBId(selectedId);
      
      // Save ID to cache if found
      if (movieTmdbId && !tmdbIdCache[selectedId]) {
        tmdbIdCache[selectedId] = movieTmdbId;
        setTmdbId(movieTmdbId);
      }

      // Step 2: Get similar movies (from cache or APIs)
      let similarResults = [];
      
      // Check cache first
      if (movieTmdbId && similarMoviesCache[movieTmdbId]) {
        similarResults = similarMoviesCache[movieTmdbId];
      }
      // Otherwise fetch from TMDB if we have an ID
      else if (movieTmdbId) {
        const tmdbSimilarMovies = await getSimilarMovies(movieTmdbId);
        similarResults = tmdbSimilarMovies.map(convertTMDBMovie);
        
        // Cache the results
        if (similarResults.length > 0) {
          similarMoviesCache[movieTmdbId] = similarResults;
        }
      }
      
      // Step 3: Fall back to genre-based search if needed
      if (similarResults.length < 3 && genre) {
        // Get up to 2 genres for better matching
        const genres = genre.split(',').map(g => g.trim()).slice(0, 2);
        const seenIds = new Set(similarResults.map(m => m.imdbID.replace('tmdb-', '')));
        
        // Search each genre in parallel
        const results = await Promise.all(genres.map(async (genreItem) => {
          try {
            const res = await fetch(
              `${OMDB_BASE_URL}/?apikey=${API_KEY}&s=${encodeURIComponent(genreItem)}&type=movie&page=1`,
              { signal: controllerRef.current?.signal }
            );
            
            if (!res.ok) return [];
            
            const data = await res.json();
            return data.Response === "True" ? data.Search || [] : [];
          } catch (err) {
            return [];  // Return empty on error
          }
        }));
        
        // Add unique movies to results
        results.flat().forEach(movie => {
          if (movie && !seenIds.has(movie.imdbID) && movie.imdbID !== selectedId) {
            seenIds.add(movie.imdbID);
            similarResults.push(movie);
          }
        });
      }
      
      // Step 4: Filter and set results
      const validSimilarMovies = similarResults
        .filter(movie => movie && movie.imdbID && movie.Title && movie.Poster)
        .slice(0, 6);  // Limit to 6 similar movies
      
      setSimilarMovies(validSimilarMovies);
    } catch (err) {
      console.error("Error fetching similar movies:", err);
    } finally {
      setIsLoadingSimilar(false);
    }
  }, [genre, selectedId, title]);

  // Fetch full plot when requested
  const fetchFullPlot = useCallback(async () => {
    if (fullPlotText) {
      setIsFullPlot(true);
      return;
    }

    setIsLoadingFullPlot(true);

    try {
      const res = await fetch(
        `${OMDB_BASE_URL}/?apikey=${API_KEY}&i=${selectedId}&plot=full`,
        { signal: controllerRef.current.signal }
      );

      if (!res.ok) throw new Error("Failed to fetch full plot");

      const data = await res.json();

      if (data.Plot && data.Plot !== plot) {
        setFullPlotText(data.Plot);
      } else {
        setFullPlotText(plot);
      }

      setIsFullPlot(true);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching full plot:", err);
      }
    } finally {
      setIsLoadingFullPlot(false);
    }
  }, [selectedId, plot, fullPlotText]);

  // Reset states when new movie is selected
  useEffect(() => {
    setUserRating(watchedMovie?.userRating || '');
    setUserReview(watchedMovie?.userReview || '');
    setIsReviewSubmitted(!!watchedMovie);
    setIsFullPlot(false);
    setFullPlotText('');
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

  // Fetch similar movies when genre is available
  useEffect(() => {
    if (genre) {
      fetchSimilarMovies();
    }
  }, [genre, fetchSimilarMovies]);

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
    // Set loading state immediately (this is redundant now since we set it in the first effect)
    // setIsLoading(true);
    // setFadeIn(false);
    
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

    async function getMovieDetails() {
      try {
        const res = await fetch(
          `${OMDB_BASE_URL}/?apikey=${API_KEY}&i=${selectedId}`,
          { signal: controllerRef.current.signal }
        );

        if (!res.ok) throw new Error("Failed to fetch movie details");

        const data = await res.json();

        // Cache the result
        movieCache[selectedId] = data;
        setMovie(data);
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

    getMovieDetails();

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

  // Simple function to handle similar movie clicks
  function handleSimilarMovieClick(movieId) {
    // For TMDB movies, we need to search OMDB to get proper details
    if (movieId.startsWith('tmdb-')) {
      const movie = similarMovies.find(m => m.imdbID === movieId);
      
      if (movie?.Title) {
        // console.log(`Loading TMDB movie: ${movie.Title}`);
        
        // Show loading state immediately
        setFadeIn(false);
        
        // We need to get OMDB data first for TMDB movies
        async function fetchOmdbData() {
          try {
            // Search OMDB for this movie
            const searchRes = await fetch(
              `${OMDB_BASE_URL}/?apikey=${API_KEY}&s=${encodeURIComponent(movie.Title)}&type=movie`
            );
            
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              
              if (searchData.Response === "True" && searchData.Search && searchData.Search.length > 0) {
                // Use the first result that best matches the title
                const firstResult = searchData.Search[0];
                // console.log(`Using search result: ${firstResult.Title} (${firstResult.imdbID})`);
                
                // Now we have a valid IMDB ID, transition to it
                onSelectMovie(firstResult.imdbID, false, true);
              } else {
                console.error("No search results found");
                setFadeIn(true); // Restore fade in if failed
                alert("Could not find this movie. Please try another one.");
              }
            } else {
              console.error(`API error: ${searchRes.status}`);
              setFadeIn(true); // Restore fade in if failed
              alert("Error loading movie. Please try again.");
            }
          } catch (err) {
            console.error("Error finding movie by title:", err);
            setFadeIn(true); // Restore fade in if failed
            alert("Error loading movie. Please try again.");
          }
        }
        
        // Start the data fetch
        fetchOmdbData();
      }
    } else {
      // Regular IMDB ID, use a direct approach
      // console.log(`Loading regular movie: ${movieId}`);
      
      // First set fadeIn to false to start the transition
      setFadeIn(false);
      
      // Direct transition
      setTimeout(() => {
        onSelectMovie(movieId, false, true);
      }, 100);
    }
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

    // Scroll to top with smooth behavior
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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

  return (
    <div className={`details ${fadeIn ? 'fade-in' : ''}`} ref={detailsContainerRef}>
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

      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <header>
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
                {country && <span className="meta-item">🌍 {country}</span>}
                {awards && awards !== "N/A" && <span className="meta-item">🏆 {awards}</span>}
              </div>

              <div className="ratings-container">
                <div className="rating-imdb">
                  <span>⭐️</span>
                  <strong>{imdbRating}</strong>
                  <span>IMDb rating</span>
                </div>

                {Metascore && Metascore !== 'N/A' && (
                  <div className="rating-metacritic">
                    <span>📊</span>
                    <strong>{Metascore}</strong>
                    <span>Metacritic</span>
                  </div>
                )}

                {rottenTomatoesRating !== 'N/A' && (
                  <div className="rating-rt">
                    <span>🍅</span>
                    <strong>{rottenTomatoesRating}</strong>
                    <span>Rotten Tomatoes</span>
                  </div>
                )}

                {isWatchedSelected && watchedMovie && (
                  <div className="rating-user">
                    <span>🌟</span>
                    <strong>{watchedMovie.userRating}</strong>
                    <span>Your rating</span>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="plot-container">
            <p className="plot">
              {isFullPlot ? fullPlotText || plot : plot}
            </p>
            {plot && plot.length > 100 && (
              <button
                className="btn-read-more"
                onClick={isFullPlot ? () => setIsFullPlot(false) : fetchFullPlot}
                disabled={isLoadingFullPlot}
              >
                {isLoadingFullPlot ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Loading...</span>
                  </>
                ) : isFullPlot ? "Show Less" : "Read More"}
              </button>
            )}
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
          </div>

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
            ) : genre ? (
              <p className="no-similar">No similar movies found.</p>
            ) : null}
          </div>

          <section>
            {(!isReviewSubmitted || (isWatchedSelected && watchedMovie)) && (
              <div className="rating">
                <h3>{watchedMovie ? "Edit your rating" : "Rate this movie"}</h3>
                <div className="rating-stars">
                  <StarRating
                    maxRating={10}
                    size={24}
                    onSetRating={setUserRating}
                    color="var(--color-star)"
                    defaultRating={watchedMovie?.userRating}
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
            )}
            {(isReviewSubmitted || (isWatchedSelected && watchedMovie)) && watchedMovie?.userReview && (
              <div className="user-review">
                <h3>Your Review</h3>
                <p>{watchedMovie.userReview}</p>
                {!isWatchedSelected && watchedMovie?.userReview && (
                  <button 
                    className="btn-edit-review" 
                    onClick={() => setIsReviewSubmitted(false)}
                  >
                    Edit Review
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default React.memo(MovieDetails); 