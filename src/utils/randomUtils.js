/**
 * Generate a seeded random number generator (Mulberry32)
 * @param {number} seed - Seed value
 * @returns {Function} Function returning a random number between 0 and 1
 */
export const seededRandom = (seed) => {
    return () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @param {Function} rng - Random number generator function
 * @returns {Array} Shuffled array
 */
export const shuffleArray = (array, rng = Math.random) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
