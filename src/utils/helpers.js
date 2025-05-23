// Utility functions

/**
 * Calculate the average value of an array of numbers
 * @param {Array<number>} arr - Array of numbers to calculate average from
 * @returns {number} The average value
 */
export const average = (arr) => 
  arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0); 