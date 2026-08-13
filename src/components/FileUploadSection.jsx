import React from 'react';
import FileUploader from './FileUploader';

/**
 * File upload section with all CSV uploaders
 * @param {Object} props
 * @param {Array} props.assignments - Loaded assignments
 * @param {Array} props.persons - Loaded persons
 * @param {Array} props.classes - Loaded classes
 * @param {Array} props.tasks - Loaded tasks
 * @param {Array} props.immutableSlots - Loaded immutable slots
 * @param {Function} props.onFileUpload - File upload handler
 */
const FileUploadSection = ({
    assignments,
    persons,
    classes,
    tasks,
    immutableSlots,
    onFileUpload
}) => {
    const uploaders = [
        { label: 'Assignments', type: 'assignments', count: assignments.length },
        { label: 'Persons', type: 'persons', count: persons.length },
        { label: 'Classes', type: 'classes', count: classes.length },
        { label: 'Tasks', type: 'tasks', count: tasks.length },
        { label: 'Immutable Slots', type: 'immutable', count: immutableSlots.length }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload CSV Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        </div>
    );
};

export default FileUploadSection;
