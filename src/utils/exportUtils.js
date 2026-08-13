import * as XLSX from 'xlsx-js-style';
import { SLOTS_PER_DAY, DAYS, CELL_COLORS, IMMUTABLE_SLOT_ID } from '../constants';

// Map Tailwind classes to Hex colors (without #)
const COLOR_MAP = {
    'bg-blue-200': 'BFDBFE',
    'bg-green-200': 'BBF7D0',
    'bg-purple-200': 'E9D5FF',
    'bg-pink-200': 'FBCFE8',
    'bg-indigo-200': 'C7D2FE',
    'bg-orange-200': 'FED7AA',
    'bg-teal-200': '99F6E4',
    'bg-cyan-200': 'A5F3FC',
    'bg-white': 'FFFFFF',
    'bg-gray-200': 'E5E7EB', // Lunch
    'bg-gray-300': 'D1D5DB'  // Immutable
};

// Common Styles
const BASE_STYLE = {
    alignment: {
        vertical: 'center',
        horizontal: 'center',
        wrapText: true
    },
    border: {
        top: { style: 'thin', color: { rgb: "000000" } },
        bottom: { style: 'thin', color: { rgb: "000000" } },
        left: { style: 'thin', color: { rgb: "000000" } },
        right: { style: 'thin', color: { rgb: "000000" } }
    }
};

const HEADER_STYLE = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BASE_STYLE.border,
    fill: { fgColor: { rgb: "E5E7EB" } } // Light gray header
};

/**
 * Get Hex color for a given Tailwind class or assignment ID
 */
const getCellHexColor = (assignmentId, details) => {
    if (details?.isLunch) return COLOR_MAP['bg-gray-200'];
    if (details?.isImmutable) return COLOR_MAP['bg-gray-300'];

    // Use the logic from TimetableGrid/constants implicit mapping
    // assignments 1-8 map to CELL_COLORS[0-7]
    // modulo arithmetic for rotation
    if (assignmentId > 0 && assignmentId < IMMUTABLE_SLOT_ID) {
        const colorClass = CELL_COLORS[(assignmentId - 1) % CELL_COLORS.length];
        return COLOR_MAP[colorClass] || 'FFFFFF';
    }

    return 'FFFFFF';
};

/**
 * Format the content and style for a single cell
 */
const formatCell = (assignmentId, resourceName, isPersonView, getAssignmentDetails) => {
    // Empty Cell
    if (assignmentId === 0) {
        return { v: '', s: BASE_STYLE };
    }

    const details = getAssignmentDetails(assignmentId, isPersonView ? resourceName : null);
    if (!details) return { v: '', s: BASE_STYLE };

    let text = '';
    if (details.isLunch) text = 'LUNCH BREAK';
    else if (details.isImmutable) {
        text = details.Task; // Use Task name
        if (details.Names) text += `\r\n${details.Names}`;
        if (details.Venue) text += `\r\n${details.Venue}`;
    }
    else if (isPersonView) {
        // Task, Role, Class
        text = `${details.Task}\r\n${details.Role}\r\n${details.Class}`;
    } else {
        // Task, Main, Assist
        text = `${details.Task}\r\nM:${details.Main}\r\nA:${details.Assist}`;
    }

    const hexColor = getCellHexColor(assignmentId, details);

    const style = {
        ...BASE_STYLE,
        fill: { fgColor: { rgb: hexColor } }
    };

    return { v: text, s: style };
};

/**
 * Generate data array for a single sheet (Transposed: Rows=Days, Cols=Slots)
 */
const generateSheetData = (resourceName, timetable, isPersonView, getAssignmentDetails, getSlotLabel) => {
    if (!timetable) return [];

    // Header Row: ['Day', '08:30', '09:00', ...]
    const headerRow = [
        { v: 'Day', s: HEADER_STYLE }
    ];
    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
        headerRow.push({
            v: getSlotLabel(slot, true),
            s: HEADER_STYLE
        });
    }

    const data = [headerRow];

    // Data Rows: One per Day
    DAYS.forEach((dayName, dayIdx) => {
        const row = [
            { v: dayName, s: HEADER_STYLE } // Row header
        ];
        for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
            const assignmentId = timetable[dayIdx][slot];
            row.push(formatCell(assignmentId, resourceName, isPersonView, getAssignmentDetails));
        }
        data.push(row);
    });

    return data;
};

/**
 * Calculate merge ranges for consecutive identical cells
 * @param {Array<Array<Object>>} data - The sheet data (objects)
 * @returns {Array<Object>} Array of merge objects for xlsx
 */
const calculateMerges = (data) => {
    const merges = [];

    // Skip header row (index 0)
    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        let startCol = 1; // Skip Day column (index 0)

        for (let c = 2; c < row.length; c++) {
            const current = row[c]?.v;
            const previous = row[c - 1]?.v;

            if (current !== previous) {
                // If distinct, check if we need to close a merge
                if (c - 1 > startCol) {
                    merges.push({ s: { r, c: startCol }, e: { r, c: c - 1 } });
                }
                startCol = c;
            }
        }

        // Check for any final merge at end of row
        if (row.length - 1 > startCol) {
            merges.push({ s: { r, c: startCol }, e: { r, c: row.length - 1 } });
        }
    }

    return merges;
};

/**
 * Export all timetables to a single Excel file
 */
export const exportTimetables = async (timetables, classes, persons, successfulAttempt, getAssignmentDetails, getSlotLabel, onComplete) => {
    const wb = XLSX.utils.book_new();

    // Add Class Sheets
    classes.forEach(classItem => {
        const className = classItem.Name || classItem.name;
        const wsData = generateSheetData(className, timetables[className], false, getAssignmentDetails, getSlotLabel);
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Apply Merges
        const merges = calculateMerges(wsData);
        if (merges.length > 0) {
            ws['!merges'] = merges;
        }

        // Adjust column widths
        const wscols = [{ wch: 15 }]; // Day column
        for (let i = 0; i < SLOTS_PER_DAY; i++) wscols.push({ wch: 20 }); // Slot columns
        ws['!cols'] = wscols;

        // Apply Row Heights (Height for 3 lines of text + padding)
        const rowHeights = [{ hpt: 30 }]; // Header row
        for (let i = 0; i < DAYS.length; i++) rowHeights.push({ hpt: 60 });
        ws['!rows'] = rowHeights;

        const safeName = className.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
        XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    // Add Person Sheets
    persons.forEach(person => {
        const personName = person.Name || person.name;
        const resourceKey = `person-${personName}`;
        const wsData = generateSheetData(personName, timetables[resourceKey], true, getAssignmentDetails, getSlotLabel);
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        const merges = calculateMerges(wsData);
        if (merges.length > 0) {
            ws['!merges'] = merges;
        }

        const rowHeights = [{ hpt: 30 }];
        for (let i = 0; i < DAYS.length; i++) rowHeights.push({ hpt: 60 });
        ws['!rows'] = rowHeights;

        const wscols = [{ wch: 15 }];
        for (let i = 0; i < SLOTS_PER_DAY; i++) wscols.push({ wch: 20 });
        ws['!cols'] = wscols;

        const safeName = personName.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
        try {
            XLSX.utils.book_append_sheet(wb, ws, safeName);
        } catch (e) {
            XLSX.utils.book_append_sheet(wb, ws, (safeName + '_P').substring(0, 31));
        }
    });

    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');

    const filename = `tt-${dateStr}-${timeStr}.xlsx`;

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                id: 'timetable-planner',
                suggestedName: filename,
                types: [{
                    description: 'Excel Files',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                }]
            });
            const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            if (onComplete) onComplete(classes.length, persons.length);
            return;
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Export error:', err);
            return;
        }
    }

    // Fallback
    XLSX.writeFile(wb, filename);

    if (onComplete) {
        onComplete(classes.length, persons.length);
    }
};
