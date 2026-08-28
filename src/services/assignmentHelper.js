import { LUNCH_BREAK_ID, IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Get assignment details with role information
 * @param {number} assignmentId - Assignment ID
 * @param {Array} assignments - List of all assignments
 * @param {Array} immutableSlots - List of immutable slots (each carries its own explicit Venue)
 * @param {Array} classes - List of classes (each carries the one Venue used for all its regular sessions)
 * @param {string|null} personView - Person name if viewing from person perspective
 * @returns {Object|null} Assignment details or null
 */
export const getAssignmentDetails = (assignmentId, assignments, immutableSlots = [], classes = [], personView = null) => {
    if (assignmentId === 0) return null;
    if (assignmentId === LUNCH_BREAK_ID) {
        return { Task: 'LUNCH BREAK', Main: '-', Assist: '-', Class: '-', isLunch: true };
    }
    if (assignmentId >= IMMUTABLE_SLOT_ID) {
        const immutable = immutableSlots ? immutableSlots.find(s => (s.id || s.ID) === assignmentId) : null;
        const taskName = immutable ? (immutable.Task || immutable.task || 'IMMUTABLE') : 'IMMUTABLE';
        const names = immutable ? (immutable.Names || immutable.names) : undefined;
        // Immutable slots move around, so their venue is keyed in explicitly per row.
        const venue = immutable ? (immutable.Venue || immutable.venue) : undefined;
        return { Task: taskName, Main: '-', Assist: '-', Class: '-', Names: names, Venue: venue, isImmutable: true };
    }

    const assignment = assignments.find(a => (a.id || a.ID) === assignmentId);
    if (!assignment) return null;

    const className = assignment.Class || assignment.class;
    // Regular (staff-led) sessions use one consistent venue per class, rather
    // than a venue keyed in per session.
    const classInfo = classes.find(c => (c.Name || c.name) === className);
    const venue = classInfo ? (classInfo.Venue || classInfo.venue) : undefined;

    const details = {
        Task: assignment.Task || assignment.task,
        Main: assignment.Main || assignment.main,
        Assist: assignment.Assist || assignment.assist,
        Class: className,
        Venue: venue
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
 * Extract the module abbreviation from a task name.
 * Tasks are named "{ModuleAbbreviation}-{T|P}{n}", e.g. "CVA-T1" -> "CVA",
 * "IP-P1" -> "IP". Falls back to the full task name if no separator is found.
 * @param {string} taskName - Task name
 * @returns {string} Module abbreviation
 */
export const getModuleFromTask = (taskName) => {
    if (!taskName) return taskName;
    const idx = taskName.lastIndexOf('-');
    return idx === -1 ? taskName : taskName.slice(0, idx);
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
