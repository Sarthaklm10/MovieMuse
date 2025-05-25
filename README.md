# MovieMuse 🎬

MovieMuse is an interactive React application that allows users to search for movies, view detailed information, rate them, add personal reviews, and create a personalized watchlist. The application features a modern, responsive design with both light and dark themes.

## Features

- **Powerful Movie Search**: Find movies using the OMDB API with instant results
- **Comprehensive Movie Details**: View detailed information including plot, cast, director, ratings, and more
- **Personal Rating System**: Rate movies on a scale of 1-10 and add your own reviews
- **Smart Recommendations**: Get personalized movie recommendations based on your watchlist
- **Bookmarking System**: Keep track of movies you've watched with your ratings and reviews
- **Similar Movies**: Discover related movies based on your current selection
- **Dark/Light Theme**: Toggle between light and dark themes based on your preference
- **Responsive Design**: Enjoy a seamless experience across desktop, tablet, and mobile devices
- **Local Storage**: Your watchlist and preferences are saved between sessions

## Screenshots

### Main Interface with Movie Search
![Main Interface](./screenshots/screenshot1.png)
*The main interface showing search functionality and movie results with a clean, modern design*

### Movie Details View
![Movie Details](./screenshots/screenshot2.png)
*Detailed movie view displaying comprehensive information, ratings, and similar movie recommendations*

### Watchlist with User Ratings
![Watchlist](./screenshots/screenshot3.png)
*Personal watchlist showing rated and reviewed movies with summary statistics*

## Technologies Used

- **React**: Front-end UI library using functional components and hooks
- **Custom Hooks**: Created specialized hooks for local storage, API fetching, and keyboard events
- **OMDB API**: Primary API for movie data and search functionality
- **TMDB API**: Secondary API for recommendations and similar movies
- **CSS3**: Modern styling with custom properties for theming
- **LocalStorage API**: For persisting user preferences and watchlist data
- **Responsive Design**: Flexbox and CSS Grid for layout across all device sizes
- **ES6+ JavaScript**: Modern JavaScript features and syntax

## Project Structure

```
moviemuse/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/     # UI components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helper functions and constants
│   ├── App.jsx         # Main application component
│   ├── index.js        # Application entry point
│   └── index.css       # Global styles
└── screenshots/        # Project screenshots
```

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/moviemuse.git
   ```

2. Navigate to the project directory:
   ```
   cd moviemuse 
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add your API keys:
   ```
   REACT_APP_OMDB_API_KEY=your_omdb_api_key
   REACT_APP_TMDB_API_KEY=your_tmdb_api_key
   ```

5. Start the development server:
   ```
   npm start
   ```

6. Open your browser and navigate to `http://localhost:3000`

## How to Use

1. **Search for Movies**: Type a movie title in the search bar
2. **View Movie Details**: Click on any movie poster to see detailed information
3. **Rate and Review**: Select a star rating (1-10) and optionally add a text review
4. **Add to Watchlist**: After rating, click "Add to list" to save to your watchlist
5. **View Similar Movies**: Scroll down in movie details to see similar movie recommendations
6. **Check Your Watchlist**: Your watched movies appear in the right panel with ratings
7. **Toggle Theme**: Click the sun/moon icon in the navigation bar to switch between light and dark themes