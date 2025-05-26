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

// Centralized TMDB API fetch function
async function fetchTMDB(endpoint, params = {}) {
  try {
    // Build query string from params
    const queryParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'en-US',
      ...params
    });
    
    const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

// Centralized OMDB API fetch function
async function fetchOMDB(params = {}) {
  try {
    const queryParams = new URLSearchParams({
      apikey: API_KEY,
      ...params
    });
    
    const url = `${OMDB_BASE_URL}/?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching OMDB:', error);
    return null;
  }
}

// Search TMDB by movie title
export async function searchTMDB(title, year = "") {
  const params = { query: title };
  if (year) params.year = year;
  
  const data = await fetchTMDB('/search/movie', params);
  return data?.results || [];
}

// Get similar movies from TMDB
export async function getSimilarMovies(movieId) {
  const data = await fetchTMDB(`/movie/${movieId}/similar`, { page: 1 });
  return data?.results || [];
}

// Get movie recommendations from TMDB
export async function getRecommendations(movieId) {
  const data = await fetchTMDB(`/movie/${movieId}/recommendations`, { page: 1 });
  return data?.results || [];
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
  
  const data = await fetchTMDB(`/find/${imdbId}`, { external_source: 'imdb_id' });
  return data?.movie_results?.[0]?.id || null;
}

// Discover movies by genre
export async function discoverMoviesByGenre(genreId) {
  const data = await fetchTMDB('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page: 1
  });
  
  return data?.results || [];
}

// Get genre ID from name
export async function getGenreId(genreName) {
  if (!genreName) return null;
  
  // Check for direct match with known genres
  for (const [key, id] of Object.entries(TMDB_GENRES)) {
    if (key.toLowerCase() === genreName.toLowerCase()) {
      return id;
    }
  }
  
  // Default to Drama if no match
  return 18;
}

// Test API connectivity
export async function testApiConnectivity() {
  const results = {
    omdb: { status: 'unknown', message: '' },
    tmdb: { status: 'unknown', message: '' }
  };
  
  // Test OMDB
  try {
    const data = await fetchOMDB({ s: 'action', type: 'movie', page: 1 });
    
    if (!data) {
      results.omdb = { status: 'error', message: 'Connection failed' };
    } else if (data.Response === "True") {
      results.omdb = { 
        status: 'success', 
        message: `Found ${data.totalResults || '?'} results, showing ${data.Search?.length || 0}` 
      };
    } else {
      results.omdb = { status: 'error', message: data.Error || 'Unknown error' };
    }
  } catch (err) {
    results.omdb = { status: 'error', message: err.message || 'Connection failed' };
  }
  
  // Test TMDB
  try {
    const data = await fetchTMDB('/movie/popular', { page: 1 });
    
    if (!data) {
      results.tmdb = { status: 'error', message: 'Connection failed' };
    } else {
      results.tmdb = { 
        status: 'success', 
        message: `Retrieved ${data.results?.length || 0} popular movies` 
      };
    }
  } catch (err) {
    results.tmdb = { status: 'error', message: err.message || 'Connection failed' };
  }
  
  return results;
} 