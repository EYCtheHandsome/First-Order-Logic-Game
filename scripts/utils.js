// scripts/utils.js

export const gridSize = 5; // Default 5x5 grid

// Map hex color codes to color names for convenience
const colorMap = {
    '#ff82a9': 'Pink',
    '#7ed957': 'Green',
    '#6ecbff': 'Sky Blue',
    '#ffd966': 'Yellow',
    '#b07bff': 'Purple'
};

/**
 * getColorName(colorHex): returns the English color name if known, else the raw hex
 */
export function getColorName(colorHex) {
    return colorMap[colorHex.toLowerCase()] || colorHex;
}

// Available shapes, colors, etc.
export const shapes = ['circle', 'square', 'triangle'];
export const colors = ['#ff82a9', '#7ed957', '#6ecbff', '#ffd966', '#b07bff'];
export const colorNames = {
    '#ff82a9': 'Pink',
    '#7ed957': 'Green',
    '#6ecbff': 'Sky Blue',
    '#ffd966': 'Yellow',
    '#b07bff': 'Purple'
};
export const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Some optional arrays if needed
export const positions = ['top left corner', 'top right corner', 'bottom left corner', 'bottom right corner'];
export const equality = ['equal', 'greater than', 'less than'];
export const directions = ['left', 'right', 'up', 'down'];
export const orders = ['first', 'second', 'third'];

/**
 * getRandomElement(array): returns a random element from array
 */
export function getRandomElement(array) {
    if (!array || array.length === 0) {
        console.error("Attempted to get a random element from an empty array.");
        return null;
    }
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * randomIntFromInterval(min, max): integer in [min, max]
 */
export function randomIntFromInterval(min, max) {
    if (min > max) {
        console.error("Invalid interval: min is greater than max.");
        return min; // fallback
    }
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * shuffleArray(array): in-place shuffle (Fisher-Yates)
 */
export function shuffleArray(array) {
    if (!array || array.length === 0) {
        console.warn("Attempted to shuffle an empty array.");
        return;
    }
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
