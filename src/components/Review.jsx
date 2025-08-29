import React from 'react';
// Removed StarRating import as it's no longer used

const Review = ({ review }) => {
  return (
    <div className="review">
      <div className="review-header">
        <span className="review-username">{review.username}</span>
        {/* Display rating as text instead of stars */}
        <span className="review-rating">{review.rating}/10</span>
      </div>
      <p className="review-comment">{review.comment}</p>
    </div>
  );
};

export default Review;
