import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc, onSnapshot, updateDoc, collection, getDocs, writeBatch, getDoc, deleteDoc, query, where, documentId } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { ArrowLeft, Loader, Check, Download, Upload, RefreshCw } from 'lucide-react';
import { app, auth, db } from './lib/firebase';
import { APP_VERSION, toLocalDateString } from './lib/utils';
import { AlertModal, LoadingSpinner } from './components/common';
import { DashboardScreen } from './screens/DashboardScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MenuScreen } from './screens/MenuScreen';
import { TimetableScreen } from './screens/TimetableScreen';

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
    const [syncError, setSyncError] = useState('');
    const [selectedDate, setSelectedDate] = useState(toLocalDateString());
    const fileInputRef = useRef(null);
    const [onFileReadCallback, setOnFileReadCallback] = useState(null);

    // 保存時に常に最新の assignments を参照するための ref（クロージャが古い state を参照して保存時にデータが消える不具合の対策）
    // useEffect ではなく setAssignmentsWithRef 呼び出し時に「即座に同期更新」するため、
    // 保存ボタンが押された瞬間に ref には必ず最新値が入っている
    const assignmentsLatestRef = useRef({});
    const setAssignmentsWithRef = (arg) => {
        const next = typeof arg === 'function' ? arg(assignmentsLatestRef.current) : arg;
        assignmentsLatestRef.current = next;
        setAssignments(next);
    };

    // テンプレートも同様に最新値を ref で管理（stale closure & 未ロード時の空上書きを防止）
    // templatesLoadedRef が true になるのは Firestore から正常に読み込んだ後のみ
    const templatesLatestRef = useRef({});
    const templatesLoadedRef = useRef(false);
    const setTemplatesWithRef = (arg) => {
        const next = typeof arg === 'function' ? arg(templatesLatestRef.current) : arg;
        templatesLatestRef.current = next;
        setTemplates(next);
    };

    // 変更された日付とデータ種別を追跡（保存時に変更分のみ送信するため）
    // 読み込み時点のDBの内容（3方向マージの「基準」）
    // 基準にあったのに今ローカルに無い = この端末で削除した → 復活させない
    // 基準に無かったのにDBにある     = 他端末が追加・入力した → 守る
    const baseTasksRef = useRef({});   // { 'YYYY-MM-DD': Map<taskId, {worker, duration}> }
    const baseMetricHoursRef = useRef({}); // { 'YYYY-MM-DD': Set<'0'..'23'> }
    const dirtyAssignmentDatesRef = useRef(new Set());
    const dirtyMetricsDatesRef = useRef(new Set());
    const dirtyTemplatesRef = useRef(false);

    // 未保存の変更を検知するためのカウンタ（refは再描画を起こさないため、stateで変更を通知する）
    const [dirtyCounter, setDirtyCounter] = useState(0);

    const markAssignmentDirty = (date) => {
        dirtyAssignmentDatesRef.current.add(date);
        setDirtyCounter(c => c + 1);
    };
    const markMetricsDirty = (date) => {
        dirtyMetricsDatesRef.current.add(date);
        setDirtyCounter(c => c + 1);
    };
    const markTemplatesDirty = () => {
        dirtyTemplatesRef.current = true;
        setDirtyCounter(c => c + 1);
    };

    // 未保存の変更が残っているか
    const hasUnsavedChanges = () =>
        dirtyAssignmentDatesRef.current.size > 0 ||
        dirtyMetricsDatesRef.current.size > 0 ||
        dirtyTemplatesRef.current;

    // 読み込み済みデータの最古日付（これより前は未読み込み）
    const loadedFromRef = useRef(null);
    // 追い読みの多重実行防止
    const isLoadingOlderRef = useRef(false);

    // 起動時の読み込み開始日（今日から3ヶ月前）を返す
    const getDefaultLoadFrom = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return toLocalDateString(d);
    };

    // 店舗ID・店舗名の両プレフィックスで、期間内のドキュメントを範囲クエリで取得する
    const fetchDocsInRange = async (firestore, collectionName, storesList, fromStr, toStr) => {
        const prefixes = [...new Set(storesList.flatMap(s => [s.id, s.name]))];
        const snapshots = await Promise.all(prefixes.map(prefix =>
            getDocs(query(
                collection(firestore, collectionName),
                where(documentId(), '>=', `${prefix}_${fromStr}`),
                where(documentId(), '<=', `${prefix}_${toStr}`)
            ))
        ));
        return snapshots.flatMap(snap => snap.docs);
    };

    const fetchAllData = async (firestore) => {
        setIsAssignmentsReady(false);
        try {
            const storesRef = collection(firestore, 'artifacts/general-master-data/public/data/stores');
            const employeesRef = collection(firestore, 'artifacts/general-master-data/public/data/employees');
            const workItemsRef = collection(firestore, 'artifacts/general-master-data/public/data/work_items');
            
            const [storesSnapshot, employeesSnapshot, workItemsSnapshot] = await Promise.all([
                getDocs(storesRef), getDocs(employeesRef), getDocs(workItemsRef)
            ]);

            const allStores = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const allowedStoreNames = ["伊賀平野東町店", "伊賀平野北谷店", "伊賀忍者市駅南店"];
            const storesList = allStores.filter(store => allowedStoreNames.includes(store.name));
            storesList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

            // 直近3ヶ月分のみ読み込む（それ以前は必要時に追い読みする）
            const loadFrom = getDefaultLoadFrom();
            const [assignmentDocs, metricsDocs] = await Promise.all([
                fetchDocsInRange(firestore, 'assignments', storesList, loadFrom, '9999-12-31'),
                fetchDocsInRange(firestore, 'hourly_metrics', storesList, loadFrom, '9999-12-31')
            ]);
            loadedFromRef.current = loadFrom;

            const workItemsList = workItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            workItemsList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

            const employeeDataList = [];
            const todayStr = toLocalDateString();
            employeesSnapshot.docs.forEach(doc => {
                const employee = doc.data();
                // 退職済み（retirementDate が今日以前）のスタッフはドロップダウンに出さない
                // （未来の退職日が登録されている人は退職日まで表示される。過去タスクの表示は
                //   TimetableScreen 側で担当者名を選択肢に補完して守る）
                const retirement = typeof employee.retirementDate === 'string' ? employee.retirementDate.trim() : '';
                if (retirement && /^\d{4}-\d{2}-\d{2}$/.test(retirement) && retirement <= todayStr) return;
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
            
            // storeId正規化マップ: 店舗名→正規ID、正規ID→正規ID の双方向マッピング
            // これにより、ドキュメントIDが店舗名でも正規IDでも一貫して正規IDに変換できる
            const storeIdMap = new Map();
            storesList.forEach(store => {
                storeIdMap.set(store.id, store.id);
                storeIdMap.set(store.name, store.id);
            });
            const normalizeStoreId = (rawId) => storeIdMap.get(rawId) || rawId;

            const allAssignments = {};
            assignmentDocs.forEach(doc => {
                const docId = doc.id;
                const idParts = docId.split('_');
                if (idParts.length < 2) return;
                
                const storeIdFromDoc = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

                const storeId = normalizeStoreId(storeIdFromDoc);

                if (!allAssignments[date]) allAssignments[date] = [];
                const tasksWithStoreId = (doc.data().tasks || []).map(t => ({
                  ...t,
                  storeId,
                  isFromTemplate: t.isFromTemplate !== undefined ? t.isFromTemplate : true
                }));
                allAssignments[date].push(...tasksWithStoreId);
            });

            // 旧形式（店舗名）と新形式（正規ID）のドキュメントが両方存在する場合の重複排除
            Object.keys(allAssignments).forEach(date => {
                const seen = new Set();
                allAssignments[date] = allAssignments[date].filter(task => {
                    if (seen.has(task.id)) return false;
                    seen.add(task.id);
                    return true;
                });
            });

            const allMetrics = {};
            metricsDocs.forEach(doc => {
                const docId = doc.id;
                const idParts = docId.split('_');
                if (idParts.length < 2) return;
                
                const storeIdFromDoc = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];

                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

                const storeId = normalizeStoreId(storeIdFromDoc);

                if (!allMetrics[date]) {
                    allMetrics[date] = {};
                }
                allMetrics[date][storeId] = doc.data().hourlyData || {};
            });

            // 読み込んだ内容を3方向マージの基準として記録
            const baseTasks = {}, baseHours = {};
            Object.entries(allAssignments).forEach(([date, tasks]) => {
                baseTasks[date] = new Map(tasks.map(t => [t.id, { worker: t.worker, duration: t.duration }]));
            });
            Object.entries(allMetrics).forEach(([date, byStore]) => {
                const hours = new Set();
                Object.values(byStore).forEach(h => Object.keys(h || {}).forEach(k => hours.add(k)));
                baseHours[date] = hours;
            });
            baseTasksRef.current = baseTasks;
            baseMetricHoursRef.current = baseHours;

            setAssignmentsWithRef(allAssignments);
            setHourlyMetrics(allMetrics);
            setMasterData({ stores: storesList, staff: sortedUniqueStaffNames, workItems: workItemsList });
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsAssignmentsReady(true);
        }
    };

    // 指定日以降のデータが未読み込みなら、不足分（指定日〜読み込み済み最古日の前日）を追加読み込みする
    const ensureDataFrom = async (targetDateStr) => {
        if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) return;
        const loadedFrom = loadedFromRef.current;
        if (!loadedFrom || targetDateStr >= loadedFrom) return;
        if (isLoadingOlderRef.current) return;
        if (masterData.stores.length === 0) return;

        isLoadingOlderRef.current = true;
        try {
            const prev = new Date(loadedFrom + 'T00:00:00');
            prev.setDate(prev.getDate() - 1);
            const toStr = toLocalDateString(prev);

            const [assignmentDocs, metricsDocs] = await Promise.all([
                fetchDocsInRange(db, 'assignments', masterData.stores, targetDateStr, toStr),
                fetchDocsInRange(db, 'hourly_metrics', masterData.stores, targetDateStr, toStr)
            ]);

            const storeIdMap = new Map();
            masterData.stores.forEach(store => {
                storeIdMap.set(store.id, store.id);
                storeIdMap.set(store.name, store.id);
            });
            const normalizeStoreId = (rawId) => storeIdMap.get(rawId) || rawId;

            const olderAssignments = {};
            assignmentDocs.forEach(doc => {
                const idParts = doc.id.split('_');
                if (idParts.length < 2) return;
                const storeIdFromDoc = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
                const storeId = normalizeStoreId(storeIdFromDoc);
                if (!olderAssignments[date]) olderAssignments[date] = [];
                const tasksWithStoreId = (doc.data().tasks || []).map(t => ({
                    ...t,
                    storeId,
                    isFromTemplate: t.isFromTemplate !== undefined ? t.isFromTemplate : true
                }));
                olderAssignments[date].push(...tasksWithStoreId);
            });
            Object.keys(olderAssignments).forEach(date => {
                const seen = new Set();
                olderAssignments[date] = olderAssignments[date].filter(task => {
                    if (seen.has(task.id)) return false;
                    seen.add(task.id);
                    return true;
                });
            });

            const olderMetrics = {};
            metricsDocs.forEach(doc => {
                const idParts = doc.id.split('_');
                if (idParts.length < 2) return;
                const storeIdFromDoc = idParts.slice(0, -1).join('_');
                const date = idParts[idParts.length - 1];
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
                const storeId = normalizeStoreId(storeIdFromDoc);
                if (!olderMetrics[date]) olderMetrics[date] = {};
                olderMetrics[date][storeId] = doc.data().hourlyData || {};
            });

            // 追い読みした分も基準に加える（既に基準がある日付は上書きしない）
            Object.entries(olderAssignments).forEach(([date, tasks]) => {
                if (!baseTasksRef.current[date]) baseTasksRef.current[date] = new Map(tasks.map(t => [t.id, { worker: t.worker, duration: t.duration }]));
            });
            Object.entries(olderMetrics).forEach(([date, byStore]) => {
                if (!baseMetricHoursRef.current[date]) {
                    const hours = new Set();
                    Object.values(byStore).forEach(h => Object.keys(h || {}).forEach(k => hours.add(k)));
                    baseMetricHoursRef.current[date] = hours;
                }
            });

            setAssignmentsWithRef(prev => ({ ...olderAssignments, ...prev }));
            setHourlyMetrics(prev => ({ ...olderMetrics, ...prev }));
            loadedFromRef.current = targetDateStr;
        } catch (error) {
            console.error("Error loading older data:", error);
        } finally {
            isLoadingOlderRef.current = false;
        }
    };
    
    // アプリケーション初期化時に認証フローを実行（Canvas環境向け修正）
    useEffect(() => {
        // ページリロードを検知してセッションストレージをクリア
        // Performance Navigation APIを使用してリロードを検知
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
            const navEntry = navEntries[0];
            if (navEntry && (navEntry.type === 'reload' || (window.performance.navigation && window.performance.navigation.type === 1))) {
                // リロード時はセッションストレージをクリアしてログアウト状態にする
                sessionStorage.removeItem('isLoggedIn');
            }
        }
        
        // beforeunloadイベントでリロード検知（より確実）
        const handleBeforeUnload = (e) => {
            // リロード時にセッションストレージをクリア（既存動作）
            sessionStorage.removeItem('isLoggedIn');
            // 未保存の変更があれば、ブラウザ標準の確認ダイアログを表示
            if (dirtyAssignmentDatesRef.current.size > 0 ||
                dirtyMetricsDatesRef.current.size > 0 ||
                dirtyTemplatesRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
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
            
            // セッションストレージをチェック（ページリロード時は空になる）
            const sessionLogin = sessionStorage.getItem('isLoggedIn');
            
            if (user && sessionLogin === 'true') {
                // セッション中でログイン済みの場合のみ、ユーザー情報を復元
                try {
                    const userProfileRef = doc(db, 'users', user.uid);
                    const userProfileSnap = await getDoc(userProfileRef);

                    if (userProfileSnap.exists()) {
                        const userData = userProfileSnap.data();
                        setCurrentUser({ uid: user.uid, ...userData });
                        setCurrentPage('menu');

                        const templatesDocRef = doc(db, 'templates', userData.storeId);
                        const templateSnap = await getDoc(templatesDocRef);

                        templatesLoadedRef.current = true;
                        setTemplatesWithRef(templateSnap.exists() ? templateSnap.data() : {});
                        setLanes([ { id: 'lane1', name: '1 レジ' }, { id: 'lane2', name: '2 レジ' } ]);
                    } else {
                        // ユーザープロファイルが存在しない場合はログイン画面へ
                        setCurrentUser(null);
                        setCurrentPage('login');
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setCurrentUser(null);
                    setCurrentPage('login');
                } finally {
                    setIsUserDataLoaded(true);
                }
            } else {
                // セッションがない、またはログインしていない場合はログイン画面へ
                setCurrentUser(null);
                setCurrentPage('login');
                setIsUserDataLoaded(true);
            }
            setIsAuthReady(true);
        });

        return () => {
            unsubscribeAuth();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
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
            // 常に ref から最新を参照（編集直後に保存した際のクロージャの古い state で上書きされる不具合を防止）
            const safeAssignments = assignmentsLatestRef.current || {};
            
            // 変更された日付のみ保存する（全日付を一括送信すると Firestore の 10 MiB バッチ上限を超過するため）
            const dirtyAssignmentDates = dirtyAssignmentDatesRef.current;
            const dirtyMetricsDates = dirtyMetricsDatesRef.current;
            const isTemplatesDirty = dirtyTemplatesRef.current;

            const currentStoreName = masterData.stores.find(s => s.id === currentUser.storeId)?.name;

            const assignmentOps = [];
            const mergedTasksByDate = {}; // 保存成功後にローカルstateへ反映するため保持
            for (const date of dirtyAssignmentDates) {
                const dayTasks = safeAssignments[date];
                if (!Array.isArray(dayTasks)) continue;
                const localTasks = dayTasks
                  .filter(t => t.storeId === currentUser.storeId || (currentStoreName && t.storeId === currentStoreName))
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

                // --- 3方向マージ保存: 書き込み直前にDBの最新を読み、他端末の入力を消さない ---
                // 丸ごと上書きによる入力消失事故（2026-08-09 北谷店の深夜0〜8時分が消えた）の再発防止。
                // 「読み込み時点の基準(baseTasksRef)」と突き合わせて、DBにあってローカルに無い
                // タスクの正体を判別する:
                //   基準にあった  → この端末で削除した        → 復活させない
                //   基準に無かった → 他端末が追加・入力した   → 守る
                // （基準が無い日付は判別不能のため、安全側に倒してDB側を守る）
                const docRef = doc(db, 'assignments', `${currentUser.storeId}_${date}`);
                let remoteTasks = [];
                try {
                    const remoteSnap = await getDoc(docRef);
                    if (remoteSnap.exists()) remoteTasks = remoteSnap.data().tasks || [];
                } catch (e) {
                    console.error('Merge read failed (assignments):', e);
                    // 読めない場合は従来どおりローカルのみで保存（保存不能よりまし）
                }

                const localById = new Map(localTasks.map(t => [t.id, t]));
                const hasValue = (v) => v !== undefined && v !== null && v !== '';
                const baseMap = baseTasksRef.current[date];
                // ローカルが空欄のとき、それが「この端末でのリセット」か「他端末の入力」かを
                // 基準の値と突き合わせて判別する。基準からDB側が変わっていれば他端末の入力。
                const changedByOther = (id, field, remoteVal) => {
                    if (!hasValue(remoteVal)) return false;
                    if (!baseMap) return true;                 // 基準不明 → 安全側（DBを守る）
                    if (!baseMap.has(id)) return true;         // 基準に無い → 他端末が作った
                    const baseVal = baseMap.get(id)[field];
                    return String(baseVal ?? '') !== String(remoteVal ?? '');
                };
                const merged = localTasks.map(lt => {
                    const rt = remoteTasks.find(r => r.id === lt.id);
                    if (!rt) return lt;
                    const out = { ...lt };
                    // ローカルが空欄でも、DB側が基準から変わっていなければ「この端末で消した」
                    // とみなして空欄のままにする（↺リセットが効くようにするため）
                    if (!hasValue(lt.worker) && changedByOther(lt.id, 'worker', rt.worker)) out.worker = rt.worker;
                    if (!hasValue(lt.duration) && changedByOther(lt.id, 'duration', rt.duration)) out.duration = rt.duration;
                    return out;
                });
                // リモートにだけ存在するタスクの扱いを、基準と照らして決める
                remoteTasks.forEach(rt => {
                    if (localById.has(rt.id)) return;
                    if (baseMap && baseMap.has(rt.id)) return; // この端末で削除した → 復活させない
                    if (hasValue(rt.worker) || hasValue(rt.duration)) merged.push(rt); // 他端末の入力 → 守る
                });

                mergedTasksByDate[date] = merged;
                if (merged.length > 0) {
                    assignmentOps.push({ docRef, data: { tasks: merged } });
                }
            }

            const metricsOps = [];
            for (const date of dirtyMetricsDates) {
                const storeData = (hourlyMetrics || {})[date];
                if (!storeData) continue;
                const metricsData = storeData[currentUser.storeId] || (currentStoreName && storeData[currentStoreName]);
                if (!metricsData) continue;

                // 時間帯単位で3方向マージ（ローカル優先。ローカルに無い時間帯は、基準にあれば
                // この端末で消した扱いで削除、基準に無ければ他端末の入力として残す）
                const docRef = doc(db, 'hourly_metrics', `${currentUser.storeId}_${date}`);
                let remoteHourly = {};
                try {
                    const remoteSnap = await getDoc(docRef);
                    if (remoteSnap.exists()) remoteHourly = remoteSnap.data().hourlyData || {};
                } catch (e) {
                    console.error('Merge read failed (metrics):', e);
                }
                const baseHours = baseMetricHoursRef.current[date];
                const keptRemoteHourly = {};
                Object.entries(remoteHourly).forEach(([hourKey, value]) => {
                    if (metricsData[hourKey] !== undefined) return;      // ローカル側で扱う
                    if (baseHours && baseHours.has(hourKey)) return;     // この端末で消した → 復活させない
                    keptRemoteHourly[hourKey] = value;                   // 他端末の入力 → 守る
                });
                const mergedHourly = { ...keptRemoteHourly, ...metricsData };
                metricsOps.push({ docRef, data: { hourlyData: mergedHourly } });
            }
            
            const allOps = [...assignmentOps, ...metricsOps];
            if (isTemplatesDirty && templatesLoadedRef.current) {
                const templatesDocRef = doc(db, 'templates', currentUser.storeId);
                allOps.push({ docRef: templatesDocRef, data: templatesLatestRef.current || {} });
            }
            
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
            
            // 保存した内容を次回の基準として更新する（これ以降の削除を正しく判別するため）
            Object.entries(mergedTasksByDate).forEach(([date, merged]) => {
                baseTasksRef.current[date] = new Map(merged.map(t => [t.id, { worker: t.worker, duration: t.duration }]));
            });
            metricsOps.forEach(({ docRef, data }) => {
                const date = docRef.id.split('_').pop();
                baseMetricHoursRef.current[date] = new Set(Object.keys(data.hourlyData || {}));
            });

            // マージで取り込んだ他端末の入力をこの端末の表示にも反映する
            Object.entries(mergedTasksByDate).forEach(([date, merged]) => {
                setAssignmentsWithRef(prev => {
                    const others = (prev[date] || []).filter(t => t.storeId !== currentUser.storeId);
                    const mine = merged.map(t => ({ ...t, storeId: currentUser.storeId, isFromTemplate: t.isFromTemplate !== undefined ? t.isFromTemplate : true }));
                    return { ...prev, [date]: [...others, ...mine] };
                });
            });

            // 保存成功 → dirty フラグをクリア
            dirtyAssignmentDatesRef.current = new Set();
            dirtyMetricsDatesRef.current = new Set();
            dirtyTemplatesRef.current = false;

            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
            
            if (shouldExport && currentPage === 'timetable') handleExportAssignmentsCSV();

        } catch (error) {
            console.error("Error syncing data with Firestore:", error);
            const msg = error.code === 'resource-exhausted'
                ? 'Firestore書き込み制限に達しました。しばらく待ってから再試行してください。'
                : `データの保存に失敗しました。(${error.code || error.message || '不明なエラー'})`;
            setSyncError(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    // 自動保存：変更が止まってから5秒後に、変更分のみ保存する
    // （手動保存と違い CSVエクスポートはしない。isSyncing中は次の変更まで持ち越し）
    useEffect(() => {
        if (dirtyCounter === 0) return;
        if (!currentUser || !isUserDataLoaded || !isAssignmentsReady || !isMasterDataReady) return;
        const timer = setTimeout(() => {
            if (hasUnsavedChanges() && !isSyncing) {
                handleSync(false, false);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [dirtyCounter]);

    // 選択日付の30日前までのデータを確保（直近1週間の平均・定点観測作業の平均計算に必要）
    useEffect(() => {
        if (!isAssignmentsReady) return;
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() - 30);
        ensureDataFrom(toLocalDateString(d));
    }, [selectedDate, isAssignmentsReady]);

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
        setAssignmentsWithRef(prev => ({ ...prev, [csvDate]: [...otherStoresAssignments, ...newTasks] }));
        markAssignmentDirty(csvDate);
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

            // セッションストレージにログイン状態を保存（ページリロード時に失われる）
            sessionStorage.setItem('isLoggedIn', 'true');

            // 状態を更新して即座に画面遷移
            // onAuthStateChangedは認証状態が変わらないと発火しないため、ここで手動セットして画面を切り替える
            setCurrentUser({ uid: user.uid, storeId, staffName });
            setCurrentPage('menu');

            // 選択された店舗のテンプレートデータを読み込む
            try {
                const templatesDocRef = doc(db, 'templates', storeId);
                const templateSnap = await getDoc(templatesDocRef);
                templatesLoadedRef.current = true;
                setTemplatesWithRef(templateSnap.exists() ? templateSnap.data() : {});
                
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
        
        // ログアウト後は次回ログインまでテンプレートを書き込まないようフラグをリセット
        templatesLoadedRef.current = false;
        templatesLatestRef.current = {};
        
        // セッションストレージをクリア
        sessionStorage.removeItem('isLoggedIn');
        
        // ユーザープロファイルを削除して、次回起動時にログイン画面から始まるようにする
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(db, 'users', user.uid));
            } catch (error) {
                console.error("Error deleting user profile:", error);
            }
        }
        
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
            {syncError && <AlertModal message={syncError} onClose={() => setSyncError('')} />}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,text/csv" style={{ display: 'none' }} />
            {(() => {
                switch (currentPage) {
                    case 'menu':
                        return <MenuScreen currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} masterData={masterData} />;
                    case 'timetable':
                        return <TimetableScreen 
                                    db={db} currentUser={currentUser} 
                                    assignments={assignments} setAssignments={setAssignmentsWithRef} 
                                    templates={templates} setTemplates={setTemplatesWithRef} 
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
                                    markAssignmentDirty={markAssignmentDirty}
                                    markMetricsDirty={markMetricsDirty}
                                    markTemplatesDirty={markTemplatesDirty}
                                />;
                    case 'dashboard':
                        return <div className="bg-gray-900 text-white min-h-screen font-sans"><div className="max-w-screen-2xl mx-auto p-2 sm:p-4"><header className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg flex justify-between items-center"><div><h1 className="text-2xl font-bold text-indigo-400">ダッシュボード</h1><span className="text-gray-600 text-xs">v{APP_VERSION}</span></div><div className="flex items-center gap-4"><button onClick={() => handleNavigate('menu')} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={16}/>メニューに戻る</button></div></header><DashboardScreen allAssignments={assignments} hourlyMetrics={hourlyMetrics} currentUser={currentUser} masterData={masterData} lanes={lanes} onEnsureDataFrom={ensureDataFrom} /></div></div>;
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
