import React, { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';

/**
 * Uploader for the raw planning workbook (.xlsx). Runs extraction in-browser
 * and populates all 5 datasets at once, instead of requiring the Python
 * script to be run separately and each of its 5 CSV outputs uploaded by hand.
 * @param {Object} props
 * @param {Function} props.onExcelUpload - File upload handler
 * @param {Object} props.counts - { tasks, assignments, persons, classes, immutableSlots }
 */
const ExcelUploader = ({ onExcelUpload, counts }) => {
    const [fileName, setFileName] = useState('');
    const hasData = counts.tasks > 0 || counts.assignments > 0;

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) setFileName(file.name);
        onExcelUpload(e);
    };

    const handleLabelClick = async (e) => {
        if (window.showOpenFilePicker) {
            e.preventDefault();
            try {
                const [handle] = await window.showOpenFilePicker({
                    id: 'timetable-planner-xlsx',
                    types: [{
                        description: 'Excel Files',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                if (file) {
                    setFileName(file.name);
                    onExcelUpload({ target: { files: [file] } });
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('File picker error:', err);
            }
        }
    };

    return (
        <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded p-6 hover:border-blue-500 transition">
            <label className="cursor-pointer flex flex-col items-center gap-2 text-center" onClick={handleLabelClick}>
                <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                <span className="text-base font-semibold text-gray-800">Upload Planning Workbook (.xlsx)</span>
                <span className="text-xs text-gray-500">
                    Reads the "Timetable Planning" and "Immutables" sheets directly - no separate script run needed
                </span>
                {fileName && (
                    <span className="text-xs text-gray-500 max-w-full truncate" title={fileName}>
                        {fileName}
                    </span>
                )}
                {hasData && (
                    <span className="text-xs text-green-600">
                        ({counts.tasks} tasks, {counts.assignments} assignments, {counts.persons} persons, {counts.classes} classes, {counts.immutableSlots} immutable slots loaded)
                    </span>
                )}
                <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleChange}
                    className="hidden"
                />
            </label>
        </div>
    );
};

export default ExcelUploader;
