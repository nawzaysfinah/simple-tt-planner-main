// Timetable configuration constants
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const SLOTS_PER_DAY = 20;
export const SLOT_DURATION = 30; // minutes
export const START_TIME = 8 * 60; // 08:00 in minutes from midnight

// Lunch break configuration
export const LUNCH_OPTIONS = [[8, 9], [9, 10], [10, 11]];
export const LUNCH_BREAK_ID = 101;

// Immutable slot ID threshold
export const IMMUTABLE_SLOT_ID = 100;

// Color mappings for timetable cells
export const CELL_COLORS = [
    'bg-blue-200',
    'bg-green-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-indigo-200',
    'bg-orange-200',
    'bg-teal-200',
    'bg-cyan-200'
];
