
import React, { useState, useEffect } from 'react';
import { getTrendingMovies } from '../utils/api';
import { convertTMDBMovie } from '../utils/tmdbApi';
import Loader from './Loader';
import './Hero.css';

const Hero = ({ onSelectMovie }) => {
  const [heroMovie, setHeroMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHeroMovie = async () => {
      try {
        const trendingMovies = await getTrendingMovies();
        if (trendingMovies && trendingMovies.length > 0) {
          const suitableMovie = trendingMovies.find(movie => movie.backdrop_path);
          if (suitableMovie) {
            const convertedMovie = convertTMDBMovie(suitableMovie);
            setHeroMovie(convertedMovie);
          } else {
            setError('Could not find a trending movie with a suitable backdrop.');
          }
        } else {
          setError('No trending movies found.');
        }
      } catch (err) {
        console.error('Error fetching hero movie:', err);
        setError('Failed to load trending movies.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeroMovie();
  }, []);

  if (isLoading) {
    return (
      <div className="hero-container hero-loading">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="hero-container hero-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!heroMovie) {
    return null;
  }

  return (
    <div
      className="hero-container"
      onClick={() => onSelectMovie(heroMovie.imdbID)}
    >
      <div
        className="hero-background"
        style={{
          backgroundImage: `url(${heroMovie.backdrop_path})`,
        }}
      />
      <div className="hero-content">
        <h1 className="hero-title">{heroMovie.Title}</h1>
        <p className="hero-overview">{heroMovie.overview}</p>
      </div>
    </div>
  );
};

export default Hero;
