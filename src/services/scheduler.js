import { DAYS, SLOTS_PER_DAY, LUNCH_OPTIONS, LUNCH_BREAK_ID, IMMUTABLE_SLOT_ID, SAME_MODULE_SAME_DAY_PENALTY, NEW_TEACHING_DAY_PENALTY } from '../constants';
import { getSlotLabel } from '../utils/timeUtils';
import { seededRandom, shuffleArray } from '../utils/randomUtils';
import { getModuleFromTask } from './assignmentHelper';

/**
 * Check if a time slot range is available
 * @param {Array} tracker - 2D array tracking availability
 * @param {number} day - Day index (0-4)
 * @param {number} startSlot - Starting slot index
 * @param {number} duration - Number of slots needed
 * @returns {boolean} True if available
 */
export const checkAvailability = (tracker, day, startSlot, duration) => {
    if (!tracker || !tracker[day]) return false;

    for (let i = 0; i < duration; i++) {
        if (tracker[day][startSlot + i] !== 0) {
            return false;
        }
    }
    return true;
};

/**
 * Initialize trackers for classes and persons
 * @param {Array} classes - List of classes
 * @param {Array} persons - List of persons
 * @param {Array} assignments - List of assignments
 * @param {Function} logger - Logging function
 * @returns {Object} { classTrackers, personTrackers, classNames, personNames }
 */
export const initializeTrackers = (classes, persons, assignments, logger) => {
    const classTrackers = {};
    const personTrackers = {};
    const classNames = new Set();
    const personNames = new Set();

    // Initialize all classes
    classes.forEach(classItem => {
        const className = classItem.Name || classItem.name;
        if (className) {
            classNames.add(className);
            classTrackers[className] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
            logger(`Initialized class: ${className} `);
        }
    });

    // Initialize classes from assignments if not in class list
    assignments.forEach(assignment => {
        const className = assignment.Class || assignment.class;
        if (className && !classNames.has(className)) {
            classNames.add(className);
            classTrackers[className] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
            logger(`Initialized class from assignments: ${className} `);
        }
    });

    // Initialize all persons
    persons.forEach(person => {
        const personName = person.Name || person.name;
        if (personName) {
            personNames.add(personName);
            personTrackers[personName] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
            logger(`Initialized person: ${personName} `);
        }
    });

    // Initialize persons from assignments if not in person list
    assignments.forEach(assignment => {
        const mainPerson = assignment.Main || assignment.main;
        const assistPerson = assignment.Assist || assignment.assist;

        if (mainPerson && !personNames.has(mainPerson)) {
            personNames.add(mainPerson);
            personTrackers[mainPerson] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
            logger(`Initialized person from assignments: ${mainPerson} `);
        }

        if (assistPerson && !personNames.has(assistPerson)) {
            personNames.add(assistPerson);
            personTrackers[assistPerson] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
            logger(`Initialized person from assignments: ${assistPerson} `);
        }
    });

    return { classTrackers, personTrackers, classNames, personNames };
};

/**
 * Apply random lunch breaks to all trackers
 * @param {Object} classTrackers - Class availability trackers
 * @param {Object} personTrackers - Person availability trackers
 * @param {Object} timetables - Timetable data
 * @param {Function} logger - Logging function
 * @returns {Object} Lunch break configuration by day
 */
export const applyLunchBreaks = (classTrackers, personTrackers, timetables, logger) => {
    const lunchBreaks = {};

    // Randomly choose lunch slots for each day
    for (let day = 0; day < 5; day++) {
        const lunchSlots = LUNCH_OPTIONS[Math.floor(Math.random() * LUNCH_OPTIONS.length)];
        lunchBreaks[day] = lunchSlots;
        logger(`${DAYS[day]} lunch break: slots ${lunchSlots[0] + 1} -${lunchSlots[1] + 1} (${getSlotLabel(lunchSlots[0])} to ${getSlotLabel(lunchSlots[1])})`);
    }

    // Mark lunch breaks in class trackers
    Object.keys(classTrackers).forEach(className => {
        for (let day = 0; day < 5; day++) {
            const lunchSlots = lunchBreaks[day];
            lunchSlots.forEach(slot => {
                classTrackers[className][day][slot] = LUNCH_BREAK_ID;
                timetables[className][day][slot] = LUNCH_BREAK_ID;
            });
        }
    });

    // Mark lunch breaks in person trackers
    Object.keys(personTrackers).forEach(personName => {
        for (let day = 0; day < 5; day++) {
            const lunchSlots = lunchBreaks[day];
            lunchSlots.forEach(slot => {
                personTrackers[personName][day][slot] = LUNCH_BREAK_ID;
            });
        }
    });

    return lunchBreaks;
};

/**
 * Apply immutable slots from CSV
 * @param {Array} immutableSlots - List of immutable slot definitions
 * @param {Object} classTrackers - Class availability trackers
 * @param {Object} timetables - Timetable data
 * @param {Function} logger - Logging function
 */
export const applyImmutableSlots = (immutableSlots, classTrackers, timetables, logger) => {
    immutableSlots.forEach(immutable => {
        const immutableId = immutable.id || immutable.ID || IMMUTABLE_SLOT_ID;
        const className = immutable.class || immutable.Class;
        const dayName = immutable.day || immutable.Day;
        const slotNum = immutable.slot || immutable.Slot;
        const duration = immutable.duration || immutable.Duration || 1;

        if (!className || !dayName || slotNum === undefined) {
            logger(`Invalid immutable slot entry: ${JSON.stringify(immutable)} `, 'error');
            return;
        }

        const dayIndex = DAYS.findIndex(d => d.toLowerCase() === dayName.toLowerCase());
        if (dayIndex === -1) {
            logger(`Invalid day in immutable slots: ${dayName} `, 'error');
            return;
        }

        if (slotNum < 0 || slotNum >= SLOTS_PER_DAY) {
            logger(`Invalid slot number in immutable slots: ${slotNum} `, 'error');
            return;
        }

        if (classTrackers[className]) {
            for (let i = 0; i < duration; i++) {
                if (slotNum + i < SLOTS_PER_DAY) {
                    classTrackers[className][dayIndex][slotNum + i] = immutableId;
                    timetables[className][dayIndex][slotNum + i] = immutableId;
                }
            }
            logger(`Applied immutable slot: ${className}, ${dayName}, slot ${slotNum + 1}, duration ${duration} `);
        } else {
            logger(`Class not found for immutable slot: ${className} `, 'error');
        }
    });
};

/**
 * Attempt to schedule all assignments
 * @param {Array} assignments - List of assignments
 * @param {Array} tasks - List of tasks
 * @param {Array} classes - List of classes
 * @param {Array} persons - List of persons
 * @param {Array} immutableSlots - List of immutable slots
 * @param {number} attemptNumber - Current attempt number
 * @param {Function} logger - Logging function
 * @param {string|number} randomSeed - Optional random seed
 * @returns {Object} { success, scheduled, failed, timetables }
 */
export const attemptSchedule = (assignments, tasks, classes, persons, immutableSlots, attemptNumber, logger, randomSeed = null, allowBeyond530 = false, allowBefore830 = false, lockedPlacements = []) => {
    // Initialize timetables
    const newTimetables = {};

    // Initialize trackers
    const { classTrackers, personTrackers } = initializeTrackers(classes, persons, assignments, logger);

    // Initialize timetables for all classes
    Object.keys(classTrackers).forEach(className => {
        newTimetables[className] = Array(5).fill(null).map(() => Array(SLOTS_PER_DAY).fill(0));
    });

    // Track each Main lecturer's teaching-day clustering and per-day module usage.
    // Used only as a soft preference when choosing where to place a task (see below) -
    // Assist-role sessions are intentionally not tracked here.
    const mainTeachingDays = new Map();  // personName -> Set<dayIndex> they already teach as Main
    const mainModulesByDay = new Map();  // personName -> Map<dayIndex, Set<moduleAbbreviation>>

    const recordMainPlacement = (personName, day, taskName) => {
        if (!personName) return;

        if (!mainTeachingDays.has(personName)) mainTeachingDays.set(personName, new Set());
        mainTeachingDays.get(personName).add(day);

        if (!mainModulesByDay.has(personName)) mainModulesByDay.set(personName, new Map());
        const byDay = mainModulesByDay.get(personName);
        if (!byDay.has(day)) byDay.set(day, new Set());
        byDay.get(day).add(getModuleFromTask(taskName));
    };

    // Apply lunch breaks
    applyLunchBreaks(classTrackers, personTrackers, newTimetables, logger);

    // Apply immutable slots
    applyImmutableSlots(immutableSlots, classTrackers, newTimetables, logger);

    // Pre-place locked assignments
    if (lockedPlacements.length > 0) {
        const lockedIds = new Set(lockedPlacements.map(lp => lp.assignmentId));

        for (const { assignmentId, className, mainPerson, assistPerson, day, slot, taskName } of lockedPlacements) {
            // Place in class timetable and tracker
            if (newTimetables[className]) {
                newTimetables[className][day][slot] = assignmentId;
            }
            if (classTrackers[className]) {
                classTrackers[className][day][slot] = assignmentId;
            }
            // Place in person trackers
            if (personTrackers[mainPerson]) {
                personTrackers[mainPerson][day][slot] = assignmentId;
            }
            if (assistPerson && personTrackers[assistPerson]) {
                personTrackers[assistPerson][day][slot] = assignmentId;
            }
            // Count this locked slot towards the Main lecturer's clustering/no-repeat preference
            recordMainPlacement(mainPerson, day, taskName);
        }

        logger(`Pre-placed ${lockedPlacements.length} slots for ${lockedIds.size} locked assignments`);
    }

    // Shuffle assignments for random allocation, then sort by descending task duration.
    // `rng` is also reused below to break ties between equally-preferred slots.
    let rng = Math.random;
    let shuffledAssignments;
    if (randomSeed) {
        // Create deterministic seed for this attempt
        const combinedSeed = `${randomSeed} -${attemptNumber} `;
        let hash = 0;
        for (let i = 0; i < combinedSeed.length; i++) {
            hash = ((hash << 5) - hash) + combinedSeed.charCodeAt(i);
            hash |= 0;
        }
        rng = seededRandom(hash);
        shuffledAssignments = shuffleArray(assignments, rng);
        logger(`  Using deterministic shuffle with seed: ${combinedSeed} `);
    } else {
        shuffledAssignments = shuffleArray(assignments, rng);
    }

    // Sort by descending task duration (longest first) after shuffling
    shuffledAssignments.sort((a, b) => {
        const taskA = tasks.find(t => (t.Name || t.name) === (a.Task || a.task));
        const taskB = tasks.find(t => (t.Name || t.name) === (b.Task || b.task));
        const durationA = taskA ? (taskA.Duration || taskA.duration || 0) : 0;
        const durationB = taskB ? (taskB.Duration || taskB.duration || 0) : 0;
        return durationB - durationA;
    });
    logger(`  Assignments sorted by descending task duration after shuffle.`);

    let scheduled = 0;
    let failed = 0;
    const unassignedTasks = [];

    // Try to schedule each assignment
    for (const assignment of shuffledAssignments) {
        const assignmentId = assignment.id || assignment.ID;
        const taskName = assignment.Task || assignment.task;
        const className = assignment.Class || assignment.class;
        const mainPerson = assignment.Main || assignment.main;
        const assistPerson = assignment.Assist || assignment.assist;

        logger(`Processing assignment ID:${assignmentId} - Task:${taskName} `);

        // Find the task
        const task = tasks.find(t => (t.Name || t.name) === taskName);
        if (!task) {
            logger(`Task ${taskName} not found in tasks list`, 'error');
            failed++;
            continue;
        }

        const duration = task.Duration || task.duration;
        logger(`  Task duration: ${duration} slots`);

        // Validate class and persons exist
        if (!classTrackers[className]) {
            logger(`  Class ${className} not found`, 'error');
            failed++;
            continue;
        }

        if (!personTrackers[mainPerson]) {
            logger(`  Main person ${mainPerson} not found`, 'error');
            failed++;
            continue;
        }

        if (assistPerson && !personTrackers[assistPerson]) {
            logger(`  Assist person ${assistPerson} not found`, 'error');
            failed++;
            continue;
        }

        // Collect every open slot for this task, then score each candidate against
        // two soft preferences for the Main lecturer: avoid repeating the same module
        // on one day, and cluster their teaching onto as few days as possible.
        // Scoring only ranks slots that are already valid, so it never makes a task
        // unschedulable that would otherwise have fit - if every open slot violates a
        // preference, the least-bad one is used rather than leaving the task unplaced.
        let placed = false;
        const startSlot = allowBefore830 ? 0 : 1;
        const maxSlots = allowBeyond530 ? SLOTS_PER_DAY : 19;

        const candidates = [];
        for (let day = 0; day < 5; day++) {
            for (let slot = startSlot; slot <= maxSlots - duration; slot++) {
                const classAvailable = checkAvailability(classTrackers[className], day, slot, duration);
                const mainAvailable = checkAvailability(personTrackers[mainPerson], day, slot, duration);
                const assistAvailable = assistPerson ? checkAvailability(personTrackers[assistPerson], day, slot, duration) : true;

                if (classAvailable && mainAvailable && assistAvailable) {
                    candidates.push({ day, slot });
                }
            }
        }

        if (candidates.length > 0) {
            const module = getModuleFromTask(taskName);
            const teachingDays = mainTeachingDays.get(mainPerson);
            const modulesByDay = mainModulesByDay.get(mainPerson);

            let bestScore = Infinity;
            let bestCandidates = [];

            for (const candidate of candidates) {
                let score = 0;

                const sameModuleToday = !!(modulesByDay && modulesByDay.get(candidate.day)?.has(module));
                if (sameModuleToday) score += SAME_MODULE_SAME_DAY_PENALTY;

                const opensNewDay = !!(teachingDays && teachingDays.size > 0 && !teachingDays.has(candidate.day));
                if (opensNewDay) score += NEW_TEACHING_DAY_PENALTY;

                if (score < bestScore) {
                    bestScore = score;
                    bestCandidates = [candidate];
                } else if (score === bestScore) {
                    bestCandidates.push(candidate);
                }
            }

            // Random tie-break among equally-preferred slots
            const { day, slot } = bestCandidates[Math.floor(rng() * bestCandidates.length)];

            // Assign the task
            for (let i = 0; i < duration; i++) {
                newTimetables[className][day][slot + i] = assignmentId;
                classTrackers[className][day][slot + i] = assignmentId;
                personTrackers[mainPerson][day][slot + i] = assignmentId;
                if (assistPerson) {
                    personTrackers[assistPerson][day][slot + i] = assignmentId;
                }
            }
            recordMainPlacement(mainPerson, day, taskName);

            if (bestScore >= SAME_MODULE_SAME_DAY_PENALTY) {
                logger(`  ⚠ Every open slot repeats ${module} for ${mainPerson}; placed on ${DAYS[day]} anyway`, 'warning');
            }
            logger(`  ✓ Scheduled on ${DAYS[day]}, slots ${slot + 1} -${slot + duration} `, 'info');
            scheduled++;
            placed = true;
        }

        if (!placed) {
            logger(`  ✗ Failed to find available slot`, 'error');
            failed++;
            unassignedTasks.push(assignmentId);
        }
    }

    // Store person trackers as timetables
    Object.keys(personTrackers).forEach(personName => {
        newTimetables[`person-${personName}`] = personTrackers[personName];
    });

    return {
        success: failed === 0,
        scheduled,
        failed,
        timetables: newTimetables,
        unassignedTasks
    };
};
