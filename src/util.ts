/**
 * Utility functions.
 */

/**
 * Generate a random interger between 2 bounds.
 *
 * @param min The minimum number.
 * @param max The maximum number.
 * @returns Random number between given numbers.
 */
export function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
