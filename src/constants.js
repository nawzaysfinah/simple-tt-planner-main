// Timetable configuration constants
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const SLOTS_PER_DAY = 20;
export const SLOT_DURATION = 30; // minutes
export const START_TIME = 8 * 60; // 08:00 in minutes from midnight

// Lunch break configuration
export const LUNCH_OPTIONS = [[8, 9], [9, 10], [10, 11]];
export const LUNCH_BREAK_ID = 101;

// Earliest slot classes may start at by default (slot 2 = 09:00). Sessions before
// 9am tend to have low attendance; the "Before 9:00AM" toggle overrides this to slot 0 (08:00).
export const DEFAULT_EARLIEST_START_SLOT = 2;

// Immutable slot ID threshold
export const IMMUTABLE_SLOT_ID = 100;

// Scheduling preference weights (soft preferences: used only to rank slots that
// are already valid, so they can never make a task unschedulable by themselves)
export const SAME_MODULE_SAME_DAY_PENALTY = 1000; // discourage a Main lecturer teaching the same module twice in one day
export const NEW_TEACHING_DAY_PENALTY = 20; // discourage opening a new teaching day for a Main lecturer when an existing day still has room
export const CLASS_GAP_PENALTY = 15; // discourage leaving a blank period between a class's sessions on a day that already has bookings
export const FRIDAY_PENALTY = 50; // discourage (but don't forbid) using Friday at all, per management's "ideally no Friday morning" request

// Friday afternoon is a hard rule, not a preference: no session may start, or run
// past, this slot on a Friday - management said "explicitly no classes" here, so
// this is used as a candidate filter, not a score, and can leave tasks unscheduled.
export const FRIDAY_AFTERNOON_START_SLOT = (13 * 60 - START_TIME) / SLOT_DURATION; // 13:00 -> slot 10
export const FRIDAY_DAY_INDEX = DAYS.indexOf('Friday');

// Modules that represent a lecturer being out of the building (e.g. IP = Internship
// Programme site visits) rather than an in-room class. What the timetable says for
// these doesn't matter much in practice, so they: (1) get scheduled last, after every
// other module has already claimed its slot, so they never crowd out real classes, and
// (2) may be split across multiple smaller blocks (see SPLIT_CHUNK_SLOTS) instead of
// needing one big contiguous block, since that's far easier to slot into leftover time.
export const LOW_PRIORITY_SPLITTABLE_MODULES = ['IP'];
export const SPLIT_CHUNK_SLOTS = 2; // 1 hour - the piece size a splittable task is broken into if it can't fit as one block

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
