import { useState, useCallback } from 'react';
import { parseCSV } from '../utils/csvParser';
import { extractTimetableFromFile } from '../utils/excelExtractor';
import { IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Sample data for testing
 */
const SAMPLE_DATA = {
    assignments: [
        { id: 1, Main: 'PersonA', Assist: 'PersonB', Task: 'TaskA-T1', Class: 'Class1' },
        { id: 2, Main: 'PersonA', Assist: 'PersonB', Task: 'TaskA-T2', Class: 'Class1' },
        { id: 3, Main: 'PersonA', Assist: 'PersonB', Task: 'TaskA-P1', Class: 'Class1' },
        { id: 4, Main: 'PersonA', Assist: 'PersonB', Task: 'TaskA-P2', Class: 'Class1' },
        { id: 5, Main: 'PersonB', Assist: 'PersonC', Task: 'TaskB-T1', Class: 'Class1' },
        { id: 6, Main: 'PersonB', Assist: 'PersonC', Task: 'TaskB-T2', Class: 'Class1' },
        { id: 7, Main: 'PersonB', Assist: 'PersonC', Task: 'TaskB-P1', Class: 'Class1' },
        { id: 8, Main: 'PersonB', Assist: 'PersonC', Task: 'TaskB-P2', Class: 'Class1' },
        { id: 9, Main: 'PersonD', Assist: 'PersonC', Task: 'TaskC-T1', Class: 'Class1' },
        { id: 10, Main: 'PersonD', Assist: 'PersonC', Task: 'TaskC-T2', Class: 'Class1' },
        { id: 11, Main: 'PersonD', Assist: 'PersonC', Task: 'TaskC-P1', Class: 'Class1' },
        { id: 12, Main: 'PersonD', Assist: 'PersonC', Task: 'TaskC-P2', Class: 'Class1' }
    ],
    persons: [
        { id: 1, Name: 'PersonA' },
        { id: 2, Name: 'PersonB' },
        { id: 3, Name: 'PersonC' },
        { id: 4, Name: 'PersonD' }
    ],
    classes: [
        { id: 1, Name: 'Class1' },
        { id: 2, Name: 'Class2' },
        { id: 3, Name: 'Class3' },
        { id: 4, Name: 'Class4' }
    ],
    tasks: [
        { id: 1, Name: 'TaskA-T1', Duration: 3 },
        { id: 2, Name: 'TaskA-T2', Duration: 3 },
        { id: 3, Name: 'TaskA-P1', Duration: 5 },
        { id: 4, Name: 'TaskA-P2', Duration: 5 },
        { id: 5, Name: 'TaskB-T1', Duration: 3 },
        { id: 6, Name: 'TaskB-T2', Duration: 3 },
        { id: 7, Name: 'TaskB-P1', Duration: 5 },
        { id: 8, Name: 'TaskB-P2', Duration: 5 },
        { id: 9, Name: 'TaskC-T1', Duration: 3 },
        { id: 10, Name: 'TaskC-T2', Duration: 3 },
        { id: 11, Name: 'TaskC-P1', Duration: 5 },
        { id: 12, Name: 'TaskC-P2', Duration: 5 }
    ]
};

/**
 * Custom hook for managing CSV data
 * @param {Function} addLog - Logging function
 * @returns {Object} CSV data state and handlers
 */
export const useCSVData = (addLog) => {
    const [assignments, setAssignments] = useState([]);
    const [persons, setPersons] = useState([]);
    const [classes, setClasses] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [immutableSlots, setImmutableSlots] = useState([]);

    const handleFileUpload = useCallback((e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const setterMap = {
            'assignments': setAssignments,
            'persons': setPersons,
            'classes': setClasses,
            'tasks': setTasks,
            'immutable': setImmutableSlots
        };

        const setter = setterMap[type];
        if (!setter) return;

        parseCSV(
            file,
            (data, filename) => {
                if (type === 'assignments' && data.length >= IMMUTABLE_SLOT_ID) {
                    alert(`The planner can only deal with less than ${IMMUTABLE_SLOT_ID} assignments`);
                    return;
                }
                setter(data);
                addLog(`Loaded ${data.length} records from ${filename}`);
            },
            (error, filename) => {
                addLog(`Error parsing ${filename}: ${error}`, 'error');
            }
        );
    }, [addLog]);

    /**
     * Upload the raw planning workbook (.xlsx) directly - runs the same
     * extraction extract_timetable.py used to do, in-browser, and populates
     * all 5 datasets at once instead of requiring 5 separate CSV uploads.
     */
    const handleExcelUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        extractTimetableFromFile(file)
            .then(({ tasks: extractedTasks, assignments: extractedAssignments, persons: extractedPersons, classes: extractedClasses, immutableSlots: extractedImmutables, warnings }) => {
                if (extractedAssignments.length >= IMMUTABLE_SLOT_ID) {
                    alert(`The planner can only deal with less than ${IMMUTABLE_SLOT_ID} assignments`);
                    return;
                }

                setTasks(extractedTasks);
                setAssignments(extractedAssignments);
                setPersons(extractedPersons);
                setClasses(extractedClasses);
                setImmutableSlots(extractedImmutables);

                addLog(
                    `Extracted from ${file.name}: ${extractedTasks.length} tasks, ${extractedAssignments.length} assignments, ` +
                    `${extractedPersons.length} persons, ${extractedClasses.length} classes, ${extractedImmutables.length} immutable slots`
                );
                warnings.forEach((w) => addLog(w, 'warning'));
            })
            .catch((err) => {
                addLog(`Error extracting ${file.name}: ${err.message}`, 'error');
            });
    }, [addLog]);

    const loadSampleData = useCallback(() => {
        setAssignments(SAMPLE_DATA.assignments);
        setPersons(SAMPLE_DATA.persons);
        setClasses(SAMPLE_DATA.classes);
        setTasks(SAMPLE_DATA.tasks);
        addLog('Loaded sample data for testing');
    }, [addLog]);

    return {
        assignments,
        persons,
        classes,
        tasks,
        immutableSlots,
        handleFileUpload,
        handleExcelUpload,
        loadSampleData,
        setAssignments,
        setPersons,
        setClasses,
        setTasks,
        setImmutableSlots
    };
};
