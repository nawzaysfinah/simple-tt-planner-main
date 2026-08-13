import React, { useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';

/**
 * Displays all loaded assignments as a grid with enable/disable checkboxes
 * @param {Object} props
 * @param {Array} props.assignments - Loaded assignments
 * @param {Array} props.tasks - Loaded tasks (for duration lookup)
 * @param {Set} props.enabledIds - Set of enabled assignment IDs
 * @param {Function} props.onToggle - Called with (id) to toggle one assignment
 * @param {Function} props.onToggleAll - Called with (boolean) to enable/disable all
 */
const AssignmentsGrid = ({ assignments, tasks, enabledIds, onToggle, onToggleAll }) => {
    if (!assignments || assignments.length === 0) return null;

    const allEnabled = assignments.every(a => enabledIds.has(a.id ?? a.ID));
    const enabledCount = assignments.filter(a => enabledIds.has(a.id ?? a.ID)).length;

    const getTaskDuration = (taskName) => {
        if (!tasks) return null;
        const task = tasks.find(t => (t.Name || t.name) === taskName);
        return task ? (task.Duration || task.duration) : null;
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                    Assignments
                    <span className="ml-2 text-sm font-normal text-gray-500">
                        ({enabledCount}/{assignments.length} included)
                    </span>
                </h2>
                <button
                    onClick={() => onToggleAll(!allEnabled)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                    {allEnabled
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square className="w-4 h-4" />}
                    {allEnabled ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {assignments.map(assignment => {
                    const id = assignment.id ?? assignment.ID;
                    const enabled = enabledIds.has(id);
                    const taskName = assignment.Task || assignment.task;
                    const className = assignment.Class || assignment.class;
                    const mainPerson = assignment.Main || assignment.main;
                    const assistPerson = assignment.Assist || assignment.assist;
                    const duration = getTaskDuration(taskName);

                    return (
                        <button
                            key={id}
                            onClick={() => onToggle(id)}
                            className={`text-left rounded-md border-2 px-2 py-1.5 transition-all cursor-pointer select-none
                                ${enabled
                                    ? 'border-blue-400 bg-blue-50 hover:bg-blue-100'
                                    : 'border-gray-200 bg-gray-50 opacity-55 hover:opacity-75 hover:border-gray-300'
                                }`}
                        >
                            {/* Row 1: ID + checkbox */}
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-bold ${enabled ? 'text-blue-700' : 'text-gray-400'}`}>
                                    #{id}
                                </span>
                                <span className={enabled ? 'text-blue-500' : 'text-gray-300'}>
                                    {enabled
                                        ? <CheckSquare className="w-3.5 h-3.5" />
                                        : <Square className="w-3.5 h-3.5" />}
                                </span>
                            </div>
                            {/* Row 2: task · class · slots — space-between */}
                            <div className={`flex items-baseline justify-between gap-1 text-xs ${enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                                <span className="font-semibold truncate">{taskName}</span>
                                <span className={`shrink-0 ${enabled ? 'text-gray-400' : 'text-gray-300'}`}>{className}</span>
                                {duration != null && (
                                    <span className={`shrink-0 ${enabled ? 'text-blue-500' : 'text-gray-300'}`}>
                                        {duration}s
                                    </span>
                                )}
                            </div>
                            {/* Row 3: persons */}
                            <div className={`text-xs mt-0.5 flex gap-x-1.5 truncate ${enabled ? 'text-gray-500' : 'text-gray-300'}`}>
                                <span title="Main">👤 {mainPerson}</span>
                                {assistPerson && assistPerson !== mainPerson && (
                                    <span title="Assist">🤝 {assistPerson}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AssignmentsGrid;
