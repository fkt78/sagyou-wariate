import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, User, Clock, Sparkles, Send, Loader, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Label, ComposedChart } from 'recharts';
import { calcRegisterGuide, toLocalDateString } from '../lib/utils';
import { LoadingSpinner } from '../components/common';

/**
 * ヒートマップ詳細モーダル
 */
const HeatmapDetailModal = ({ modalData, onClose, allAssignments, lanes }) => {
    if (!modalData) return null;
    const { hour, laneId, storeId, startDate, endDate, avgCustomers } = modalData;
    
    const availableDates = useMemo(() => {
        const dates = new Set();
        if (!allAssignments) return [];
        for (let d = new Date(startDate + 'T00:00:00'); d <= new Date(endDate + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
            const dateString = toLocalDateString(d);
            if (allAssignments[dateString]) {
                const hasTasks = allAssignments[dateString].some(task => 
                    task.storeId === storeId && parseInt(task.hour, 10) === hour && task.laneId === laneId
                );
                if (hasTasks) {
                    dates.add(dateString);
                }
            }
        }
        return Array.from(dates).sort();
    }, [startDate, endDate, allAssignments, storeId, hour, laneId]);

    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        if (availableDates.length > 0) {
            setSelectedDate(availableDates[0]);
        } else {
            setSelectedDate('');
        }
    }, [availableDates]);

    const tasksForSelectedDate = useMemo(() => {
        if (!selectedDate || !allAssignments || !allAssignments[selectedDate]) return [];
        return allAssignments[selectedDate].filter(task => 
            task.storeId === storeId && parseInt(task.hour, 10) === hour && task.laneId === laneId
        );
    }, [selectedDate, allAssignments, storeId, hour, laneId]);

    const laneName = (lanes && Array.isArray(lanes) ? lanes : []).find(l => l.id === laneId)?.name || 'Unknown Lane';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-cyan-400">{`${laneName} - ${String(hour).padStart(2, '0')}:00 の作業詳細`}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                {(() => {
                    const guide = calcRegisterGuide(avgCustomers);
                    if (!guide) return null;
                    return (
                        <div className="mx-4 mt-4 p-3 bg-amber-900/30 border border-amber-600/50 rounded-md text-sm">
                            <p className="text-amber-300">
                                この時間帯の平均客数: {avgCustomers}人 →
                                レジ対応の目安: 1レジ {guide.one}分 / 2レジ {guide.two}分
                            </p>
                        </div>
                    );
                })()}
                <div className="p-4">
                    <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md mb-4" disabled={availableDates.length === 0}>
                        {availableDates.length > 0 ? (
                           availableDates.map(date => <option key={date} value={date}>{date}</option>)
                        ) : (
                           <option>該当データなし</option>
                        )}
                    </select>
                </div>
                <div className="overflow-y-auto p-4 pt-0">
                    {tasksForSelectedDate.length > 0 ? (
                        <div className="space-y-3">
                            {tasksForSelectedDate.map(task => (
                                <div key={task.id} className="bg-gray-700 p-3 rounded-md">
                                    <p className="font-semibold text-white">{task.taskName}</p>
                                    <div className="flex justify-between items-center mt-2 text-sm text-gray-300">
                                        <span className="flex items-center gap-2"><User size={14} /> {task.worker || '未割り当て'}</span>
                                        <span className="flex items-center gap-2"><Clock size={14} /> {task.duration || 'N/A'} 分</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">この日のこの時間帯に割り当てられた作業はありません。</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// 個人別パフォーマンスタスク詳細モーダル
const TaskDetailModal = ({ isOpen, onClose, modalData, allAssignments, filteredData, detailStore }) => {
    if (!isOpen) return null;
    
    const { worker, taskName, taskId } = modalData;

    const tasksForWorker = useMemo(() => {
        if (!filteredData || !worker || !taskId) return [];

        const relevantTasks = filteredData.filter(task => 
            task.storeId === detailStore && 
            task.taskId === taskId && 
            task.worker === worker &&
            task.duration 
        );

        const tasksWithDate = relevantTasks.map(task => {
            const dateEntry = Object.entries(allAssignments || {}).find(([date, tasksOnDate]) => 
                Array.isArray(tasksOnDate) && tasksOnDate.some(t => t.id === task.id)
            );
            return {
                ...task,
                date: dateEntry ? dateEntry[0] : '不明な日付'
            };
        });
        
        return tasksWithDate.sort((a, b) => a.date.localeCompare(b.date));

    }, [isOpen, filteredData, worker, taskId, detailStore, allAssignments]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-lg font-bold text-cyan-400">{taskName}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                    <p className="text-sm text-gray-300">担当者: {worker}</p>
                </div>
                <div className="overflow-y-auto p-4">
                    <table className="w-full text-white">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="p-2 text-left">日付</th>
                                <th className="p-2 text-right">作業時間 (分)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasksForWorker.length > 0 ? (
                                tasksForWorker.map(task => (
                                    <tr key={task.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-2">{task.date}</td>
                                        <td className="p-2 text-right">{task.duration} 分</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="p-4 text-center text-gray-400">データがありません。</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

/**
 * AI分析チャットコンポーネント
 */
const AIAnalysisChat = ({ chatHistory, userInput, setUserInput, onSendMessage, isLoading, error }) => {
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading]);

    const renderMarkdown = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => {
            if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold text-cyan-400 mt-6 mb-3">{line.substring(4)}</h3>;
            if (line.startsWith('#### ')) return <h4 key={index} className="text-lg font-semibold text-white mt-4 mb-2">{line.substring(5)}</h4>;
            if (line.startsWith('* **')) {
                const boldEnd = line.indexOf('**', 3);
                const boldText = line.substring(3, boldEnd);
                const restOfLine = line.substring(boldEnd + 2);
                return <p key={index} className="mb-2 ml-4"><strong className="text-cyan-300">{boldText}</strong>{restOfLine}</p>;
            }
            if (line.startsWith('> ###')) return <h3 key={index} className="text-xl font-bold text-cyan-300 border-l-4 border-cyan-500 pl-4 mb-4">{line.substring(5)}</h3>;
            if (line.startsWith('> ####')) return <h4 key={index} className="text-lg font-bold text-white mt-4 mb-2 border-l-4 border-gray-500 pl-4">{line.substring(6)}</h4>;
            if (line.startsWith('> * **')) {
                const boldEnd = line.indexOf('**', 6);
                const boldText = line.substring(6, boldEnd);
                const restOfLine = line.substring(boldEnd + 2);
                return <div key={index} className="border-l-4 border-gray-500 pl-4 mb-3"><p><strong className="text-cyan-300">{boldText}</strong>{restOfLine}</p></div>
            }
            if (line.startsWith('>   * **')) {
                const boldEnd = line.indexOf('**', 9);
                const boldText = line.substring(9, boldEnd);
                const restOfLine = line.substring(boldEnd + 2);
                return <div key={index} className="border-l-4 border-gray-500 pl-4 ml-4 mb-3"><p><strong className="text-cyan-300">{boldText}</strong>{restOfLine}</p></div>
            }
            if (line.startsWith('>')) return <p key={index} className="border-l-4 border-gray-500 pl-4 text-gray-300 mb-4">{line.substring(2)}</p>;
            if(line.trim() === '---') return <hr key={index} className="border-gray-600 my-4" />;
            return <p key={index} className="text-gray-300 mb-2">{line}</p>;
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage(e);
        }
    };
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [userInput]);

    return (
        <div className="bg-gray-800 rounded-lg border-2 border-cyan-700/50 flex flex-col max-h-[70vh]">
            <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-6">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shrink-0"><Sparkles size={16} /></div>}
                        <div className={`p-4 rounded-lg max-w-2xl ${msg.role === 'user' ? 'bg-blue-900/80' : 'bg-gray-700'}`}>
                            {msg.role === 'user' ? <p className="text-white whitespace-pre-wrap">{msg.content}</p> : renderMarkdown(msg.content)}
                        </div>
                         {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0"><User size={16} /></div>}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-4">
                         <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shrink-0"><Sparkles size={16} /></div>
                        <div className="p-4 rounded-lg bg-gray-700 flex items-center gap-3">
                            <Loader className="animate-spin text-cyan-400" size={16} />
                            <span className="text-gray-300">考え中...</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-900/50 p-4 rounded-lg border border-red-500 text-red-300">
                        <h4 className="font-bold mb-2">エラー</h4>
                        <p>応答の生成中にエラーが発生しました。時間をおいて再度お試しください。</p>
                        <p className="text-xs mt-2 text-red-400">{error.message}</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-cyan-700/30">
                <form onSubmit={onSendMessage} className="flex items-center gap-4">
                    <textarea
                        ref={textareaRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={chatHistory.length > 0 ? "追加で質問を入力... (Shift+Enterで改行)" : "まず「初期分析を開始」ボタンを押してください"}
                        className="flex-grow bg-gray-700 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 max-h-40"
                        rows={1}
                        disabled={isLoading || chatHistory.length === 0}
                    />
                    <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-3 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};


/**
 * ダッシュボード画面コンポーネント
 */
export const DashboardScreen = ({ allAssignments = {}, hourlyMetrics = {}, currentUser, masterData = {}, lanes = [], onEnsureDataFrom = () => {} }) => {
    const { stores = [], workItems = [], staff = [] } = masterData;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    
    const [startDate, setStartDate] = useState(toLocalDateString(weekAgo));
    const [endDate, setEndDate] = useState(toLocalDateString(today));
    const [comparisonStores, setComparisonStores] = useState(stores.map(s => s.id));
    const [heatmapStore, setHeatmapStore] = useState(currentUser.storeId);
    const [detailStore, setDetailStore] = useState(currentUser.storeId);
    const [taskComparisonStore, setTaskComparisonStore] = useState(currentUser.storeId);
    const [heatmapModal, setHeatmapModal] = useState({ isOpen: false, data: null });
    const [taskDetailModal, setTaskDetailModal] = useState({ isOpen: false, worker: null, taskName: null, taskId: null });
    
    const [chatHistory, setChatHistory] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const analysisDataRef = useRef(null);
    
    const initialVisibility = useMemo(() => stores.reduce((acc, store) => {
        acc[store.id] = { customers: true, sales: true, workload: true };
        return acc;
    }, {}), [stores]);
    const [visibleData, setVisibleData] = useState(initialVisibility);

    // パフォーマンス分析の表示モード: 'detail'（従来の詳細表示） | 'load'（負荷分析）
    const [perfViewMode, setPerfViewMode] = useState('load');

    // 分析期間が読み込み済み範囲より前に設定されたら追加読み込み
    useEffect(() => {
        onEnsureDataFrom(startDate);
    }, [startDate]);

    const handleVisibilityToggle = (storeId, metric) => {
        setVisibleData(prev => ({
            ...prev,
            [storeId]: {
                ...prev[storeId],
                [metric]: !prev[storeId]?.[metric]
            }
        }));
    };
    
    const workTypes = useMemo(() => {
        const allTypes = new Set();
        workItems.forEach(item => {
            if (item.associated_types && Array.isArray(item.associated_types)) {
                item.associated_types.forEach(type => allTypes.add(type));
            }
        });
        return ['すべて', ...Array.from(allTypes).sort()];
    }, [workItems]);

    const [selectedAnalysisTask, setSelectedAnalysisTask] = useState('');
    const [selectedWorkType, setSelectedWorkType] = useState('');
    const [comparisonCategory, setComparisonCategory] = useState('すべて');
    
    useEffect(() => {
        if (workItems.length > 0 && !selectedAnalysisTask) {
            setSelectedAnalysisTask(workItems[0].id);
        }
    }, [workItems, selectedAnalysisTask]);

    useEffect(() => {
        if (workTypes.length > 0 && !selectedWorkType) {
            setSelectedWorkType(workTypes[0]);
        }
    }, [workTypes, selectedWorkType]);
    
    useEffect(() => {
        setComparisonStores(stores.map(s => s.id));
    }, [stores]);

    const handleComparisonStoreToggle = (storeId) => {
        setComparisonStores(prev => prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]);
    };
    
    const filteredData = useMemo(() => 
        Object.entries(allAssignments || {})
            .filter(([date]) => date >= startDate && date <= endDate)
            .flatMap(([, tasks]) => tasks.filter(task => comparisonStores.includes(task.storeId))), 
        [allAssignments, startDate, endDate, comparisonStores]
    );

    const timeLine = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

    const getWorkloadColor = (duration) => {
        if (duration <= 0) return 'bg-gray-800/50';
        if (duration <= 5) return 'bg-green-900/80';
        if (duration <= 10) return 'bg-green-800/80';
        if (duration <= 15) return 'bg-green-700/80';
        if (duration <= 20) return 'bg-green-600/80';
        if (duration <= 25) return 'bg-lime-800/80';
        if (duration <= 30) return 'bg-lime-700/80';
        if (duration <= 35) return 'bg-lime-600/80';
        if (duration <= 40) return 'bg-yellow-800/80';
        if (duration <= 45) return 'bg-yellow-700/80';
        if (duration <= 50) return 'bg-yellow-600/80';
        if (duration <= 55) return 'bg-orange-700/80';
        if (duration <= 60) return 'bg-orange-600/80';
        return 'bg-red-700/80';
    };
    
    const STORE_COLORS = useMemo(() => {
        const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
        return stores.reduce((acc, store, index) => {
            acc[store.id] = colors[index % colors.length];
            return acc;
        }, {});
    }, [stores]);

    const heatmapData = useMemo(() => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const numberOfDaysInPeriod = dayCount > 0 ? dayCount : 1;
        const safeLanes = Array.isArray(lanes) ? lanes : [];

        const totals = {};
        for (let i = 0; i < 24; i++) {
            totals[i] = {
                lanes: safeLanes.reduce((acc, lane) => ({ ...acc, [lane.id]: 0 }), {}),
                customers: 0,
                sales: 0
            };
        }

        filteredData
            .filter(t => t.storeId === heatmapStore)
            .forEach(task => {
                const duration = parseInt(task.duration, 10);
                const taskHour = parseInt(task.hour, 10);
                if (!isNaN(duration) && !isNaN(taskHour) && task.laneId && totals[taskHour] && totals[taskHour].lanes[task.laneId] !== undefined) {
                    totals[taskHour].lanes[task.laneId] += duration;
                }
            });
        
        if (hourlyMetrics) {
             for (let d = new Date(startDate + 'T00:00:00'); d <= new Date(endDate + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
                const dateString = toLocalDateString(d);
                const metricsForDate = hourlyMetrics[dateString]?.[heatmapStore];
                if (metricsForDate) {
                    for (let hour = 0; hour < 24; hour++) {
                        const hourData = metricsForDate[String(hour)];
                        if (hourData) {
                            totals[hour].customers += hourData.customers || 0;
                            totals[hour].sales += hourData.sales || 0;
                        }
                    }
                }
            }
        }

        const averages = {};
        for (let hour = 0; hour < 24; hour++) {
            averages[hour] = {
                lanes: safeLanes.reduce((acc, lane) => ({
                    ...acc,
                    [lane.id]: Math.round((totals[hour].lanes[lane.id] || 0) / numberOfDaysInPeriod)
                }), {}),
                customers: Math.round((totals[hour].customers || 0) / numberOfDaysInPeriod),
                sales: Math.round((totals[hour].sales || 0) / numberOfDaysInPeriod)
            };
        }
        return averages;
    }, [startDate, endDate, filteredData, hourlyMetrics, heatmapStore, lanes]);

    const handleHeatmapClick = (hour, laneId) => {
        setHeatmapModal({
            isOpen: true,
            data: { hour, laneId, storeId: heatmapStore, startDate, endDate,
                    avgCustomers: heatmapData[hour]?.customers || 0 }
        });
    };
    
    const performanceData = useMemo(() => {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const numberOfDaysInPeriod = dayCount > 0 ? dayCount : 1;

        const totals = {};
        for (let i = 0; i < 24; i++) {
            totals[i] = {};
            (stores || []).forEach(store => {
                totals[i][store.id] = { customers: 0, sales: 0, workload: 0 };
            });
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = toLocalDateString(d);
            
            if (hourlyMetrics && hourlyMetrics[dateString]) {
                stores.forEach(store => {
                    const metricsForStore = hourlyMetrics[dateString][store.id];
                    if (metricsForStore) {
                        for (let hour = 0; hour < 24; hour++) {
                            const hourData = metricsForStore[String(hour)];
                            if (hourData) {
                                totals[hour][store.id].customers += hourData.customers || 0;
                                totals[hour][store.id].sales += hourData.sales || 0;
                            }
                        }
                    }
                });
            }

            if (allAssignments && allAssignments[dateString] && Array.isArray(allAssignments[dateString])) {
                allAssignments[dateString].forEach(task => {
                    const duration = parseInt(task.duration, 10);
                    const taskHour = parseInt(task.hour, 10);
                    if (!isNaN(duration) && !isNaN(taskHour) && totals[taskHour] && totals[taskHour][task.storeId]) {
                        totals[taskHour][task.storeId].workload += duration;
                    }
                });
            }
        }

        const chartData = [];
        const safeStores = Array.isArray(stores) ? stores : [];
        for (let hour = 0; hour < 24; hour++) {
            const hourData = { hour: `${String(hour).padStart(2, '0')}:00` };
            safeStores.forEach(store => {
                const storeTotals = totals[hour][store.id];
                hourData[`${store.name}_workload`] = Math.round(storeTotals.workload / numberOfDaysInPeriod);
                hourData[`${store.name}_customers`] = Math.round(storeTotals.customers / numberOfDaysInPeriod);
                hourData[`${store.name}_sales`] = Math.round(storeTotals.sales / numberOfDaysInPeriod);
            });
            chartData.push(hourData);
        }
        return chartData;
    }, [startDate, endDate, hourlyMetrics, allAssignments, stores]);

    // 負荷指数（総作業時間(分) ÷ 客数(人)）: 店舗別・時間帯別
    const loadIndexData = useMemo(() => {
        return performanceData.map(hourData => {
            const row = { hour: hourData.hour };
            (stores || []).forEach(store => {
                const customers = hourData[`${store.name}_customers`];
                const workload = hourData[`${store.name}_workload`];
                row[store.name] = (typeof customers === 'number' && customers > 0 && typeof workload === 'number')
                    ? Math.round((workload / customers) * 100) / 100
                    : null;
            });
            return row;
        });
    }, [performanceData, stores]);

    const timeByWorker = useMemo(() => {
        const workerData = filteredData.filter(t => t.storeId === detailStore).reduce((acc, task) => {
            if (!task.worker) return acc;
            const duration = parseInt(task.duration, 10);
            if (!isNaN(duration)) {
                acc[task.worker] = (acc[task.worker] || 0) + duration;
            }
            return acc;
        }, {});
        return Object.entries(workerData).map(([name, value]) => ({ name, value }));
    }, [filteredData, detailStore]);

    const individualTaskPerformance = useMemo(() => {
        const tasksForAnalysis = filteredData.filter(task => task.storeId === detailStore && task.taskId === selectedAnalysisTask && task.worker);
        let overallTotalDuration = 0;
        let overallTaskCount = 0;
        const workerData = tasksForAnalysis.reduce((acc, task) => {
            const duration = parseInt(task.duration, 10);
            if(!isNaN(duration)){
                if(!acc[task.worker]) acc[task.worker] = { total: 0, count: 0 };
                acc[task.worker].total += duration;
                acc[task.worker].count++;
                overallTotalDuration += duration;
                overallTaskCount++;
            }
            return acc;
        }, {});
        const individualData = Object.entries(workerData).map(([name, {total, count}]) => ({ name, avgTime: Math.round(total/count) }));
        const overallAverage = overallTaskCount > 0 ? Math.round(overallTotalDuration / overallTaskCount) : 0;
        return { individualData, overallAverage };
    }, [filteredData, detailStore, selectedAnalysisTask]);
    
    const seasonalTaskTrend = useMemo(() => {
        if (!selectedWorkType) return [];
        const monthlyData = Object.entries(allAssignments || {}).filter(([date, tasks]) => tasks.some(t => comparisonStores.includes(t.storeId))).reduce((acc, [date, tasks]) => {
            const month = date.substring(0, 7);
            if (!acc[month]) {
                acc[month] = { month, ...stores.reduce((a, s) => ({...a, [s.name]: 0}), {}) };
            }
            const tasksForAnalysis = tasks.filter(task => task.category === selectedWorkType && comparisonStores.includes(task.storeId));
            tasksForAnalysis.forEach(task => {
                const duration = parseInt(task.duration, 10) || 0;
                const storeName = stores.find(s => s.id === task.storeId)?.name;
                if (storeName) {
                    acc[month][storeName] += duration;
                }
            });
            return acc;
        }, {});
        return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }, [allAssignments, selectedWorkType, comparisonStores, stores]);
    
    const timeByTaskComparison = useMemo(() => {
        const categoryFilteredData = comparisonCategory === 'すべて'
            ? filteredData
            : filteredData.filter(task => {
                const workItem = workItems.find(item => item.id === task.taskId);
                return workItem && Array.isArray(workItem.associated_types) && workItem.associated_types.includes(comparisonCategory);
            });

        const overallTaskData = categoryFilteredData.reduce((acc, task) => {
            const duration = parseInt(task.duration, 10);
            if (!isNaN(duration)) {
                if (!acc[task.taskName]) {
                    acc[task.taskName] = { total: 0, count: 0 };
                }
                acc[task.taskName].total += duration;
                acc[task.taskName].count++;
            }
            return acc;
        }, {});

        const storeFilteredData = categoryFilteredData.filter(t => t.storeId === taskComparisonStore);
        const storeTaskData = storeFilteredData.reduce((acc, task) => {
            const duration = parseInt(task.duration, 10);
            if (!isNaN(duration)) {
                if (!acc[task.taskName]) {
                    acc[task.taskName] = { total: 0, count: 0 };
                }
                acc[task.taskName].total += duration;
                acc[task.taskName].count++;
            }
            return acc;
        }, {});

        const combinedData = Object.keys(overallTaskData).map(taskName => {
            const overallAvg = Math.round(overallTaskData[taskName].total / overallTaskData[taskName].count);
            const storeStats = storeTaskData[taskName];
            const storeAvg = storeStats ? Math.round(storeStats.total / storeStats.count) : 0;
            return { name: taskName, overallAvg, storeAvg };
        });
        return combinedData.sort((a, b) => b.overallAvg - a.overallAvg);
    }, [filteredData, taskComparisonStore, workItems, comparisonCategory]);

    const prepareAnalysisData = () => {
        const analysisData = {
            period: { start: startDate, end: endDate },
            stores: comparisonStores.map(id => stores.find(s => s.id === id)?.name).filter(Boolean),
            hourlyData: performanceData,
            taskData: timeByTaskComparison,
            individualData: {}
        };
        const individualPerformance = {};
        filteredData.forEach(task => {
            if (!task.worker || !task.duration) return;
            if (!individualPerformance[task.taskId]) individualPerformance[task.taskId] = {};
            if (!individualPerformance[task.taskId][task.worker]) individualPerformance[task.taskId][task.worker] = { total: 0, count: 0 };
            individualPerformance[task.taskId][task.worker].total += parseInt(task.duration, 10);
            individualPerformance[task.taskId][task.worker].count++;
        });
        analysisData.individualData = Object.entries(individualPerformance).map(([taskId, workers]) => {
            const taskName = workItems.find(item => item.id === taskId)?.name || '不明なタスク';
            const workerAverages = Object.entries(workers).map(([worker, data]) => ({ worker, avg: Math.round(data.total / data.count) }));
            return { taskName, workerAverages };
        });
        analysisDataRef.current = analysisData;
        return `分析期間: ${analysisData.period.start} ~ ${analysisData.period.end}\n分析対象店舗: ${analysisData.stores.join(', ')}\n\n時間帯別平均データ:\n${analysisData.hourlyData.map(h => `- ${h.hour}:\n${analysisData.stores.map(s => `  - ${s}: 客数 ${h[s+'_customers']}人, 売上 ${h[s+'_sales']}円, 作業時間 ${h[s+'_workload']}分`).join('\n')}`).join('')}\n\nタスク別平均作業時間:\n${analysisData.taskData.map(t => `- ${t.name}: 全店舗平均 ${t.overallAvg}分, ${taskComparisonStore && stores.find(s=>s.id === taskComparisonStore)?.name}平均 ${t.storeAvg}分`).join('\n')}\n\n担当者別タスク平均作業時間:\n${analysisData.individualData.map(t => `- ${t.taskName}:\n${t.workerAverages.map(w => `  - ${w.worker}: ${w.avg}分`).join('\n')}`).join('')}`;
    };

    const handleInitialAnalysis = async () => {
        setIsAiLoading(true);
        setAiError(null);
        setChatHistory([]);
        try {
            const dataSummary = prepareAnalysisData();
            const systemPrompt = "あなたは、コンビニエンスストアや小売店の運営を改善するための優秀なビジネスアナリストです。\n提供されたデータを分析し、プロフェッショナルで洞察に満ちた改善提案レポートをMarkdown形式で作成してください。\n\nレポートには必ず以下の3つの視点を含めてください：\n\n1.  **【時間帯の最適化】**: 売上や客数のピーク・オフピークに対して、人員（総作業時間）が適切に配置されているか分析し、過不足がある時間帯を指摘してください。\n2.  **【タスクの効率化】**: 他店舗と比較して、特定の作業の平均時間が著しく長い店舗やタスクを特定し、その原因の可能性と改善策を提案してください。\n3.  **【個人のパフォーマンスと育成機会】**: 特定の重要なタスクにおいて、作業時間が平均より特に速い、または遅い担当者を特定してください。\n    -   遅い担当者については、トレーニングやマニュアル見直しの機会として提案してください。\n    -   速い担当者については、そのノウハウをチームで共有することを提案してください。\n    -   ただし、平均より極端に速い場合は、手順の抜け漏れの可能性がないか確認を促す注意点も付け加えてください。\n\n**レポートの構成:**\n-   まず「エグゼクティブサマリー」として、分析結果の最も重要なポイントを2〜3行で要約してください。\n-   次に「改善のための具体的な提案」として、上記の3つの視点に基づいた具体的な分析内容と提案を記述してください。\n-   店舗名、タスク名、担当者名、具体的な数値を必ず含めて、客観的で説得力のある内容にしてください。\n-   堅苦しくなりすぎず、店長がすぐに行動に移せるような、明確でポジティブな表現を心がけてください。";
            const userQuery = `以下の店舗運営データを分析し、改善提案レポートを作成してください。\n\n${dataSummary}`;
            
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const payload = { contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };

            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                setChatHistory([{ role: 'model', content: text }]);
            } else {
                throw new Error("AIからの応答が空です。");
            }
        } catch (error) {
            console.error("AI report generation error:", error);
            setAiError(error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || isAiLoading) return;

        const newUserMessage = { role: 'user', content: userInput };
        const updatedChatHistory = [...chatHistory, newUserMessage];
        setChatHistory(updatedChatHistory);
        setUserInput('');
        setIsAiLoading(true);
        setAiError(null);

        try {
            const dataSummary = prepareAnalysisData();
            const systemPrompt = "あなたは、コンビニエンスストアや小売店の運営を改善するための優秀なビジネスアナリストです。最初の分析結果とデータに基づいて、ユーザーからの追加の質問に簡潔かつ的確に答えてください。Markdown形式で、読みやすく整形してください。";
            const initialPrompt = { role: 'user', content: `以下の店舗運営データを分析し、改善提案レポートを作成してください。\n\n${dataSummary}` };

            const conversationHistory = [initialPrompt, ...updatedChatHistory].map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));

            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const payload = { contents: conversationHistory, systemInstruction: { parts: [{ text: systemPrompt }] } };

            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                setChatHistory(prev => [...prev, { role: 'model', content: text }]);
            } else {
                 throw new Error("AIからの応答が空です。");
            }
        } catch (error) {
            console.error("AI chat error:", error);
            setAiError(error);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    if (!allAssignments) {
        return <LoadingSpinner message="分析データを準備しています..." />;
    }
    
    const isLeftAxisVisible = comparisonStores.some(storeId => visibleData[storeId]?.sales);
    const isRightAxisVisible = comparisonStores.some(storeId => visibleData[storeId]?.customers || visibleData[storeId]?.workload);


    return (
        <>
            {heatmapModal.isOpen && <HeatmapDetailModal modalData={heatmapModal.data} allAssignments={allAssignments} onClose={() => setHeatmapModal({ isOpen: false, data: null })} lanes={lanes} />}
            <TaskDetailModal 
                isOpen={taskDetailModal.isOpen}
                onClose={() => setTaskDetailModal({ isOpen: false, worker: null, taskName: null, taskId: null })}
                modalData={taskDetailModal}
                allAssignments={allAssignments}
                filteredData={filteredData}
                detailStore={detailStore}
            />
            <div className="p-4 space-y-6">
                <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                    <div><h3 className="text-lg font-bold text-cyan-400 mb-2">フィルター設定</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4">
                            <label htmlFor="start-date" className="text-sm">分析期間:</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 text-white p-2 rounded-md" />
                            <span>〜</span>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 text-white p-2 rounded-md" />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-sm">比較対象店舗:</label>
                            <div className="flex gap-4">
                                {stores.map(store => (
                                    <label key={store.id} className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={comparisonStores.includes(store.id)} onChange={() => handleComparisonStoreToggle(store.id)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500"/>
                                        {store.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-lg font-bold text-cyan-400">時間帯・指標別 状況ヒートマップ（期間平均）</h3>
                        <div className="flex items-center gap-2">
                            {stores.map(store => (
                                <button key={store.id} onClick={() => setHeatmapStore(store.id)} className={`px-3 py-1 text-sm rounded-md ${heatmapStore === store.id ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{store.name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-2 overflow-x-auto pb-4" style={{gridTemplateColumns: `minmax(130px, auto) minmax(150px, auto) repeat(${lanes.length}, minmax(120px, 1fr))`}}>
                        <div>
                            <h4 className="text-center font-bold mb-2">客数</h4>
                            <div className="space-y-1">
                                {timeLine.map(hour => {
                                    const guide = calcRegisterGuide(heatmapData[hour]?.customers);
                                    return (
                                        <div key={`cust-${hour}`} className="w-full p-2 rounded-md text-sm bg-gray-700/50 min-h-[52px]">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-200">{String(hour).padStart(2, '0')}:00</span>
                                                <span className="font-semibold text-white">{(heatmapData[hour]?.customers || 0).toLocaleString()} 人</span>
                                            </div>
                                            {guide && (
                                                <div className="text-right text-xs text-amber-300 mt-0.5">
                                                    目安 {guide.one}分/{guide.two}分
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-center font-bold mb-2">販売金額</h4>
                            <div className="space-y-1">
                                {timeLine.map(hour => (
                                    <div key={`sales-${hour}`} className="w-full p-2 rounded-md text-sm flex justify-between items-center bg-gray-700/50 min-h-[52px]">
                                        <span className="font-bold text-gray-200">{String(hour).padStart(2, '0')}:00</span>
                                        <span className="font-semibold text-white">¥{(heatmapData[hour]?.sales || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {lanes.map(lane => (
                            <div key={lane.id}>
                                <h4 className="text-center font-bold mb-2">{lane.name}</h4>
                                <div className="space-y-1">
                                    {timeLine.map(hour => (
                                        <button key={`${lane.id}-${hour}`} onClick={() => handleHeatmapClick(hour, lane.id)} className={`w-full p-2 rounded-md text-sm flex justify-between items-center transition-colors duration-300 min-h-[52px] ${getWorkloadColor(heatmapData[hour]?.lanes?.[lane.id] || 0)}`}>
                                            <span className="font-bold text-gray-200">{String(hour).padStart(2, '0')}:00</span>
                                            <span className="font-semibold text-white">{heatmapData[hour]?.lanes?.[lane.id] || 0} 分</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-lg font-bold text-cyan-400">店舗別 時間帯パフォーマンス分析</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPerfViewMode('load')} className={`px-3 py-1 text-sm rounded-md ${perfViewMode === 'load' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>負荷分析</button>
                            <button onClick={() => setPerfViewMode('detail')} className={`px-3 py-1 text-sm rounded-md ${perfViewMode === 'detail' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>詳細表示</button>
                        </div>
                    </div>
                    {perfViewMode === 'detail' && (
                    <>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6 p-3 bg-gray-900/50 rounded-lg">
                        {stores.map(store => (
                            <div key={store.id} className="flex items-center gap-4 p-2 rounded-lg" style={{ border: `1px solid ${STORE_COLORS[store.id]}` }}>
                                <span className="font-bold text-sm" style={{ color: STORE_COLORS[store.id] }}>{store.name}</span>
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:text-white">
                                        <input type="checkbox" checked={visibleData[store.id]?.customers ?? true} onChange={() => handleVisibilityToggle(store.id, 'customers')} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"/>
                                        客数
                                    </label>
                                    <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:text-white">
                                        <input type="checkbox" checked={visibleData[store.id]?.sales ?? true} onChange={() => handleVisibilityToggle(store.id, 'sales')} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-pink-500 focus:ring-pink-500"/>
                                        売上
                                    </label>
                                    <label className="flex items-center gap-1.5 text-sm cursor-pointer hover:text-white">
                                        <input type="checkbox" checked={visibleData[store.id]?.workload ?? true} onChange={() => handleVisibilityToggle(store.id, 'workload')} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"/>
                                        作業時間
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={performanceData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                            {isLeftAxisVisible && <YAxis yAxisId="left" stroke="#8884d8" label={{ value: '金額(円)', angle: -90, position: 'insideLeft', offset: -10, fill: '#9ca3af' }} />}
                            {isRightAxisVisible && <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: '客数(人) / 総作業時間 (分)', angle: 90, position: 'insideRight', offset: -10, fill: '#9ca3af' }} />}
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }}/>
                            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                             {comparisonStores.map(storeId => {
                                const store = stores.find(s => s.id === storeId);
                                if (!store) return null;
                                const storeVisibility = visibleData[store.id] || {};
                                const color = STORE_COLORS[store.id];

                                return (
                                    <React.Fragment key={store.id}>
                                        {storeVisibility.sales && <Bar yAxisId="left" dataKey={`${store.name}_sales`} name={`${store.name} 売上`} fill={color} opacity={0.7} />}
                                        {storeVisibility.workload && <Line yAxisId="right" type="monotone" dataKey={`${store.name}_workload`} name={`${store.name} 作業時間`} stroke={color} strokeWidth={3} strokeDasharray="3 3" />}
                                        {storeVisibility.customers && <Line yAxisId="right" type="monotone" dataKey={`${store.name}_customers`} name={`${store.name} 客数`} stroke={color} strokeWidth={3} />}
                                    </React.Fragment>
                                );
                            })}
                        </ComposedChart>
                    </ResponsiveContainer>
                    </>
                    )}
                    {perfViewMode === 'load' && (
                    <>
                        <p className="text-sm text-gray-400 mb-4">
                            負荷指数 ＝ 総作業時間（分）÷ 客数（人）。1.0が「客数1人あたり作業1分」の基準。
                            高い時間帯は作業が重い（または人員余剰・過大申告）、低い時間帯は作業が回っていない（または入力漏れ）可能性。
                        </p>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={loadIndexData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} label={{ value: '負荷指数 (分/人)', angle: -90, position: 'insideLeft', offset: -5, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }} />
                                <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                                <ReferenceLine y={1} stroke="#f43f5e" strokeDasharray="3 3">
                                    <Label value="基準 1.0" position="insideTopRight" fill="#f43f5e" fontSize={12} />
                                </ReferenceLine>
                                {comparisonStores.map(storeId => {
                                    const store = stores.find(s => s.id === storeId);
                                    if (!store) return null;
                                    return <Line key={storeId} type="monotone" dataKey={store.name} name={store.name} stroke={STORE_COLORS[storeId]} strokeWidth={3} connectNulls={false} />;
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                    )}
                </div>
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <button onClick={handleInitialAnalysis} disabled={isAiLoading} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-3 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-wait">
                            <Sparkles size={20} />
                            {isAiLoading ? '分析中...' : 'AIによる初期分析を開始'}
                        </button>
                    </div>
                    <AIAnalysisChat
                        chatHistory={chatHistory}
                        userInput={userInput}
                        setUserInput={setUserInput}
                        onSendMessage={handleSendMessage}
                        isLoading={isAiLoading}
                        error={aiError}
                    />
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-wrap gap-4 items-center mb-4">
                        <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2"><TrendingUp size={24}/>季節変動トレンド</h3>
                        <select value={selectedWorkType} onChange={e => setSelectedWorkType(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            {workTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={seasonalTaskTrend}>
                            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12}/>
                            <YAxis stroke="#9ca3af" fontSize={12}/>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }}/>
                            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                            {comparisonStores.map(storeId => {
                                const store = stores.find(s => s.id === storeId);
                                return store ? <Line key={storeId} type="monotone" dataKey={store.name} stroke={STORE_COLORS[storeId]} name={store.name} /> : null;
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-wrap gap-4 items-center mb-4">
                        <h3 className="text-lg font-bold text-cyan-400">詳細分析</h3>
                        <select value={detailStore} onChange={e => setDetailStore(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-center font-bold mb-4">担当者別 作業時間</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={timeByWorker} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {timeByWorker.map((entry, index) => <Cell key={`cell-${index}`} fill={STORE_COLORS[detailStore]} opacity={(index/timeByWorker.length)*0.5 + 0.5} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }}/>
                                    <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div>
                            <h4 className="text-center font-bold mb-4">作業別・個人別 パフォーマンス</h4>
                            <select value={selectedAnalysisTask} onChange={e => setSelectedAnalysisTask(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none mb-2">
                                {workItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={individualTaskPerformance.individualData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                    <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={60} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }} cursor={{fill: 'rgba(107, 114, 128, 0.2)'}} />
                                    <Legend wrapperStyle={{top: 0, color: '#e5e7eb' }} />
                                    <Bar 
                                        dataKey="avgTime" 
                                        fill={STORE_COLORS[detailStore]} 
                                        name="平均作業時間 (分)"
                                        onClick={(data) => {
                                            setTaskDetailModal({
                                                isOpen: true,
                                                worker: data.name,
                                                taskName: workItems.find(item => item.id === selectedAnalysisTask)?.name,
                                                taskId: selectedAnalysisTask
                                            });
                                        }}
                                        cursor="pointer"
                                    />
                                    {individualTaskPerformance.overallAverage > 0 && (
                                        <ReferenceLine x={individualTaskPerformance.overallAverage} stroke="#f43f5e" strokeDasharray="3 3">
                                            <Label value={`全体平均: ${individualTaskPerformance.overallAverage}分`} position="insideTopLeft" fill="#f43f5e" fontSize={12} />
                                        </ReferenceLine>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-wrap gap-4 items-center mb-4">
                        <h3 className="text-lg font-bold text-cyan-400">タスク別 平均作業時間（比較）</h3>
                        <select value={taskComparisonStore} onChange={e => setTaskComparisonStore(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                            {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                            カテゴリ:
                            <select value={comparisonCategory} onChange={e => setComparisonCategory(e.target.value)} className="bg-gray-700 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                                {workTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </label>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={timeByTaskComparison} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={120} interval={0} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} itemStyle={{ color: '#e5e7eb' }} cursor={{fill: 'rgba(107, 114, 128, 0.2)'}} />
                            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                            <Bar dataKey="overallAvg" name="全店舗平均" fill="#a78bfa" />
                            <Bar dataKey="storeAvg" name={`${stores.find(s=>s.id === taskComparisonStore)?.name} 平均`} fill={STORE_COLORS[taskComparisonStore]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
};
