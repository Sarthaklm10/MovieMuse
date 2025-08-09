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
import Auth from "./components/Auth";
import UserStatus from "./components/UserStatus";
import LoginPrompt from "./components/LoginPrompt";
import { getRecommendations, convertTMDBMovie, getGenreId, discoverMoviesByGenre } from "./utils/tmdbApi";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from './utils/api';
import useMovies from "./hooks/useMovies";
import useLocalStorage from "./hooks/useLocalStorage";

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

const recommendationCache = {};

function getUrlParams() {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    query: searchParams.get('q') || "",
    movieId: searchParams.get('movie') || null,
    isWatched: searchParams.get('watched') === 'true'
  };
}

function updateUrl(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set('q', params.query);
  if (params.movieId) searchParams.set('movie', params.movieId);
  if (params.isWatched) searchParams.set('watched', 'true');
  const newUrl = searchParams.toString() ? `${window.location.pathname}?${searchParams.toString()}` : window.location.pathname;
  window.history.pushState({ ...params }, '', newUrl);
}

const getTmdbRecommendationsForWatched = async (watched, seenIds, watchedIds) => {
  const allRecommendations = [];
  const recentMovies = watched.slice(-3);
  for (const movie of recentMovies) {
    if (recommendationCache[movie.imdbID]) {
      allRecommendations.push(...recommendationCache[movie.imdbID]);
      continue;
    }
    const tmdbId = movie.imdbID.startsWith('tmdb-') ? movie.imdbID.replace('tmdb-', '') : movie.imdbID;
    if (!tmdbId) continue;
    const tmdbMovies = await getRecommendations(tmdbId);
    const convertedMovies = tmdbMovies.map(convertTMDBMovie).filter(movie => {
      if (!movie || !movie.imdbID || !movie.Title || !movie.Poster || movie.Poster === "N/A") return false;
      const id = movie.imdbID.replace('tmdb-', '');
      if (watchedIds.has(movie.imdbID) || seenIds.has(id)) return false;
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
  const allGenres = [...new Set(watched.filter(movie => movie.Genre).flatMap(movie => movie.Genre.split(',').map(g => g.trim())))];
  if (allGenres.length === 0) return [];
  const randomGenre = allGenres[Math.floor(Math.random() * allGenres.length)];
  const genreId = await getGenreId(randomGenre);
  if (!genreId) return [];
  const discoverResults = await discoverMoviesByGenre(genreId);
  return discoverResults.map(convertTMDBMovie).filter(movie => {
    if (!movie || !movie.imdbID || !movie.Poster || movie.Poster === "N/A") return false;
    const id = movie.imdbID.replace('tmdb-', '');
    if (watchedIds.has(movie.imdbID) || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [authRedirectMovieId, setAuthRedirectMovieId] = useState(null);

  const urlParams = getUrlParams();
  const [query, setQuery] = useState(urlParams.query);
  const [selectedId, setSelectedId] = useState(urlParams.movieId);
  const [isWatchedSelected, setIsWatchedSelected] = useState(urlParams.isWatched);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [watched, setWatched] = useState([]);
  const { movies, isLoading, error } = useMovies(query);
  const [theme, setTheme] = useLocalStorage('dark', 'theme');

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setWatched([]);
    setUsername('');
  }, []);

  // const handleLogin = useCallback(() => {
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     const userData = parseJwt(token);
  //     if (userData && userData.user && userData.user.username) {
  //       setUsername(userData.user.username);
  //     }
  //     setIsAuthenticated(true);
  //   }
  //   setShowAuthPage(false);
  //   if (authRedirectMovieId) {
  //     setSelectedId(authRedirectMovieId);
  //     setAuthRedirectMovieId(null);
  //   }
  // }, [authRedirectMovieId]);

  const handleLogin = useCallback((nameFromLogin) => {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = parseJwt(token);
      if (nameFromLogin) {
        setUsername(nameFromLogin);
      } else if (userData?.user?.username) {
        setUsername(userData.user.username);
      } else {
        const storedName = localStorage.getItem('username');
        if (storedName) setUsername(storedName);
      }
      setIsAuthenticated(true);
    }
    setShowAuthPage(false);
    if (authRedirectMovieId) {
      setSelectedId(authRedirectMovieId);
      setAuthRedirectMovieId(null);
    }
  }, [authRedirectMovieId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      const userData = parseJwt(token);
      if (userData?.user?.username) {
        setUsername(userData.user.username);
      } else {
        const storedName = localStorage.getItem('username');
        if (storedName) setUsername(storedName);
      }
      setIsAuthenticated(true);
    } else {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchWatched = async () => {
        setIsGlobalLoading(true);
        try {
          const watchlist = await getWatchlist();
          setWatched(watchlist);
        } catch (error) {
          console.error("Failed to fetch watchlist.", error);
          handleLogout();
        } finally {
          setIsGlobalLoading(false);
        }
      };
      fetchWatched();
    }
  }, [isAuthenticated, handleLogout]);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { updateUrl({ query, movieId: selectedId, isWatched: isWatchedSelected }); }, [query, selectedId, isWatchedSelected]);
  useEffect(() => {
    const handlePopState = () => {
      const params = getUrlParams();
      setQuery(params.query);
      setSelectedId(params.movieId);
      setIsWatchedSelected(params.isWatched);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchRecommendedMovies = useCallback(async () => {
    if (watched.length === 0 || query) {
      setRecommendedMovies([]);
      return;
    }
    setIsLoadingRecommended(true);
    try {
      const seenIds = new Set();
      const watchedIds = new Set(watched.map(m => m.imdbID).concat(watched.map(m => m.imdbID.replace('tmdb-', ''))));
      let recommendations = await getTmdbRecommendationsForWatched(watched, seenIds, watchedIds);
      if (recommendations.length < 3) {
        recommendations = recommendations.concat(await getGenreBasedRecommendations(watched, seenIds, watchedIds));
      }
      const uniqueRecommendations = [];
      const uniqueIds = new Set();
      for (const movie of recommendations) {
        if (!movie || !movie.imdbID || !movie.Title || !movie.Poster || movie.Poster === "N/A") continue;
        if (watchedIds.has(movie.imdbID) || watchedIds.has(movie.imdbID.replace('tmdb-', ''))) continue;
        if (uniqueIds.has(movie.imdbID) || uniqueIds.has(movie.imdbID.replace('tmdb-', ''))) continue;
        uniqueIds.add(movie.imdbID);
        uniqueIds.add(movie.imdbID.replace('tmdb-', ''));
        uniqueRecommendations.push(movie);
        if (uniqueRecommendations.length >= 10) break;
      }
      setRecommendedMovies(uniqueRecommendations);
    } catch (err) {
      console.error("Error fetching recommended movies:", err);
    } finally {
      setIsLoadingRecommended(false);
    }
  }, [watched, query]);

  useEffect(() => {
    if (isAuthenticated) fetchRecommendedMovies();
  }, [watched, query, fetchRecommendedMovies, isAuthenticated]);

  const handleSelectMovie = useCallback((id, isWatched = false) => {
    setIsGlobalLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedId(id);
    setIsWatchedSelected(isWatched);
    updateUrl({ query, movieId: id, isWatched });
    setTimeout(() => setIsGlobalLoading(false), 300);
  }, [query]);

  const handleCloseMovie = useCallback(() => {
    setIsGlobalLoading(true);
    setSelectedId(null);
    setIsWatchedSelected(false);
    updateUrl({ query });
    setTimeout(() => setIsGlobalLoading(false), 300);
  }, [query]);

  const handleLoginRequest = useCallback(() => {
    setAuthRedirectMovieId(selectedId);
    setShowLoginPrompt(true);
  }, [selectedId]);

  const handleAddWatched = useCallback(async (movie) => {
    if (!isAuthenticated) {
      handleLoginRequest();
      return;
    }
    try {
      const updatedWatchlist = await addToWatchlist(movie);
      setWatched(updatedWatchlist);
    } catch (error) {
      console.error("Failed to add to watchlist", error);
    }
  }, [isAuthenticated, handleLoginRequest]);

  const handleRemoveWatched = useCallback(async (id) => {
    try {
      const updatedWatchlist = await removeFromWatchlist(id);
      setWatched(updatedWatchlist);
    } catch (error) {
      console.error("Failed to remove from watchlist", error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme => {
      const newTheme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      return newTheme;
    });
  }, [setTheme]);

  const handleHomeClick = useCallback(() => {
    setQuery("");
    setSelectedId(null);
    setIsWatchedSelected(false);
    updateUrl({});
  }, []);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
    updateUrl({ query: newQuery, movieId: selectedId, isWatched: isWatchedSelected });
  }, [selectedId, isWatchedSelected]);

  const movieList = useMemo(() => {
    if (error) return <p className="error">{error}</p>;
    if (isLoading) return <Loader />;
    if (movies.length > 0) return <MovieList movies={movies} onSelectMovie={handleSelectMovie} />;
    if (!query && recommendedMovies.length > 0) {
      const watchedIds = new Set(watched.map(m => m.imdbID));
      const filteredRecommendations = recommendedMovies.filter(movie => !watchedIds.has(movie.imdbID));
      return (
        <div className="recommended-movies">
          <h3>You might also enjoy...</h3>
          <MovieList movies={filteredRecommendations} onSelectMovie={handleSelectMovie} />
        </div>
      );
    }
    if (isLoadingRecommended) return <Loader />;
    return <p className="no-results">Search for a movie or check your watchlist for recommendations!</p>;
  }, [movies, isLoading, error, query, recommendedMovies, isLoadingRecommended, handleSelectMovie, watched]);

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
          isAuthenticated={isAuthenticated}
          onLoginRequest={handleLoginRequest}
        />
      );
    }
    return (
      <>
        <WatchedSummary watched={watched} />
        <WatchedList watched={watched} onSelectMovie={handleSelectMovie} onRemoveWatched={handleRemoveWatched} />
      </>
    );
  }, [selectedId, isWatchedSelected, watched, handleCloseMovie, handleAddWatched, handleRemoveWatched, handleSelectMovie, isAuthenticated, handleLoginRequest]);

  if (showAuthPage) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <>
      {isGlobalLoading && <div className="global-loader"></div>}
      {showLoginPrompt && <LoginPrompt onTimeout={() => { setShowLoginPrompt(false); setShowAuthPage(true); }} />}

      <NavBar>
        <Logo onHomeClick={handleHomeClick} />
        <Search query={query} setQuery={handleQueryChange} />
        {query && <NumResults movies={movies} />}
        <div className="nav-bar-actions">
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
          <UserStatus isAuthenticated={isAuthenticated} onLogout={handleLogout} username={username} onLoginClick={() => setShowAuthPage(true)} />
        </div>
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
