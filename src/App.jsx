import { useEffect, useState, useMemo, useCallback } from "react";
import NavBar from "./components/NavBar";
import Logo from "./components/Logo";
import Search from "./components/Search";
import NumResults from "./components/NumResults";
import Main from "./components/Main";
import Box from "./components/Box";
import MovieList from "./components/MovieList";
import MovieDetails from "./components/MovieDetails";
import WatchedSummary from "./components/WatchedSummary";
import WatchedList from "./components/WatchedList";
import Loader from "./components/Loader";
import { getRecommendations, convertTMDBMovie, getGenreId, discoverMoviesByGenre, testApiConnectivity, findTMDBId } from "./utils/tmdbApi";
import useMovies from "./hooks/useMovies";
import useLocalStorage from "./hooks/useLocalStorage";

// Cache for TMDB recommendations
const recommendationCache = {};

// Test API connectivity on app start
testApiConnectivity().then(results => {
  // API connectivity check - silent by default
});

// Helper to parse URL parameters
function getUrlParams() {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    query: searchParams.get('q') || "",
    movieId: searchParams.get('movie') || null,
    isWatched: searchParams.get('watched') === 'true'
  };
}

// Helper to update URL
function updateUrl(params = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.set('q', params.query);
  if (params.movieId) searchParams.set('movie', params.movieId);
  if (params.isWatched) searchParams.set('watched', 'true');
  
  const newUrl = searchParams.toString() 
    ? `${window.location.pathname}?${searchParams.toString()}` 
    : window.location.pathname;
    
  window.history.pushState({ ...params }, '', newUrl);
}

/**
 * Fetch recommended movies for the user using TMDB API.
 * 1. Try TMDB recommendations for recent watched movies.
 * 2. If not enough, try genre-based TMDB recommendations.
 */
const getTmdbRecommendationsForWatched = async (watched, seenIds, watchedIds) => {
  const allRecommendations = [];
  const recentMovies = watched.slice(-3);
  for (const movie of recentMovies) {
    if (recommendationCache[movie.imdbID]) {
      allRecommendations.push(...recommendationCache[movie.imdbID]);
      continue;
    }
    
    // Get TMDB ID from the movie ID (removing tmdb- prefix if present)
    const tmdbId = movie.imdbID.startsWith('tmdb-') ? 
      movie.imdbID.replace('tmdb-', '') : movie.imdbID;
      
    if (!tmdbId) continue;
    
    const tmdbMovies = await getRecommendations(tmdbId);
    const convertedMovies = tmdbMovies
      .map(convertTMDBMovie)
      .filter(movie => {
        if (!movie || !movie.imdbID || !movie.Title) return false;
        if (!movie.Poster || movie.Poster === "N/A") return false;
        const id = movie.imdbID.replace('tmdb-', '');
        if (watchedIds.includes(movie.imdbID) || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
    if (convertedMovies.length > 0) {
      recommendationCache[movie.imdbID] = convertedMovies;
      allRecommendations.push(...convertedMovies);
    }
  }
  return allRecommendations;
};

const getGenreBasedRecommendations = async (watched, seenIds, watchedIds) => {
  const allGenres = [...new Set(
    watched
      .filter(movie => movie.Genre)
      .flatMap(movie => movie.Genre.split(',').map(g => g.trim()))
  )];
  if (allGenres.length === 0) return [];
  const randomGenre = allGenres[Math.floor(Math.random() * allGenres.length)];
  const genreId = await getGenreId(randomGenre);
  if (!genreId) return [];
  const discoverResults = await discoverMoviesByGenre(genreId);
  return discoverResults
    .map(convertTMDBMovie)
    .filter(movie => {
      if (!movie || !movie.imdbID) return false;
      if (!movie.Poster || movie.Poster === "N/A") return false;
      const id = movie.imdbID.replace('tmdb-', '');
      if (watchedIds.includes(movie.imdbID) || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
};

const filterAndLimitRecommendations = (recommendations) => {
  return recommendations
    .filter(movie => movie && movie.imdbID && movie.Title && movie.Poster && movie.Poster !== "N/A")
    .slice(0, 10);
};

export default function App() {
  // Get initial state from URL
  const urlParams = getUrlParams();
  
  const [query, setQuery] = useState(urlParams.query);
  const [selectedId, setSelectedId] = useState(urlParams.movieId);
  const [isWatchedSelected, setIsWatchedSelected] = useState(urlParams.isWatched);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const { movies, isLoading, error } = useMovies(query);
  const [watched, setWatched] = useLocalStorage([], 'watched');

  const [theme, setTheme] = useLocalStorage('dark', 'theme');

  // Initialize theme on app load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Update URL when query changes
  useEffect(() => {
    updateUrl({ 
      query, 
      movieId: selectedId, 
      isWatched: isWatchedSelected 
    });
  }, [query, selectedId, isWatchedSelected]);
  
  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      const params = getUrlParams();
      setQuery(params.query);
      setSelectedId(params.movieId);
      setIsWatchedSelected(params.isWatched);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch recommended movies when watchlist changes or query is cleared
  const fetchRecommendedMovies = useCallback(async () => {
    if (watched.length === 0 || query) {
      setRecommendedMovies([]);
      return;
    }
    
    setIsLoadingRecommended(true);
    
    try {
      const seenIds = new Set();
      const watchedIds = new Set();
      
      // Create a set of both original and normalized IDs (without tmdb- prefix)
      watched.forEach(movie => {
        if (movie.imdbID) {
          watchedIds.add(movie.imdbID);
          // Also add without tmdb- prefix
          if (movie.imdbID.startsWith('tmdb-')) {
            watchedIds.add(movie.imdbID.replace('tmdb-', ''));
          }
          // Also add with tmdb- prefix
          else {
            watchedIds.add(`tmdb-${movie.imdbID}`);
          }
        }
      });
      
      // Get recommendations from TMDB
      let recommendations = await getTmdbRecommendationsForWatched(watched, seenIds, Array.from(watchedIds));
      
      // If not enough recommendations, get genre-based recommendations
      if (recommendations.length < 3) {
        recommendations = recommendations.concat(
          await getGenreBasedRecommendations(watched, seenIds, Array.from(watchedIds))
        );
      }
      
      // Filter out any invalid movies and duplicates
      const uniqueRecommendations = [];
      const uniqueIds = new Set();
      
      for (const movie of recommendations) {
        // Skip invalid movies
        if (!movie || !movie.imdbID || !movie.Title) continue;
        if (!movie.Poster || movie.Poster === "N/A") continue;
        
        // Skip if this movie is in our watchlist (check both with and without tmdb- prefix)
        if (watchedIds.has(movie.imdbID)) continue;
        
        // Check if we've already seen this ID (without tmdb- prefix)
        const normalizedId = movie.imdbID.replace('tmdb-', '');
        if (watchedIds.has(normalizedId)) continue;
        
        // Skip if we've already added this movie to recommendations
        if (uniqueIds.has(movie.imdbID) || uniqueIds.has(normalizedId)) continue;
        
        // Add to our unique IDs set
        uniqueIds.add(movie.imdbID);
        uniqueIds.add(normalizedId);
        
        // Add to our final recommendations
        uniqueRecommendations.push(movie);
        
        // Limit to 10 recommendations
        if (uniqueRecommendations.length >= 10) break;
      }
      
      setRecommendedMovies(uniqueRecommendations);
    } catch (err) {
      console.error("Error fetching recommended movies:", err);
    } finally {
      setIsLoadingRecommended(false);
    }
  }, [watched, query]);

  // Fetch recommended movies when watchlist changes or query is cleared
  useEffect(() => {
    fetchRecommendedMovies();
  }, [watched, query, fetchRecommendedMovies]);

  // Memoize handlers to prevent unnecessary rerenders
  const handleSelectMovie = useCallback((id, isWatched = false, isDirect = false) => {
    // Show loading state
    setIsGlobalLoading(true);
    
    // Scroll to top smoothly whenever a new movie is selected
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth'
    });
    
    // Set the selected movie ID directly
    setSelectedId(id);
    setIsWatchedSelected(isWatched);
    
    // Update URL with the selected movie
    updateUrl({ query, movieId: id, isWatched });
    
    // Hide loading after a shorter time for better performance
    setTimeout(() => setIsGlobalLoading(false), 300);
  }, [query]);

  const handleCloseMovie = useCallback(() => {
    // Short loading state for smoother transition
    setIsGlobalLoading(true);
    setSelectedId(null);
    setIsWatchedSelected(false);
    
    // Update URL to remove movie parameter
    updateUrl({ query });
    
    setTimeout(() => setIsGlobalLoading(false), 300);
  }, [query]);

  const handleAddWatched = useCallback((movie) => {
    setWatched(watched => {
      // First remove the movie if it already exists
      const filteredWatched = watched.filter(mov => mov.imdbID !== movie.imdbID);
      // Then add it back with new information
      return [...filteredWatched, movie];
    });
    
    // Also immediately update recommendations to remove this movie
    setRecommendedMovies(current => {
      return current.filter(m => {
        // Skip if this exact movie
        if (m.imdbID === movie.imdbID) return false;
        
        // Skip if same movie with different ID format (with/without tmdb- prefix)
        const normalizedMovieId = movie.imdbID.replace('tmdb-', '');
        const normalizedCurrentId = m.imdbID.replace('tmdb-', '');
        
        if (normalizedMovieId === normalizedCurrentId) return false;
        
        // Keep this movie in recommendations
        return true;
      });
    });
    
    // Clear the cache for this movie
    if (movie.imdbID && recommendationCache[movie.imdbID]) {
      delete recommendationCache[movie.imdbID];
    }
    
    // Force refresh recommendations
    setTimeout(() => {
      fetchRecommendedMovies();
    }, 100);
  }, [fetchRecommendedMovies]);

  const handleRemoveWatched = useCallback((id) => {
    setWatched(watched => watched.filter(movie => movie.imdbID !== id));
    
    // Clear the cache for this movie if it exists
    if (id && recommendationCache[id]) {
      delete recommendationCache[id];
    }
    
    // Force refresh recommendations
    setTimeout(() => {
      fetchRecommendedMovies();
    }, 100);
  }, [fetchRecommendedMovies]);

  const toggleTheme = useCallback(() => {
    setTheme(theme => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      return newTheme;
    });
  }, [setTheme]);

  // Handler for Logo click (go to homepage)
  const handleHomeClick = useCallback(() => {
    // Reset query to empty
    setQuery("");
    // Close any selected movie
    setSelectedId(null);
    // Make sure we're viewing the watchlist
    setIsWatchedSelected(false);
    
    // Clear URL parameters
    updateUrl({});
  }, []);

  // Handler for query updates
  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
    // If we have a movie selected, keep it in the URL
    if (selectedId) {
      updateUrl({ query: newQuery, movieId: selectedId, isWatched: isWatchedSelected });
    } else {
      updateUrl({ query: newQuery });
    }
  }, [selectedId, isWatchedSelected]);

  // Memoize movie list to prevent rerenders
  const movieList = useMemo(() => {
    if (error) return <p className="error">{error}</p>;
    if (isLoading) return <Loader />;

    if (movies.length > 0) {
      return <MovieList movies={movies} onSelectMovie={handleSelectMovie} />;
    } else if (!query && recommendedMovies.length > 0) {
      // Additional safety check: filter out any recommendations that are in the watched list
      const watchedIds = new Set();
      
      // Collect all watched movie IDs in both original and normalized form
      watched.forEach(movie => {
        if (movie.imdbID) {
          watchedIds.add(movie.imdbID);
          // Add without tmdb- prefix
          watchedIds.add(movie.imdbID.replace('tmdb-', ''));
          // Add with tmdb- prefix if it doesn't already have one
          if (!movie.imdbID.startsWith('tmdb-')) {
            watchedIds.add(`tmdb-${movie.imdbID}`);
          }
        }
      });
      
      // Final filter to remove any watched movies from recommendations
      const filteredRecommendations = recommendedMovies.filter(movie => {
        if (!movie.imdbID) return false;
        
        // Skip if direct match
        if (watchedIds.has(movie.imdbID)) return false;
        
        // Skip if normalized match
        const normalizedId = movie.imdbID.replace('tmdb-', '');
        if (watchedIds.has(normalizedId)) return false;
        
        return true;
      });
      
      return (
        <div className="recommended-movies">
          <h3>You might also enjoy...</h3>
          <MovieList movies={filteredRecommendations} onSelectMovie={handleSelectMovie} />
        </div>
      );
    } else if (isLoadingRecommended) {
      return <Loader />;
    } else {
      return <p className="no-results">Search for a movie or check your watchlist for recommendations!</p>;
    }
  }, [movies, isLoading, error, query, recommendedMovies, isLoadingRecommended, handleSelectMovie, watched]);

  // Memoize right box (prevent re-renders during search)
  const rightPanel = useMemo(() => {
    if (selectedId) {
      return (
        <MovieDetails
          selectedId={selectedId}
          onCloseMovie={handleCloseMovie}
          onAddWatched={handleAddWatched}
          onRemoveWatched={handleRemoveWatched}
          onSelectMovie={handleSelectMovie}
          watched={watched}
          isWatchedSelected={isWatchedSelected}
        />
      );
    } else {
      return (
        <>
          <WatchedSummary watched={watched} />
          <WatchedList
            watched={watched}
            onSelectMovie={handleSelectMovie}
            onRemoveWatched={handleRemoveWatched}
          />
        </>
      );
    }
  }, [selectedId, isWatchedSelected, watched, handleCloseMovie, handleAddWatched, handleRemoveWatched, handleSelectMovie]);

  return (
    <>
      {isGlobalLoading && <div className="global-loader"></div>}
      <NavBar>
        <Logo onHomeClick={handleHomeClick} />
        <Search query={query} setQuery={handleQueryChange} />
        {query && <NumResults movies={movies} />}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>
      </NavBar>

      <Main className={isGlobalLoading ? "loading" : ""}>
        <Box title={!query ? "Recommended for You" : "Movie Search Results"}>
          {movieList}
        </Box>
        <Box title="Your Watchlist">
          {rightPanel}
        </Box>
      </Main>
    </>
  );
}