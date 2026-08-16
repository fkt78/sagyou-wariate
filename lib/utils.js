// --- アプリバージョン ---
export const APP_VERSION = '1.5.4';
export const BUILD_TIME = __BUILD_TIME__;

/** ビルド時刻を「2026/08/04 00:45」形式にする */
export const formatBuildTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
};

// --- 客単価チェックしきい値（hourly_metrics 2025-10-08〜2026-08-02 実測値） ---
// [下限, 上限]（円）。null は判定対象外
export const HOURLY_SPEND_RANGE = {
    0:  [300, 1583],  1:  [125, 1923],  2:  null,         3:  null,
    4:  null,         5:  [286, 1417],  6:  [333, 1333],  7:  [400, 1200],
    8:  [379, 1160],  9:  [355, 1455],  10: [433, 2000],  11: [476, 1483],
    12: [483, 1241],  13: [400, 1391],  14: [386, 1545],  15: [360, 1300],
    16: [417, 1350],  17: [500, 1440],  18: [508, 1414],  19: [524, 1500],
    20: [556, 1442],  21: [536, 1412],  22: [524, 1722],  23: [448, 1786],
};
export const HOURLY_SPEND_MIN_CUSTOMERS = 10;

// 店舗名 → [下限, 上限]（円）
export const DAILY_SPEND_RANGE = {
    '伊賀平野東町店':   [736, 989],
    '伊賀平野北谷店':   [737, 990],
    '伊賀忍者市駅南店': [635, 834],
};
export const DAILY_SPEND_RANGE_DEFAULT = [635, 990];

/** 時間帯単位の判定。範囲外なら true */
export const isHourlySpendAbnormal = (hour, customers, sales) => {
    if (typeof customers !== 'number' || typeof sales !== 'number') return false;
    if (customers < HOURLY_SPEND_MIN_CUSTOMERS) return false;
    const range = HOURLY_SPEND_RANGE[hour];
    if (!range) return false;
    const spend = sales / customers;
    return spend < range[0] || spend > range[1];
};

/** 1日合計の判定 */
export const checkDailySpend = (storeName, custSum, salesSum) => {
    if (!custSum || !salesSum) return null;
    const range = DAILY_SPEND_RANGE[storeName] || DAILY_SPEND_RANGE_DEFAULT;
    const spend = salesSum / custSum;
    return { spend: Math.round(spend), range, abnormal: spend < range[0] || spend > range[1] };
};

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
