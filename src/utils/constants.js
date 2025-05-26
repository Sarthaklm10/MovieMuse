// OMDB API key - loaded from environment variables
export const API_KEY = process.env.REACT_APP_OMDB_API_KEY;

// TMDB API keys and URLs - loaded from environment variables
export const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

// Using environment variables for URLs
export const TMDB_BASE_URL = process.env.REACT_APP_TMDB_BASE_URL || "https://api.themoviedb.org/3";
export const TMDB_IMAGE_URL = process.env.REACT_APP_TMDB_IMAGE_URL || "https://image.tmdb.org/t/p/w500";

// OMDB API URL - always use HTTPS 
export const OMDB_BASE_URL = "https://www.omdbapi.com"; 