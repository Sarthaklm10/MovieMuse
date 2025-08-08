const router = require("express").Router();
const authMiddleware = require("../middleware/auth");
let User = require("../models/user.model");

// GET /api/watchlist - Get the logged-in user's watchlist
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("watched");
    res.json(user.watched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// POST /api/watchlist/add - Add or update a movie in the watchlist
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const movieData = req.body;

    const movieIndex = user.watched.findIndex(
      (m) => m.imdbID === movieData.imdbID
    );

    if (movieIndex > -1) {
      user.watched[movieIndex] = movieData;
    } else {
      // Movie doesn't exist, add it
      user.watched.push(movieData);
    }

    await user.save();
    res.json(user.watched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// DELETE /api/watchlist/remove/:imdbID - Remove a movie from the watchlist
router.delete("/remove/:imdbID", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.watched = user.watched.filter(
      ({ imdbID }) => imdbID !== req.params.imdbID
    );

    await user.save();
    res.json(user.watched);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
