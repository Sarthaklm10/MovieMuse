import { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_URL } from "./constants";

const TMDB_IMAGE_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";

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

// Search TMDB by movie title
export async function searchTMDB(title, year = "") {
  const params = { query: title };
  if (year) params.year = year;
  
  const data = await fetchTMDB('/search/movie', params);
  return data?.results || [];
}

// Get movie details from TMDB
export async function getMovieDetails(movieId) {
  if (!movieId) return null;
  
  // If the ID starts with tmdb- prefix, remove it
  const id = movieId.startsWith('tmdb-') ? movieId.replace('tmdb-', '') : movieId;
  
  const data = await fetchTMDB(`/movie/${id}`, {
    append_to_response: 'credits,release_dates,reviews,external_ids'
  });
  
  return data;
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

// Get movie credits (cast and crew)
export async function getMovieCredits(movieId) {
  const data = await fetchTMDB(`/movie/${movieId}/credits`);
  return data;
}

// Get popular movies
export async function getPopularMovies(page = 1) {
  const data = await fetchTMDB('/movie/popular', { page });
  return data?.results || [];
}

// Convert TMDB movie object to our app's format
export function convertTMDBMovie(tmdbMovie) {
  if (!tmdbMovie) return null;
  
  // Skip movies without poster or release date
  if (!tmdbMovie.poster_path || !tmdbMovie.release_date) {
    return null;
  }
  
  return {
    imdbID: `tmdb-${tmdbMovie.id}`,
    Title: tmdbMovie.title,
    Year: tmdbMovie.release_date ? tmdbMovie.release_date.split('-')[0] : 'N/A',
    Poster: tmdbMovie.poster_path ? `${TMDB_IMAGE_URL}${tmdbMovie.poster_path}` : 'N/A',
    backdrop_path: tmdbMovie.backdrop_path ? `${TMDB_IMAGE_URL_ORIGINAL}${tmdbMovie.backdrop_path}` : null,
    Type: 'movie',
    // Store TMDB specific data
    tmdbRating: tmdbMovie.vote_average,
    overview: tmdbMovie.overview,
    originalTitle: tmdbMovie.original_title,
    genre_ids: tmdbMovie.genre_ids,
    popularity: tmdbMovie.popularity
  };
}

// Format full TMDB movie details to match the app's expected structure
export function formatMovieDetails(tmdbDetails) {
  if (!tmdbDetails) return {};
  
  // Get director from credits
  let director = 'N/A';
  let actors = 'N/A';
  let writer = 'N/A';
  
  if (tmdbDetails.credits) {
    // Find directors
    const directors = tmdbDetails.credits.crew
      .filter(person => person.job === 'Director')
      .map(person => person.name);
      
    if (directors.length > 0) {
      director = directors.join(', ');
    }
    
    // Find writers (Screenplay, Writer, Story)
    const writers = tmdbDetails.credits.crew
      .filter(person => ['Screenplay', 'Writer', 'Story'].includes(person.job))
      .map(person => person.name);
      
    if (writers.length > 0) {
      writer = [...new Set(writers)].join(', '); // Remove duplicates
    }
    
    // Get top cast
    const topCast = tmdbDetails.credits.cast
      .slice(0, 5)
      .map(person => person.name);
      
    if (topCast.length > 0) {
      actors = topCast.join(', ');
    }
  }
  
  // Get genre names
  const genres = tmdbDetails.genres ? tmdbDetails.genres.map(g => g.name).join(', ') : 'N/A';
  
  // Get certification (US rating if available)
  let rated = 'N/A';
  if (tmdbDetails.release_dates && tmdbDetails.release_dates.results) {
    const usRelease = tmdbDetails.release_dates.results.find(r => r.iso_3166_1 === 'US');
    if (usRelease && usRelease.release_dates && usRelease.release_dates.length > 0) {
      const certification = usRelease.release_dates.find(d => d.certification)?.certification;
      if (certification) rated = certification;
    }
  }
  
  // Format release date
  const released = tmdbDetails.release_date 
    ? new Date(tmdbDetails.release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';
  
  // Calculate audience score (simulating Rotten Tomatoes audience score based on TMDB vote average)
  const audienceScore = tmdbDetails.vote_average ? Math.round(tmdbDetails.vote_average * 10) : 'N/A';
  
  // Extract IMDb ID if available in external IDs
  const imdbIDValue = tmdbDetails.external_ids?.imdb_id || `tmdb-${tmdbDetails.id}`;

  // Extract production company names
  const productionCompanyNames = tmdbDetails.production_companies?.map(company => company.name) || [];
  
  return {
    imdbID: imdbIDValue,
    tmdbId: tmdbDetails.id,
    Title: tmdbDetails.title,
    Year: tmdbDetails.release_date ? tmdbDetails.release_date.split('-')[0] : 'N/A',
    Rated: rated,
    Released: released,
    Runtime: tmdbDetails.runtime ? `${tmdbDetails.runtime} min` : 'N/A',
    Genre: genres,
    Director: director,
    Writer: writer,
    Actors: actors,
    Plot: tmdbDetails.overview || 'No plot available',
    Language: tmdbDetails.original_language ? tmdbDetails.original_language.toUpperCase() : 'N/A',
    Country: tmdbDetails.production_countries?.map(c => c.name).join(', ') || 'N/A',
    Awards: 'N/A', // TMDB doesn't provide awards directly
    Poster: tmdbDetails.poster_path ? `${TMDB_IMAGE_URL}${tmdbDetails.poster_path}` : 'N/A',
    Ratings: [
      { Source: 'TMDB Rating', Value: `${tmdbDetails.vote_average}/10` },
      { Source: 'Audience Score', Value: `${audienceScore}%` }
    ],
    Metascore: audienceScore,
    imdbRating: tmdbDetails.vote_average ? (tmdbDetails.vote_average).toFixed(1) : 'N/A',
    imdbVotes: tmdbDetails.vote_count ? tmdbDetails.vote_count.toString() : 'N/A',
    Type: 'movie',
    DVD: tmdbDetails.release_dates?.results?.find(r => r.iso_3166_1 === 'US')?.release_dates?.find(d => d.type === 4 || d.type === 5)?.release_date ? new Date(tmdbDetails.release_dates.results.find(r => r.iso_3166_1 === 'US').release_dates.find(d => d.type === 4 || d.type === 5).release_date).toLocaleDateString('en-US') : 'N/A',
    BoxOffice: tmdbDetails.revenue ? `$${tmdbDetails.revenue.toLocaleString()}` : 'N/A',
    Production: tmdbDetails.production_companies?.map(company => company.name).join(', ') || 'N/A',
    Website: tmdbDetails.homepage || 'N/A',
    Response: 'True',
    // Add original TMDB fields for more detailed UI
    vote_count: tmdbDetails.vote_count,
    vote_average: tmdbDetails.vote_average,
    popularity: tmdbDetails.popularity,
    original_language: tmdbDetails.original_language,
    audienceScore: audienceScore,
    original_imdb_id: tmdbDetails.external_ids?.imdb_id || null,
    // Additional TMDB fields
    tagline: tmdbDetails.tagline || null,
    budget: tmdbDetails.budget || 0,
    revenue: tmdbDetails.revenue || 0,
    production_companies: productionCompanyNames,
    homepage: tmdbDetails.homepage || null,
    status: tmdbDetails.status || 'Released'
  };
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
    tmdb: { status: 'unknown', message: '' }
  };
  
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

// Find TMDB ID using IMDB ID
export async function findTMDBId(imdbId) {
  if (!imdbId) return null;
  
  // If the ID already has tmdb- prefix, just return the ID part
  if (imdbId.startsWith('tmdb-')) {
    return imdbId.replace('tmdb-', '');
  }
  
  // Otherwise, try to find an equivalent TMDB ID (for backward compatibility)
  const data = await fetchTMDB(`/find/${imdbId}`, { external_source: 'imdb_id' });
  return data?.movie_results?.[0]?.id || null;
}