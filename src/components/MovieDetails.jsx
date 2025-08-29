import React, { useState, useEffect, useRef, useCallback } from "react";
import StarRating from "../StarRating";
import Loader from "./Loader";

import {
  getMovieDetails,
  getSimilarMovies,
  convertTMDBMovie,
  formatMovieDetails,
} from "../utils/tmdbApi";

import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import { getReviewsForMovie } from "../utils/api";
import "./Review.css";
import "./ReviewList.css";
import "./ReviewForm.css";

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
};

// Simple cache to store previously fetched movie details
const movieCache = {};

// Cache for similar movies
const similarMoviesCache = {};

function MovieDetails({
  selectedId,
  onCloseMovie,
  onAddWatched,
  onRemoveWatched,
  watched,
  isWatchedSelected,
  onSelectMovie,
  isAuthenticated,
  onLoginRequest,
}) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [userRating, setUserRating] = useState("");
  const [userReview, setUserReview] = useState("");
  const [fadeIn, setFadeIn] = useState(false);
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [reviews, setReviews] = useState([]);
  const controllerRef = useRef(null);

  // Find watched movie data if it exists
  const watchedMovie = watched.find((movie) => movie.imdbID === selectedId);

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
    status,
  } = movie;

  // Extract TMDB rating from the Ratings array if available
  const tmdbRating =
    Ratings?.find((rating) => rating.Source === "TMDB Rating")?.Value || "N/A";

  // Fetch similar movies using TMDB API
  const fetchSimilarMovies = useCallback(async () => {
    if (!movie.tmdbId) return; // No ID, no search

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
        .slice(0, 6); // Limit to 6 similar movies

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

  // Add a reference to scroll to top
  const detailsContainerRef = useRef(null);

  // Reset states when new movie is selected
  useEffect(() => {
    setUserRating(watchedMovie?.userRating || "");
    setUserReview(watchedMovie?.userReview || "");
    setIsReviewSubmitted(!!watchedMovie);
    // Set loading state immediately on selectedId change
    setIsLoading(true);
    setFadeIn(false);

    // Only scroll to top when switching movies, not when submitting review
    if (detailsContainerRef.current) {
      // First scroll to top of component
      detailsContainerRef.current.scrollIntoView({
        behavior: "auto",
        block: "start",
      });

      // Then add additional scroll to position it better (scrolls up by 60px)
      setTimeout(() => {
        window.scrollBy({
          top: -60,
          behavior: "smooth",
        });
      }, 50);
    }
  }, [selectedId, watchedMovie]);

  // Separate effect for watchedMovie updates to avoid resetting loading state
  useEffect(() => {
    if (watchedMovie) {
      setUserRating(watchedMovie.userRating || "");
      setUserReview(watchedMovie.userReview || "");
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
    const fetchReviews = async () => {
      if (selectedId) {
        const reviews = await getReviewsForMovie(selectedId);
        setReviews(reviews);
      }
    };
    fetchReviews();
  }, [selectedId]);

  const currentUserId = isAuthenticated
    ? parseJwt(localStorage.getItem("token"))?.user?.id
    : null;

  const handleReviewAdded = (response) => {
    const newReview = response.review; // The actual review object from the backend
    // const message = response.message; // The message from the backend is handled in ReviewForm

    setReviews((prevReviews) => {
      const existingReviewIndex = prevReviews.findIndex(
        (review) => review.userId === currentUserId
      );

      if (existingReviewIndex > -1) {
        // Update existing review
        const updatedReviews = [...prevReviews];
        updatedReviews[existingReviewIndex] = newReview;
        return updatedReviews;
      } else {
        // Add new review
        return [newReview, ...prevReviews];
      }
    });
  };

  // Determine if the current user has already reviewed this movie
  const userHasReviewed = reviews.some((review) => review.userId === currentUserId);

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
  }, [onCloseMovie, reviews, currentUserId]); // Added dependencies

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
        const movieId = selectedId.startsWith("tmdb-")
          ? selectedId.replace("tmdb-", "")
          : selectedId;

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
        if (!controllerRef.current?.signal.aborted) {
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
      similarMovies.forEach((movie) => {
        if (movie.Poster && movie.Poster !== "N/A") {
          const img = new Image();
          img.src = movie.Poster;
        }
      });
    }
  }, [similarMovies]);

  const handleAdd = useCallback(() => {
    // Check if user is authenticated before adding
    if (!isAuthenticated) {
      // Defensive check to prevent crash if prop is missing
      if (typeof onLoginRequest === "function") {
        onLoginRequest();
      } else {
        console.error("onLoginRequest prop is missing or not a function.");
      }
      return;
    }

    const newMovie = {
      imdbID: selectedId,
      Title: title,
      Year: year,
      Poster: poster,
      imdbRating: Number(imdbRating),
      runtime: runtime?.split(" ")[0],
      userRating,
      userReview,
      Genre: genre,
    };
    onAddWatched(newMovie);

    setIsReviewSubmitted(true);

    if (detailsContainerRef.current) {
      const headerOffset = 80;
      const elementPosition =
        detailsContainerRef.current.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, [
    selectedId,
    title,
    year,
    poster,
    imdbRating,
    runtime,
    userRating,
    userReview,
    onAddWatched,
    genre,
    isAuthenticated,
    onLoginRequest,
  ]);

  // Add height reservation for similar movies section to prevent layout shifts
  const similarMoviesSectionStyle = {
    minHeight: isLoadingSimilar ? "250px" : "auto",
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
      const minLoadingTimer = setTimeout(() => {
        if (movie && Object.keys(movie).length > 0) {
          setIsLoading(false);
          setTimeout(() => setFadeIn(true), 10);
        }
      }, 800);

      return () => clearTimeout(minLoadingTimer);
    }
  }, [isLoading, movie]);

  // Review section states
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAdd();

    const wasAlreadyWatched = Boolean(watchedMovie);
    const msg = wasAlreadyWatched ? "Review updated!" : "Review added!";

    // Show success message and switch back to view mode
    setShowSuccessPrompt(msg);
    setIsReviewSubmitted(true);
    setIsEditingReview(false);

    // hide prompt after 2s
    setTimeout(() => setShowSuccessPrompt(false), 2000);
  };

  if (isLoading) return <SkeletonLoader />;

  return (
    <div
      className={`details ${fadeIn ? "fade-in" : ""}`}
      ref={detailsContainerRef}
    >
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
            {country && country !== "N/A" && (
              <span className="meta-item">🌍 {country}</span>
            )}
            {awards && awards !== "N/A" && (
              <span className="meta-item">🏆 {awards}</span>
            )}
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

            {audienceScore && audienceScore !== "N/A" && (
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
                    <div className="rating-value">
                      {watchedMovie.userRating}
                    </div>
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
            <strong>Production:</strong>{" "}
            <span>{production_companies.join(", ")}</span>
          </p>
        )}
      </div>

      {(homepage ||
        budget > 0 ||
        revenue > 0 ||
        (status && status !== "Released")) && (
        <div className="additional-info">
          <h3>Additional Information</h3>
          <div className="info-grid">
            {budget > 0 && (
              <div className="info-item">
                <div className="info-icon">💰</div>
                <div className="info-content">
                  <div className="info-label">Budget</div>
                  <div className="info-value">
                    ${new Intl.NumberFormat("en-US").format(budget)}
                  </div>
                </div>
              </div>
            )}
            {revenue > 0 && (
              <div className="info-item">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <div className="info-label">Box Office</div>
                  <div className="info-value">
                    ${new Intl.NumberFormat("en-US").format(revenue)}
                  </div>
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
                    <a
                      href={homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="movie-link"
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="similar-movies-section" style={similarMoviesSectionStyle}>
        <h3>Similar Movies</h3>
        {isLoadingSimilar ? (
          <div className="similar-movies-loading">
            <span className="spinner-small"></span>
            <span>Finding similar movies...</span>
          </div>
        ) : similarMovies.length > 0 ? (
          <div className="similar-movies-grid">
            {similarMovies.map((m) => (
              <div
                key={m.imdbID}
                className="similar-movie"
                onClick={() => handleSimilarMovieClick(m.imdbID)}
              >
                {m.Poster && m.Poster !== "N/A" ? (
                  <img src={m.Poster} alt={`Poster of ${m.Title}`} />
                ) : (
                  <div className="no-poster">No poster available</div>
                )}
                <h4>{m.Title}</h4>
                <p>{m.Year}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="reviews-section">
        <ReviewList reviews={reviews} /> {/* Pass reviews as prop */}
        {isAuthenticated && (
          <ReviewForm movieId={selectedId} onReviewAdded={handleReviewAdded} />
        )}
      </div>

      <section>
        {showSuccessPrompt && (
          <div className="success-prompt">{showSuccessPrompt}</div>
        )}
      </section>
    </div>
  );
}

export default MovieDetails;
