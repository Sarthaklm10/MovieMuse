import { useState, useEffect, useRef, useCallback } from "react";
import { searchTMDB, convertTMDBMovie } from "../utils/tmdbApi";

// Simple cache to store results
const searchCache = new Map();
const DEBOUNCE_DELAY = 500; // ms

export default function useMovies(query) {
    const [movies, setMovies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const prevQuery = useRef(query);
    const controllerRef = useRef(null);
    
    // Debounce setup
    const timeoutId = useRef(null);

    // Memoize the fetch function to prevent recreating on each render
    const fetchMovies = useCallback(async (searchQuery, controller) => {
        // Check cache first
        if (searchCache.has(searchQuery)) {
            return searchCache.get(searchQuery);
        }

        try {
            // Search movies using TMDB API
            const results = await searchTMDB(searchQuery);
            
            if (!results || results.length === 0) {
                return { Response: "False", Error: "No results found" };
            }
            
            // Convert to app's movie format
            const formattedResults = results
                .filter(movie => movie.poster_path)
                .map(convertTMDBMovie)
                .filter(Boolean); // Remove null entries
                
            const data = {
                Response: formattedResults.length > 0 ? "True" : "False",
                Search: formattedResults,
                totalResults: formattedResults.length.toString()
            };
            
            // Cache the results
            searchCache.set(searchQuery, data);
            return data;
        } catch (error) {
            console.error("Error searching movies:", error);
            return { Response: "False", Error: error.message || "Failed to fetch movies" };
        }
    }, []);

    useEffect(() => {
        // For very short queries, don't show loading state
        if (query.length < 3) {
            if (prevQuery.current.length >= 3) {
                setMovies([]);
                setError("");
            }
            setIsLoading(false);
            return;
        }

        // Clear any existing timeout to prevent multiple requests
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        // Cancel any ongoing fetch
        if (controllerRef.current) {
            controllerRef.current.abort();
        }

        // Show loading state with a slight delay to prevent flickering
        const loadingTimeout = setTimeout(() => {
            if (prevQuery.current !== query) {
                setIsLoading(true);
            }
        }, 150);

        // Create a new abort controller for this request
        controllerRef.current = new AbortController();

        // Debounce the API call
        timeoutId.current = setTimeout(async () => {
            try {
                const data = await fetchMovies(query, controllerRef.current);
                
                if (data.Response === "False") {
                    if (query.length >= 3) {
                        setMovies([]);
                    }
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
                    setIsLoading(false);
                    prevQuery.current = query;
                }
            }
        }, DEBOUNCE_DELAY);

        return () => {
            clearTimeout(timeoutId.current);
            clearTimeout(loadingTimeout);
            if (controllerRef.current) {
                controllerRef.current.abort();
            }
        };
    }, [query, fetchMovies]);

    return { movies, isLoading, error };
}