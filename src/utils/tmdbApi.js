import { TMDB_API_KEY, TMDB_BASE_URL, API_KEY, TMDB_IMAGE_URL, OMDB_BASE_URL } from "./constants";

// Common genre IDs for TMDB API
export const TMDB_GENRES = {
  "Action": 28,
  "Adventure": 12,
  "Animation": 16,
  "Comedy": 35,
  "Crime": 80,
  "Documentary": 99,
  "Drama": 18,
  "Family": 10751,
  "Fantasy": 14,
  "History": 36,
  "Horror": 27,
  "Music": 10402,
  "Mystery": 9648,
  "Romance": 10749,
  "Science Fiction": 878,
  "TV Movie": 10770,
  "Thriller": 53,
  "War": 10752,
  "Western": 37
};

// Helper function with proper headers
function fetchWithHeaders(url) {
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
}

// Search TMDB by movie title
export async function searchTMDB(title, year = "") {
  try {
    const response = await fetchWithHeaders(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ""}`
    );
    
    if (!response.ok) {
      throw new Error("TMDB search failed");
    }
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error searching TMDB:", error);
    return [];
  }
}

// Get similar movies from TMDB
export async function getSimilarMovies(movieId) {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    return data.results || [];
  } catch (err) {
    console.error("Error fetching similar movies from TMDB:", err);
    return [];
  }
}

// Get movie recommendations from TMDB
export async function getRecommendations(movieId) {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    return data.results || [];
  } catch (err) {
    console.error("Error fetching recommendations from TMDB:", err);
    return [];
  }
}

// Convert TMDB movie object to our app's format
export function convertTMDBMovie(tmdbMovie) {
  if (!tmdbMovie) return null;
  
  return {
    imdbID: `tmdb-${tmdbMovie.id}`,
    Title: tmdbMovie.title,
    Year: tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A',
    Poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : 'N/A',
    Type: 'movie'
  };
}

// Find TMDB ID using IMDB ID
export async function findTMDBId(imdbId) {
  if (!imdbId) return null;
  
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    );
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data = await res.json();
    const tmdbId = data.movie_results?.[0]?.id || null;
    
    return tmdbId;
  } catch (err) {
    console.error("Error finding TMDB ID:", err);
    return null;
  }
}

// Discover movies by genre
export async function discoverMoviesByGenre(genreId) {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`
    );
    
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    return data.results || [];
  } catch (err) {
    console.error("Error discovering movies by genre:", err);
    return [];
  }
}

// Get genre ID from name
export async function getGenreId(genreName) {
  if (!genreName) return null;
  
  // First check if we have a direct match
  for (const [key, id] of Object.entries(TMDB_GENRES)) {
    if (key.toLowerCase() === genreName.toLowerCase()) {
      return id;
    }
  }
  
  // If no direct match, default to Drama
  return 18; // Drama as fallback
}

// Test API connectivity
export async function testApiConnectivity() {
  const results = {
    omdb: { status: 'unknown', message: '' },
    tmdb: { status: 'unknown', message: '' }
  };
  
  // Test OMDB
  try {
    const omdbResp = await fetch(`${OMDB_BASE_URL}/?apikey=${API_KEY}&s=action&type=movie&page=1`);
    
    if (!omdbResp.ok) {
      results.omdb = { status: 'error', message: `HTTP error: ${omdbResp.status} ${omdbResp.statusText}` };
    } else {
      const data = await omdbResp.json();
      if (data.Response === "True") {
        results.omdb = { 
          status: 'success', 
          message: `Found ${data.totalResults || '?'} results, showing ${data.Search?.length || 0}` 
        };
      } else {
        results.omdb = { status: 'error', message: data.Error || 'Unknown error' };
      }
    }
  } catch (err) {
    results.omdb = { status: 'error', message: err.message || 'Connection failed' };
  }
  
  // Test TMDB
  try {
    const tmdbResp = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    
    if (!tmdbResp.ok) {
      results.tmdb = { status: 'error', message: `HTTP error: ${tmdbResp.status} ${tmdbResp.statusText}` };
    } else {
      const data = await tmdbResp.json();
      if (data.results) {
        results.tmdb = { 
          status: 'success', 
          message: `Found ${data.results.length || 0} popular movies` 
        };
      } else {
        results.tmdb = { status: 'error', message: 'Invalid response format' };
      }
    }
  } catch (err) {
    results.tmdb = { status: 'error', message: err.message || 'Connection failed' };
  }
  
  return results;
} 