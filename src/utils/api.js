// Detect environment and set API base URL
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://moviemuse-s0gi.onrender.com/api" // Render backend
    : "http://localhost:5000/api"; // Local backend

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
