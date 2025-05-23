import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import StarRating from './StarRating';

function Test() {
  const [movieRating, setMovieRating] = useState(0);
  return (
    <div>
      <StarRating
        maxRating={5}
        messages={["Terrible", "Bad", "Okay", "Good", "Perfect"]}
        defaultRating={3}
        onSetRating={setMovieRating}
      />
      <p>This movie is rated {movieRating} stars. </p>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <StarRating
      maxRating={5}
      messages={["Terrible", "Bad", "Okay", "Good", "Perfect"]}
      defaultRating={0}
    />
    <Test> </Test> */}
    <App />
  </React.StrictMode>
);