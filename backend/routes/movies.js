// routes/movies.js
const router = require("express").Router();
const dotenv = require("dotenv");
dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const cache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function for TMDB calls with caching + fallback
async function fetchFromTMDB(endpoint, cacheKey) {
  const now = Date.now();

  // Return cached data if still valid
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDB returned ${res.status}`);
    }

    const data = await res.json();

    // Store in cache
    cache[cacheKey] = {
      data,
      timestamp: now,
    };

    return data;
  } catch (err) {
    console.error(`Error fetching ${cacheKey} from TMDB:`, err.message);

    // Fallback to cached data if available
    if (cache[cacheKey]) {
      console.warn(`Serving stale cache for ${cacheKey}`);
      return cache[cacheKey].data;
    }

    throw err; // No cache available, rethrow error
  }
}

// Routes
router.get("/trending", async (req, res) => {
  try {
    const data = await fetchFromTMDB("/trending/movie/week", "trending");
    res.json(data.results);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/new-releases", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split("T")[0];

    const endpoint = `/discover/movie?primary_release_date.gte=${lastMonthStr}&primary_release_date.lte=${today}&sort_by=release_date.desc`;
    const data = await fetchFromTMDB(endpoint, "new-releases");
    res.json(data.results);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/top-rated", async (req, res) => {
  try {
    const data = await fetchFromTMDB("/movie/top_rated", "top-rated");
    res.json(data.results);
  } catch {
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
