import React, { useState } from 'react';
import { createReviewForMovie } from '../utils/api';
import StarRating from '../StarRating';

const ReviewForm = ({ movieId, onReviewAdded, userHasReviewed }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null); // New state for success message

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please provide a rating.');
      return;
    }

    try {
      const response = await createReviewForMovie(movieId, { rating, comment });
      onReviewAdded(response); // Pass the entire response object
      setRating(0);
      setComment('');
      setError(null);
      setSuccessMessage(response.message); // Use the message from the backend response
      setTimeout(() => setSuccessMessage(null), 3000); // Clear message after 3 seconds
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    } catch (err) {
      setError('Failed to submit review.');
      setSuccessMessage(null); // Clear success message on error
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Add Your Review</h3>
      {error && <p className="error">{error}</p>}
      {successMessage && ( // Display success message with styled box
        <div className="success-message-container">
          <div className="success-message">
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      <StarRating maxRating={10} size={30} onSetRating={setRating} />
      <textarea
        placeholder="Write your review here..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="submit">{userHasReviewed ? "UPDATE Review" : "ADD Review"}</button>
    </form>
  );
};

export default ReviewForm;
