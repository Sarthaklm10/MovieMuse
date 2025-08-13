import React, { useState, useEffect } from "react";
import {
  getTrendingMovies,
  getNewReleases,
  getTopRatedMovies,
} from "../utils/api";
import { convertTMDBMovie } from "../utils/tmdbApi";
import MovieList from "./MovieList";
import Loader from "./Loader";

const MovieCategories = ({ onSelectMovie }) => {
  const [categories, setCategories] = useState({
    trending: { movies: [], isLoading: false, error: null },
    "new-releases": { movies: [], isLoading: false, error: null },
    "top-rated": { movies: [], isLoading: false, error: null },
  });

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
      const rawMovies = await fetchFn();
      const convertedMovies = rawMovies
        .map(convertTMDBMovie)
        .filter(
          (movie) =>
            movie && movie.Title && movie.Poster && movie.Poster !== "N/A"
        );

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
      {categoryConfig.map(renderCategorySection)}
    </div>
  );
};

export default MovieCategories;
