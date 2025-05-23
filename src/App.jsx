import { useEffect, useState } from "react";
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

export default function App() {
  const [movies, setMovies] = useState([]);
  const [watched, setWatched] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isWatchedSelected, setIsWatchedSelected] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return savedTheme;
  });
  const [userRating, setUserRating] = useState('')

  function handleSelectMovie(id, isWatched = false) {
    setSelectedId(id);
    setIsWatchedSelected(isWatched);
  }

  function handleCloseMovie() {
    setSelectedId(null);
    setIsWatchedSelected(false);
  }

  function handleAddWatched(movie) {
    setWatched(
      watched.filter((mov) => {
        return mov.imdbID !== movie.imdbID;
      })
    )
    setWatched((watched) => [...watched, movie])
  }
  function handleRemoveWatched(id) {
    setWatched(watched => watched.filter(movie => movie.imdbID !== id));
  }

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  useEffect(function () {
    const controller = new AbortController();

    async function getMovies() {
      try {
        setIsLoading(true);
        setError("");

        const res = await fetch(
          `http://www.omdbapi.com/?apikey=${API_KEY}&s=${query}`,
          { signal: controller.signal }
        );

        if (!res.ok)
          throw new Error("Something went wrong with fetching movies");

        const data = await res.json();
        if (data.Response === "False") throw new Error("Movie not found");

        setMovies(data.Search);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (query.length < 3) {
      setMovies([]);
      setError("");
      setIsLoading(false);
      return;
    }

    handleCloseMovie();
    getMovies();

    return function () {
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <NavBar>
        <Logo />
        <Search query={query} setQuery={setQuery} />
        <NumResults movies={movies} />
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

      <Main>
        <Box>
          {error && <p className="error">{error}</p>}
          {isLoading ? <Loader /> : <MovieList movies={movies} onSelectMovie={handleSelectMovie} />}
        </Box>
        <Box>
          {isLoading ? (
            <Loader />
          ) : selectedId ? (
            <MovieDetails
              selectedId={selectedId}
              onCloseMovie={handleCloseMovie}
              onAddWatched={handleAddWatched}
              onRemoveWatched={handleRemoveWatched}
              userRating={userRating}
              watched={watched}
              isWatchedSelected={isWatchedSelected}
            />
          ) : (
            <>
              <WatchedSummary watched={watched} />
              <WatchedList
                watched={watched}
                onSelectMovie={handleSelectMovie}
                onRemoveWatched={handleRemoveWatched}
              />
            </>
          )}
        </Box>
      </Main>
    </>
  );
}