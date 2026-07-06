import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Store, Calendar, PlusCircle, X, User, Clock, FileText, Edit, Copy, Trash2, AlertTriangle, Layers, Save, ArrowLeft, ChevronDown, ChevronRight, Folder, Download, Upload, Sheet, RotateCcw } from 'lucide-react';
import { APP_VERSION, calcRegisterGuide, BENCHMARK_TASKS, toLocalDateString } from '../lib/utils';

/**
 * 客数・販売金額一括入力モーダル
 */
const MetricsBulkInputModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [metricsData, setMetricsData] = useState({});
    const inputRefs = useRef({});
    const saveButtonRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const fullDayData = {};
            for (let i = 0; i < 24; i++) {
                fullDayData[i] = {
                    customers: initialData[i]?.customers ?? '',
                    sales: initialData[i]?.sales ?? ''
                };
            }
            setMetricsData(fullDayData);
            setTimeout(() => inputRefs.current['customers-0']?.focus(), 100);
        }
    }, [initialData, isOpen]);

    const handleInputChange = (hour, field, value) => {
        const parsedValue = value === '' ? '' : parseInt(value.replace(/,/g, ''), 10);
         if (value !== '' && isNaN(parsedValue)) return;

        setMetricsData(prev => ({
            ...prev,
            [hour]: {
                ...prev[hour],
                [field]: parsedValue
            }
        }));
    };

    const handleSaveClick = () => {
        const cleanedData = {};
        Object.entries(metricsData).forEach(([hour, values]) => {
            const customers = values.customers === '' ? null : Number(values.customers);
            const sales = values.sales === '' ? null : Number(values.sales);

            if (customers !== null || sales !== null) {
                cleanedData[hour] = {};
                if (customers !== null) cleanedData[hour].customers = customers;
                if (sales !== null) cleanedData[hour].sales = sales;
            }
        });
        onSave(cleanedData);
    };

    const handleKeyDown = (e, hour, field) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        if (field === 'customers') {
            if (hour < 23) {
                inputRefs.current[`customers-${hour + 1}`]?.focus();
            } else {
                inputRefs.current['sales-0']?.focus();
            }
        } else if (field === 'sales') {
            if (hour < 23) {
                inputRefs.current[`sales-${hour + 1}`]?.focus();
            } else {
                saveButtonRef.current?.focus();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-cyan-400">客数・売上 一括入力</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-white">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="p-2 text-left">時間</th>
                                <th className="p-2 text-right">客数 (人)</th>
                                <th className="p-2 text-right">販売金額 (円)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                <tr key={hour} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-2 font-semibold">{`${String(hour).padStart(2, '0')}:00`}</td>
                                    <td>
                                        <input
                                            ref={el => inputRefs.current[`customers-${hour}`] = el}
                                            type="text"
                                            inputMode="numeric"
                                            className="bg-gray-900 text-white w-full p-1 rounded-md text-right focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                            value={metricsData[hour]?.customers?.toLocaleString() ?? ''}
                                            onChange={e => handleInputChange(hour, 'customers', e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, hour, 'customers')}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            ref={el => inputRefs.current[`sales-${hour}`] = el}
                                            type="text"
                                            inputMode="numeric"
                                            className="bg-gray-900 text-white w-full p-1 rounded-md text-right focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                            value={metricsData[hour]?.sales?.toLocaleString() ?? ''}
                                            onChange={e => handleInputChange(hour, 'sales', e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, hour, 'sales')}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">キャンセル</button>
                    <button ref={saveButtonRef} onClick={handleSaveClick} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg">保存</button>
                </div>
            </div>
        </div>
    );
};


/**
 * タイムテーブル画面コンポーネント
 */
export const TimetableScreen = ({ 
    db, currentUser, assignments, setAssignments, templates, setTemplates, 
    hourlyMetrics, setHourlyMetrics,
    onBack, masterData, onSync, isSyncing, 
    selectedDate, setSelectedDate, onImportRequest,
    lanes, setLanes,
    markAssignmentDirty, markMetricsDirty, markTemplatesDirty
}) => {
    const [viewMode, setViewMode] = useState('operational');
    const [selectedPatternId, setSelectedPatternId] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
    const [parsedCsvData, setParsedCsvData] = useState(null);
    const [now, setNow] = useState(new Date());
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 15 * 60 * 1000);
        return () => clearInterval(timer);
    }, []);
    
    useEffect(() => {
        const tasksForDate = assignments[selectedDate]?.filter(a => a.storeId === currentUser.storeId) || [];
        
        let targetLaneCount = 2;

        if (tasksForDate.length > 0) {
            const maxLaneNumInData = tasksForDate.reduce((max, task) => {
                if (task.laneId) {
                    const laneNum = parseInt(task.laneId.replace('lane', ''), 10);
                    return !isNaN(laneNum) && laneNum > max ? laneNum : max;
                }
                return max;
            }, 0);
            
            targetLaneCount = Math.max(2, maxLaneNumInData);
        }

        if (lanes.length !== targetLaneCount) {
            const newLanes = Array.from({ length: targetLaneCount }, (_, i) => ({
                id: `lane${i + 1}`,
                name: `${i + 1} レジ`
            }));
            setLanes(newLanes);
        }
    }, [selectedDate, assignments, currentUser.storeId]);
    
    const currentStoreTemplates = useMemo(() => templates || {}, [templates]);
    
    const currentAssignments = useMemo(() => {
        if (viewMode === 'template') {
            return currentStoreTemplates[selectedPatternId]?.assignments || [];
        }
        return assignments[selectedDate]?.filter(a => a.storeId === currentUser.storeId) || [];
    }, [viewMode, assignments, templates, selectedDate, currentUser.storeId, selectedPatternId]);
    
    const currentMetrics = useMemo(() => {
        if (viewMode !== 'operational') return {};
        return hourlyMetrics[selectedDate]?.[currentUser.storeId] || {};
    }, [hourlyMetrics, selectedDate, currentUser.storeId, viewMode]);

    // 直近1週間（選択日の前日〜7日前）の時間帯別平均客数・平均売上
    const weeklyAverages = useMemo(() => {
        const result = {};
        const base = new Date(selectedDate + 'T00:00:00');
        for (let hour = 0; hour < 24; hour++) {
            let custSum = 0, custCount = 0, salesSum = 0, salesCount = 0;
            for (let i = 1; i <= 7; i++) {
                const d = new Date(base);
                d.setDate(base.getDate() - i);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                const hourData = hourlyMetrics[dateStr]?.[currentUser.storeId]?.[String(hour)];
                if (hourData) {
                    if (typeof hourData.customers === 'number') { custSum += hourData.customers; custCount++; }
                    if (typeof hourData.sales === 'number') { salesSum += hourData.sales; salesCount++; }
                }
            }
            result[hour] = {
                customers: custCount > 0 ? Math.round(custSum / custCount) : null,
                sales: salesCount > 0 ? Math.round(salesSum / salesCount) : null
            };
        }
        return result;
    }, [selectedDate, hourlyMetrics, currentUser.storeId]);

    // 定点観測作業の直近1ヶ月（前日〜30日前）の平均作業時間（自店・全店）
    const benchmarkAverages = useMemo(() => {
        const stats = {};
        BENCHMARK_TASKS.forEach(name => {
            stats[name] = { storeSum: 0, storeCount: 0, allSum: 0, allCount: 0 };
        });
        const base = new Date(selectedDate + 'T00:00:00');
        for (let i = 1; i <= 30; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() - i);
            const dateStr = toLocalDateString(d);
            const tasksOnDate = assignments[dateStr];
            if (!Array.isArray(tasksOnDate)) continue;
            tasksOnDate.forEach(task => {
                if (!stats[task.taskName]) return;
                const duration = parseInt(task.duration, 10);
                if (isNaN(duration) || duration <= 0) return;
                stats[task.taskName].allSum += duration;
                stats[task.taskName].allCount++;
                if (task.storeId === currentUser.storeId) {
                    stats[task.taskName].storeSum += duration;
                    stats[task.taskName].storeCount++;
                }
            });
        }
        const result = {};
        Object.entries(stats).forEach(([name, s]) => {
            result[name] = {
                store: s.storeCount > 0 ? Math.round(s.storeSum / s.storeCount) : null,
                all: s.allCount > 0 ? Math.round(s.allSum / s.allCount) : null
            };
        });
        return result;
    }, [selectedDate, assignments, currentUser.storeId]);

    const overdueTaskCount = useMemo(() => {
        if (viewMode !== 'operational') return 0;
        
        const todayStr = toLocalDateString();
        if (selectedDate > todayStr) return 0;

        return currentAssignments.reduce((count, task) => {
            const taskHour = parseInt(task.hour, 10);
            if (isNaN(taskHour)) return count;

            const isPast = selectedDate < todayStr || (selectedDate === todayStr && taskHour < now.getHours());
            
            if (isPast && (!task.worker || !task.duration)) {
                return count + 1;
            }
            return count;
        }, 0);
    }, [currentAssignments, selectedDate, now, viewMode]);


    useEffect(() => {
        const patternIds = Object.keys(currentStoreTemplates);
        if (!selectedPatternId && patternIds.length > 0) {
            setSelectedPatternId(patternIds[0]);
        } else if (patternIds.length > 0 && !patternIds.includes(selectedPatternId)) {
            setSelectedPatternId(patternIds[0]);
        } else if (patternIds.length === 0) {
            setSelectedPatternId(null);
        }
    }, [currentStoreTemplates, selectedPatternId]);

    const updateCurrentData = (newDataSet) => {
        if (viewMode === 'template') {
            if (!selectedPatternId) return;
            const updatedTemplates = {
                ...currentStoreTemplates,
                [selectedPatternId]: { ...currentStoreTemplates[selectedPatternId], assignments: newDataSet }
            };
            setTemplates(updatedTemplates);
            markTemplatesDirty();
        } else {
            setAssignments(prev => {
                const otherStoresAssignments = prev[selectedDate]?.filter(a => a.storeId !== currentUser.storeId) || [];
                return {
                    ...prev,
                    [selectedDate]: [...otherStoresAssignments, ...newDataSet]
                };
            });
            markAssignmentDirty(selectedDate);
        }
    };
    
    const handleDataChange = (assignmentId, field, value) => {
        const newDataSet = currentAssignments.map(a => a.id === assignmentId ? { ...a, [field]: value } : a );
        updateCurrentData(newDataSet);
    };

    const handleResetTaskData = (assignmentId) => {
         const newDataSet = currentAssignments.map(a =>
            a.id === assignmentId ? { ...a, worker: '', duration: '' } : a
        );
        updateCurrentData(newDataSet);
    };
    
    const handleMetricsBulkSave = (newData) => {
        setHourlyMetrics(prev => ({
            ...prev,
            [selectedDate]: {
                ...prev[selectedDate],
                [currentUser.storeId]: newData
            }
        }));
        markMetricsDirty(selectedDate);
        setIsMetricsModalOpen(false);
    };

    const handleDeleteTask = (assignmentIdToDelete) => {
        const newAssignments = currentAssignments.filter(a => a.id !== assignmentIdToDelete);
        updateCurrentData(newAssignments);
    };

    const handleApplyTemplate = (patternId) => {
        const template = templates?.[patternId];
        if (!template) return;

        const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();

        const newDailySchedule = (template.assignments || [])
            .map(taskInTemplate => {
                const workItem = masterData.workItems.find(item => item.id === taskInTemplate.taskId);
                if (!workItem) return null;
                
                const taskApplicableDays = workItem.applicableDays;
                if (Array.isArray(taskApplicableDays) && taskApplicableDays.length > 0 && !taskApplicableDays.includes(dayOfWeek)) {
                    return null;
                }
                return { ...taskInTemplate, id: crypto.randomUUID(), storeId: currentUser.storeId, isFromTemplate: true };
            })
            .filter(Boolean);

        updateCurrentData(newDailySchedule);
        setModalState({ isOpen: false, type: null });
    };

    const handleCreatePatternSubmit = (patternName) => {
        const newPatternId = crypto.randomUUID();
        const newTemplates = {
            ...currentStoreTemplates,
            [newPatternId]: { name: patternName, assignments: [] }
        };
        setTemplates(newTemplates);
        markTemplatesDirty();
        setSelectedPatternId(newPatternId);
        setModalState({ isOpen: false, type: null });
    };
    
    const handleCopyPatternSubmit = (newPatternName) => {
        if (!selectedPatternId) return;
        const sourcePattern = currentStoreTemplates[selectedPatternId];
        const newPatternId = crypto.randomUUID();
        const copiedAssignments = sourcePattern.assignments.map(a => ({...a, id: crypto.randomUUID()}));
        const newTemplates = {
            ...currentStoreTemplates,
            [newPatternId]: { name: newPatternName, assignments: copiedAssignments }
        };
        setTemplates(newTemplates);
        markTemplatesDirty();
        setSelectedPatternId(newPatternId);
        setModalState({ isOpen: false, type: null });
    };

    const handleDeletePatternSubmit = () => {
        if (!selectedPatternId) return;
        const newStoreTemplates = { ...currentStoreTemplates };
        delete newStoreTemplates[selectedPatternId];
        setTemplates(newStoreTemplates);
        markTemplatesDirty();
        const remainingIds = Object.keys(newStoreTemplates);
        setSelectedPatternId(remainingIds.length > 0 ? remainingIds[0] : null);
        setModalState({ isOpen: false, type: null });
    };
    
    const handleSaveAndProceed = async () => {
        await onSync(false, true);
        const currentDate = new Date(selectedDate + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() + 1);
        const nextDate = toLocalDateString(currentDate);
        setSelectedDate(nextDate);
    };
    
    const handleExportTemplateCSV = () => {
        if (!selectedPatternId || !currentStoreTemplates[selectedPatternId]) {
            alert("エクスポートするテンプレートを選択してください。");
            return;
        }

        const template = currentStoreTemplates[selectedPatternId];
        const assignmentsToExport = template.assignments;
        const templateName = template.name;
        const storeName = masterData.stores.find(s => s.id === currentUser.storeId)?.name || '不明な店舗';
        
        if (assignmentsToExport.length === 0) {
            alert("テンプレートにエクスポートするタスクがありません。");
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}`;
        const saveDate = `${year}-${month}-${day}`;

        const headers = ['storeName', 'saveDate', 'templateName', 'hour', 'laneId', 'taskId', 'taskName', 'category', 'worker', 'duration'];
        const csvRows = [headers.join(',')];

        assignmentsToExport.forEach(task => {
            const taskData = { storeName, saveDate, templateName, ...task };
            const row = headers.map(header => {
                let value = taskData[header] === undefined || taskData[header] === null ? '' : String(taskData[header]);
                if (/[",\n]/.test(value)) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `【${storeName}】${templateName}_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportPatternSubmit = (patternName) => {
        if (!parsedCsvData) return;
        const newPatternId = crypto.randomUUID();
        const newTemplates = {
            ...currentStoreTemplates,
            [newPatternId]: { name: patternName, assignments: parsedCsvData }
        };
        setTemplates(newTemplates);
        markTemplatesDirty();
        setSelectedPatternId(newPatternId);
        setParsedCsvData(null);
        setModalState({ isOpen: false, type: null });
    };

    const handleTemplateFileRead = (text) => {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) {
            alert("CSVファイルにヘッダー行と少なくとも1つのデータ行が必要です。");
            return;
        }
        const headers = rows[0].trim().split(',');
        const requiredHeaders = ['hour', 'laneId', 'taskId', 'taskName'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            alert(`CSVファイルのヘッダーには、少なくとも次の列が必要です: ${requiredHeaders.join(', ')}`);
            return;
        }
        const assignments = rows.slice(1).map((row, index) => {
            try {
                const values = row.trim().split(',').map(v => v.trim());
                const task = {};
                headers.forEach((header, headerIndex) => {
                    task[header] = values[headerIndex] || '';
                });
                
                if (task.hour) task.hour = parseInt(task.hour, 10);
                
                task.id = crypto.randomUUID();
                task.storeId = currentUser.storeId;
                return task;
            } catch (error) {
                console.error(`Error processing template row ${index + 2}:`, error);
                return null;
            }
        }).filter(task => task && !isNaN(task.hour) && task.hour >= 0 && task.hour < 24);
        
        setParsedCsvData(assignments);
        setModalState({ isOpen: true, type: 'importPatternName' });
    };

    const timeLine = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
    
    const addLane = () => {
        if (lanes.length >= 8) {
            alert("これ以上レジは追加できません。");
            return;
        }
        const newLaneNumber = lanes.length + 1;
        const newLane = { id: `lane${newLaneNumber}`, name: `${newLaneNumber} レジ` };
        setLanes([...lanes, newLane]);
    };

    const removeLane = () => {
        if (lanes.length <= 2) {
            alert("これ以上レジは削除できません。");
            return;
        }
        setLanes(lanes.slice(0, -1));
    };

    const GenericModal = () => {
        if (!modalState.isOpen) return null;
        const closeModal = () => setModalState({ isOpen: false, type: null, data: null });

        if (modalState.type === 'addTask') {
            const [expandedGroups, setExpandedGroups] = useState({});
            const [selectedTaskIds, setSelectedTaskIds] = useState({});

            const groupedWorkItems = useMemo(() => {
                const groups = {};
                masterData.workItems.forEach(item => {
                    const categories = item.associated_types && Array.isArray(item.associated_types) && item.associated_types.length > 0 ? item.associated_types : ['未分類'];
                    categories.forEach(groupName => {
                        if (!groups[groupName]) groups[groupName] = [];
                        if (!groups[groupName].some(i => i.id === item.id)) {
                           groups[groupName].push(item);
                        }
                    });
                });
                for (const groupName in groups) {
                    groups[groupName].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
                }
                return groups;
            }, [masterData.workItems]);

            const toggleGroup = (groupName) => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
            
            const handleTaskSelection = (taskId) => {
                setSelectedTaskIds(prev => {
                    const newSelection = { ...prev };
                    if (newSelection[taskId]) {
                        delete newSelection[taskId];
                    } else {
                        newSelection[taskId] = true;
                    }
                    return newSelection;
                });
            };

            const handleGroupSelection = (groupName) => {
                const itemIdsInGroup = groupedWorkItems[groupName].map(item => item.id);
                const allSelected = itemIdsInGroup.every(id => selectedTaskIds[id]);
                setSelectedTaskIds(prev => {
                    const newSelection = {...prev};
                    itemIdsInGroup.forEach(id => {
                        if (allSelected) delete newSelection[id];
                        else newSelection[id] = true;
                    });
                    return newSelection;
                });
            };
            
            const handleBulkAddTask = () => {
                const tasksToAdd = masterData.workItems.filter(item => selectedTaskIds[item.id]);
                if (tasksToAdd.length === 0) return;

                const { hour, laneId } = modalState;
                const currentTasksInHour = currentAssignments.filter(a => parseInt(a.hour, 10) === hour && a.laneId === laneId).length;
                if (currentTasksInHour + tasksToAdd.length > 10) {
                    alert("1つの時間帯に追加できるタスクは10個までです。");
                    return;
                }

                const newAssignments = tasksToAdd.map(item => ({
                    id: crypto.randomUUID(), storeId: currentUser.storeId, hour, laneId,
                    taskId: item.id, taskName: item.name, category: item.associated_types?.[0] || '未分類',
                    worker: '', duration: '',
                    isFromTemplate: false
                }));
                
                updateCurrentData([...currentAssignments, ...newAssignments]);
                closeModal();
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-cyan-400">タスクを追加 ({modalState.hour}:00 - {(lanes && Array.isArray(lanes) ? lanes : []).find(l=>l.id===modalState.laneId)?.name})</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-grow">
                            {Object.keys(groupedWorkItems).sort((a,b) => a.localeCompare(b, 'ja')).map(groupName => {
                                const itemsInGroup = groupedWorkItems[groupName];
                                const allInGroupSelected = itemsInGroup.every(item => selectedTaskIds[item.id]);
                                const someInGroupSelected = itemsInGroup.some(item => selectedTaskIds[item.id]) && !allInGroupSelected;

                                return (
                                <div key={groupName}>
                                    <div className="flex items-center p-2 bg-gray-700 rounded-md">
                                        <input type="checkbox" className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-cyan-600 focus:ring-cyan-500 mr-3"
                                            checked={allInGroupSelected} ref={el => el && (el.indeterminate = someInGroupSelected)} onChange={() => handleGroupSelection(groupName)} />
                                        <button onClick={() => toggleGroup(groupName)} className="w-full flex items-center justify-between text-left">
                                            <div className="flex items-center gap-3"><Folder size={20} className="text-cyan-400" /><span className="font-semibold text-white">{groupName}</span></div>
                                            {expandedGroups[groupName] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                    </div>
                                    {expandedGroups[groupName] && (
                                        <div className="pt-2 pl-8 space-y-2">
                                            {itemsInGroup.map((item) => (
                                                <label key={item.id} className="flex items-center p-2 bg-gray-900/50 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                                    <input type="checkbox" className="h-4 w-4 rounded bg-gray-800 border-gray-600 text-cyan-600 focus:ring-cyan-500 mr-3"
                                                        checked={!!selectedTaskIds[item.id]} onChange={() => handleTaskSelection(item.id)} />
                                                    <span className="text-sm">{item.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                        <div className="p-4 border-t border-gray-700 flex justify-end">
                            <button onClick={handleBulkAddTask} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
                                <PlusCircle size={20}/>選択したタスクを追加
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (modalState.type === 'applyTemplate') {
            const availableTemplates = Object.entries(currentStoreTemplates);
            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-cyan-400">テンプレートを読み込む</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {availableTemplates.length > 0 ? availableTemplates.map(([pId, pData]) => (
                                <button key={pId} onClick={() => handleApplyTemplate(pId)} className="w-full text-left bg-gray-700 hover:bg-cyan-700 p-3 rounded-md transition-colors">
                                    {pData.name}
                                </button>
                            )) : <p className="text-gray-400 text-center">利用可能なテンプレートがありません。</p>}
                        </div>
                    </div>
                </div>
            );
        }
        
        if (modalState.type === 'createPattern' || modalState.type === 'copyPattern' || modalState.type === 'importPatternName') {
            const isCopy = modalState.type === 'copyPattern';
            const isImport = modalState.type === 'importPatternName';
            const originalName = isCopy ? (currentStoreTemplates[selectedPatternId]?.name || '') : '';
            const [name, setName] = useState(isCopy ? `${originalName} (コピー)` : (isImport ? 'インポートしたパターン' : '新規パターン'));
            
            let title, buttonText, handleSubmit;
            if (isImport) {
                title = '新規テンプレート名'; buttonText = '作成'; handleSubmit = (e) => { e.preventDefault(); if(name.trim()) handleImportPatternSubmit(name.trim()); };
            } else if (isCopy) {
                title = 'パターンをコピー'; buttonText = 'コピー'; handleSubmit = (e) => { e.preventDefault(); if(name.trim()) handleCopyPatternSubmit(name.trim()); };
            } else {
                title = '新規パターン作成'; buttonText = '作成'; handleSubmit = (e) => { e.preventDefault(); if(name.trim()) handleCreatePatternSubmit(name.trim()); };
            }

            return <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"><div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm"><form onSubmit={handleSubmit} className="p-6"><h3 className="text-lg font-bold text-cyan-400 mb-4">{title}</h3><input type="text" value={name} onChange={e => setName(e.target.value)} className="shadow appearance-none border rounded-lg w-full py-2 px-3 bg-gray-700 border-gray-600 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 mb-4" autoFocus/><div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">キャンセル</button><button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg">{buttonText}</button></div></form></div></div>;
        }

        if (modalState.type === 'deletePattern') {
            const patternName = currentStoreTemplates[selectedPatternId]?.name || '';
            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm text-center p-6">
                        <AlertTriangle className="text-red-500 w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">確認</h3>
                        <p className="text-gray-300 mb-6">本当に「{patternName}」を削除しますか？</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={closeModal} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">キャンセル</button>
                            <button onClick={handleDeletePatternSubmit} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg">削除</button>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <style>{`
                @keyframes blink {
                    0%, 100% { background-color: #374151; }
                    50% { background-color: #ef4444; }
                }
                .blinking-task {
                    animation: blink 1.5s infinite;
                    border: 1px solid #f87171;
                }
                .overdue-alert-enter {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                .overdue-alert-enter-active {
                    opacity: 1;
                    transform: translateY(0);
                    transition: opacity 300ms, transform 300ms;
                }
                @keyframes blink-blue {
                    0%, 100% { background-color: #374151; }
                    50% { background-color: #1e40af; }
                }
                .blinking-new-task {
                    animation: blink-blue 2s ease-in-out infinite;
                    border: 1px solid #3b82f6;
                }
            `}</style>
            <GenericModal />
            <MetricsBulkInputModal 
                isOpen={isMetricsModalOpen}
                onClose={() => setIsMetricsModalOpen(false)}
                onSave={handleMetricsBulkSave}
                initialData={currentMetrics}
            />
            <div className="max-w-screen-2xl mx-auto p-2 sm:p-4">
                 <header className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div><h1 className="text-2xl font-bold text-cyan-400">{viewMode === 'operational' ? '作業割り当て' : 'テンプレート編集'}</h1><span className="text-gray-600 text-xs">v{APP_VERSION}</span></div>
                        <div className="flex items-center gap-4">
                           <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={16}/>メニューに戻る</button>
                           <span className="text-sm text-gray-300 flex items-center gap-2"><User size={16}/>{currentUser.staffName}</span>
                           <div className="flex gap-2">
                                <button onClick={() => setViewMode('operational')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${viewMode === 'operational' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><FileText size={16}/>通常表示</button>
                                <button onClick={() => setViewMode('template')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${viewMode === 'template' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><Edit size={16}/>テンプレート</button>
                            </div>
                        </div>
                    </div>
                    {viewMode === 'operational' && (
                        <>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2"><Store className="text-gray-400"/><input type="text" value={masterData.stores.find(s=>s.id === currentUser.storeId)?.name || ''} className="bg-gray-700 text-white rounded-md p-2 w-full" readOnly/></div>
                                <div className="flex items-center gap-2"><Calendar className="text-gray-400"/><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 w-full focus:ring-2 focus:ring-cyan-500 focus:outline-none"/></div>
                                <button onClick={() => setModalState({isOpen: true, type: 'applyTemplate'})} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-md text-sm"><Layers size={16}/>テンプレートから読み込む</button>
                                <button onClick={() => setIsMetricsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md text-sm"><Sheet size={16}/>客数・売上 一括入力</button>
                                <div className="flex items-center gap-2 ml-auto">
                                    <button onClick={addLane} title="レジを追加" className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-md text-sm"><PlusCircle size={16}/></button>
                                    <button onClick={removeLane} title="レジを削除" className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-md text-sm"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            {overdueTaskCount > 0 && (
                                <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-3 overdue-alert-enter-active">
                                    <AlertTriangle className="text-red-400" size={20} />
                                    <span className="text-red-300 font-semibold">未完了の過去タスクが {overdueTaskCount} 件あります。入力してください。</span>
                                </div>
                            )}
                        </>
                    )}
                    {viewMode === 'template' && (
                        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-purple-300 mr-2">パターン管理:</h3>
                                <select value={selectedPatternId || ''} onChange={e => setSelectedPatternId(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none flex-grow">
                                    <option value="" disabled>パターンを選択...</option>
                                    {Object.entries(currentStoreTemplates).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'ja')).map(([id, data]) => (<option key={id} value={id}>{data.name}</option>))}
                                </select>
                                <button onClick={() => setModalState({isOpen: true, type: 'createPattern'})} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-md text-sm"><PlusCircle size={16}/>新規</button>
                                <button onClick={() => setModalState({isOpen: true, type: 'copyPattern'})} disabled={!selectedPatternId} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"><Copy size={16}/>コピー</button>
                                <button onClick={() => setModalState({isOpen: true, type: 'deletePattern'})} disabled={!selectedPatternId} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={16}/>削除</button>
                                <div className="flex-grow border-t border-gray-700 md:flex-grow-0 md:border-l md:border-t-0 md:h-8 md:mx-2"></div>
                                <button onClick={handleExportTemplateCSV} disabled={!selectedPatternId} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"><Download size={16}/>CSVエクスポート</button>
                                <button onClick={() => onImportRequest(handleTemplateFileRead)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-md text-sm"><Upload size={16}/>CSVインポート</button>
                            </div>
                        </div>
                    )}
                </header>
                {(currentAssignments.length === 0 && viewMode === 'operational') && <div className="text-center p-8 bg-gray-800 rounded-lg"><p className="text-gray-400 mb-4">この日のスケジュールは空です。</p></div>}
                {(!selectedPatternId && viewMode === 'template') && <div className="text-center p-8 bg-gray-800 rounded-lg"><p className="text-gray-400">パターンが選択されていません。「新規作成」から新しいパターンを作成してください。</p></div>}
                
                {(currentAssignments.length > 0 || (viewMode === 'template' && selectedPatternId) || viewMode === 'operational') && (
                    <div className="bg-gray-800 rounded-lg overflow-x-auto relative">
                        <div className="grid" style={{ gridTemplateColumns: `minmax(120px, auto) repeat(${lanes.length}, minmax(250px, 1fr))` }}>
                            <div className="p-3 font-bold text-cyan-400 text-center sticky top-0 left-0 bg-gray-800 z-30 border-r border-b-2 border-gray-700">時間</div>
                            {lanes.map(lane => (
                                <div key={lane.id} className="p-3 font-bold text-cyan-400 text-center sticky top-0 bg-gray-800 z-20 border-r border-b-2 border-gray-700 last:border-r-0">{lane.name}</div>
                            ))}
                        </div>
                        <div className="min-w-full inline-block">
                            {timeLine.map(hour => (
                                <div key={hour} className="grid items-start border-t border-gray-900" style={{ gridTemplateColumns: `minmax(120px, auto) repeat(${lanes.length}, minmax(250px, 1fr))` }}>
                                    <div className="p-2 font-bold text-gray-400 text-center sticky left-0 bg-gray-800 z-10 border-r border-gray-700 h-full flex flex-col items-center justify-center">
                                        <div className="text-lg">{String(hour).padStart(2, '0')}:00</div>
                                        {viewMode === 'operational' && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="text"
                                                        readOnly
                                                        value={(currentMetrics[hour]?.customers ?? '').toLocaleString()}
                                                        className="bg-gray-700 text-white w-16 p-1 rounded-md text-right text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-default"
                                                    />
                                                    <span className="text-xs text-gray-400">人</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                     <input 
                                                        type="text"
                                                        readOnly
                                                        value={(currentMetrics[hour]?.sales ?? '').toLocaleString()}
                                                        className="bg-gray-700 text-white w-16 p-1 rounded-md text-right text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-default"
                                                    />
                                                    <span className="text-xs text-gray-400">円</span>
                                                </div>
                                                {(weeklyAverages[hour]?.customers !== null || weeklyAverages[hour]?.sales !== null) && (
                                                    <div className="mt-1 pt-1 border-t border-gray-600 text-center">
                                                        <p className="text-[10px] text-gray-400">直近1週間の平均</p>
                                                        {weeklyAverages[hour]?.customers !== null && (
                                                            <p className="text-xs text-amber-300">{weeklyAverages[hour].customers.toLocaleString()} 人</p>
                                                        )}
                                                        {weeklyAverages[hour]?.sales !== null && (
                                                            <p className="text-xs text-amber-300">¥{weeklyAverages[hour].sales.toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {lanes.map(lane => {
                                        const hourAssignments = currentAssignments.filter(a => parseInt(a.hour, 10) === hour && a.laneId === lane.id);
                                        return (
                                            <div key={lane.id} className="p-2 border-r border-gray-700 last:border-r-0 min-h-[100px] flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    {hourAssignments.map(assignment => {
                                                        const todayStr = toLocalDateString();
                                                        const isPastTask = selectedDate < todayStr || (selectedDate === todayStr && parseInt(assignment.hour, 10) < now.getHours());
                                                        const needsAttention = viewMode === 'operational' && isPastTask && (!assignment.worker || !assignment.duration);
                                                        const isAddedTask = viewMode === 'operational' && assignment.isFromTemplate === false;

                                                        return (
                                                            <div key={assignment.id} className={`bg-gray-700 p-2 rounded-md flex flex-col text-sm relative group ${needsAttention ? 'blinking-task' : ''} ${isAddedTask ? 'blinking-new-task' : ''}`}>
                                                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                    <button onClick={() => handleResetTaskData(assignment.id)} title="担当者と時間をリセット" className="text-gray-500 hover:text-yellow-400"><RotateCcw size={14} /></button>
                                                                    <button onClick={() => handleDeleteTask(assignment.id)} title="タスクを削除" className="text-gray-500 hover:text-red-400"><X size={14} /></button>
                                                                </div>
                                                                <div className="mb-2">
                                                                    <p className="font-semibold">{assignment.taskName}</p>
                                                                    <p className="text-xs text-gray-400">{assignment.category}</p>
                                                                </div>
                                                                {assignment.taskName === 'レジ対応' && (() => {
                                                                    const actual = currentMetrics[hour]?.customers;
                                                                    const hasActual = typeof actual === 'number' && actual > 0;
                                                                    const source = hasActual ? actual : weeklyAverages[hour]?.customers;
                                                                    const guide = calcRegisterGuide(source);
                                                                    if (!guide) return null;
                                                                    return (
                                                                        <p className="text-xs text-amber-300 mb-1">
                                                                            目安{hasActual ? '' : '(平均)'}: 1レジ {guide.one}分 / 2レジ {guide.two}分
                                                                        </p>
                                                                    );
                                                                })()}
                                                                {BENCHMARK_TASKS.includes(assignment.taskName) && (() => {
                                                                    const avg = benchmarkAverages[assignment.taskName];
                                                                    if (!avg || avg.all === null) return null;
                                                                    return (
                                                                        <p className="text-xs text-amber-300 mb-1">
                                                                            平均: {avg.store !== null ? `店 ${avg.store}分 / ` : ''}全店 {avg.all}分
                                                                        </p>
                                                                    );
                                                                })()}
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1 bg-gray-800 rounded">
                                                                        <User size={14} className="text-gray-500 ml-1 shrink-0"/>
                                                                        <select value={assignment.worker || ''} onChange={(e) => handleDataChange(assignment.id, 'worker', e.target.value)} className="bg-transparent text-white p-1 w-full text-xs focus:outline-none appearance-none">
                                                                            <option value="" disabled className="bg-gray-900 text-gray-400">担当者...</option>
                                                                            {masterData.staff.map(name => (<option key={name} value={name} className="bg-gray-800 text-white">{name}</option>))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 bg-gray-800 rounded">
                                                                        <Clock size={14} className="text-gray-500 ml-1 shrink-0"/>
                                                                        <select value={assignment.duration || ''} onChange={(e) => handleDataChange(assignment.id, 'duration', e.target.value)} className="bg-transparent text-white p-1 w-full text-xs focus:outline-none appearance-none">
                                                                            <option value="" disabled className="bg-gray-900 text-gray-400">時間(分)</option>
                                                                            {Array.from({ length: 90 }, (_, i) => i + 1).map(minute => (<option key={minute} value={minute} className="bg-gray-800 text-white">{minute} 分</option>))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <button onClick={() => setModalState({ isOpen: true, type: 'addTask', hour, laneId: lane.id })} className="mt-2 w-full text-cyan-400 hover:text-cyan-300 transition-colors opacity-20 hover:opacity-100 flex items-center justify-center gap-1 text-sm py-2 rounded-md hover:bg-gray-900/50">
                                                    <PlusCircle size={16} /> タスク追加
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {viewMode === 'operational' && (
                    <div className="mt-8 flex justify-center">
                        <button onClick={handleSaveAndProceed} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-colors duration-300 shadow-lg">
                            <Save size={20} />
                            今日の作業を保存し、明日に進む
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
