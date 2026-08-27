import { useState, useCallback } from 'react';
import { attemptSchedule } from '../services/scheduler';
import { validateAssignmentCSV } from '../services/assignmentHelper';
import { exportTimetables } from '../utils/exportUtils';
import { getSlotLabel } from '../utils/timeUtils';

/**
 * Custom hook for managing schedule generation and export
 * @param {Object} csvData - CSV data (assignments, tasks, classes, persons, immutableSlots)
 * @param {Function} addLog - Logging function
 * @param {Function} getAssignmentDetails - Function to get assignment details
 * @returns {Object} Scheduler state and methods
 */
export const useScheduler = (csvData, addLog, getAssignmentDetails, allowBeyond530 = false, allowBefore900 = false, disabledAssignmentIds = [], lockedAssignmentIds = new Set(), timetablesRef = { current: {} }) => {
    const [timetables, setTimetables] = useState({});
    const [successfulAttempt, setSuccessfulAttempt] = useState(null);
    const [allScheduled, setAllScheduled] = useState(false);
    const [maxRetries, setMaxRetries] = useState(5);
    const [randomSeed, setRandomSeed] = useState('');
    const [unassignedTasks, setUnassignedTasks] = useState([]);

    const { assignments, tasks, classes, persons, immutableSlots } = csvData;

    const generateSchedule = useCallback(() => {
        if (!assignments.length || !tasks.length || !classes.length || !persons.length) {
            addLog('Please upload all required CSV files (Assignments, Persons, Classes, Tasks)', 'error');
            return;
        }

        addLog('='.repeat(60));
        addLog(`Starting schedule generation with ${maxRetries} max retries...`);
        addLog(`Total assignments: ${assignments.length}, tasks: ${tasks.length}, classes: ${classes.length}, persons: ${persons.length}, immutable slots: ${immutableSlots.length}`);

        // Validate CSV structure
        const validation = validateAssignmentCSV(assignments);
        if (!validation.valid) {
            addLog(`ERROR: Assignment CSV is missing columns: ${validation.missingFields.join(', ')}`, 'error');
            addLog('Please check your CSV file has headers: id,Main,Assist,Task,Class', 'error');
            return;
        }

        // Try multiple attempts
        let bestResult = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            addLog(`\n--- ATTEMPT ${attempt + 1}/${maxRetries} ---`);

            // Extract locked placements from current timetables
            const lockedPlacements = [];
            if (lockedAssignmentIds.size > 0 && timetablesRef.current && Object.keys(timetablesRef.current).length > 0) {
                for (const assignment of assignments) {
                    const aid = assignment.id || assignment.ID;
                    if (!lockedAssignmentIds.has(aid)) continue;
                    const className = assignment.Class || assignment.class;
                    const mainPerson = assignment.Main || assignment.main;
                    const assistPerson = assignment.Assist || assignment.assist;
                    const taskName = assignment.Task || assignment.task;
                    const classTable = timetablesRef.current[className];
                    if (!classTable) continue;
                    // Find all (day, slot) for this assignment in the class timetable
                    for (let d = 0; d < 5; d++) {
                        for (let s = 0; s < classTable[d].length; s++) {
                            if (classTable[d][s] === aid) {
                                lockedPlacements.push({ assignmentId: aid, className, mainPerson, assistPerson, day: d, slot: s, taskName });
                            }
                        }
                    }
                }
                addLog(`Locked assignments: ${lockedAssignmentIds.size}, locked placements: ${lockedPlacements.length}`);
            }

            // Filter out locked assignments from scheduling
            const schedulableAssignments = lockedAssignmentIds.size > 0
                ? assignments.filter(a => !lockedAssignmentIds.has(a.id || a.ID))
                : assignments;

            const result = attemptSchedule(
                schedulableAssignments,
                tasks,
                classes,
                persons,
                immutableSlots,
                attempt,
                addLog,
                randomSeed,
                allowBeyond530,
                allowBefore900,
                lockedPlacements
            );

            // Track the best result (fewest failed assignments)
            if (!bestResult || result.failed < bestResult.failed) {
                bestResult = result;
            }

            if (result.success) {
                addLog(`✓✓✓ SUCCESS! All ${assignments.length} assignments scheduled on attempt ${attempt + 1}`, 'info');
                setTimetables(result.timetables);
                setSuccessfulAttempt(attempt);
                setAllScheduled(true);
                setUnassignedTasks(disabledAssignmentIds);
                return;
            } else {
                addLog(`✗ Attempt ${attempt + 1} failed: ${result.scheduled}/${schedulableAssignments.length} scheduled (+ ${lockedPlacements.length} locked), ${result.failed} failed`, 'error');
            }
        }

        addLog(`\n${'='.repeat(60)}`, 'warning');
        addLog(`All ${maxRetries} attempts failed. Showing best attempt with ${bestResult.failed} failed assignments.`, 'warning');
        addLog('Try increasing the number of retries or check for conflicts in assignments.', 'warning');

        // Use the best result even though it failed
        setTimetables(bestResult.timetables);
        setSuccessfulAttempt(null);
        setAllScheduled(false);
        setUnassignedTasks([...(bestResult.unassignedTasks || []), ...disabledAssignmentIds]);

    }, [assignments, tasks, classes, persons, immutableSlots, maxRetries, randomSeed, addLog, allowBeyond530, allowBefore900, disabledAssignmentIds, lockedAssignmentIds]);

    // Exporting only needs SOME timetable data to have been generated - it does not
    // require a perfect (allScheduled) run. A partial schedule still exports fine,
    // just with blank cells wherever a task didn't get placed.
    const hasScheduleData = Object.keys(timetables).length > 0;

    const handleExport = useCallback(() => {
        if (!hasScheduleData) {
            addLog('Cannot export - generate a schedule first', 'error');
            return;
        }

        addLog('Exporting timetables...');
        if (!allScheduled) {
            addLog(`⚠ Exporting a partial schedule - ${unassignedTasks.length} task(s) are unassigned and will show as blank cells`, 'warning');
        }
        exportTimetables(
            timetables,
            classes,
            persons,
            successfulAttempt,
            getAssignmentDetails,
            getSlotLabel,
            (classCount, personCount) => {
                addLog(`✓ Exported all timetables to a single .xlsx file (${classCount} class tabs, ${personCount} staff tabs)`);
            }
        );
    }, [hasScheduleData, allScheduled, successfulAttempt, timetables, classes, persons, unassignedTasks, getAssignmentDetails, addLog]);

    return {
        timetables,
        successfulAttempt,
        allScheduled,
        hasScheduleData,
        maxRetries,
        setMaxRetries,
        randomSeed,
        setRandomSeed,
        generateSchedule,
        handleExport,
        setTimetables,
        setSuccessfulAttempt,
        setAllScheduled,
        unassignedTasks,
        setUnassignedTasks
    };
};
