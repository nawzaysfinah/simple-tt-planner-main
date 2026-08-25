import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import FileUploader from './FileUploader';
import ExcelUploader from './ExcelUploader';

/**
 * File upload section: primary path is a single planning-workbook (.xlsx)
 * upload; the original per-dataset CSV uploaders remain available under
 * "Advanced" for manual overrides or when only some CSVs need replacing.
 * @param {Object} props
 * @param {Array} props.assignments - Loaded assignments
 * @param {Array} props.persons - Loaded persons
 * @param {Array} props.classes - Loaded classes
 * @param {Array} props.tasks - Loaded tasks
 * @param {Array} props.immutableSlots - Loaded immutable slots
 * @param {Function} props.onFileUpload - CSV file upload handler
 * @param {Function} props.onExcelUpload - Workbook file upload handler
 */
const FileUploadSection = ({
    assignments,
    persons,
    classes,
    tasks,
    immutableSlots,
    onFileUpload,
    onExcelUpload
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const uploaders = [
        { label: 'Assignments', type: 'assignments', count: assignments.length },
        { label: 'Persons', type: 'persons', count: persons.length },
        { label: 'Classes', type: 'classes', count: classes.length },
        { label: 'Tasks', type: 'tasks', count: tasks.length },
        { label: 'Immutable Slots', type: 'immutable', count: immutableSlots.length }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Load Data</h2>

            <ExcelUploader
                onExcelUpload={onExcelUpload}
                counts={{
                    tasks: tasks.length,
                    assignments: assignments.length,
                    persons: persons.length,
                    classes: classes.length,
                    immutableSlots: immutableSlots.length
                }}
            />

            <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="mt-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Advanced: upload individual CSVs instead
            </button>

            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                    {uploaders.map(({ label, type, count }) => (
                        <FileUploader
                            key={type}
                            label={label}
                            type={type}
                            count={count}
                            onFileUpload={onFileUpload}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploadSection;
