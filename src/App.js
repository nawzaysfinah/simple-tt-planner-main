import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

// Hooks
import { useLogger } from './hooks/useLogger';
import { useCSVData } from './hooks/useCSVData';
import { useScheduler } from './hooks/useScheduler';

// Components
import FileUploadSection from './components/FileUploadSection';
import AssignmentsGrid from './components/AssignmentsGrid';
import ControlPanel from './components/ControlPanel';
import TimetableViewer from './components/TimetableViewer';
import LogViewer from './components/LogViewer';
import StaffWorkload from './components/StaffWorkload';

// Utilities
import { getAssignmentDetails } from './services/assignmentHelper';
import { getCellColor } from './utils/colorUtils';
import { getSlotLabel } from './utils/timeUtils';

const App = () => {
  // Initialize logger
  const { logs, addLog } = useLogger();

  // Initialize CSV data management
  const csvData = useCSVData(addLog);
  const {
    assignments,
    persons,
    classes,
    tasks,
    immutableSlots,
    handleFileUpload,
    handleExcelUpload,
    loadSampleData,
    setAssignments,
    setPersons,
    setClasses,
    setTasks,
    setImmutableSlots
  } = csvData;

  // Track which assignments are enabled for scheduling (default: all enabled)
  const [enabledAssignmentIds, setEnabledAssignmentIds] = useState(new Set());
  const [allowBeyond530, setAllowBeyond530] = useState(false);
  const [allowBefore900, setAllowBefore900] = useState(false);
  const [lockedAssignmentIds, setLockedAssignmentIds] = useState(new Set());

  // When assignments load/change, enable all of them by default
  useEffect(() => {
    setEnabledAssignmentIds(new Set(assignments.map(a => a.id ?? a.ID)));
  }, [assignments]);

  const handleToggleAssignment = useCallback((id) => {
    setEnabledAssignmentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAllAssignments = useCallback((enable) => {
    if (enable) {
      setEnabledAssignmentIds(new Set(assignments.map(a => a.id ?? a.ID)));
    } else {
      setEnabledAssignmentIds(new Set());
    }
  }, [assignments]);

  const handleLockAssignment = useCallback((id) => {
    setLockedAssignmentIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleUnlockAssignment = useCallback((id) => {
    setLockedAssignmentIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleUnlockAll = useCallback(() => {
    setLockedAssignmentIds(new Set());
  }, []);

  // Only pass enabled assignments to the scheduler
  const enabledAssignments = useMemo(
    () => assignments.filter(a => enabledAssignmentIds.has(a.id ?? a.ID)),
    [assignments, enabledAssignmentIds]
  );

  // Keep track of disabled assignment IDs to inject them into Unassigned Tasks
  const disabledAssignmentIds = useMemo(
    () => assignments.filter(a => !enabledAssignmentIds.has(a.id ?? a.ID)).map(a => a.id ?? a.ID),
    [assignments, enabledAssignmentIds]
  );

  // Wrapper function for getAssignmentDetails to bind assignments, immutableSlots and classes
  const getDetails = useCallback((assignmentId, personView = null) => {
    return getAssignmentDetails(assignmentId, assignments, immutableSlots, classes, personView);
  }, [assignments, immutableSlots, classes]);

  // Initialize scheduler — use a csvData-like object with filtered assignments
  const filteredCsvData = useMemo(() => ({
    ...csvData,
    assignments: enabledAssignments
  }), [csvData, enabledAssignments]);

  // Ref to current timetables for useScheduler (avoids circular dependency)
  const timetablesRef = useRef({});

  const {
    timetables,
    successfulAttempt,
    allScheduled,
    hasScheduleData,
    maxRetries,
    setMaxRetries,
    randomSeed,
    setRandomSeed,
    generateSchedule,
    handleExport,
    setTimetables,
    setSuccessfulAttempt,
    setAllScheduled,
    unassignedTasks,
    setUnassignedTasks
  } = useScheduler(filteredCsvData, addLog, getDetails, allowBeyond530, allowBefore900, disabledAssignmentIds, lockedAssignmentIds, timetablesRef);

  // Keep ref synced with latest timetables
  useEffect(() => { timetablesRef.current = timetables; }, [timetables]);

  // Save State to JSON File
  const handleSaveState = async () => {
    const state = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        assignments,
        persons,
        classes,
        tasks,
        immutableSlots
      },
      scheduler: {
        timetables,
        successfulAttempt,
        allScheduled,
        maxRetries,
        randomSeed,
        unassignedTasks,
        lockedAssignmentIds: [...lockedAssignmentIds]
      }
    };

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    
    // Format filename: timetable-state-YYYYMMDD-HHMM.json
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    const filename = `timetable-state-${dateStr}-${timeStr}.json`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          id: 'timetable-planner',
          suggestedName: filename,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        addLog('State saved successfully', 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Save error:', err);
        return; // User cancelled or error, don't fallback to link
      }
    }

    // Fallback if File System Access API is not supported
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog('State saved successfully', 'success');
  };

  // Load State from JSON File
  const handleLoadState = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);

        // Restore Data
        if (json.data) {
          setAssignments(json.data.assignments || []);
          setPersons(json.data.persons || []);
          setClasses(json.data.classes || []);
          setTasks(json.data.tasks || []);
          setImmutableSlots(json.data.immutableSlots || []);
        }

        // Restore Scheduler State
        if (json.scheduler) {
          setTimetables(json.scheduler.timetables || null);
          setSuccessfulAttempt(json.scheduler.successfulAttempt); // can be null
          setAllScheduled(json.scheduler.allScheduled || false);
          setMaxRetries(json.scheduler.maxRetries || 5);
          setRandomSeed(json.scheduler.randomSeed || null);
          setUnassignedTasks(json.scheduler.unassignedTasks || []);
          setLockedAssignmentIds(new Set(json.scheduler.lockedAssignmentIds || []));
        }

        addLog(`State loaded from ${file.name}`, 'success');
      } catch (err) {
        console.error(err);
        addLog('Failed to load state: Invalid JSON format', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input value to allow reloading same file if needed
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Weekly Resource Scheduler
          </h1>
          <div className="flex flex-col items-end text-right">
            <span className="text-sm font-semibold text-gray-700">Syazwan Hanif</span>
            <span className="text-xs text-gray-500">Updated 25 Aug 2026</span>
          </div>
        </div>

        {/* File Upload Section */}
        <FileUploadSection
          assignments={assignments}
          persons={persons}
          classes={classes}
          tasks={tasks}
          immutableSlots={immutableSlots}
          onFileUpload={handleFileUpload}
          onExcelUpload={handleExcelUpload}
        />

        {/* Assignments Grid */}
        <AssignmentsGrid
          assignments={assignments}
          tasks={tasks}
          enabledIds={enabledAssignmentIds}
          onToggle={handleToggleAssignment}
          onToggleAll={handleToggleAllAssignments}
        />

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <ControlPanel
            maxRetries={maxRetries}
            onMaxRetriesChange={setMaxRetries}
            randomSeed={randomSeed}
            onRandomSeedChange={setRandomSeed}
            onGenerateSchedule={generateSchedule}
            onLoadSampleData={loadSampleData}
            onExport={handleExport}
            onSaveState={handleSaveState}
            onLoadState={handleLoadState}
            allScheduled={allScheduled}
            hasScheduleData={hasScheduleData}
            successfulAttempt={successfulAttempt}
          />
        </div>

        {/* Timetable Display */}
        <TimetableViewer
          timetables={timetables}
          classes={classes}
          persons={persons}
          assignments={assignments}
          tasks={tasks}
          getAssignmentDetails={getDetails}
          getCellColor={getCellColor}
          getSlotLabel={getSlotLabel}
          onUpdateTimetables={setTimetables}
          allowBeyond530={allowBeyond530}
          onAllowBeyond530Change={setAllowBeyond530}
          allowBefore900={allowBefore900}
          onAllowBefore900Change={setAllowBefore900}
          unassignedTasks={unassignedTasks}
          onUpdateUnassignedTasks={setUnassignedTasks}
          lockedAssignmentIds={lockedAssignmentIds}
          onLockAssignment={handleLockAssignment}
          onUnlockAssignment={handleUnlockAssignment}
          onUnlockAll={handleUnlockAll}
        />

        {/* Staff Workload Table */}
        <StaffWorkload
          assignments={assignments}
          persons={persons}
          tasks={tasks}
        />

        {/* Logs Section */}
        <LogViewer logs={logs} />
      </div>
    </div>
  );
};

export default App;