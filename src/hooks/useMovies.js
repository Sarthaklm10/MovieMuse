import { useState, useEffect, useRef, useCallback } from "react";
import { API_KEY, OMDB_BASE_URL } from "../utils/constants";

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

        const res = await fetch(
            `${OMDB_BASE_URL}/?apikey=${API_KEY}&s=${searchQuery}`,
            { signal: controller.signal }
        );

        if (!res.ok) {
            throw new Error("Something went wrong with fetching movies");
        }

        const data = await res.json();
        
        // Cache the results
        if (data.Response !== "False") {
            searchCache.set(searchQuery, data);
        }
        
        return data;
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
                    throw new Error("Movie not found");
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