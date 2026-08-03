import React, { useState, useEffect } from 'react';
import { LogIn, Loader, ChevronDown } from 'lucide-react';
import { APP_VERSION, BUILD_TIME, formatBuildTime } from '../lib/utils';
import { AlertModal } from '../components/common';

/**
 * ログイン画面コンポーネント
 */
export const LoginScreen = ({ onLogin, masterData }) => {
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
                    <p className="text-center text-gray-500 text-xs mt-4">v{APP_VERSION} ({formatBuildTime(BUILD_TIME)})</p>
                </div>
            </div>
        </>
    );
};
