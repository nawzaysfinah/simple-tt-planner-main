import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Log viewer component
 * @param {Object} props
 * @param {Array} props.logs - Array of log entries
 */
const LogViewer = ({ logs }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Logs
            </h2>
            <div className="bg-gray-50 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                    <p className="text-gray-400">No logs yet. Upload files and generate schedule.</p>
                ) : (
                    logs.map((log, idx) => (
                        <div
                            key={idx}
                            className={`mb-1 ${log.type === 'error' ? 'text-red-600' : 'text-gray-700'}`}
                        >
                            <span className="text-gray-400">[{log.time}]</span> {log.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LogViewer;
