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
import { API_KEY } from "./utils/constants";
import { findTMDBId, getRecommendations, convertTMDBMovie, getGenreId, discoverMoviesByGenre, testApiConnectivity } from "./utils/tmdbApi";
import useMovies from "./hooks/useMovies";
import useLocalStorage from "./hooks/useLocalStorage";

// Cache for TMDB recommendations
const recommendationCache = {};

// Test API connectivity on app start
testApiConnectivity().then(results => {
  // API connectivity check - silent by default
});

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isWatchedSelected, setIsWatchedSelected] = useState(false);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const { movies, isLoading, error } = useMovies(query);
  const [watched, setWatched] = useLocalStorage([], 'watched');

  const [theme, setTheme] = useLocalStorage('dark', 'theme');

  const [userRating, setUserRating] = useState('')

  // Initialize theme on app load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Function to get recommended movies based on bookmarked items
  const fetchRecommendedMovies = useCallback(async () => {
    // If there are no watched movies or there is a search query, don't fetch recommendations
    if (watched.length === 0 || query) {
      setRecommendedMovies([]);
      return;
    }

    setIsLoadingRecommended(true);
    try {
     
      const recentMovies = watched.slice(-3);

      const recommendationPromises = [];
      
      for (const movie of recentMovies) {
        // Check if we already have recommendations cached for this movie
        if (recommendationCache[movie.imdbID]) {
          recommendationPromises.push(Promise.resolve(recommendationCache[movie.imdbID]));
          continue;
        }
        
        // Find TMDB ID for this movie
        const tmdbId = await findTMDBId(movie.imdbID);
        
        if (tmdbId) {
          // Get recommendations from TMDB
          const tmdbRecommendationsPromise = getRecommendations(tmdbId);
          recommendationPromises.push(tmdbRecommendationsPromise);
        }
      }
      
      // Wait for all recommendations to load
      const recommendationResults = await Promise.all(recommendationPromises);
      
      // Combine and deduplicate recommendations
      const allRecommendations = [];
      const seenIds = new Set();
      const watchedIds = watched.map(movie => movie.imdbID);
      
      // Process each batch of recommendations
      for (let i = 0; i < recommendationResults.length && i < recentMovies.length; i++) {
        const movies = recommendationResults[i] || [];
        const sourceMovieId = recentMovies[i]?.imdbID;
        
        if (sourceMovieId) {
          // Convert and filter results
          const convertedMovies = movies
            .map(convertTMDBMovie)
            .filter(movie => {
              // Skip invalid movies, already watched movies, and duplicates
              if (!movie || !movie.imdbID || !movie.Title || movie.Poster === "N/A") {
                return false;
              }
              
              const tmdbId = movie.imdbID.replace('tmdb-', '');
              if (watchedIds.includes(movie.imdbID) || seenIds.has(tmdbId)) {
                return false;
              }
              seenIds.add(tmdbId);
              return true;
            });
          
          // Cache these recommendations
          if (convertedMovies.length > 0) {
            recommendationCache[sourceMovieId] = convertedMovies;
            // Add to combined results
            allRecommendations.push(...convertedMovies);
          }
        }
      }
      
      // If we don't have enough recommendations from TMDB, fall back to genre-based discovery
      if (allRecommendations.length < 3) {
        // Extract all genres from watched movies
        const allGenres = [];
        
        for (const movie of watched) {
          if (movie.Genre) {
            movie.Genre.split(',').forEach(genre => {
              const trimmedGenre = genre.trim();
              if (!allGenres.includes(trimmedGenre)) {
                allGenres.push(trimmedGenre);
              }
            });
          }
        }
        
        // If we have any genres, use TMDB discover endpoint
        if (allGenres.length > 0) {
          // Pick a random genre from user preferences
          const randomGenre = allGenres[Math.floor(Math.random() * allGenres.length)];
          
          try {
            // Convert genre name to TMDB genre ID
            const genreId = await getGenreId(randomGenre);
            
            if (genreId) {
              // Get popular movies in this genre using discover
              const discoverResults = await discoverMoviesByGenre(genreId);
              
              // Convert and filter
              const convertedMovies = discoverResults
                .map(convertTMDBMovie)
                .filter(movie => {
                  // Skip watched movies and duplicates
                  const tmdbId = movie.imdbID.replace('tmdb-', '');
                  if (watchedIds.includes(movie.imdbID) || seenIds.has(tmdbId)) {
                    return false;
                  }
                  seenIds.add(tmdbId);
                  return true;
                });
                
                allRecommendations.push(...convertedMovies);
            }
          } catch (err) {
            console.error("Error using TMDB discover:", err);
          }
        }
        
        // If we still don't have enough, fall back to OMDB
        if (allRecommendations.length < 3) {
          // Get a popular genre as fallback
          const fallbackGenre = allGenres.length > 0 ? 
            allGenres[Math.floor(Math.random() * allGenres.length)] : 
            "Drama";
          
          try {
            const res = await fetch(
              `http://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(fallbackGenre)}&type=movie&page=1`
            );
            
            if (!res.ok) {
              console.error(`OMDB API error: ${res.status} ${res.statusText}`);
              return;
            }

            const data = await res.json();
            if (data.Response === "False") {
              return;
            }
            
            if (data.Response === "True" && data.Search) {
              // Filter out watched movies and already added recommendations
              data.Search.forEach(movie => {
                if (!watchedIds.includes(movie.imdbID) && !seenIds.has(movie.imdbID)) {
                  seenIds.add(movie.imdbID);
                  allRecommendations.push(movie);
                }
              });
            }
          } catch (err) {
            console.error("Error fetching OMDB fallback recommendations:", err);
          }
        }
      }
      
      // Final validation to remove any null or invalid entries
      const validRecommendations = allRecommendations.filter(movie => 
        movie && movie.imdbID && movie.Title && movie.Poster && movie.Poster !== "N/A"
      );
      
      // Set the recommendations (up to 10)
      setRecommendedMovies(validRecommendations.slice(0, 10));
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
    // Use a more aggressive scroll for better user experience
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth'
    });
    
    // For TMDB movies, we need extra handling
    if (id.startsWith('tmdb-')) {
      // Find the movie from recommendations or passed data
      const movie = recommendedMovies.find(m => m.imdbID === id);
      
      if (movie?.Title) {
        // Use a faster, simpler approach - just search by title
        (async () => {
          try {
            // Direct search is faster than title match
            const searchRes = await fetch(
              `http://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(movie.Title)}&type=movie`
            );
            
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              
              if (searchData.Response === "True" && searchData.Search && searchData.Search.length > 0) {
                // Use the first result
                const firstResult = searchData.Search[0];
                setSelectedId(firstResult.imdbID);
                setIsWatchedSelected(isWatched);
              } else {
                console.error("No search results found");
                alert("Could not find this movie. Please try another one.");
                setIsGlobalLoading(false);
              }
            } else {
              console.error("API error");
              setIsGlobalLoading(false);
            }
          } catch (err) {
            console.error("Error finding movie by title:", err);
            alert("Error loading movie. Please try again.");
            setIsGlobalLoading(false);
          } finally {
            // Hide loading after a shorter time
            setTimeout(() => setIsGlobalLoading(false), 300);
          }
        })();
      } else {
        // Null movie data - handle error
        console.error("Invalid movie data in recommendations");
        setIsGlobalLoading(false);
        alert("Error loading movie. Please try another one.");
      }
    } else {
      setSelectedId(id);
      setIsWatchedSelected(isWatched);
      
      // Hide loading after a shorter time for better performance
      setTimeout(() => setIsGlobalLoading(false), 300);
    }
  }, [recommendedMovies]);

  const handleCloseMovie = useCallback(() => {
    // Short loading state for smoother transition
    setIsGlobalLoading(true);
    setSelectedId(null);
    setIsWatchedSelected(false);
    setTimeout(() => setIsGlobalLoading(false), 300);
  }, []);

  const handleAddWatched = useCallback((movie) => {
    setWatched(watched => {
      // First remove the movie if it already exists
      const filteredWatched = watched.filter(mov => mov.imdbID !== movie.imdbID);
      // Then add it back with new information
      return [...filteredWatched, movie];
    });
  }, [setWatched]);

  const handleRemoveWatched = useCallback((id) => {
    setWatched(watched => watched.filter(movie => movie.imdbID !== id));
  }, [setWatched]);

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
  }, []);

  // Memoize movie list to prevent rerenders
  const movieList = useMemo(() => {
    if (error) return <p className="error">{error}</p>;
    if (isLoading) return <Loader />;

    if (movies.length > 0) {
      return <MovieList movies={movies} onSelectMovie={handleSelectMovie} />;
    } else if (!query && recommendedMovies.length > 0) {
      return (
        <div className="recommended-movies">
          <h3>You might also enjoy...</h3>
          <MovieList movies={recommendedMovies} onSelectMovie={handleSelectMovie} />
        </div>
      );
    } else if (isLoadingRecommended) {
      return <Loader />;
    } else {
      return <p className="no-results">Search for a movie or check your watchlist for recommendations!</p>;
    }
  }, [movies, isLoading, error, query, recommendedMovies, isLoadingRecommended, handleSelectMovie]);

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
          userRating={userRating}
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
  }, [selectedId, isWatchedSelected, watched, userRating, handleCloseMovie, handleAddWatched, handleRemoveWatched, handleSelectMovie]);

  return (
    <>
      {isGlobalLoading && <div className="global-loader"></div>}
      <NavBar>
        <Logo onHomeClick={handleHomeClick} />
        <Search query={query} setQuery={setQuery} />
        <NumResults movies={query ? movies : recommendedMovies} />
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