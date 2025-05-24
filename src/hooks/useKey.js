import { useEffect } from 'react';

/**
 * Custom hook to handle keyboard events for a specific key
 * @param {string} key - The key to listen for (e.g., "Escape", "Enter")
 * @param {Function} callback - The function to call when the key is pressed
 */
export default function useKey(key, callback) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === key) {
        callback();
      }
    }

    // Add event listener when the component mounts
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove event listener when the component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, callback]); // Re-run if key or callback changes
} 