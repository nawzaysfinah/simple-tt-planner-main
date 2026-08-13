import { CELL_COLORS, LUNCH_BREAK_ID, IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Get background color class for a timetable cell based on assignment ID
 * @param {number} assignmentId - Assignment ID (0 = empty, lunch/immutable thresholds defined in constants)
 * @returns {string} Tailwind CSS background color class
 */
export const getCellColor = (assignmentId) => {
    if (assignmentId === 0) return 'bg-white';
    if (assignmentId === LUNCH_BREAK_ID) return 'bg-yellow-100';
    if (assignmentId >= IMMUTABLE_SLOT_ID) return 'bg-gray-400';

    return CELL_COLORS[assignmentId % CELL_COLORS.length];
};
