import * as XLSX from 'xlsx-js-style';

/**
 * Client-side port of extract_timetable.py: reads the same raw planning
 * workbook the Python script expects (a "Timetable Planning" sheet and an
 * "Immutables" sheet) and produces the same 5 datasets it used to write out
 * as tasks.csv / assignments.csv / persons.csv / classes.csv / immutables.csv -
 * so the app can consume the workbook directly instead of requiring a
 * separate script run plus five manual CSV uploads.
 *
 * Kept deliberately in lock-step with extract_timetable.py's column names,
 * row numbering, and ID scheme, so a workbook that used to produce a given
 * set of CSVs via the Python script produces the same records here.
 */

const SHEET_TIMETABLE = 'Timetable Planning';
const SHEET_IMMUTABLES = 'Immutables';

const COL_CLASS = 'Class Name';
const COL_ABBR = 'Abbreviation';
const COL_THY = 'THY';
const COL_PRA = 'PRA';
const COL_MAIN = 'Main Lecturer';
const COL_ASSIST = 'Assist Lecturer';

const IMMUTABLE_ID_START = 110;

const ABBR_STARTS_WITH_LETTER = /^[A-Za-z]/;

/** Strip whitespace and non-breaking spaces from a header cell, matching normalize_columns(). */
const NBSP_REGEX = new RegExp(String.fromCharCode(160), 'g');
const normalizeHeader = (h) => String(h ?? '').replace(NBSP_REGEX, '').trim();

/** Trim a cell to a plain string; blank/missing cells become ''. */
const cellToStr = (v) => (v === undefined || v === null ? '' : String(v).trim());

/** Split a "4,4,4"-style cell into ["4","4","4"], dropping blank tokens (e.g. a trailing comma). */
const parseSlots = (cellValue) => {
    const s = cellToStr(cellValue);
    if (!s) return [];
    return s.split(',').map((x) => x.trim()).filter(Boolean);
};

/**
 * Convert an Excel time-of-day cell to minutes since midnight. Handles the
 * three shapes a time cell can come through as via SheetJS: a real Date
 * (when the workbook read used cellDates), a raw serial-day fraction, or a
 * plain "HH:MM" / "HH:MM:SS" string.
 */
const excelTimeToMinutes = (value) => {
    if (value instanceof Date) {
        return value.getHours() * 60 + value.getMinutes();
    }
    if (typeof value === 'number') {
        const fractionOfDay = value % 1;
        return Math.round(fractionOfDay * 24 * 60);
    }
    const parts = String(value ?? '').trim().split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new Error(`Could not parse time value "${value}"`);
    }
    return hours * 60 + minutes;
};

const slotFromStart = (startValue) => Math.floor((excelTimeToMinutes(startValue) - 8 * 60) / 30);
const durationFromStartEnd = (startValue, endValue) =>
    Math.floor((excelTimeToMinutes(endValue) - excelTimeToMinutes(startValue)) / 30);

/**
 * Read a worksheet into an array of row objects keyed by normalized header
 * names, mirroring pandas' normalize_columns() + dtype=str read - built by
 * hand (rather than relying on SheetJS's own header inference) so header
 * normalization is applied consistently and raw cell values (Date/number/
 * string) survive for the time-parsing helpers above.
 */
const sheetToNormalizedRows = (worksheet) => {
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true });
    if (rows.length === 0) return { headers: [], rows: [] };

    const headers = rows[0].map(normalizeHeader);
    const dataRows = rows.slice(1).map((rowArr) => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = rowArr[i] !== undefined ? rowArr[i] : '';
        });
        return obj;
    });
    return { headers, rows: dataRows };
};

const assertColumnsPresent = (sheetName, headers, requiredColumns) => {
    const missing = requiredColumns.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
        throw new Error(
            `Sheet "${sheetName}" is missing column(s): ${missing.join(', ')}. Found columns: ${headers.join(', ') || '(none)'}`
        );
    }
};

/**
 * Extract the same 5 datasets extract_timetable.py wrote to CSV, directly
 * from the raw planning workbook.
 * @param {ArrayBuffer} arrayBuffer - The .xlsx file contents
 * @returns {{ tasks: Array, assignments: Array, persons: Array, classes: Array, immutableSlots: Array, warnings: Array<string> }}
 */
export const extractTimetableFromWorkbook = (arrayBuffer) => {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
    const warnings = [];

    if (!workbook.Sheets[SHEET_TIMETABLE]) {
        throw new Error(
            `Missing required sheet "${SHEET_TIMETABLE}". Found sheets: ${workbook.SheetNames.join(', ')}`
        );
    }
    if (!workbook.Sheets[SHEET_IMMUTABLES]) {
        throw new Error(
            `Missing required sheet "${SHEET_IMMUTABLES}". Found sheets: ${workbook.SheetNames.join(', ')}`
        );
    }

    // ── Timetable Planning sheet ──────────────────────────────────────────
    const { headers, rows } = sheetToNormalizedRows(workbook.Sheets[SHEET_TIMETABLE]);
    assertColumnsPresent(SHEET_TIMETABLE, headers, [COL_CLASS, COL_ABBR, COL_THY, COL_PRA, COL_MAIN, COL_ASSIST]);

    // Forward-fill Class Name across ALL rows first (merged-cell style), then
    // filter down to real module rows - same order of operations as the
    // Python script, since filtering first would break the fill.
    let lastClassName = '';
    const filledRows = rows.map((row) => {
        const raw = cellToStr(row[COL_CLASS]);
        if (raw) lastClassName = raw;
        return { ...row, [COL_CLASS]: lastClassName };
    });

    const moduleRows = filledRows.filter((row) => {
        const abbr = cellToStr(row[COL_ABBR]);
        return abbr && ABBR_STARTS_WITH_LETTER.test(abbr);
    });

    const rowsTasks = [];
    const rowsAssign = [];
    const seenPersons = [];
    const seenClasses = [];
    let runningNum = 1;

    moduleRows.forEach((row, rowIdx) => {
        const excelRow = rowIdx + 1; // sequential position among kept rows, matching the Python script's numbering
        const abbr = cellToStr(row[COL_ABBR]);
        const className = cellToStr(row[COL_CLASS]);
        const mainLec = cellToStr(row[COL_MAIN]);
        const assistLec = cellToStr(row[COL_ASSIST]);

        [mainLec, assistLec].forEach((name) => {
            if (name && !seenPersons.includes(name)) seenPersons.push(name);
        });
        if (className && !seenClasses.includes(className)) seenClasses.push(className);

        const thySlots = parseSlots(row[COL_THY]);
        const praSlots = parseSlots(row[COL_PRA]);
        let subIdx = 0;

        thySlots.forEach((slotVal, i) => {
            const tNum = i + 1;
            const letter = String.fromCharCode(97 + subIdx); // 'a', 'b', ...
            const idLabel = `t${excelRow}${letter}`;
            const slotName = `${abbr}-T${tNum}`;
            const duration = Number(slotVal);
            if (Number.isNaN(duration)) {
                warnings.push(`${SHEET_TIMETABLE} row for "${abbr}": could not parse THY duration "${slotVal}"`);
            }
            rowsTasks.push({ id: idLabel, Name: slotName, Duration: duration });
            rowsAssign.push({ id: runningNum, Main: mainLec, Assist: '', Task: slotName, Class: className });
            subIdx += 1;
            runningNum += 1;
        });

        praSlots.forEach((slotVal, i) => {
            const pNum = i + 1;
            const letter = String.fromCharCode(97 + subIdx);
            const idLabel = `t${excelRow}${letter}`;
            const slotName = `${abbr}-P${pNum}`;
            const duration = Number(slotVal);
            if (Number.isNaN(duration)) {
                warnings.push(`${SHEET_TIMETABLE} row for "${abbr}": could not parse PRA duration "${slotVal}"`);
            }
            rowsTasks.push({ id: idLabel, Name: slotName, Duration: duration });
            rowsAssign.push({ id: runningNum, Main: mainLec, Assist: assistLec, Task: slotName, Class: className });
            subIdx += 1;
            runningNum += 1;
        });
    });

    // ── Immutables sheet ────────────────────────────────────────────────
    const immSheet = sheetToNormalizedRows(workbook.Sheets[SHEET_IMMUTABLES]);
    assertColumnsPresent(SHEET_IMMUTABLES, immSheet.headers, ['Class', 'Day', 'Start', 'End', 'Task', 'Names', 'Venue']);

    const rowsImm = immSheet.rows.map((row, i) => {
        const immId = IMMUTABLE_ID_START + i;
        const className = cellToStr(row.Class);
        const day = cellToStr(row.Day);
        const task = cellToStr(row.Task);
        const names = cellToStr(row.Names);
        const venue = cellToStr(row.Venue);

        let slot = null;
        let duration = null;
        try {
            slot = slotFromStart(row.Start);
            duration = durationFromStartEnd(row.Start, row.End);
        } catch (err) {
            warnings.push(`${SHEET_IMMUTABLES} row ${i + 1} (${className || 'unknown class'}): ${err.message}`);
        }

        return { id: immId, Class: className, Day: day, Slot: slot, Duration: duration, Task: task, Names: names, Venue: venue };
    }).filter((row) => row.Class); // skip fully blank trailing rows

    const persons = seenPersons.map((name, i) => ({ id: `p${i + 1}`, Name: name }));
    const classes = seenClasses.map((name, i) => ({ id: `c${i + 1}`, Name: name }));

    return {
        tasks: rowsTasks,
        assignments: rowsAssign,
        persons,
        classes,
        immutableSlots: rowsImm,
        warnings
    };
};

/**
 * Read a File (from a file input) and run extractTimetableFromWorkbook on it.
 * @param {File} file
 * @returns {Promise<{tasks, assignments, persons, classes, immutableSlots, warnings}>}
 */
export const extractTimetableFromFile = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(extractTimetableFromWorkbook(e.target.result));
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
