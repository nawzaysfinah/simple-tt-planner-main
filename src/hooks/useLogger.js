import { useState, useCallback } from 'react';

/**
 * Custom hook for managing application logs
 * @returns {Object} { logs, addLog }
 */
export const useLogger = () => {
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((message, type = 'info') => {
        console.log(`[${type}]`, message);
        setLogs(prev => [...prev, {
            message,
            type,
            time: new Date().toLocaleTimeString()
        }]);
    }, []);

    return { logs, addLog };
};
