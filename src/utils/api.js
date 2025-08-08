const API_URL = "http://localhost:5000/api";

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
