// --- アプリバージョン ---
export const APP_VERSION = '1.4.5';
export const APP_BUILD_DATE = '2026-07-11';

/**
 * 客数から1時間あたりのレジ対応の目安合計時間を計算する（客数1人 = 1分）
 * 複数レジで分担する場合も「全レジの入力合計がこの時間以内」が目安
 * @returns {number | null} 目安合計（分）。客数が無ければ null
 */
export const calcRegisterGuide = (customers) => {
    const n = parseInt(customers, 10);
    if (isNaN(n) || n <= 0) return null;
    return n;
};

// 定点観測対象の作業（直近1ヶ月の平均時間を入力画面に表示する）
// 作業名はマスターの taskName と完全一致させること
export const BENCHMARK_TASKS = [
    'ウォークイン補充',
    'ウォークイン補充箱開け',
    'フローズンフェイスアップ',
    '伝票集計',
    '返本',
    'コピー入金',
    'トイレ掃除',
    '温度チェック',
    '仮集計',
    '雑誌鮮度チェック',
    '乳製品・栄ドリ補充',
    '募金入金',
];

/**
 * Dateをローカルタイムゾーン基準の 'YYYY-MM-DD' 文字列に変換する
 * （toISOString はUTC基準のため、日本では朝9時まで前日になる問題への対策）
 */
export const toLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
