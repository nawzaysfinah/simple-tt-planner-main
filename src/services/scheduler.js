import { DAYS, SLOTS_PER_DAY, LUNCH_OPTIONS, LUNCH_BREAK_ID, IMMUTABLE_SLOT_ID, SAME_MODULE_SAME_DAY_PENALTY, NEW_TEACHING_DAY_PENALTY, CLASS_GAP_PENALTY, FRIDAY_PENALTY, FRIDAY_AFTERNOON_START_SLOT, FRIDAY_DAY_INDEX, DEFAULT_EARLIEST_START_SLOT, LOW_PRIORITY_SPLITTABLE_MODULES, SPLIT_CHUNK_SLOTS } from '../constants';
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
 * Apply a lunch break to all trackers. For each day, every candidate lunch
 * position (LUNCH_OPTIONS) is scored by how much usable room it leaves on both
 * sides relative to the longest pending task duration, and the best-fitting one
 * is chosen - so real sessions can still land cleanly before AND after lunch,
 * rather than lunch landing wherever and boxing a session out. The lunch time
 * can differ day-to-day (each day's own available-time shape may call for a
 * different split), but every class and every person still shares the same
 * lunch slot as each other WITHIN a given day, so the whole team is still free
 * to eat together at the same time.
 * @param {Object} classTrackers - Class availability trackers
 * @param {Object} personTrackers - Person availability trackers
 * @param {Object} timetables - Timetable data
 * @param {Array} tasks - List of tasks, used to find the longest pending duration
 * @param {Function} logger - Logging function
 * @param {boolean} allowBeyond530 - Whether sessions may run past 17:30
 * @param {boolean} allowBefore900 - Whether sessions may start before 09:00
 * @returns {Object} Lunch break configuration by day
 */
export const applyLunchBreaks = (classTrackers, personTrackers, timetables, tasks, logger, allowBeyond530 = false, allowBefore900 = false) => {
    const lunchBreaks = {};

    const dayStartSlot = allowBefore900 ? 0 : DEFAULT_EARLIEST_START_SLOT;
    const dayMaxSlots = allowBeyond530 ? SLOTS_PER_DAY : 19;
    const longestTaskDuration = tasks.reduce((max, t) => Math.max(max, Number(t.Duration || t.duration) || 0), 0);

    for (let day = 0; day < 5; day++) {
        // Friday afternoon is off-limits to real sessions (see the hard rule below),
        // so there's no point leaving "after lunch" room past that cutoff there.
        const dayEnd = day === FRIDAY_DAY_INDEX ? Math.min(dayMaxSlots, FRIDAY_AFTERNOON_START_SLOT) : dayMaxSlots;

        let bestBadness = Infinity;
        let bestOptions = [];
        for (const option of LUNCH_OPTIONS) {
            const [lunchStart, lunchEndSlot] = option;
            const roomBefore = lunchStart - dayStartSlot;
            const roomAfter = dayEnd - (lunchEndSlot + 1);
            // How far short each side falls of fitting the longest pending task - 0 if
            // both sides already comfortably fit it, higher is worse.
            const badness = Math.max(0, longestTaskDuration - roomBefore) + Math.max(0, longestTaskDuration - roomAfter);

            if (badness < bestBadness) {
                bestBadness = badness;
                bestOptions = [option];
            } else if (badness === bestBadness) {
                bestOptions.push(option);
            }
        }

        const lunchSlots = bestOptions[Math.floor(Math.random() * bestOptions.length)];
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
export const attemptSchedule = (assignments, tasks, classes, persons, immutableSlots, attemptNumber, logger, randomSeed = null, allowBeyond530 = false, allowBefore900 = false, lockedPlacements = []) => {
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
    applyLunchBreaks(classTrackers, personTrackers, newTimetables, tasks, logger, allowBeyond530, allowBefore900);

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

    // Sort low-priority/splittable tasks (e.g. IP site visits) to the very end, so
    // every other module claims its slot first; within each priority tier, sort by
    // descending task duration (longest first) after shuffling.
    const isLowPriorityTask = (a) => LOW_PRIORITY_SPLITTABLE_MODULES.includes(getModuleFromTask(a.Task || a.task));
    shuffledAssignments.sort((a, b) => {
        const aLowPriority = isLowPriorityTask(a);
        const bLowPriority = isLowPriorityTask(b);
        if (aLowPriority !== bLowPriority) return aLowPriority ? 1 : -1;

        const taskA = tasks.find(t => (t.Name || t.name) === (a.Task || a.task));
        const taskB = tasks.find(t => (t.Name || t.name) === (b.Task || b.task));
        const durationA = taskA ? (taskA.Duration || taskA.duration || 0) : 0;
        const durationB = taskB ? (taskB.Duration || taskB.duration || 0) : 0;
        return durationB - durationA;
    });
    logger(`  Assignments sorted: low-priority/splittable modules last, descending task duration within each tier.`);

    let scheduled = 0;
    let failed = 0;
    const unassignedTasks = [];

    const startSlot = allowBefore900 ? 0 : DEFAULT_EARLIEST_START_SLOT;
    const maxSlots = allowBeyond530 ? SLOTS_PER_DAY : 19;

    /**
     * Find and score every open (day, slot) able to fit a block of `duration`
     * for this class/main/assist, using the same four soft preferences
     * documented below, and return the chosen one (or null if none exist).
     * Pure search - does not write to any tracker.
     */
    const findBestBlock = (duration, className, mainPerson, assistPerson, taskName) => {
        const candidates = [];
        for (let day = 0; day < 5; day++) {
            const dayMaxSlots = day === FRIDAY_DAY_INDEX ? Math.min(maxSlots, FRIDAY_AFTERNOON_START_SLOT) : maxSlots;
            for (let slot = startSlot; slot <= dayMaxSlots - duration; slot++) {
                const classAvailable = checkAvailability(classTrackers[className], day, slot, duration);
                const mainAvailable = checkAvailability(personTrackers[mainPerson], day, slot, duration);
                const assistAvailable = assistPerson ? checkAvailability(personTrackers[assistPerson], day, slot, duration) : true;

                if (classAvailable && mainAvailable && assistAvailable) {
                    candidates.push({ day, slot });
                }
            }
        }
        if (candidates.length === 0) return null;

        const module = getModuleFromTask(taskName);
        const teachingDays = mainTeachingDays.get(mainPerson);
        const modulesByDay = mainModulesByDay.get(mainPerson);

        // Per day, does this class already have any booking? Used below to tell an
        // isolated (gap-prone) placement apart from the day's first booking, which
        // can't create a gap since nothing else exists yet to leave a gap from.
        const classDayHasBooking = {};
        for (let day = 0; day < 5; day++) {
            classDayHasBooking[day] = classTrackers[className][day].some(v => v !== 0);
        }

        let bestScore = Infinity;
        let bestCandidates = [];

        for (const candidate of candidates) {
            let score = 0;

            const sameModuleToday = !!(modulesByDay && modulesByDay.get(candidate.day)?.has(module));
            if (sameModuleToday) score += SAME_MODULE_SAME_DAY_PENALTY;

            const opensNewDay = !!(teachingDays && teachingDays.size > 0 && !teachingDays.has(candidate.day));
            if (opensNewDay) score += NEW_TEACHING_DAY_PENALTY;

            const dayTrack = classTrackers[className][candidate.day];
            const leftBusy = candidate.slot > 0 && dayTrack[candidate.slot - 1] !== 0;
            const rightIdx = candidate.slot + duration;
            const rightBusy = rightIdx < SLOTS_PER_DAY && dayTrack[rightIdx] !== 0;
            const createsGap = classDayHasBooking[candidate.day] && !leftBusy && !rightBusy;
            if (createsGap) score += CLASS_GAP_PENALTY;

            // Any Friday candidate that survives the hard afternoon filter above is,
            // by definition, a Friday morning (or pre-1pm) slot - discourage it too.
            if (candidate.day === FRIDAY_DAY_INDEX) score += FRIDAY_PENALTY;

            if (score < bestScore) {
                bestScore = score;
                bestCandidates = [candidate];
            } else if (score === bestScore) {
                bestCandidates.push(candidate);
            }
        }

        // Random tie-break among equally-preferred slots
        const chosen = bestCandidates[Math.floor(rng() * bestCandidates.length)];
        return { ...chosen, sameModuleConflict: bestScore >= SAME_MODULE_SAME_DAY_PENALTY };
    };

    const commitBlock = (day, slot, duration, className, mainPerson, assistPerson, assignmentId, taskName) => {
        for (let i = 0; i < duration; i++) {
            newTimetables[className][day][slot + i] = assignmentId;
            classTrackers[className][day][slot + i] = assignmentId;
            personTrackers[mainPerson][day][slot + i] = assignmentId;
            if (assistPerson) {
                personTrackers[assistPerson][day][slot + i] = assignmentId;
            }
        }
        recordMainPlacement(mainPerson, day, taskName);
    };

    const releaseBlock = (day, slot, duration, className, mainPerson, assistPerson) => {
        for (let i = 0; i < duration; i++) {
            newTimetables[className][day][slot + i] = 0;
            classTrackers[className][day][slot + i] = 0;
            personTrackers[mainPerson][day][slot + i] = 0;
            if (assistPerson) {
                personTrackers[assistPerson][day][slot + i] = 0;
            }
        }
        // mainTeachingDays/mainModulesByDay entries are intentionally left in place on
        // rollback - they're monotonic "has this person ever taught X on day Y" markers
        // for the soft clustering preference; a stale entry only makes that preference
        // very slightly more conservative afterwards, never incorrect.
    };

    /** Split `duration` into SPLIT_CHUNK_SLOTS-sized pieces (the last piece takes the remainder). */
    const splitIntoChunks = (duration) => {
        const chunks = [];
        let remaining = duration;
        while (remaining > 0) {
            const size = Math.min(SPLIT_CHUNK_SLOTS, remaining);
            chunks.push(size);
            remaining -= size;
        }
        return chunks;
    };

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

        // Look for one contiguous block first (works for every task, low-priority or
        // not) - scored against four soft preferences: (1) for the Main lecturer,
        // avoid repeating the same module on one day, (2) for the Main lecturer,
        // cluster their teaching onto as few days as possible, (3) for the class,
        // avoid leaving a blank period between sessions on a day that already has
        // bookings, (4) avoid Friday altogether where possible. Scoring only ranks
        // slots that are already valid, so it never makes a task unschedulable that
        // would otherwise have fit.
        //
        // Friday afternoon is the one HARD rule (not scored): management wants explicitly
        // no classes there, so a session may not start, or run past, FRIDAY_AFTERNOON_START_SLOT
        // on a Friday - such placements are excluded from the candidate list entirely.
        let placed = false;
        const isLowPriority = isLowPriorityTask(assignment);

        const fullBlock = findBestBlock(duration, className, mainPerson, assistPerson, taskName);
        if (fullBlock) {
            commitBlock(fullBlock.day, fullBlock.slot, duration, className, mainPerson, assistPerson, assignmentId, taskName);
            if (fullBlock.sameModuleConflict) {
                logger(`  ⚠ Every open slot repeats ${getModuleFromTask(taskName)} for ${mainPerson}; placed on ${DAYS[fullBlock.day]} anyway`, 'warning');
            }
            logger(`  ✓ Scheduled on ${DAYS[fullBlock.day]}, slots ${fullBlock.slot + 1} -${fullBlock.slot + duration} `, 'info');
            scheduled++;
            placed = true;
        } else if (isLowPriority) {
            // No single block fits anywhere - this task is allowed to split into
            // smaller pieces (each independently placed, possibly on different days).
            // If even one piece can't be placed, roll back whatever pieces did get
            // placed and report the whole task as unassigned, rather than leaving a
            // half-scheduled task the UI has no way to represent.
            const chunkSizes = splitIntoChunks(duration);
            const committedChunks = [];
            let anyChunkConflict = false;

            for (const chunkDuration of chunkSizes) {
                const chunkBlock = findBestBlock(chunkDuration, className, mainPerson, assistPerson, taskName);
                if (!chunkBlock) break;
                commitBlock(chunkBlock.day, chunkBlock.slot, chunkDuration, className, mainPerson, assistPerson, assignmentId, taskName);
                committedChunks.push({ ...chunkBlock, duration: chunkDuration });
                if (chunkBlock.sameModuleConflict) anyChunkConflict = true;
            }

            if (committedChunks.length === chunkSizes.length) {
                if (anyChunkConflict) {
                    logger(`  ⚠ Every open slot repeats ${getModuleFromTask(taskName)} for ${mainPerson} in at least one piece; placed anyway`, 'warning');
                }
                const description = committedChunks.map(c => `${DAYS[c.day]} ${c.slot + 1}-${c.slot + c.duration}`).join(' + ');
                logger(`  ✓ Scheduled as ${committedChunks.length} split pieces (low-priority/splittable): ${description}`, 'info');
                scheduled++;
                placed = true;
            } else {
                committedChunks.forEach(c => releaseBlock(c.day, c.slot, c.duration, className, mainPerson, assistPerson));
                logger(`  ✗ Could not fit even as split pieces`, 'error');
            }
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
