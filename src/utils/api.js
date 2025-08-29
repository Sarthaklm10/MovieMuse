// Detect environment and set API base URL
import { FALLBACK_MOVIES } from "./fallbackData";

const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://moviemuse-s0gi.onrender.com/api" // Render backend
    : "http://localhost:5000/api"; // Local backend

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

// Cached request helper
async function cachedRequest(
  cacheKey,
  endpoint,
  options = {},
  fallbackData = null
) {
  const localData = getFromLocalStorage(cacheKey);
  if (localData) {
    console.log(`Serving from local storage cache for ${cacheKey}`);
    return localData;
  }

  try {
    // If no cached data, fetch from network
    const data = await request(endpoint, options);
    saveToLocalStorage(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    if (fallbackData) {
      console.log(`Serving fallback data for ${cacheKey}`);
      return { movies: fallbackData, isFallback: true }; // Mark as fallback data
    }
    throw error; // Re-throw if no fallback and API failed
  }
}

// Generic request helper
async function request(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": localStorage.getItem("token"),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "An error occurred");
  return data;
}

// API functions
export const login = (credentials) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const signup = (credentials) =>
  request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const getWatchlist = () => request("/watchlist");

export const addToWatchlist = (movie) =>
  request("/watchlist/add", {
    method: "POST",
    body: JSON.stringify(movie),
  });

export const removeFromWatchlist = (imdbID) =>
  request(`/watchlist/remove/${imdbID}`, {
    method: "DELETE",
  });

// New movie discovery endpoints
export const getTrendingMovies = () =>
  cachedRequest(
    "trendingMovies",
    "/movies/trending",
    {},
    FALLBACK_MOVIES.trending
  );

export const getNewReleases = () =>
  cachedRequest(
    "newReleasesMovies",
    "/movies/new-releases",
    {},
    FALLBACK_MOVIES.newReleases
  );

export const getTopRatedMovies = () =>
  cachedRequest(
    "topRatedMovies",
    "/movies/top-rated",
    {},
    FALLBACK_MOVIES.topRated
  );

// Review endpoints
export const getReviewsForMovie = (movieId) => request(`/reviews/${movieId}`);

export const createReviewForMovie = (movieId, review) =>
  request(`/reviews/${movieId}`, {
    method: "POST",
    body: JSON.stringify(review),
  });
