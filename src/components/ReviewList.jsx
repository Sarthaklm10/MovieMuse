import React from 'react'; // Removed useState, useEffect as reviews are now props
// Removed getReviewsForMovie as reviews are now props
import Review from './Review';
import Loader from './Loader'; // Loader might still be used if reviews prop is null initially

const ReviewList = ({ reviews }) => { // Changed movieId to reviews
  // Removed isLoading, setIsLoading, error, setError states as reviews are now props
  // Removed useEffect for fetching reviews

  // If reviews are not yet loaded (e.g., parent is still fetching), show loader
  if (!reviews) {
    return <Loader />;
  }

  // If reviews are an empty array, it means no reviews exist
  if (reviews.length === 0) {
    return (
      <div className="review-list">
        <h3>Reviews</h3>
        <p>No reviews yet. Be the first to review this movie!</p>
      </div>
    );
  }

  return (
    <div className="review-list">
      <h3>Reviews</h3>
      {reviews.map((review) => <Review key={review._id} review={review} />)}
    </div>
  );
};

export default ReviewList;