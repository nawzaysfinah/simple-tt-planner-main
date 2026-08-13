import Papa from 'papaparse';

/**
 * Parse CSV file with consistent configuration
 * @param {File} file - CSV file to parse
 * @param {Function} onComplete - Callback with parsed data
 * @param {Function} onError - Callback with error message
 */
const HEADER_MAPPINGS = {
    'class': 'Class',
    'main': 'Main',
    'assist': 'Assist',
    'task': 'Task',
    'id': 'id',
    'day': 'Day',
    'duration': 'Duration',
    'slot': 'Slot'
};

export const parseCSV = (file, onComplete, onError) => {
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
            const trimmed = header.trim();
            const lower = trimmed.toLowerCase();
            return HEADER_MAPPINGS[lower] || trimmed;
        },
        complete: (results) => {
            console.log(`Parsed ${file.name}:`, results.data);
            onComplete(results.data, file.name);
        },
        error: (error) => {
            console.error(`Error parsing ${file.name}:`, error);
            onError(error.message, file.name);
        }
    });
};
