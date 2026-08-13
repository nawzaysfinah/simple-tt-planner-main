import { START_TIME, SLOT_DURATION } from '../constants';

/**
 * Format minutes from midnight to HH:MM format
 * @param {number} minutes - Minutes from midnight
 * @returns {string} Formatted time string (HH:MM)
 */
export const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Get label for a time slot with index and time range
 * @param {number} slotIndex - Zero-based slot index
 * @param {boolean} compact - Whether to return compact label (start time only)
 * @returns {string} Slot label (e.g., "1: 08:30-09:00" or "08:30")
 */
export const getSlotLabel = (slotIndex, compact = false) => {
    const startMinutes = START_TIME + (slotIndex * SLOT_DURATION);
    const endMinutes = startMinutes + SLOT_DURATION;

    if (compact) {
        return formatTime(startMinutes);
    }

    return `${slotIndex + 1}: ${formatTime(startMinutes)}-${formatTime(endMinutes)}`;
};
