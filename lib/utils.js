// --- アプリバージョン ---
export const APP_VERSION = '1.3.9';
export const APP_BUILD_DATE = '2026-07-06';

/**
 * 客数からレジ対応の目安時間を計算する（客数1人 = 1分）
 * @returns {{ one: number, two: number } | null} 1レジ/2レジそれぞれの目安（分）。客数が無ければ null
 */
export const calcRegisterGuide = (customers) => {
    const n = parseInt(customers, 10);
    if (isNaN(n) || n <= 0) return null;
    return { one: n, two: Math.round(n / 2) };
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
