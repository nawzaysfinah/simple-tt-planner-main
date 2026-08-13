import React, { useMemo } from 'react';

/**
 * Staff Workload table – shown below the timetable.
 *
 * @param {Array}  assignments  – full assignments list (id, Main, Assist, Task, …)
 * @param {Array}  persons      – full persons list  (Name, …)
 * @param {Array}  tasks        – full tasks list    (Name, Duration)
 */
const StaffWorkload = ({ assignments, persons, tasks }) => {
    // Build a lookup: taskName -> Duration
    const durationByTask = useMemo(() => {
        const map = {};
        tasks.forEach(t => {
            const name = t.Name || t.name;
            const dur = parseFloat(t.Duration || t.duration) || 0;
            map[name] = dur;
        });
        return map;
    }, [tasks]);

    // Build per-person workload rows
    const rows = useMemo(() => {
        return persons.map(person => {
            const name = person.Name || person.name;

            const mainTasks = assignments.filter(a => (a.Main || a.main) === name);
            const assistTasks = assignments.filter(a => (a.Assist || a.assist) === name);

            const mainTaskNames = mainTasks.map(a => a.Task || a.task);
            const assistTaskNames = assistTasks.map(a => a.Task || a.task);

            const totalSlots =
                [...mainTaskNames, ...assistTaskNames].reduce(
                    (sum, taskName) => sum + (durationByTask[taskName] ?? 0),
                    0
                );

            const totalHours = totalSlots / 2;

            return { name, mainTaskNames, assistTaskNames, totalHours };
        });
    }, [persons, assignments, durationByTask]);

    if (!assignments.length || !persons.length) return null;

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Staff Workload</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-700">
                            <th className="border border-gray-300 px-3 py-2 text-center w-12">S/n</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Name</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Main</th>
                            <th className="border border-gray-300 px-3 py-2 text-left">Assist</th>
                            <th className="border border-gray-300 px-3 py-2 text-center w-24">Total (hrs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr
                                key={row.name}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                                <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">
                                    {idx + 1}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 font-medium">
                                    {row.name}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-gray-700">
                                    {row.mainTaskNames.length
                                        ? row.mainTaskNames.join(', ')
                                        : <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-gray-700">
                                    {row.assistTaskNames.length
                                        ? row.assistTaskNames.join(', ')
                                        : <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                                    {row.totalHours % 1 === 0
                                        ? row.totalHours
                                        : row.totalHours.toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StaffWorkload;
