import React from 'react';
import { LogIn, FileText, LayoutDashboard } from 'lucide-react';
import { APP_VERSION, BUILD_TIME, formatBuildTime } from '../lib/utils';

/**
 * メニュー画面コンポーネント
 */
export const MenuScreen = ({ currentUser, onNavigate, onLogout, masterData }) => (
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
            <p className="text-gray-600 text-xs mt-8">v{APP_VERSION} ({formatBuildTime(BUILD_TIME)})</p>
        </div>
    </div>
);
