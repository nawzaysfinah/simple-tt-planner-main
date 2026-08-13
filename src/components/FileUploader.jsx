import React, { useState } from 'react';
import { Upload } from 'lucide-react';

/**
 * File uploader component for CSV files
 * @param {Object} props
 * @param {string} props.label - Display label
 * @param {string} props.type - File type identifier
 * @param {number} props.count - Number of loaded items
 * @param {Function} props.onFileUpload - File upload handler
 */
const FileUploader = ({ label, type, count, onFileUpload }) => {
    const [fileName, setFileName] = useState('');

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) setFileName(file.name);
        onFileUpload(e, type);
    };

    const handleLabelClick = async (e) => {
        if (window.showOpenFilePicker) {
            e.preventDefault();
            try {
                const [handle] = await window.showOpenFilePicker({
                    id: 'timetable-planner',
                    types: [{
                        description: 'CSV Files',
                        accept: { 'text/csv': ['.csv'] }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                if (file) {
                    setFileName(file.name);
                    onFileUpload({ target: { files: [file] } }, type);
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('File picker error:', err);
            }
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded p-4 hover:border-blue-400 transition">
            <label className="cursor-pointer flex flex-col items-center gap-2" onClick={handleLabelClick}>
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium">{label}</span>
                {fileName && (
                    <span
                        className="text-xs text-gray-500 max-w-full truncate"
                        title={fileName}
                    >
                        {fileName}
                    </span>
                )}
                {count > 0 && <span className="text-xs text-green-600">({count} loaded)</span>}
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    className="hidden"
                />
            </label>
        </div>
    );
};

export default FileUploader;
