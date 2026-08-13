import React from 'react';
import { DAYS, SLOTS_PER_DAY, IMMUTABLE_SLOT_ID } from '../constants';

/**
 * Unassigned Tasks grid — same structure as the main timetable.
 * Tasks are placed sequentially, filling row by row, each spanning its duration.
 */
const UnassignedTasks = ({
    unassignedTasks = [],       // array of assignment IDs
    assignments = [],           // all assignment records
    tasks = [],                 // all task records (for duration lookup)
    getAssignmentDetails,
    getCellColor,
    getSlotLabel,
    isEditMode = false,
    selectedUnassignedId = null,
    onSelectUnassigned = () => { },
    onDropToUnassigned = () => { },
}) => {
    if (unassignedTasks.length === 0) return null;

    // Build a grid (5 days × SLOTS_PER_DAY) filled with unassigned tasks sequentially
    const grid = Array.from({ length: DAYS.length }, () => Array(SLOTS_PER_DAY).fill(0));

    let dayIdx = 0;
    let slotIdx = 0;

    for (const assignmentId of unassignedTasks) {
        // Look up assignment → task → duration
        const assignment = assignments.find(a => (a.id || a.ID) === assignmentId);
        if (!assignment) continue;
        const taskName = assignment.Task || assignment.task;
        const task = tasks.find(t => (t.Name || t.name) === taskName);
        const duration = task ? (task.Duration || task.duration || 1) : 1;

        // If it won't fit in the remaining slots of current row, move to next row
        if (slotIdx + duration > SLOTS_PER_DAY) {
            dayIdx++;
            slotIdx = 0;
        }
        // If we've run out of rows, stop
        if (dayIdx >= DAYS.length) break;

        // Place the assignment
        for (let i = 0; i < duration; i++) {
            grid[dayIdx][slotIdx + i] = assignmentId;
        }
        slotIdx += duration;
    }

    // Determine how many rows are actually used
    const usedRows = grid.reduce((max, row, idx) => {
        return row.some(id => id !== 0) ? idx + 1 : max;
    }, 0);

    const handleDragOver = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.assignmentId && data.assignmentId > 0 && data.assignmentId < IMMUTABLE_SLOT_ID) {
                onDropToUnassigned(data.assignmentId, data.fromDay, data.fromSlot);
            }
        } catch (err) {
            console.error('Drop to unassigned failed', err);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Unassigned Tasks ({unassignedTasks.length})</h2>
            <div
                className="overflow-x-auto"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <table className="w-full border-collapse text-xs table-fixed">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 bg-gray-100 p-2 w-24">S/n</th>
                            {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
                                <th key={slot} className="border border-gray-300 bg-gray-100 p-2 text-xs font-semibold text-center">
                                    {slot + 1}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {grid.slice(0, Math.max(usedRows, 1)).map((row, rowIdx) => {
                            const hasContent = row.some(id => id !== 0);

                            return (
                                <tr key={rowIdx}>
                                    <td className="border border-gray-300 bg-gray-50 font-medium text-center text-xs p-1 h-[40px]">
                                        {String.fromCharCode(65 + rowIdx)}
                                    </td>
                                    {(() => {
                                        const cells = [];
                                        for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
                                            const assignmentId = row[slot];
                                            // Merge consecutive identical IDs
                                            let colSpan = 1;
                                            while (
                                                slot + colSpan < SLOTS_PER_DAY &&
                                                row[slot + colSpan] === assignmentId &&
                                                assignmentId !== 0
                                            ) {
                                                colSpan++;
                                            }

                                            const details = assignmentId > 0 ? getAssignmentDetails(assignmentId) : null;
                                            const isSelected = selectedUnassignedId === assignmentId && assignmentId > 0;

                                            cells.push(
                                                <td
                                                    key={`unassigned-${rowIdx}-${slot}`}
                                                    colSpan={colSpan}
                                                    className={`border border-gray-300 ${hasContent ? 'p-1' : 'p-0 px-1'}
                                                        ${assignmentId > 0 ? getCellColor(assignmentId) : ''}
                                                        overflow-hidden
                                                        ${isEditMode && assignmentId > 0 ? 'cursor-pointer hover:opacity-80' : ''}
                                                        ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}
                                                    `}
                                                    title={details ? `${details.Task}\nClass: ${details.Class}\nMain: ${details.Main}\nAssist: ${details.Assist}` : ''}
                                                    style={{ height: hasContent ? 'auto' : '2rem' }}
                                                    onClick={() => isEditMode && assignmentId > 0 && onSelectUnassigned(assignmentId)}
                                                >
                                                    {details && (
                                                        <div className="text-center">
                                                            <div className="font-semibold text-xs whitespace-nowrap overflow-hidden text-ellipsis">{details.Task}</div>
                                                            <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">M: {details.Main}</div>
                                                            <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">A: {details.Assist}</div>
                                                        </div>
                                                    )}
                                                </td>
                                            );

                                            if (colSpan > 1) {
                                                slot += (colSpan - 1);
                                            }
                                        }
                                        return cells;
                                    })()}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UnassignedTasks;
