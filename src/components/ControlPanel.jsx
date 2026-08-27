import React from 'react';
import { Download } from 'lucide-react';

/**
 * Control panel with action buttons
 * @param {Object} props
 * @param {number} props.maxRetries - Maximum retry attempts
 * @param {Function} props.onMaxRetriesChange - Handler for retry count change
 * @param {Function} props.onGenerateSchedule - Handler for generate button
 * @param {Function} props.onLoadSampleData - Handler for sample data button
 * @param {Function} props.onExport - Handler for export button
 * @param {boolean} props.allScheduled - Whether all assignments are scheduled
 * @param {boolean} props.hasScheduleData - Whether a schedule (complete or partial) has been generated
 * @param {number|null} props.successfulAttempt - Successful attempt number
 */
const ControlPanel = ({
    maxRetries,
    onMaxRetriesChange,
    randomSeed,
    onRandomSeedChange,
    onGenerateSchedule,
    onLoadSampleData,
    onExport,
    onSaveState,
    onLoadState,
    allScheduled,
    hasScheduleData,
    successfulAttempt
}) => {
    const handleLoadStateClick = async (e) => {
        if (window.showOpenFilePicker) {
            e.preventDefault();
            try {
                const [handle] = await window.showOpenFilePicker({
                    id: 'timetable-planner',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                if (file) {
                    onLoadState({ target: { files: [file], value: '' } });
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('File picker error:', err);
            }
        }
    };

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Max Retries:</label>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxRetries}
                        onChange={(e) => onMaxRetriesChange(parseInt(e.target.value) || 5)}
                        className="border border-gray-300 rounded px-3 py-2 w-20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Random Seed:</label>
                    <input
                        type="text"
                        placeholder="Random"
                        value={randomSeed || ''}
                        onChange={(e) => onRandomSeedChange(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 w-24"
                    />
                </div>
                <span className="text-xs text-gray-500">Seed for deterministic shuffling (optional)</span>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onGenerateSchedule}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-medium"
                >
                    Generate Schedule
                </button>
                <button
                    onClick={onLoadSampleData}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-medium"
                >
                    Load Sample Data
                </button>
                <button
                    onClick={onExport}
                    disabled={!hasScheduleData}
                    title={hasScheduleData ? 'One file: a tab per class, a tab per staff member' : 'Generate a schedule first'}
                    className={`px-6 py-2 rounded transition font-medium flex items-center gap-2 ${hasScheduleData
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <Download className="w-4 h-4" />
                    Export All Timetables (XLSX)
                </button>

                {/* Save/Load State Buttons */}
                <div className="border-l pl-4 flex gap-4">
                    <button
                        onClick={onSaveState}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition font-medium flex items-center gap-2"
                        title="Save current state to file"
                    >
                        <Download className="w-4 h-4" />
                        Save State
                    </button>
                    <label 
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition font-medium flex items-center gap-2 cursor-pointer"
                        onClick={handleLoadStateClick}
                    >
                        <Download className="w-4 h-4 rotate-180" /> {/* Upload Icon */}
                        Load State
                        <input
                            type="file"
                            accept=".json"
                            onChange={onLoadState}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {allScheduled && successfulAttempt !== null && (
                <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800 text-sm">
                    ✓ All assignments successfully scheduled on attempt {successfulAttempt + 1}! Ready to export.
                </div>
            )}
            {hasScheduleData && !allScheduled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
                    ⚠ Not every assignment could be scheduled (see Unassigned Tasks below). You can still export -
                    unplaced tasks just show as blank cells.
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
