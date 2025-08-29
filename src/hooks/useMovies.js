import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchTMDB,
  convertTMDBMovie,
  getMoviesByGenre,
} from "../utils/tmdbApi";

// Simple cache to store results
const searchCache = new Map();
const DEBOUNCE_DELAY = 500;

// Helper for localStorage with expiration
function getFromLocalStorage(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  const { value, expiry } = JSON.parse(item);
  if (Date.now() > expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return value;
}

function saveToLocalStorage(key, value, ttl = 1000 * 60 * 30) {
  // 30 minutes TTL
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export default function useMovies(
  query,
  manualSearchTrigger = 0,
  genreId = null
) {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const prevQuery = useRef(query);
  const prevGenreId = useRef(genreId);
  const controllerRef = useRef(null);

  // Debounce setup
  const timeoutId = useRef(null);

  // Memoize fetch function
  const fetchMovies = useCallback(
    async (searchQuery, searchGenreId, controller) => {
      const cacheKey = searchGenreId
        ? `genre-${searchGenreId}`
        : `search-${searchQuery}`;

      // Check in-memory cache first
      if (searchCache.has(cacheKey)) {
        console.log(`Serving from in-memory cache for ${cacheKey}`);
        return searchCache.get(cacheKey);
      }

      // Then check local storage
      const localData = getFromLocalStorage(cacheKey);
      if (localData) {
        console.log(`Serving from local storage cache for ${cacheKey}`);
        searchCache.set(cacheKey, localData); // Populate in-memory cache
        return localData;
      }

      try {
        let results;
        if (searchGenreId) {
          results = await getMoviesByGenre(searchGenreId);
        } else {
          // Search movies using TMDB API
          results = await searchTMDB(searchQuery);
        }

        if (!results || results.length === 0)
          return { Response: "False", Error: "No results found" };

        // Convert to app's movie format
        const formattedResults = results
          .filter((movie) => movie.poster_path)
          .map(convertTMDBMovie)
          .filter(Boolean); // Remove null entries

        const data = {
          Response: formattedResults.length > 0 ? "True" : "False",
          Search: formattedResults,
          totalResults: formattedResults.length.toString(),
        };

        // Cache the results in-memory and in local storage
        searchCache.set(cacheKey, data);
        saveToLocalStorage(cacheKey, data);
        return data;
      } catch (error) {
        console.error("Error searching movies:", error);
        return {
          Response: "False",
          Error: error.message || "Failed to fetch movies",
        };
      }
    },
    []
  );

  useEffect(() => {
    // Clear any existing timeout to prevent multiple requests
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    // Cancel any ongoing fetch
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    if (genreId) {
      // Fetch movies by genre
    } else {
      // For very short queries, don't show loading state unless manual search
      if (query.length < 3 && manualSearchTrigger === 0) {
        if (prevQuery.current.length >= 3 || manualSearchTrigger > 0) {
          setMovies([]);
          setError("");
        }
        setIsLoading(false);
        return;
      }

      if (query.length < 3) {
        if (manualSearchTrigger > 0) {
          // Allow search for short queries on manual trigger (e.g., Enter press)
        } else {
          setMovies([]);
          setError("");
          setIsLoading(false);
          return;
        }
      }
    }

    // Attempt to load from local storage immediately for faster display
    const cacheKey = genreId ? `genre-${genreId}` : `search-${query}`;
    const cachedData = getFromLocalStorage(cacheKey);
    if (cachedData) {
      setMovies(cachedData.Search || []);
      setError(null);
      setIsLoading(false);
    }

    // Show loading state with a slight delay to prevent flickering
    const loadingTimeout = setTimeout(() => {
      if (prevQuery.current !== query || prevGenreId.current !== genreId) {
        setIsLoading(true);
      }
    }, 150);

    // Create a new abort controller for this request
    controllerRef.current = new AbortController();

    // Debounce the API call (but not for manual search)
    const delay = manualSearchTrigger > 0 ? 0 : DEBOUNCE_DELAY;

    timeoutId.current = setTimeout(async () => {
      try {
        const data = await fetchMovies(query, genreId, controllerRef.current);

        if (data.Response === "False") {
          setMovies([]);
          throw new Error(data.Error || "No results found");
        }

        setMovies(data.Search || []);
        setError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controllerRef.current.signal.aborted) {
          clearTimeout(loadingTimeout);
          // Only set loading to false if no cached data was shown immediately
          if (!cachedData) {
            setIsLoading(false);
          }
          prevQuery.current = query;
          prevGenreId.current = genreId;
        }
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId.current);
      clearTimeout(loadingTimeout);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [query, manualSearchTrigger, genreId, fetchMovies]);

  return { movies, isLoading, error };
}
