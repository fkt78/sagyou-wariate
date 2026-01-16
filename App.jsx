import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, collection, getDocs, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, signInWithCustomToken } from 'firebase/auth';
import { Store, Calendar, PlusCircle, X, User, Clock, FileText, Edit, Copy, Trash2, LogIn, AlertTriangle, Layers, Save, LayoutDashboard, ArrowLeft, TrendingUp, Loader, Image as ImageIcon, ChevronDown, ChevronRight, Folder, RefreshCw, Check, Download, Upload, Sheet, Sparkles, Send, RotateCcw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Label, ComposedChart } from 'recharts';

// --- Firebase設定 ---
// アップロードされたファイルの設定値を適用しています
const firebaseConfig = {
    apiKey: "AIzaSyAvxKaj49CfK9T5-h4AycKcguU2gsSXTxc",
    authDomain: "new-check-137f9.firebaseapp.com",
    projectId: "new-check-137f9",
    storageBucket: "new-check-137f9.firebasestorage.app",
    messagingSenderId: "534868750946",
    appId: "1:534868750946:web:8e4341569853712bd8573b",
    measurementId: "G-QN9H01RKQV"
};

// Canvas環境での安定動作のため、Firebase初期化はコンポーネント外で行います
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 再利用可能なUIコンポーネント ---

/**
 * アラートモーダルコンポーネント
 */
const AlertModal = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
                <p className="text-white mb-4">{message}</p>
                <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg">OK</button>
            </div>
        </div>
    </div>
);

/**
 * ローディングスピナーコンポーネント
 */
const LoadingSpinner = ({ message = "データを読み込んでいます..." }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50">
        <div className="flex flex-col items-center gap-4">
            <Loader className="animate-spin text-cyan-400" size={48} />
            <p className="text-white">{message}</p>
        </div>
    </div>
);


// --- スクリーンコンポーネント ---

/**
 * ログイン画面コンポーネント
 */
const LoginScreen = ({ onLogin, masterData }) => {
    const { stores, staff } = masterData;
    const [storeId, setStoreId] = useState('');
    const [staffName, setStaffName] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (stores.length > 0 && !storeId) {
            setStoreId(stores[0].id);
        }
    }, [stores, storeId]);

    useEffect(() => {
        setStaffName('');
    }, [storeId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!staffName) {
            setAlertMessage("担当者を選択してください。");
            return;
        }
        setIsLoggingIn(true);
        await onLogin(storeId, staffName);
        setIsLoggingIn(false);
    };
    
    const allStaffList = staff || [];

    return (
        <>
            {alertMessage && <AlertModal message={alertMessage} onClose={() => setAlertMessage('')} />}
            <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <form onSubmit={handleSubmit} className="bg-gray-800 shadow-2xl rounded-lg p-8">
                        <h1 className="text-2xl font-bold text-cyan-400 mb-6 text-center">業務管理システム</h1>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="store-select">店舗</label>
                            <div className="relative">
                                <select id="store-select" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500">
                                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><ChevronDown size={16} /></div>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="staff-select">担当者</label>
                            <div className="relative">
                                <select id="staff-select" value={staffName} onChange={(e) => setStaffName(e.target.value)} className="block appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500" disabled={allStaffList.length === 0}>
                                    <option value="" disabled>担当者を選択...</option>
                                    {allStaffList.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><ChevronDown size={16} /></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <button type="submit" disabled={isLoggingIn} className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline w-full transition-all duration-300 disabled:opacity-50 disabled:cursor-wait">
                                {isLoggingIn ? <Loader className="animate-spin" size={20} /> : <LogIn size={20} />}
                                {isLoggingIn ? 'ログイン中...' : 'ログイン'}
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-gray-500 text-xs mt-4">Project ID: {firebaseConfig.projectId}</p>
                </div>
            </div>
        </>
    );
};

/**
 * メニュー画面コンポーネント
 */
const MenuScreen = ({ currentUser, onNavigate, onLogout, masterData }) => (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
        <div className="absolute top-5 right-5">
            <button onClick={onLogout} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><LogIn className="transform rotate-180" size={16}/>ログアウト</button>
        </div>
        <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">ようこそ、{currentUser.staffName}さん</h1>
            <p className="text-gray-400 mb-12">{masterData.stores.find(s=>s.id === currentUser.storeId)?.name}</p>
            <div className="flex flex-col md:flex-row gap-8">
                <button onClick={() => onNavigate('timetable')} className="flex flex-col items-center justify-center bg-gray-800 hover:bg-cyan-800 border-2 border-gray-700 hover:border-cyan-600 rounded-2xl p-10 w-64 h-64 transition-all duration-300 transform hover:-translate-y-2">
                    <FileText size={48} className="mb-4 text-cyan-400"/>
                    <span className="text-2xl font-semibold">作業割り当て</span>
                </button>
                <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center bg-gray-800 hover:bg-indigo-800 border-2 border-gray-700 hover:border-indigo-600 rounded-2xl p-10 w-64 h-64 transition-all duration-300 transform hover:-translate-y-2">
                    <LayoutDashboard size={48} className="mb-4 text-indigo-400"/>
                    <span className="text-2xl font-semibold">ダッシュボード</span>
                </button>
            </div>
        </div>
    </div>
);

/**
 * ヒートマップ詳細モーダル
 */
const HeatmapDetailModal = ({ modalData, onClose, allAssignments, lanes }) => {
    if (!modalData) return null;
    const { hour, laneId, storeId, startDate, endDate } = modalData;
    
    const availableDates = useMemo(() => {
        const dates = new Set();
        if (!allAssignments) return [];
        for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().slice(0, 10);
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

    const laneName = lanes.find(l => l.id === laneId)?.name || 'Unknown Lane';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-cyan-400">{`${laneName} - ${String(hour).padStart(2, '0')}:00 の作業詳細`}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
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
            const dateEntry = Object.entries(allAssignments).find(([date, tasksOnDate]) => 
                tasksOnDate.some(t => t.id === task.id)
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
const DashboardScreen = ({ allAssignments, hourlyMetrics, currentUser, masterData, lanes }) => {
    const { stores, workItems, staff } = masterData;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    
    const [startDate, setStartDate] = useState(weekAgo.toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
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
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const numberOfDaysInPeriod = dayCount > 0 ? dayCount : 1;

        const totals = {};
        for (let i = 0; i < 24; i++) {
            totals[i] = {
                lanes: lanes.reduce((acc, lane) => ({ ...acc, [lane.id]: 0 }), {}),
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
             for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
                const dateString = d.toISOString().slice(0, 10);
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
                lanes: lanes.reduce((acc, lane) => ({
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
            data: { hour, laneId, storeId: heatmapStore, startDate, endDate } 
        });
    };
    
    const performanceData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const numberOfDaysInPeriod = dayCount > 0 ? dayCount : 1;

        const totals = {};
        for (let i = 0; i < 24; i++) {
            totals[i] = {};
            stores.forEach(store => {
                totals[i][store.id] = { customers: 0, sales: 0, workload: 0 };
            });
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().slice(0, 10);
            
            if (hourlyMetrics[dateString]) {
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

            if (allAssignments[dateString]) {
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
        for (let hour = 0; hour < 24; hour++) {
            const hourData = { hour: `${String(hour).padStart(2, '0')}:00` };
            stores.forEach(store => {
                const storeTotals = totals[hour][store.id];
                hourData[`${store.name}_workload`] = Math.round(storeTotals.workload / numberOfDaysInPeriod);
                hourData[`${store.name}_customers`] = Math.round(storeTotals.customers / numberOfDaysInPeriod);
                hourData[`${store.name}_sales`] = Math.round(storeTotals.sales / numberOfDaysInPeriod);
            });
            chartData.push(hourData);
        }
        return chartData;
    }, [startDate, endDate, hourlyMetrics, allAssignments, stores]);

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
                                {timeLine.map(hour => (
                                    <div key={`cust-${hour}`} className="w-full p-2 rounded-md text-sm flex justify-between items-center bg-gray-700/50">
                                        <span className="font-bold text-gray-200">{String(hour).padStart(2, '0')}:00</span>
                                        <span className="font-semibold text-white">{(heatmapData[hour]?.customers || 0).toLocaleString()} 人</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-center font-bold mb-2">販売金額</h4>
                            <div className="space-y-1">
                                {timeLine.map(hour => (
                                    <div key={`sales-${hour}`} className="w-full p-2 rounded-md text-sm flex justify-between items-center bg-gray-700/50">
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
                                        <button key={`${lane.id}-${hour}`} onClick={() => handleHeatmapClick(hour, lane.id)} className={`w-full p-2 rounded-md text-sm flex justify-between items-center transition-colors duration-300 ${getWorkloadColor(heatmapData[hour]?.lanes?.[lane.id] || 0)}`}>
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
                    <h3 className="text-lg font-bold text-cyan-400 mb-4">店舗別 時間帯パフォーマンス分析</h3>
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
const TimetableScreen = ({ 
    db, currentUser, assignments, setAssignments, templates, setTemplates, 
    hourlyMetrics, setHourlyMetrics,
    onBack, masterData, onSync, isSyncing, 
    selectedDate, setSelectedDate, onImportRequest,
    lanes, setLanes
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

    const overdueTaskCount = useMemo(() => {
        if (viewMode !== 'operational') return 0;
        
        const todayStr = new Date().toISOString().slice(0, 10);
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
        } else {
            const otherStoresAssignments = assignments[selectedDate]?.filter(a => a.storeId !== currentUser.storeId) || [];
            setAssignments(prev => ({
                ...prev,
                [selectedDate]: [...otherStoresAssignments, ...newDataSet]
            }));
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

        const newDailySchedule = template.assignments
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
        setSelectedPatternId(newPatternId);
        setModalState({ isOpen: false, type: null });
    };

    const handleDeletePatternSubmit = () => {
        if (!selectedPatternId) return;
        const newStoreTemplates = { ...currentStoreTemplates };
        delete newStoreTemplates[selectedPatternId];
        setTemplates(newStoreTemplates);
        const remainingIds = Object.keys(newStoreTemplates);
        setSelectedPatternId(remainingIds.length > 0 ? remainingIds[0] : null);
        setModalState({ isOpen: false, type: null });
    };
    
    const handleSaveAndProceed = async () => {
        await onSync(false, true);
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + 1);
        const nextDate = currentDate.toISOString().slice(0, 10);
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
                            <h3 className="text-lg font-bold text-cyan-400">タスクを追加 ({modalState.hour}:00 - {lanes.find(l=>l.id===modalState.laneId)?.name})</h3>
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
                        <h1 className="text-2xl font-bold text-cyan-400">{viewMode === 'operational' ? '作業割り当て' : 'テンプレート編集'}</h1>
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
                                            </div>
                                        )}
                                    </div>
                                    {lanes.map(lane => {
                                        const hourAssignments = currentAssignments.filter(a => parseInt(a.hour, 10) === hour && a.laneId === lane.id);
                                        return (
                                            <div key={lane.id} className="p-2 border-r border-gray-700 last:border-r-0 min-h-[100px] flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    {hourAssignments.map(assignment => {
                                                        const todayStr = new Date().toISOString().slice(0, 10);
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


// --- App エントリーポイント ---
export default function App() {
    const [currentPage, setCurrentPage] = useState('login');
    const [currentUser, setCurrentUser] = useState(null);
    const [assignments, setAssignments] = useState({});
    const [templates, setTemplates] = useState({});
    const [hourlyMetrics, setHourlyMetrics] = useState({});
    const [masterData, setMasterData] = useState({ stores: [], staff: [], workItems: [] });
    const [lanes, setLanes] = useState([ { id: 'lane1', name: '1 レジ' }, { id: 'lane2', name: '2 レジ' } ]); 
    
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isMasterDataReady, setIsMasterDataReady] = useState(false);
    const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);
    const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const fileInputRef = useRef(null);
    const [onFileReadCallback, setOnFileReadCallback] = useState(null);

    const fetchAllData = async (firestore) => {
        setIsAssignmentsReady(false);
        try {
            const storesRef = collection(firestore, 'artifacts/general-master-data/public/data/stores');
            const employeesRef = collection(firestore, 'artifacts/general-master-data/public/data/employees');
            const workItemsRef = collection(firestore, 'artifacts/general-master-data/public/data/work_items');
            const assignmentsRef = collection(firestore, 'assignments');
            const metricsRef = collection(firestore, 'hourly_metrics');
            
            const [storesSnapshot, employeesSnapshot, workItemsSnapshot, assignmentsSnapshot, metricsSnapshot] = await Promise.all([
                getDocs(storesRef), getDocs(employeesRef), getDocs(workItemsRef), getDocs(assignmentsRef), getDocs(metricsRef)
            ]);

            const allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const allowedStoreNames = ["伊賀平野東町店", "伊賀平野北谷店", "伊賀忍者市駅南店"];
            const storesList = allStores.filter(store => allowedStoreNames.includes(store.name));
            storesList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

            const workItemsList = workItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            workItemsList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

            const employeeDataList = [];
            employeesSnapshot.docs.forEach(doc => {
                const employee = doc.data();
                let displayName = employee.nickname?.trim() || `${employee.lastName?.trim() || ''} ${employee.firstName?.trim() || ''}`.trim();
                if (displayName) employeeDataList.push({ displayName, role: employee.role || 'その他' });
            });
            const roleOrder = ['経営者', 'マネージャー', 'リーダー', 'クルー', 'サポーター', 'トレーニー', '外注業者', '本部OFC', 'その他'];
            employeeDataList.sort((a, b) => {
                const roleAIndex = roleOrder.indexOf(a.role), roleBIndex = roleOrder.indexOf(b.role);
                if (roleAIndex !== roleBIndex) return (roleAIndex === -1 ? Infinity : roleAIndex) - (roleBIndex === -1 ? Infinity : roleBIndex);
                return a.displayName.localeCompare(b.displayName, 'ja');
            });
            const sortedUniqueStaffNames = [...new Set(employeeDataList.map(emp => emp.displayName))];
            
            const allAssignments = {};
            assignmentsSnapshot.forEach(doc => {
                const docId = doc.id;
                const idParts = docId.split('_');
                if (idParts.length < 2) return;
                
                const storeId = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

                if (!allAssignments[date]) allAssignments[date] = [];
                const tasksWithStoreId = (doc.data().tasks || []).map(t => ({
                  ...t,
                  storeId,
                  isFromTemplate: t.isFromTemplate !== undefined ? t.isFromTemplate : true
                }));
                allAssignments[date].push(...tasksWithStoreId);
            });

            const allMetrics = {};
            metricsSnapshot.forEach(doc => {
                const docId = doc.id;
                const idParts = docId.split('_');
                if (idParts.length < 2) return;
                
                const storeId = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

                if (!allMetrics[date]) {
                    allMetrics[date] = {};
                }
                allMetrics[date][storeId] = doc.data().hourlyData || {};
            });

            setAssignments(allAssignments);
            setHourlyMetrics(allMetrics);
            setMasterData({ stores: storesList, staff: sortedUniqueStaffNames, workItems: workItemsList });
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsAssignmentsReady(true);
        }
    };
    
    // アプリケーション初期化時に認証フローを実行（Canvas環境向け修正）
    useEffect(() => {
        const initAuth = async () => {
            // ユーザー独自のFirebaseプロジェクトを使用しているため、
            // Canvas環境のトークン(__initial_auth_token)は使用せず、常に匿名認証を行います。
            try {
                await signInAnonymously(auth);
            } catch (e) {
                console.error("Anonymous auth failed", e);
            }
        };
        initAuth();

        fetchAllData(db).finally(() => setIsMasterDataReady(true));

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setIsUserDataLoaded(false);
            if (user) {
                try {
                    const userProfileRef = doc(db, 'users', user.uid);
                    const userProfileSnap = await getDoc(userProfileRef);

                    if (userProfileSnap.exists()) {
                        const userData = userProfileSnap.data();
                        setCurrentUser({ uid: user.uid, ...userData });
                        setCurrentPage('menu');

                        const templatesDocRef = doc(db, 'templates', userData.storeId);
                        const templateSnap = await getDoc(templatesDocRef);

                        setTemplates(templateSnap.exists() ? templateSnap.data() : {});
                        setLanes([ { id: 'lane1', name: '1 レジ' }, { id: 'lane2', name: '2 レジ' } ]);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                } finally {
                     setIsUserDataLoaded(true);
                }
            } else {
                setCurrentUser(null);
                setCurrentPage('login');
                setIsUserDataLoaded(true);
            }
            setIsAuthReady(true);
        });

        return () => unsubscribeAuth();
    }, []);

    const handleExportAssignmentsCSV = () => {
        const assignmentsToExport = assignments[selectedDate]?.filter(a => a.storeId === currentUser.storeId) || [];
        if (assignmentsToExport.length === 0) return;

        const storeName = masterData.stores.find(s => s.id === currentUser.storeId)?.name || '不明な店舗';
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        
        const headers = ['storeName', 'date', 'hour', 'laneId', 'taskId', 'taskName', 'category', 'worker', 'duration'];
        const csvRows = [headers.join(',')];
        assignmentsToExport.forEach(task => {
            const taskData = { storeName, date: selectedDate, ...task };
            const row = headers.map(header => {
                let value = taskData[header] ?? '';
                if (/[",\n]/.test(value)) value = `"${String(value).replace(/"/g, '""')}"`;
                return value;
            });
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `【${storeName}】${selectedDate.replace(/-/g, '')}_作業データ_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSync = async (shouldRefetch = false, shouldExport = false) => {
        if (!db || !currentUser || !isUserDataLoaded || !isAssignmentsReady || !isMasterDataReady) return; 
        setIsSyncing(true);
        try {
            // Firebaseのバッチ書き込み制限（500操作）を考慮して分割
            const MAX_BATCH_SIZE = 450; // 安全マージンを取る
            
            // assignmentsの準備
            const assignmentOps = [];
            Object.keys(assignments).forEach(date => {
                const tasksForCurrentUserStore = assignments[date]
                  .filter(t => t.storeId === currentUser.storeId)
                  .map(({ storeId, ...task }) => {
                    const taskToSave = { ...task };
                    
                    Object.keys(taskToSave).forEach(key => {
                        if (taskToSave[key] === undefined) {
                            delete taskToSave[key];
                        }
                    });

                    if (taskToSave.isFromTemplate === false) {
                        taskToSave.isFromTemplate = false;
                    } else {
                        delete taskToSave.isFromTemplate;
                    }
                    return taskToSave;
                  });
                
                const docRef = doc(db, 'assignments', `${currentUser.storeId}_${date}`);
                assignmentOps.push({ docRef, data: { tasks: tasksForCurrentUserStore } });
            });
            
            // hourlyMetricsの準備
            const metricsOps = [];
            Object.entries(hourlyMetrics).forEach(([date, storeData]) => {
                if (storeData[currentUser.storeId]) {
                    const docRef = doc(db, 'hourly_metrics', `${currentUser.storeId}_${date}`);
                    metricsOps.push({ docRef, data: { hourlyData: storeData[currentUser.storeId] } });
                }
            });
            
            // templatesの準備
            const templatesDocRef = doc(db, 'templates', currentUser.storeId);
            const templatesOp = { docRef: templatesDocRef, data: templates };
            
            // 全ての操作を結合
            const allOps = [...assignmentOps, ...metricsOps, templatesOp];
            
            // 操作がない場合は早期リターン
            if (allOps.length === 0) {
                setShowSaveSuccess(true);
                setTimeout(() => setShowSaveSuccess(false), 2000);
                return;
            }
            
            // バッチを分割して実行
            for (let i = 0; i < allOps.length; i += MAX_BATCH_SIZE) {
                const batch = writeBatch(db);
                const ops = allOps.slice(i, i + MAX_BATCH_SIZE);
                ops.forEach(({ docRef, data }) => {
                    batch.set(docRef, data);
                });
                await batch.commit();
            }
            
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
            
            if (shouldExport && currentPage === 'timetable') handleExportAssignmentsCSV();
            if (shouldRefetch) await fetchAllData(db);

        } catch (error) {
            console.error("Error syncing data with Firestore:", error);
            // ユーザーにエラーを通知（オプション）
            if (error.code === 'resource-exhausted') {
                console.warn("Firestore書き込み制限に達しました。しばらく待ってから再試行してください。");
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleImportRequest = (callback) => {
        setOnFileReadCallback(() => callback);
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('CSVファイルを選択してください。');
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (onFileReadCallback) onFileReadCallback(e.target.result);
        };
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            alert('ファイルの読み込み中にエラーが発生しました。');
        };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
    };

    const handleAssignmentFileRead = (text) => {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length < 2) return alert("CSVファイルにヘッダー行とデータ行が必要です。");

        const headers = rows[0].trim().split(',');
        const requiredHeaders = ['hour', 'laneId', 'taskId', 'taskName', 'date'];
        if (!requiredHeaders.every(h => headers.includes(h))) return alert(`CSVヘッダーに次の列が必要です: ${requiredHeaders.join(', ')}`);
        
        const csvDate = rows[1].trim().split(',')[headers.indexOf('date')];
        if (!csvDate || !/^\d{4}-\d{2}-\d{2}$/.test(csvDate)) return alert("CSVに有効な日付データが含まれていません。");

        const newTasks = rows.slice(1).map(row => {
            const values = row.trim().split(',');
            const task = {};
            headers.forEach((header, i) => { task[header] = values[i] || ''; });
            return {...task, hour: parseInt(task.hour, 10), id: crypto.randomUUID(), storeId: currentUser.storeId, isFromTemplate: false};
        }).filter(task => task && !isNaN(task.hour));
        
        const otherStoresAssignments = assignments[csvDate]?.filter(a => a.storeId !== currentUser.storeId) || [];
        setAssignments(prev => ({ ...prev, [csvDate]: [...otherStoresAssignments, ...newTasks] }));
        setSelectedDate(csvDate);
        alert(`${csvDate}の作業データとして${newTasks.length}件を読み込みました。`);
    };

    const handleLogin = async (storeId, staffName) => {
        if (!auth || !db) return;
        try {
            // 既に匿名ログイン済みか確認
            let user = auth.currentUser;
            if (!user) {
                // 未ログインならログイン試行
                const userCredential = await signInAnonymously(auth);
                user = userCredential.user;
            }

            // Firestoreにユーザー情報を保存（または更新）
            await setDoc(doc(db, 'users', user.uid), { storeId, staffName });

            // 状態を更新して即座に画面遷移
            // onAuthStateChangedは認証状態が変わらないと発火しないため、ここで手動セットして画面を切り替える
            setCurrentUser({ uid: user.uid, storeId, staffName });
            setCurrentPage('menu');

            // 選択された店舗のテンプレートデータを読み込む
            try {
                const templatesDocRef = doc(db, 'templates', storeId);
                const templateSnap = await getDoc(templatesDocRef);
                setTemplates(templateSnap.exists() ? templateSnap.data() : {});
                
                // レジ設定の初期化
                setLanes([ { id: 'lane1', name: '1 レジ' }, { id: 'lane2', name: '2 レジ' } ]);
            } catch (dataError) {
                console.error("Error fetching user initial data:", dataError);
            }

        } catch (error) {
            console.error("Login Error:", error);
            // エラー時もコンソールに出すだけにする（アラートだと操作を阻害する場合があるため）
            console.log("Login failed details:", error);
        }
    };
    
    const handleLogout = async () => {
        if (!auth) return;
        // ログアウト時のみ同期（変更を保存）
        await handleSync();
        await signOut(auth);
    };
    
    const handleNavigate = (page) => {
        // ページ遷移時は同期しない（即座に遷移）
        // データは手動保存ボタンで保存される
        // これにより、ボタンの反応が即座になる
        setCurrentPage(page);
    };

    if (!isAuthReady || !isMasterDataReady || !isUserDataLoaded || !isAssignmentsReady) {
        return <LoadingSpinner />;
    }

    return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,text/csv" style={{ display: 'none' }} />
            {(() => {
                switch (currentPage) {
                    case 'menu':
                        return <MenuScreen currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} masterData={masterData} />;
                    case 'timetable':
                        return <TimetableScreen 
                                    db={db} currentUser={currentUser} 
                                    assignments={assignments} setAssignments={setAssignments} 
                                    templates={templates} setTemplates={setTemplates} 
                                    hourlyMetrics={hourlyMetrics} setHourlyMetrics={setHourlyMetrics}
                                    onBack={() => handleNavigate('menu')} 
                                    masterData={masterData} 
                                    onSync={handleSync} 
                                    isSyncing={isSyncing} 
                                    selectedDate={selectedDate}
                                    setSelectedDate={setSelectedDate}
                                    onImportRequest={handleImportRequest}
                                    lanes={lanes}
                                    setLanes={setLanes}
                                />;
                    case 'dashboard':
                        return <div className="bg-gray-900 text-white min-h-screen font-sans"><div className="max-w-screen-2xl mx-auto p-2 sm:p-4"><header className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg flex justify-between items-center"><h1 className="text-2xl font-bold text-indigo-400">ダッシュボード</h1><div className="flex items-center gap-4"><button onClick={() => handleNavigate('menu')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={16}/>メニューに戻る</button></div></header><DashboardScreen allAssignments={assignments} hourlyMetrics={hourlyMetrics} currentUser={currentUser} masterData={masterData} lanes={lanes} /></div></div>;
                    case 'login':
                    default:
                        return <LoginScreen onLogin={handleLogin} masterData={masterData} />;
                }
            })()}

            {currentPage === 'timetable' && (
                <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
                     <button onClick={() => handleImportRequest(handleAssignmentFileRead)} title="作業割り当てCSVインポート" className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300">
                        <Upload size={24} />
                    </button>
                    <button onClick={() => handleSync(false, true)} disabled={isSyncing || showSaveSuccess} title={isSyncing ? '保存中...' : (showSaveSuccess ? '保存完了' : '保存 & エクスポート')} className={`font-bold p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 disabled:opacity-70 disabled:cursor-wait ${showSaveSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white`}>
                        {isSyncing ? <Loader size={24} className="animate-spin" /> : (showSaveSuccess ? <Check size={24} /> : <Download size={24} />)}
                    </button>
                </div>
            )}
             {currentPage === 'dashboard' && (
                <button onClick={() => handleSync(true)} disabled={isSyncing || showSaveSuccess} title={isSyncing ? '更新中...' : (showSaveSuccess ? '保存完了' : '更新')} className={`fixed bottom-8 right-8 text-white font-bold p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 disabled:opacity-70 disabled:cursor-wait ${showSaveSuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
                    {isSyncing ? <Loader size={24} className="animate-spin" /> : (showSaveSuccess ? <Check size={24} /> : <RefreshCw size={24} />)}
                </button>
            )}
        </>
    );
}
