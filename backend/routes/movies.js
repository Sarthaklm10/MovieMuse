// routes/movies.js
const router = require("express").Router();
const dotenv = require("dotenv");
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

if (!TMDB_API_KEY || TMDB_API_KEY === "your_tmdb_api_key_here") {
  console.error("FATAL ERROR: TMDB_API_KEY is not defined in your backend/.env file.");
}

const cache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function for TMDB calls with caching + fallback
async function fetchFromTMDB(endpoint, cacheKey, page = 1) {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
    throw new Error('TMDB_API_KEY not configured.');
  }
  const now = Date.now();
  const pageCacheKey = `${cacheKey}-page-${page}`;

  // Return cached data if still valid
  if (cache[pageCacheKey] && now - cache[pageCacheKey].timestamp < CACHE_DURATION) {
    return cache[pageCacheKey].data;
  }

  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDB returned ${res.status}`);
    }

    const data = await res.json();

    // Store in cache
    cache[pageCacheKey] = {
      data,
      timestamp: now,
    };

    return data;
  } catch (err) {
    console.error(`Error fetching ${pageCacheKey} from TMDB:`, err.message);

    // Fallback to cached data if available
    if (cache[pageCacheKey]) {
      console.warn(`Serving stale cache for ${pageCacheKey}`);
      return cache[pageCacheKey].data;
    }

    throw err; // No cache available, rethrow error
  }
}

// Routes
router.get('/trending', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const data = await fetchFromTMDB('/trending/movie/week', 'trending', page);
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/new-releases', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    const endpoint = `/discover/movie?primary_release_date.gte=${lastMonthStr}&primary_release_date.lte=${today}&sort_by=release_date.desc`;
    const data = await fetchFromTMDB(endpoint, 'new-releases', page);
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const data = await fetchFromTMDB('/movie/top_rated', 'top-rated', page);
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json(data.results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
