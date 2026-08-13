import React, { useState, useEffect } from 'react';
import TimetableGrid from './TimetableGrid';
import UnassignedTasks from './UnassignedTasks';
import { DAYS, SLOTS_PER_DAY, LUNCH_BREAK_ID, LUNCH_OPTIONS, IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Timetable viewer with resource selector
 * @param {Object} props
 * @param {Object} props.timetables - All timetables
 * @param {Array} props.classes - List of classes
 * @param {Array} props.persons - List of persons
 * @param {Function} props.getAssignmentDetails - Function to get assignment details
 * @param {Function} props.getCellColor - Function to get cell color
 * @param {Function} props.getSlotLabel - Function to get slot label
 */
const TimetableViewer = ({
    timetables,
    classes,
    persons,
    assignments,
    tasks,
    getAssignmentDetails,
    getCellColor,
    getSlotLabel,
    onUpdateTimetables,
    allowBeyond530,
    onAllowBeyond530Change,
    allowBefore830,
    onAllowBefore830Change,
    unassignedTasks = [],
    onUpdateUnassignedTasks,
    lockedAssignmentIds = new Set(),
    onLockAssignment,
    onUnlockAssignment,
    onUnlockAll
}) => {
    const [selectedResource, setSelectedResource] = useState('');
    const [mergeCells, setMergeCells] = useState(true);
    const [selectedCell, setSelectedCell] = useState(null);
    const [highlightedSlots, setHighlightedSlots] = useState([]);
    const [searchResultStatus, setSearchResultStatus] = useState('idle');

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editTimetables, setEditTimetables] = useState(null);
    const [editUnassigned, setEditUnassigned] = useState(null);
    const [history, setHistory] = useState([]); // Stack of previous states for Undo
    const [pendingUnassignedId, setPendingUnassignedId] = useState(null); // For assign-from-unassigned flow
    const [selectedLunchCell, setSelectedLunchCell] = useState(null); // For lunch shift flow

    // Set initial selected resource when timetables are loaded
    useEffect(() => {
        if (classes.length > 0 && !selectedResource) {
            setSelectedResource(classes[0].Name || classes[0].name);
        }
    }, [classes, selectedResource]);

    // Clear selection when resource or merge mode changes
    // Clear selection when resource or merge mode changes
    useEffect(() => {
        setSelectedCell(null);
        setHighlightedSlots([]);
        setSearchResultStatus('idle');
        setSelectedLunchCell(null);
    }, [selectedResource, mergeCells, isEditMode]);

    // Handle Edit Mode Toggle
    const toggleEditMode = () => {
        if (!isEditMode) {
            // Enter Edit Mode
            setEditTimetables(JSON.parse(JSON.stringify(timetables)));
            setEditUnassigned([...unassignedTasks]);
            setHistory([]);
            setIsEditMode(true);
            setMergeCells(false); // Force unmerge
            setPendingUnassignedId(null);
            setSelectedLunchCell(null);
        } else {
            setIsEditMode(false);
            setEditTimetables(null);
            setEditUnassigned(null);
            setPendingUnassignedId(null);
            setSelectedLunchCell(null);
        }
    };

    const handleCommit = () => {
        if (editTimetables) {
            onUpdateTimetables(editTimetables);
            if (onUpdateUnassignedTasks) {
                onUpdateUnassignedTasks(editUnassigned || []);
            }
            setHistory([]);
        }
    };

    const handleUndo = () => {
        if (history.length > 0) {
            const previousState = history[history.length - 1];
            setEditTimetables(previousState.timetables);
            setEditUnassigned(previousState.unassigned);
            setHistory(history.slice(0, -1));
            setPendingUnassignedId(null);
            setSelectedLunchCell(null);
        }
    };

    const pushHistory = () => {
        setHistory([...history, { timetables: editTimetables, unassigned: editUnassigned || [] }]);
    };

    const handleMoveAssignment = (assignmentId, fromDay, fromSlot, toDay, toSlot) => {
        if (!editTimetables) return;

        if (assignmentId === LUNCH_BREAK_ID) {
            if (fromDay !== toDay) return;
            const targetOption = LUNCH_OPTIONS.find(opt => opt[0] === toSlot);
            if (targetOption) {
                handleMoveLunch(toDay, targetOption);
            }
            return;
        }

        const details = getAssignmentDetails(assignmentId);
        if (!details) return;

        // Prevent moving locked assignments
        if (lockedAssignmentIds.has(assignmentId)) return;

        const { Main, Assist } = details;
        const mainResource = `person-${Main}`;
        const assistResource = Assist ? `person-${Assist}` : null;

        // Create deep copy for new state
        const newTimetables = JSON.parse(JSON.stringify(editTimetables));

        // Helper to move in one table
        const moveInTable = (tableName) => {
            if (newTimetables[tableName]) {
                // Remove from old pos
                newTimetables[tableName][fromDay][fromSlot] = 0;
                // Add to new pos
                newTimetables[tableName][toDay][toSlot] = assignmentId;
            }
        };

        // Move in all 3 affected tables
        moveInTable(selectedResource); // Current class
        moveInTable(mainResource);
        if (assistResource) moveInTable(assistResource);

        // Push to history
        pushHistory();
        // Update state
        setEditTimetables(newTimetables);

        setSelectedCell(null);
        setHighlightedSlots([]);
    };

    // Move LUNCH to a new position on the same day
    const handleMoveLunch = (dayIdx, targetSlotOption) => {
        if (!editTimetables) return;

        // Find the current lunch slots on this day by scanning the selected class timetable
        const classTimetable = editTimetables[selectedResource];
        if (!classTimetable) return;

        const currentLunchSlots = [];
        for (let s = 0; s < SLOTS_PER_DAY; s++) {
            if (classTimetable[dayIdx][s] === LUNCH_BREAK_ID) {
                currentLunchSlots.push(s);
            }
        }

        const newLunchSlots = targetSlotOption; // e.g. [8, 9]

        // Create deep copy
        const newTimetables = JSON.parse(JSON.stringify(editTimetables));

        // Move lunch in ONLY the selected resource timetable
        const table = newTimetables[selectedResource];
        if (table) {
            // Clear old lunch slots
            for (const s of currentLunchSlots) {
                if (table[dayIdx][s] === LUNCH_BREAK_ID) {
                    table[dayIdx][s] = 0;
                }
            }
            // Set new lunch slots
            for (const s of newLunchSlots) {
                table[dayIdx][s] = LUNCH_BREAK_ID;
            }
        }

        pushHistory();
        setEditTimetables(newTimetables);
        setSelectedCell(null);
        setHighlightedSlots([]);
        setSelectedLunchCell(null);
    };

    // Unassign: remove a task from the timetable and add it to unassigned
    const handleUnassign = () => {
        if (!selectedCell || !editTimetables) return;
        const assignmentId = selectedCell.assignmentId;
        if (!assignmentId || assignmentId <= 0 || assignmentId >= IMMUTABLE_SLOT_ID) return;

        // Prevent unassigning locked assignments
        if (lockedAssignmentIds.has(assignmentId)) return;

        const details = getAssignmentDetails(assignmentId);
        if (!details) return;

        const { Main, Assist, Class: className } = details;
        const newTimetables = JSON.parse(JSON.stringify(editTimetables));

        // Remove from all relevant timetables (class and person)
        const tablesToClear = [className, `person-${Main}`];
        if (Assist) tablesToClear.push(`person-${Assist}`);
        for (const tableName of tablesToClear) {
            if (newTimetables[tableName]) {
                for (let d = 0; d < DAYS.length; d++) {
                    for (let s = 0; s < SLOTS_PER_DAY; s++) {
                        if (newTimetables[tableName][d][s] === assignmentId) {
                            newTimetables[tableName][d][s] = 0;
                        }
                    }
                }
            }
        }

        pushHistory();
        setEditTimetables(newTimetables);
        setEditUnassigned([...(editUnassigned || []), assignmentId]);
        setSelectedCell(null);
        setHighlightedSlots([]);
    };

    // Drop from timetable onto the unassigned grid
    const handleDropToUnassigned = (assignmentId, fromDay, fromSlot) => {
        if (!editTimetables) return;
        // Prevent dropping locked assignments to unassigned
        if (lockedAssignmentIds.has(assignmentId)) return;
        const details = getAssignmentDetails(assignmentId);
        if (!details) return;

        const { Main, Assist, Class: className } = details;
        const newTimetables = JSON.parse(JSON.stringify(editTimetables));

        const tablesToClear = [className, `person-${Main}`];
        if (Assist) tablesToClear.push(`person-${Assist}`);
        for (const tableName of tablesToClear) {
            if (newTimetables[tableName]) {
                for (let d = 0; d < DAYS.length; d++) {
                    for (let s = 0; s < SLOTS_PER_DAY; s++) {
                        if (newTimetables[tableName][d][s] === assignmentId) {
                            newTimetables[tableName][d][s] = 0;
                        }
                    }
                }
            }
        }

        pushHistory();
        setEditTimetables(newTimetables);
        setEditUnassigned([...(editUnassigned || []), assignmentId]);
        setSelectedCell(null);
        setHighlightedSlots([]);
        setPendingUnassignedId(null);
    };

    // Select an unassigned task: highlight valid slots in the timetable
    const handleSelectUnassigned = (assignmentId) => {
        if (!editTimetables) return;
        // Toggle selection
        if (pendingUnassignedId === assignmentId) {
            setPendingUnassignedId(null);
            setHighlightedSlots([]);
            setSelectedCell(null);
            return;
        }

        setPendingUnassignedId(assignmentId);
        setSelectedCell(null);

        const details = getAssignmentDetails(assignmentId);
        if (!details) { setHighlightedSlots([]); return; }

        const { Main, Assist, Class: className } = details;

        // Look up task duration
        const assignment = assignments.find(a => (a.id || a.ID) === assignmentId);
        const taskName = assignment ? (assignment.Task || assignment.task) : null;
        const task = taskName ? tasks.find(t => (t.Name || t.name) === taskName) : null;
        const duration = task ? (task.Duration || task.duration || 1) : 1;

        const classTimetable = editTimetables[className];
        const mainTimetable = editTimetables[`person-${Main}`];
        const assistTimetable = Assist ? editTimetables[`person-${Assist}`] : null;

        if (!classTimetable || !mainTimetable || (Assist && !assistTimetable)) {
            setHighlightedSlots([]);
            return;
        }

        const newHighlighted = [];
        for (let d = 0; d < DAYS.length; d++) {
            for (let s = 0; s <= SLOTS_PER_DAY - duration; s++) {
                let allFree = true;
                for (let i = 0; i < duration; i++) {
                    const cSlot = classTimetable[d][s + i];
                    const mSlot = mainTimetable[d][s + i];
                    const aSlot = assistTimetable ? assistTimetable[d][s + i] : 0;
                    
                    if (cSlot !== 0 ||
                        (mSlot !== 0 && mSlot !== LUNCH_BREAK_ID) ||
                        (aSlot !== 0 && aSlot !== LUNCH_BREAK_ID)) {
                        allFree = false;
                        break;
                    }
                }
                if (allFree) {
                    newHighlighted.push({ day: d, slot: s });
                }
            }
        }
        setHighlightedSlots(newHighlighted);
        if (newHighlighted.length === 0) {
            setSearchResultStatus('none');
        } else {
            setSearchResultStatus('found');
        }
    };

    // Place a pending unassigned task onto the timetable
    const handlePlaceUnassigned = (dayIdx, slotIdx) => {
        if (!pendingUnassignedId || !editTimetables) return;

        const assignmentId = pendingUnassignedId;
        const details = getAssignmentDetails(assignmentId);
        if (!details) return;

        const { Main, Assist, Class: className } = details;

        // Look up duration
        const assignment = assignments.find(a => (a.id || a.ID) === assignmentId);
        const taskName = assignment ? (assignment.Task || assignment.task) : null;
        const task = taskName ? tasks.find(t => (t.Name || t.name) === taskName) : null;
        const duration = task ? (task.Duration || task.duration || 1) : 1;

        const newTimetables = JSON.parse(JSON.stringify(editTimetables));

        // Place in class and person timetables
        const tablesToFill = [className, `person-${Main}`];
        if (Assist) tablesToFill.push(`person-${Assist}`);
        for (const tableName of tablesToFill) {
            if (newTimetables[tableName]) {
                for (let i = 0; i < duration; i++) {
                    newTimetables[tableName][dayIdx][slotIdx + i] = assignmentId;
                }
            }
        }

        // Remove from unassigned
        const newUnassigned = (editUnassigned || []).filter(id => id !== assignmentId);

        pushHistory();
        setEditTimetables(newTimetables);
        setEditUnassigned(newUnassigned);
        setPendingUnassignedId(null);
        setSelectedCell(null);
        setHighlightedSlots([]);
    };

    const currentTimetables = isEditMode ? editTimetables : timetables;
    const isPersonView = selectedResource?.startsWith('person-');
    const currentUnassigned = (isEditMode ? (editUnassigned || []) : unassignedTasks).filter(assignmentId => {
        const details = getAssignmentDetails(assignmentId);
        if (!details) return false;
        if (isPersonView) return false;
        return details.Class === selectedResource;
    });

    const handleCellClick = (dayIdx, slotIdx, assignmentId) => {
        if (isPersonView) return;

        // If we have a pending unassigned task and click a highlighted slot, place it
        if (pendingUnassignedId && highlightedSlots.some(s => s.day === dayIdx && s.slot === slotIdx)) {
            handlePlaceUnassigned(dayIdx, slotIdx);
            return;
        }

        // If we have a selected lunch cell and click a highlighted slot, move lunch
        if (selectedLunchCell && highlightedSlots.some(s => s.day === dayIdx && s.slot === slotIdx)) {
            // Find which LUNCH_OPTIONS pair starts at this slot
            const targetOption = LUNCH_OPTIONS.find(opt => opt[0] === slotIdx);
            if (targetOption) {
                handleMoveLunch(dayIdx, targetOption);
            }
            return;
        }

        // Clear pending unassigned selection when clicking a timetable cell
        setPendingUnassignedId(null);
        setSelectedLunchCell(null);

        setSelectedCell({ day: dayIdx, slot: slotIdx, assignmentId });

        // If it's a LUNCH cell in edit mode, find valid alternate lunch positions
        if (isEditMode && assignmentId === LUNCH_BREAK_ID) {
            setSelectedLunchCell({ day: dayIdx, slot: slotIdx });

            // Find current lunch slots on this day
            const classTimetable = currentTimetables[selectedResource];
            if (!classTimetable) { setHighlightedSlots([]); return; }

            const currentLunchSlots = [];
            for (let s = 0; s < SLOTS_PER_DAY; s++) {
                if (classTimetable[dayIdx][s] === LUNCH_BREAK_ID) {
                    currentLunchSlots.push(s);
                }
            }

            // Check which LUNCH_OPTIONS are valid (slots must be free or already lunch in ALL timetables)
            const newHighlightedSlots = [];
            for (const option of LUNCH_OPTIONS) {
                // Skip if this is the current lunch position
                if (option.every(s => currentLunchSlots.includes(s))) continue;

                // Check this timetable ONLY: the target slots must be free (0) or lunch (LUNCH_BREAK_ID)
                let allValid = true;
                const table = currentTimetables[selectedResource];
                if (table) {
                    for (const s of option) {
                        const val = table[dayIdx][s];
                        if (val !== 0 && val !== LUNCH_BREAK_ID) {
                            allValid = false;
                            break;
                        }
                    }
                }

                if (allValid) {
                    // Highlight the first slot of this option as the clickable target
                    newHighlightedSlots.push({ day: dayIdx, slot: option[0] });
                }
            }

            if (newHighlightedSlots.length === 0) {
                setSearchResultStatus('none');
            } else {
                setSearchResultStatus('found');
            }
            setHighlightedSlots(newHighlightedSlots);
            return;
        }

        // If it's a valid assignment (not empty, not lunch, not immutable/break)
        if (assignmentId > 0 && assignmentId < IMMUTABLE_SLOT_ID) {
            // If locked, allow selection (for lock/unlock button) but don't show move targets
            if (lockedAssignmentIds.has(assignmentId)) {
                setHighlightedSlots([]);
                setSearchResultStatus('idle');
                return;
            }

            const details = getAssignmentDetails(assignmentId);
            if (!details) {
                setHighlightedSlots([]);
                return;
            }

            const { Main, Assist } = details;
            const mainResource = `person-${Main}`;
            const assistResource = Assist ? `person-${Assist}` : null;

            console.log('Selection:', { details, mainResource, assistResource });

            const classTimetable = currentTimetables[selectedResource];
            const mainTimetable = currentTimetables[mainResource];
            const assistTimetable = assistResource ? currentTimetables[assistResource] : null;

            if (!classTimetable || !mainTimetable || (assistResource && !assistTimetable)) {
                console.warn('Missing timetable for one of the parties:', { selectedResource, mainResource, assistResource });
                setHighlightedSlots([]);
                return;
            }

            const newHighlightedSlots = [];

            // Find slots that are empty (0) for all three parties
            for (let d = 0; d < DAYS.length; d++) {
                for (let s = 0; s < SLOTS_PER_DAY; s++) {
                    const classSlot = classTimetable[d][s];
                    const mainSlot = mainTimetable[d][s];
                    const assistSlot = assistTimetable ? assistTimetable[d][s] : 0;

                    if (classSlot === 0 && 
                       (mainSlot === 0 || mainSlot === LUNCH_BREAK_ID) && 
                       (assistSlot === 0 || assistSlot === LUNCH_BREAK_ID)) {
                        newHighlightedSlots.push({ day: d, slot: s });
                    }
                }
            }
            if (newHighlightedSlots.length === 0) {
                setSearchResultStatus('none');
            } else {
                setSearchResultStatus('found');
            }
            setHighlightedSlots(newHighlightedSlots);
        } else {
            setHighlightedSlots([]);
            if (assignmentId !== 0) {
                setSearchResultStatus('idle');
            }
        }
    };

    if (Object.keys(timetables).length === 0) {
        return null;
    }


    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Timetable</h2>

                    {/* Edit/View Toggle */}
                    <div className="bg-gray-200 rounded p-1 flex items-center">
                        <button
                            className={`px-3 py-1 text-sm rounded ${!isEditMode ? 'bg-white shadow text-gray-800' : 'text-gray-600'}`}
                            onClick={() => isEditMode && toggleEditMode()}
                            disabled={!isEditMode}
                        >
                            View
                        </button>
                        <button
                            className={`px-3 py-1 text-sm rounded ${isEditMode ? 'bg-blue-600 shadow text-white' : 'text-gray-600'}`}
                            onClick={() => !isEditMode && toggleEditMode()}
                            disabled={isEditMode}
                        >
                            Edit
                        </button>
                    </div>

                    {/* Undo / Commit / Unassign Buttons */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 ml-4">
                            <button
                                onClick={handleUndo}
                                disabled={history.length === 0}
                                className={`px-3 py-1 text-sm rounded border ${history.length === 0 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Undo
                            </button>
                            <button
                                onClick={handleCommit}
                                disabled={history.length === 0}
                                className={`px-3 py-1 text-sm rounded font-medium ${history.length === 0 ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
                            >
                                Commit
                            </button>
                            <button
                                onClick={handleUnassign}
                                disabled={!selectedCell || !(selectedCell.assignmentId > 0 && selectedCell.assignmentId < IMMUTABLE_SLOT_ID)}
                                className={`px-3 py-1 text-sm rounded border font-medium ${!selectedCell || !(selectedCell.assignmentId > 0 && selectedCell.assignmentId < IMMUTABLE_SLOT_ID)
                                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                                    : 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                                    }`}
                            >
                                Unassign
                            </button>
                        </div>
                    )}

                    {/* Lock / Unlock / Unlock All Buttons */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 ml-4">
                            {selectedCell && selectedCell.assignmentId > 0 && selectedCell.assignmentId < IMMUTABLE_SLOT_ID && !lockedAssignmentIds.has(selectedCell.assignmentId) && (
                                <button
                                    onClick={() => onLockAssignment(selectedCell.assignmentId)}
                                    className="px-3 py-1 text-sm rounded border font-medium bg-amber-500 text-white hover:bg-amber-600 border-amber-500"
                                >
                                    🔒 Lock
                                </button>
                            )}
                            {selectedCell && selectedCell.assignmentId > 0 && selectedCell.assignmentId < IMMUTABLE_SLOT_ID && lockedAssignmentIds.has(selectedCell.assignmentId) && (
                                <button
                                    onClick={() => onUnlockAssignment(selectedCell.assignmentId)}
                                    className="px-3 py-1 text-sm rounded border font-medium bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
                                >
                                    Unlock
                                </button>
                            )}
                            <button
                                onClick={onUnlockAll}
                                disabled={lockedAssignmentIds.size === 0}
                                className={`px-3 py-1 text-sm rounded border font-medium ${lockedAssignmentIds.size === 0
                                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                                    : 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600'
                                    }`}
                            >
                                Unlock All
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 ml-4">
                        <input
                            type="checkbox"
                            id="allowBefore830"
                            checked={allowBefore830}
                            onChange={(e) => onAllowBefore830Change(e.target.checked)}
                            className="rounded border-gray-300 transform scale-125 cursor-pointer"
                        />
                        <label htmlFor="allowBefore830" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                            Before 8:30AM
                        </label>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <input
                            type="checkbox"
                            id="allowBeyond530"
                            checked={allowBeyond530}
                            onChange={(e) => onAllowBeyond530Change(e.target.checked)}
                            className="rounded border-gray-300 transform scale-125 cursor-pointer"
                        />
                        <label htmlFor="allowBeyond530" className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap">
                            Beyond 5:30PM
                        </label>
                    </div>
                </div>

                {!isEditMode ? (
                    <div className="flex items-center gap-4"> {/* Added a wrapper div for select and checkbox */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="mergeCells"
                                checked={mergeCells}
                                onChange={(e) => setMergeCells(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="mergeCells" className="text-sm font-medium text-gray-700">Merge Cells</label>
                        </div>

                        <select
                            value={selectedResource || ''}
                            onChange={(e) => setSelectedResource(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            <optgroup label="Classes">
                                {classes.map(classItem => (
                                    <option key={classItem.Name || classItem.name} value={classItem.Name || classItem.name}>
                                        {classItem.Name || classItem.name}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="Persons">
                                {persons.map(person => (
                                    <option key={`person-${person.Name || person.name}`} value={`person-${person.Name || person.name}`}>
                                        {person.Name || person.name}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                ) : (
                    <div className="flex items-center px-3 py-2 bg-gray-100 rounded border border-gray-200">
                        <span className="font-medium text-gray-700">
                            Editing: {selectedResource.replace(/^person-/, '')}
                        </span>
                    </div>
                )}
            </div>

            {selectedResource && currentTimetables && currentTimetables[selectedResource] && (
                <TimetableGrid
                    timetable={currentTimetables[selectedResource]}
                    selectedResource={selectedResource}
                    isPersonView={isPersonView}
                    getAssignmentDetails={getAssignmentDetails}
                    getCellColor={getCellColor}
                    getSlotLabel={getSlotLabel}

                    mergeCells={mergeCells}
                    onCellClick={handleCellClick}
                    selectedCell={selectedCell}
                    highlightedSlots={highlightedSlots}
                    isEditMode={isEditMode}
                    onMoveAssignment={handleMoveAssignment}
                    lockedAssignmentIds={lockedAssignmentIds}
                />
            )}
            {searchResultStatus === 'none' && (
                <div className="mt-2 text-red-600 font-semibold text-sm">
                    No available empty slots found for Class, Main, and Assist.
                </div>
            )}

            {/* Unassigned Tasks Grid */}
            {(currentUnassigned.length > 0) && (
                <UnassignedTasks
                    unassignedTasks={currentUnassigned}
                    assignments={assignments}
                    tasks={tasks}
                    getAssignmentDetails={getAssignmentDetails}
                    getCellColor={getCellColor}
                    getSlotLabel={getSlotLabel}
                    isEditMode={isEditMode}
                    selectedUnassignedId={pendingUnassignedId}
                    onSelectUnassigned={handleSelectUnassigned}
                    onDropToUnassigned={handleDropToUnassigned}
                />
            )}
        </div>
    );
};

export default TimetableViewer;
