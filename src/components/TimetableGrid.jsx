import React from 'react';
import { DAYS, SLOTS_PER_DAY, LUNCH_BREAK_ID } from '../constants';

/**
 * Timetable grid component
 * @param {Object} props
 * @param {Array} props.timetable - 2D array of assignment IDs
 * @param {string} props.selectedResource - Currently selected resource name
 * @param {boolean} props.isPersonView - Whether viewing a person's timetable
 * @param {Function} props.getAssignmentDetails - Function to get assignment details
 * @param {Function} props.getCellColor - Function to get cell color
 * @param {Function} props.getSlotLabel - Function to get slot label
 */
const TimetableGrid = ({
    timetable,
    selectedResource,
    isPersonView,
    getAssignmentDetails,
    getCellColor,
    getSlotLabel,
    mergeCells = false,
    onCellClick = () => { },
    selectedCell = null,
    highlightedSlots = [],
    isEditMode = false,
    onMoveAssignment = () => { },
    lockedAssignmentIds = new Set()
}) => {
    const personName = isPersonView ? selectedResource.replace('person-', '') : null;

    const handleDragStart = (e, day, slot, assignmentId) => {
        if (!isEditMode) return;
        
        let startSlot = slot;
        if (assignmentId === LUNCH_BREAK_ID) {
            while (startSlot > 0 && timetable[day][startSlot - 1] === LUNCH_BREAK_ID) {
                startSlot--;
            }
        }

        e.dataTransfer.setData('text/plain', JSON.stringify({ assignmentId, fromDay: day, fromSlot: startSlot }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, day, slot) => {
        if (!isEditMode) return;
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            onMoveAssignment(data.assignmentId, data.fromDay, data.fromSlot, day, slot);
        } catch (err) {
            console.error('Drop failed', err);
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs table-fixed">
                <thead>
                    <tr>
                        <th className="border border-gray-300 bg-gray-100 p-2 w-24">Day</th>
                        {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
                            <th key={slot} className="border border-gray-300 bg-gray-100 p-1 text-xs">
                                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="mx-auto h-16">
                                    {getSlotLabel(slot, true)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DAYS.map((day, dayIdx) => {
                        // Check if this day has any real assignments (excluding Lunch and Empty)
                        const hasContent = timetable[dayIdx].some(id => id !== 0 && id !== LUNCH_BREAK_ID);

                        return (
                            <tr key={day}>
                                <td className="border border-gray-300 bg-gray-50 font-medium text-center text-xs p-1 h-[40px]">
                                    {day}
                                </td>
                                {(() => {
                                    const cells = [];
                                    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
                                        const assignmentId = timetable[dayIdx][slot];
                                        let colSpan = 1;

                                        if (mergeCells) {
                                            // Calculate colspan for merged cells
                                            while (
                                                slot + colSpan < SLOTS_PER_DAY &&
                                                timetable[dayIdx][slot + colSpan] === assignmentId
                                            ) {
                                                colSpan++;
                                            }
                                        }

                                        const details = getAssignmentDetails(assignmentId, personName);
                                        const isLunch = details && details.isLunch;
                                        const shouldHide = isPersonView && isLunch;
                                        const isLocked = lockedAssignmentIds.has(assignmentId);
                                        const isDraggableCell = isEditMode && hasContent && !details?.isImmutable && !isLocked;

                                        cells.push(
                                            <td
                                                key={`${day}-${slot}`}
                                                colSpan={mergeCells ? colSpan : 1}
                                                className={`border border-gray-300 ${hasContent ? 'p-1' : 'p-0 px-1'} 
                                                    ${shouldHide ? 'bg-white' : getCellColor(assignmentId)} 
                                                    overflow-hidden
                                                    ${!mergeCells && !isPersonView && !isEditMode ? 'cursor-pointer hover:opacity-80' : ''}
                                                    ${isDraggableCell ? 'cursor-move hover:opacity-80' : ''}
                                                    ${isEditMode && isLunch ? 'cursor-pointer hover:opacity-80' : ''}
                                                    ${isLocked ? 'border-2 border-dashed !border-amber-500' : ''}
                                                    ${selectedCell && selectedCell.day === dayIdx && selectedCell.slot === slot ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}
                                                    ${highlightedSlots.some(s => s.day === dayIdx && s.slot === slot) ? '!bg-green-50 !ring-2 !ring-green-600 !ring-inset animate-pulse' : ''}
                                                `}
                                                title={details && !shouldHide ? (details.isImmutable ? `${details.Task}${details.Names ? `\nNames: ${details.Names}` : ''}${details.Venue ? `\nVenue: ${details.Venue}` : ''}` : !details.isLunch ? `${details.Task}\nClass: ${details.Class}\nMain: ${details.Main}\nAssist: ${details.Assist}` : details.Task) : ''}
                                                style={{ height: hasContent ? 'auto' : '2rem' }}
                                                onClick={() => !mergeCells && !isPersonView && (isEditMode || !isLunch) && onCellClick(dayIdx, slot, assignmentId)}
                                                draggable={isDraggableCell}
                                                onDragStart={(e) => handleDragStart(e, dayIdx, slot, assignmentId)}
                                                onDragOver={(e) => highlightedSlots.some(s => s.day === dayIdx && s.slot === slot) ? handleDragOver(e) : null}
                                                onDrop={(e) => highlightedSlots.some(s => s.day === dayIdx && s.slot === slot) ? handleDrop(e, dayIdx, slot) : null}
                                            >
                                                {details && !shouldHide && (hasContent || !details.isLunch) && (
                                                    <div className="text-center relative">
                                                        {isLocked && (
                                                            <span className="absolute -top-1 -right-1 text-[10px]" title="Locked">🔒</span>
                                                        )}
                                                        {isPersonView ? (
                                                            <>
                                                                <div className="font-semibold text-xs whitespace-nowrap overflow-hidden text-ellipsis">{details.Task}</div>
                                                                {!details.isImmutable && !details.isLunch && (
                                                                    <>
                                                                        <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">{details.Class}</div>
                                                                        <div className="text-xs font-bold text-blue-700">{details.Role}</div>
                                                                    </>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="font-semibold text-xs whitespace-nowrap overflow-hidden text-ellipsis">{details.Task}</div>
                                                                {!details.isImmutable && !details.isLunch && (
                                                                    <>
                                                                        <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">M: {details.Main}</div>
                                                                        <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">A: {details.Assist}</div>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        {details.isImmutable && details.Names && (
                                                            <div className="text-xs text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">{details.Names}</div>
                                                        )}
                                                        {details.isImmutable && details.Venue && (
                                                            <div className="text-xs text-gray-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{details.Venue}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );

                                        // Advance slot index if merged
                                        if (mergeCells && colSpan > 1) {
                                            slot += (colSpan - 1);
                                        }
                                    }
                                    return cells;
                                })()}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TimetableGrid;
