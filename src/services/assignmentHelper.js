import { LUNCH_BREAK_ID, IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Get assignment details with role information
 * @param {number} assignmentId - Assignment ID
 * @param {Array} assignments - List of all assignments
 * @param {string|null} personView - Person name if viewing from person perspective
 * @returns {Object|null} Assignment details or null
 */
export const getAssignmentDetails = (assignmentId, assignments, immutableSlots = [], personView = null) => {
    if (assignmentId === 0) return null;
    if (assignmentId === LUNCH_BREAK_ID) {
        return { Task: 'LUNCH BREAK', Main: '-', Assist: '-', Class: '-', isLunch: true };
    }
    if (assignmentId >= IMMUTABLE_SLOT_ID) {
        const immutable = immutableSlots ? immutableSlots.find(s => (s.id || s.ID) === assignmentId) : null;
        const taskName = immutable ? (immutable.Task || immutable.task || 'IMMUTABLE') : 'IMMUTABLE';
        const names = immutable ? (immutable.Names || immutable.names) : undefined;
        const venue = immutable ? (immutable.Venue || immutable.venue) : undefined;
        return { Task: taskName, Main: '-', Assist: '-', Class: '-', Names: names, Venue: venue, isImmutable: true };
    }

    const assignment = assignments.find(a => (a.id || a.ID) === assignmentId);
    if (!assignment) return null;

    const details = {
        Task: assignment.Task || assignment.task,
        Main: assignment.Main || assignment.main,
        Assist: assignment.Assist || assignment.assist,
        Class: assignment.Class || assignment.class
    };

    // If viewing from person perspective, add their role
    if (personView) {
        if (details.Main === personView) {
            details.Role = 'Main';
        } else if (details.Assist === personView) {
            details.Role = 'Assist';
        }
    }

    return details;
};

/**
 * Validate assignment CSV structure
 * @param {Array} assignments - Parsed assignments
 * @returns {Object} { valid: boolean, missingFields: Array }
 */
export const validateAssignmentCSV = (assignments) => {
    console.log(assignments);
    if (assignments.length === 0) {
        return { valid: true, missingFields: [] };
    }

    const firstAssignment = assignments[0];
    const missingFields = [];

    if (!firstAssignment.id && !firstAssignment.ID) missingFields.push('id');
    if (!firstAssignment.Main && !firstAssignment.main) missingFields.push('Main');
    if (!firstAssignment.Task && !firstAssignment.task) missingFields.push('Task');
    if (!firstAssignment.Class && !firstAssignment.class) missingFields.push('Class');

    return {
        valid: missingFields.length === 0,
        missingFields
    };
};
