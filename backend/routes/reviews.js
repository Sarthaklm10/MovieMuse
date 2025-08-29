const express = require('express');
const router = express.Router();
const Review = require('../models/review.model');
const auth = require('../middleware/auth');

// @route   GET api/reviews/:movieId
// @desc    Get all reviews for a movie
// @access  Public
router.get('/:movieId', async (req, res) => {
  try {
    const reviews = await Review.find({ movieId: req.params.movieId });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/reviews/:movieId
// @desc    Create or update a review for a movie
// @access  Private
router.post('/:movieId', auth, async (req, res) => {
  const { rating, comment } = req.body;

  try {
    let review = await Review.findOne({
      movieId: req.params.movieId,
      userId: req.user.id,
    });

    let message;
    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment;
      await review.save();
      message = 'Review updated successfully';
    } else {
      // Create new review
      review = new Review({
        movieId: req.params.movieId,
        userId: req.user.id,
        username: req.user.username,
        rating,
        comment,
      });
      await review.save();
      message = 'Review added successfully';
    }

    res.json({ review, message }); // Send back the review and a message
  } catch (err) {
    console.error('Error creating/updating review:', err.message);
    console.error('Request user:', req.user);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
