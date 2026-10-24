export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
export const isoNow = () => new Date().toISOString();
export const dateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const localDateTime = () => { const d = new Date(); return `${dateStr(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const fromDate = (s) => new Date(`${s}T12:00:00`);
export const addDays = (s, days) => { const d = fromDate(s); d.setDate(d.getDate() + days); return dateStr(d); };
export const diffDays = (a, b) => Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86400000);
export const dayOfWeek = (s) => (fromDate(s).getDay() + 6) % 7;
export const lastDay = (year, month) => new Date(year, month, 0).getDate();
export const monthOffset = (s, n) => { const [y, m, d] = s.split('-').map(Number); const target = new Date(y, m - 1 + n, 1, 12); return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, lastDay(target.getFullYear(), target.getMonth() + 1))).padStart(2, '0')}`; };
export const yearOffset = (s, n) => { const [y, m, d] = s.split('-').map(Number); return `${y + n}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay(y + n, m))).padStart(2, '0')}`; };
export const isValidRange = (r, d) => d >= r.startDate && (!r.endDate || d <= r.endDate);
export function isScheduled(r, d) {
    if (!isValidRange(r, d))
        return false;
    const rule = r.rule;
    if (rule.type === 'daily')
        return true;
    if (rule.type === 'weekday')
        return rule.weekdays.includes(dayOfWeek(d));
    if (rule.type === 'monthly') {
        const [y, m, day] = d.split('-').map(Number);
        return day === Math.min(rule.day, lastDay(y, m));
    }
    if (rule.type === 'yearly') {
        const [y, m, day] = d.split('-').map(Number);
        return m === rule.month && day === Math.min(rule.day, lastDay(y, m));
    }
    if (rule.type === 'interval') {
        const n = Math.max(1, rule.every);
        if (rule.unit === 'days')
            return diffDays(d, r.startDate) % n === 0;
        if (rule.unit === 'weeks')
            return diffDays(d, r.startDate) % (7 * n) === 0;
        const [sy, sm] = r.startDate.split('-').map(Number), [y, m] = d.split('-').map(Number);
        if (rule.unit === 'months') {
            const v = (y - sy) * 12 + m - sm;
            return v >= 0 && v % n === 0 && monthOffset(r.startDate, v) === d;
        }
        const v = y - sy;
        return v >= 0 && v % n === 0 && yearOffset(r.startDate, v) === d;
    }
    return false;
}
export const weekStart = (s) => addDays(s, -dayOfWeek(s));
export const getPeriodStart = (s, unit) => unit === 'week' ? weekStart(s) : `${s.slice(0, 7)}-01`;
export const getPeriodEnd = (s, unit) => unit === 'week' ? addDays(getPeriodStart(s, unit), 6) : `${s.slice(0, 7)}-${lastDay(+s.slice(0, 4), +s.slice(5, 7))}`;
export const inPeriod = (a, b, unit) => getPeriodStart(a, unit) === getPeriodStart(b, unit);
export const emptyState = () => ({ version: 1, updatedAt: isoNow(), categories: [
        { id: 'study', name: '勉強', color: '#6499D5' }, { id: 'life', name: '生活', color: '#60AA86' },
        { id: 'hobby', name: '趣味', color: '#A28DCE' }, { id: 'health', name: '運動', color: '#E47980' },
        { id: 'culture', name: 'イベント', color: '#E6A14B' }
    ], todos: [], routines: [], completions: [], events: [], memos: [] });
export const isDataState = (x) => !!x && typeof x === 'object' && Array.isArray(x.categories) && Array.isArray(x.todos) && Array.isArray(x.routines) && Array.isArray(x.completions) && Array.isArray(x.events) && Array.isArray(x.memos);
export const loadLocal = () => { try {
    const x = JSON.parse(localStorage.getItem('personal-manager-v1') || 'null');
    return isDataState(x) ? x : emptyState();
}
catch {
    return emptyState();
} };
export const labelRule = (r) => { switch (r.type) {
    case 'daily': return '毎日';
    case 'weekday': return `毎週 ${[...r.weekdays].sort().map(x => ['月', '火', '水', '木', '金', '土', '日'][x]).join('・')}曜`;
    case 'monthly': return `毎月${r.day}日`;
    case 'yearly': return `毎年${r.month}/${r.day}`;
    case 'interval': return `${r.every}${{ days: '日', weeks: '週', months: 'か月', years: '年' }[r.unit]}ごと`;
    case 'quota': return `${r.unit === 'week' ? '週' : '月'}${r.count}回`;
} };
export const getColor = (item, data) => { const v = item.color || data.categories.find(c => c.id === item.categoryId)?.color || '#89929D'; return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#89929D'; };
export const getRoutineStat = (r, comps, start, end) => {
    const logs = comps.filter(c => c.routineId === r.id && c.date >= start && c.date <= end && isValidRange(r, c.date));
    let scheduled = 0, completed = 0;
    if (r.rule.type !== 'quota') {
        for (let d = start; d <= end; d = addDays(d, 1)) {
            if (isScheduled(r, d)) {
                scheduled++;
                if (logs.some(c => c.date === d))
                    completed++;
            }
        }
    }
    else {
        const seen = new Set();
        for (let d = start; d <= end; d = addDays(d, 1)) {
            if (!isValidRange(r, d))
                continue;
            const key = getPeriodStart(d, r.rule.unit);
            if (seen.has(key))
                continue;
            seen.add(key);
            const periodStart = getPeriodStart(d, r.rule.unit), periodEnd = getPeriodEnd(d, r.rule.unit);
            const activeStart = r.startDate > periodStart ? r.startDate : periodStart, activeEnd = r.endDate && r.endDate < periodEnd ? r.endDate : periodEnd;
            const overlapStart = start > activeStart ? start : activeStart, overlapEnd = end < activeEnd ? end : activeEnd;
            if (overlapEnd < overlapStart)
                continue;
            const eligible = diffDays(activeEnd, activeStart) + 1, overlap = diffDays(overlapEnd, overlapStart) + 1;
            const goal = Math.min(r.rule.count, eligible) * overlap / eligible;
            scheduled += goal;
            const count = logs.filter(c => c.date >= overlapStart && c.date <= overlapEnd).length;
            completed += Math.min(count, goal);
        }
    }
    return { scheduled, completed, rate: scheduled > 0 ? Math.min(100, Math.round(completed / scheduled * 100)) : null };
};
export const getRoutineProgress = (r, comps, today) => {
    if (r.rule.type !== 'quota') {
        return { done: comps.some(c => c.routineId === r.id && c.date === today), count: comps.some(c => c.routineId === r.id && c.date === today) ? 1 : 0, goal: 1 };
    }
    const { unit, count } = r.rule;
    const x = comps.filter(c => c.routineId === r.id && inPeriod(c.date, today, unit)).length;
    return { done: comps.some(c => c.routineId === r.id && c.date === today), count: x, goal: count };
};
export function historyRows(data, start, end) {
    const rows = [];
    const today = dateStr(), upper = end < today ? end : today;
    for (const t of data.todos) {
        const d = t.completedAt ? dateStr(new Date(t.completedAt)) : t.dueAt?.slice(0, 10);
        if (d && d >= start && d <= end)
            rows.push({ date: d, kind: 'TODO', title: t.title, category: data.categories.find(c => c.id === t.categoryId)?.name || '', status: t.completedAt ? '完了' : '未完了', completedAt: t.completedAt ? new Date(t.completedAt).toLocaleString('ja-JP') : '', notes: t.notes });
    }
    for (const r of data.routines) {
        for (let d = start; d <= upper; d = addDays(d, 1)) {
            if (!isValidRange(r, d))
                continue;
            const c = data.completions.find(x => x.routineId === r.id && x.date === d);
            if (r.rule.type === 'quota' && !c)
                continue;
            if (r.rule.type !== 'quota' && !isScheduled(r, d) && !c)
                continue;
            rows.push({ date: d, kind: 'ルーチン', title: r.title, category: data.categories.find(x => x.id === r.categoryId)?.name || '', status: c ? '完了' : '未実施', completedAt: c ? new Date(c.at).toLocaleString('ja-JP') : '', notes: r.notes });
        }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
const csvSafe = (s) => { let v = String(s ?? ''); if (/^[=+@\-\t\r]/.test(v))
    v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
export const toCSV = (rows) => '\uFEFF' + rows.map(x => x.map(csvSafe).join(',')).join('\r\n') + '\r\n';
export const downloadFile = (name, content, mime) => { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); };
export const exportHistory = (data, start, end) => downloadFile(`履歴_${start}_${end}.csv`, toCSV([['日付', '種別', '項目', 'カテゴリ', '状態', '完了日時', '備考'], ...historyRows(data, start, end).map(x => [x.date, x.kind, x.title, x.category, x.status, x.completedAt, x.notes])]), 'text/csv;charset=utf-8');
export const exportStats = (data, start, end) => downloadFile(`達成率_${start}_${end}.csv`, toCSV([['項目', 'カテゴリ', 'ルール', '予定回数', '達成回数', '達成率(%)'], ...data.routines.map(r => { const stat = getRoutineStat(r, data.completions, start, end); return [r.title, data.categories.find(c => c.id === r.categoryId)?.name || '', labelRule(r.rule), Math.round(stat.scheduled * 10) / 10, Math.round(stat.completed * 10) / 10, stat.rate ?? '']; })]), 'text/csv;charset=utf-8');
