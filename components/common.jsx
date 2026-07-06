import React from 'react';
import { Loader } from 'lucide-react';

/**
 * アラートモーダルコンポーネント
 */
export const AlertModal = ({ message, onClose }) => (
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
export const LoadingSpinner = ({ message = "データを読み込んでいます..." }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex justify-center items-center z-50">
        <div className="flex flex-col items-center gap-4">
            <Loader className="animate-spin text-cyan-400" size={48} />
            <p className="text-white">{message}</p>
        </div>
    </div>
);
