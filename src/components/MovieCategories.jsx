import React, { useState, useEffect } from "react";
import {
  getTrendingMovies,
  getNewReleases,
  getTopRatedMovies,
} from "../utils/api";
import { convertTMDBMovie, getMoviesByGenre } from "../utils/tmdbApi";
import MovieList from "./MovieList";
import Loader from "./Loader";
import Hero from "./Hero";
import GenreList from "./GenreList";

const MovieCategories = ({ onSelectMovie }) => {
  const [categories, setCategories] = useState({
    trending: { movies: [], isLoading: false, error: null },
    "new-releases": { movies: [], isLoading: false, error: null },
    "top-rated": { movies: [], isLoading: false, error: null },
  });
  const [genreMovies, setGenreMovies] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);

  const categoryConfig = [
    { id: "trending", label: "Trending", fetchFn: getTrendingMovies },
    { id: "new-releases", label: "New Releases", fetchFn: getNewReleases },
    { id: "top-rated", label: "Top Rated", fetchFn: getTopRatedMovies },
  ];

  const fetchCategoryMovies = async (categoryId, fetchFn) => {
    setCategories((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], isLoading: true, error: null },
    }));

    try {
      const responseData = await fetchFn();
      let moviesToProcess = [];

      if (responseData && responseData.isFallback) {
        // Data is from fallback, already converted
        moviesToProcess = responseData.movies;
      } else if (responseData) {
        // Data is from API, needs conversion
        moviesToProcess = responseData.map(convertTMDBMovie);
      }

      const convertedMovies = moviesToProcess.filter(
        (movie) =>
          movie && movie.Title && movie.Poster && movie.Poster !== "N/A"
      );

      console.log(`Processed movies for ${categoryId}:`, convertedMovies);
      setCategories((prev) => ({
        ...prev,
        [categoryId]: {
          movies: convertedMovies,
          isLoading: false,
          error: null,
        },
      }));
    } catch (err) {
      console.error(`Error fetching ${categoryId} movies:`, err);
      setCategories((prev) => ({
        ...prev,
        [categoryId]: {
          movies: [],
          isLoading: false,
          error: `Failed to load ${categoryId} movies`,
        },
      }));
    }
  };

  useEffect(() => {
    // Fetch all categories on component mount
    categoryConfig.forEach((category) => {
      fetchCategoryMovies(category.id, category.fetchFn);
    });
  }, []);

  const handleGenreSelect = async (genreId, genreName) => {
    setSelectedGenre(genreName);
    setGenreMovies([]);
    const movies = await getMoviesByGenre(genreId);
    setGenreMovies(movies.map(convertTMDBMovie).filter(Boolean));
  };

  const renderCategorySection = (category) => {
    const { movies, isLoading, error } = categories[category.id];

    if (isLoading) {
      return (
        <div key={category.id} className="category-section">
          <h3 className="category-title">{category.label}</h3>
          <div className="category-content">
            <Loader />
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div key={category.id} className="category-section">
          <h3 className="category-title">{category.label}</h3>
          <div className="category-content">
            <p className="category-error">{error}</p>
          </div>
        </div>
      );
    }

    if (movies.length === 0) {
      return null;
    }

    return (
      <div key={category.id} className="category-section">
        <h3 className="category-title">{category.label}</h3>
        <div className="category-content">
          <MovieList movies={movies} onSelectMovie={onSelectMovie} />
        </div>
      </div>
    );
  };

  return (
    <div className="movie-categories">
      <Hero onSelectMovie={onSelectMovie} />
      <GenreList onGenreSelect={handleGenreSelect} />
      {selectedGenre && (
        <div className="category-section">
          <h3 className="category-title">{selectedGenre}</h3>
          <div className="category-content">
            <MovieList movies={genreMovies} onSelectMovie={onSelectMovie} />
          </div>
        </div>
      )}
      {categoryConfig.map(renderCategorySection)}
    </div>
  );
};

export default MovieCategories;
