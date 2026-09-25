import type { Lesson, SolverOptions, TimetableInput, TimetableResult, SoftWeights } from './types';
import { assignmentKey, calendarOf, InputError, slotKey, validateInput } from './validation';
import { DEFAULT_WEIGHTS, scoreTimetable } from './score';

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
interface Unit { a: number; c: number; t: number; s: number; fixed: boolean }

/** Synchronous and browser-safe. Run in a Web Worker to keep a UI responsive. */
export function xepThoiKhoaBieu(input: TimetableInput, options: SolverOptions = {}): TimetableResult {
  const start = performance.now();
  validateInput(input);
  const seed = options.seed ?? 42;
  const timeLimitMs = options.timeLimitMs ?? 5000;
  const maxIterations = options.maxIterations ?? 2500;
  const maxRestarts = options.maxRestarts ?? 20;
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new InputError('seed phải là số nguyên 0–4294967295.');
  if (!Number.isFinite(timeLimitMs) || timeLimitMs <= 0) throw new InputError('timeLimitMs phải lớn hơn 0 và hữu hạn.');
  if (!Number.isSafeInteger(maxIterations) || maxIterations < 0 || !Number.isSafeInteger(maxRestarts) || maxRestarts < 1) throw new InputError('maxIterations phải nguyên không âm; maxRestarts phải nguyên dương.');
  const weights: SoftWeights = { ...DEFAULT_WEIGHTS, ...options.weights };
  for (const [key, value] of Object.entries(weights)) if (!(key in DEFAULT_WEIGHTS) || !Number.isFinite(value) || value < 0) throw new InputError(`Trọng số ${key} phải hữu hạn, không âm và có tên hợp lệ.`);
  const random = rng(seed);
  const deadline = start + timeLimitMs;
  const calendar = calendarOf(input);
  const slots = calendar.days.flatMap(day => calendar.periods.map(p => ({ day, period: p.id })));
  const width = calendar.periods.length;
  const size = slots.length;
  const classes = new Map(input.classes.map((c, i) => [c.id, i]));
  const teachers = new Map(input.teachers.map((t, i) => [t.id, i]));
  const subjects = new Map(input.subjects.map((s, i) => [s.id, i]));
  const slotIds = new Map(slots.map((s, i) => [slotKey(s), i]));
  const classAllowed = input.classes.map(c => c.available === undefined ? new Set(slots.map((_, i) => i)) : new Set(c.available.map(s => slotIds.get(slotKey(s))!)));
  const teacherBlocked = input.teachers.map(t => new Set((t.unavailable ?? []).map(s => slotIds.get(slotKey(s))!)));
  const allowed = input.assignments.map(a => [...classAllowed[classes.get(a.classId)!]].filter(s => !teacherBlocked[teachers.get(a.teacherId)!].has(s)));
  const allowedSets = allowed.map(a => new Set(a));
  const reasons: string[] = [];
  let restarts = 0, iterations = 0, constructionMs = 0;
  let initialPenalty: number | null = null;
  const result = (status: TimetableResult['status'], lessons: Lesson[] = []): TimetableResult => {
    const scored = status === 'success' ? scoreTimetable(input, lessons, weights) : { penalty: null, violations: [] };
    return { status, lessons, ...scored, reasons, stats: { seed, elapsedMs: performance.now() - start, constructionMs, restarts, iterations, initialPenalty } };
  };
  for (const c of input.classes) {
    const total = input.assignments.filter(a => a.classId === c.id).reduce((s, a) => s + a.periods, 0);
    const capacity = classAllowed[classes.get(c.id)!].size;
    if (total > capacity) reasons.push(`Lớp ${c.name ?? c.id} được phân ${total} tiết nhưng chỉ có ${capacity} ô trống.`);
  }
  for (const t of input.teachers) {
    const total = input.assignments.filter(a => a.teacherId === t.id).reduce((s, a) => s + a.periods, 0);
    const capacity = size - teacherBlocked[teachers.get(t.id)!].size;
    if (total > capacity) reasons.push(`GV ${t.name ?? t.id} được phân ${total} tiết nhưng chỉ có ${capacity} ô trống.`);
  }
  input.assignments.forEach((a, i) => { if (a.periods > allowed[i].length) reasons.push(`${a.classId}/${a.subjectId}/GV ${a.teacherId}: cần ${a.periods} tiết nhưng chỉ có ${allowed[i].length} ô phù hợp.`); });
  // Check capacities before expanding counts supplied by untrusted JSON.
  if (reasons.length) return result('infeasible');
  const units: Unit[] = [];
  const byAssignment: number[][] = input.assignments.map(() => []);
  input.assignments.forEach((a, i) => {
    for (let j = 0; j < a.periods; j++) {
      byAssignment[i].push(units.length);
      units.push({ a: i, c: classes.get(a.classId)!, t: teachers.get(a.teacherId)!, s: subjects.get(a.subjectId)!, fixed: false });
    }
  });
  const positions = new Int32Array(units.length).fill(-1);
  const classGrid = input.classes.map(() => new Int32Array(size).fill(-1));
  const teacherGrid = input.teachers.map(() => new Int32Array(size).fill(-1));
  const put = (id: number, slot: number) => {
    const u = units[id], old = positions[id];
    if (old >= 0) { classGrid[u.c][old] = -1; teacherGrid[u.t][old] = -1; }
    positions[id] = slot;
    if (slot >= 0) { classGrid[u.c][slot] = id; teacherGrid[u.t][slot] = id; }
  };
  const fixedCounts = new Map<string, number>();
  const assignmentIds = new Map(input.assignments.map((a, i) => [assignmentKey(a), i]));
  for (const f of input.fixed ?? []) {
    const key = assignmentKey(f), a = assignmentIds.get(key)!;
    const count = fixedCounts.get(key) ?? 0;
    if (count >= byAssignment[a].length) { reasons.push(`${f.classId}/${f.subjectId}: số tiết cố định vượt số tiết phân công.`); continue; }
    fixedCounts.set(key, count + 1);
    const id = byAssignment[a][count], u = units[id], s = slotIds.get(slotKey(f))!;
    if (!allowedSets[a].has(s)) { reasons.push(`Tiết cố định ${f.classId}/${f.subjectId} thứ ${f.day} tiết ${f.period} trùng lịch bận hoặc ngoài lịch lớp.`); continue; }
    if (classGrid[u.c][s] >= 0 || teacherGrid[u.t][s] >= 0) { reasons.push(`Tiết cố định thứ ${f.day} tiết ${f.period} trùng lớp ${f.classId} hoặc GV ${f.teacherId}.`); continue; }
    units[id].fixed = true; put(id, s);
  }
  if (reasons.length) return result('infeasible');
  // Necessary matching checks catch Hall conflicts caused by availability/fixed lessons.
  for (const kind of ['class', 'teacher'] as const) {
    const groups = kind === 'class' ? input.classes : input.teachers;
    for (let group = 0; group < groups.length; group++) {
      const pending = units.map((u, id) => ({ u, id })).filter(({ u }) => !u.fixed && (kind === 'class' ? u.c : u.t) === group);
      const matched = new Int32Array(size).fill(-1);
      const visit = (id: number, seen: Uint8Array): boolean => {
        const u = units[id];
        for (const s of allowed[u.a]) {
          if (seen[s] || classGrid[u.c][s] >= 0 || teacherGrid[u.t][s] >= 0) continue;
          seen[s] = 1;
          if (matched[s] < 0 || visit(matched[s], seen)) { matched[s] = id; return true; }
        }
        return false;
      };
      for (const { id } of pending) {
        if (performance.now() >= deadline) { reasons.push('Hết thời gian trong bước kiểm tra khả thi.'); return result('timeout'); }
        if (!visit(id, new Uint8Array(size))) {
          reasons.push(`${kind === 'class' ? 'Lớp' : 'GV'} ${groups[group].name ?? groups[group].id}: không đủ ô khác nhau phù hợp với lịch bận, lịch lớp và tiết cố định.`);
          return result('infeasible');
        }
      }
    }
  }
  const fixedPositions = positions.slice();
  const restore = (saved: Int32Array) => {
    positions.fill(-1); classGrid.forEach(g => g.fill(-1)); teacherGrid.forEach(g => g.fill(-1));
    saved.forEach((s, id) => { if (s >= 0) put(id, s); });
  };
  const slotHint = (id: number, slot: number) => {
    const u = units[id], subject = input.subjects[u.s], dayStart = Math.floor(slot / width) * width;
    let count = 0;
    for (let s = dayStart; s < dayStart + width; s++) {
      const other = classGrid[u.c][s]; if (other >= 0 && units[other].s === u.s) count++;
    }
    let hint = count * weights.spread + Math.max(0, count + 1 - (subject.maxPerDay ?? 2)) * weights.dailyLimit;
    const p = slot % width, period = calendar.periods[p];
    const sessionPosition = calendar.periods.slice(0, p).filter(x => x.session === period.session).length;
    if (subject.heavy && sessionPosition >= 3) hint += weights.heavy;
    for (const offset of [-1, 1]) {
      const next = p + offset;
      if (next < 0 || next >= width || calendar.periods[next].session !== period.session) continue;
      const other = classGrid[u.c][dayStart + next];
      if (subject.double && other >= 0 && units[other].s === u.s && units[other].t === u.t) hint -= weights.double;
    }
    return hint;
  };
  let complete = false;
  for (let attempt = 0; attempt < maxRestarts && performance.now() < deadline; attempt++) {
    restarts = attempt;
    restore(fixedPositions);
    const remaining = byAssignment.map(ids => ids.filter(id => !units[id].fixed));
    let left = units.filter(u => !u.fixed).length;
    while (left > 0 && performance.now() < deadline) {
      let selected = -1, difficulty = Infinity;
      for (let a = 0; a < remaining.length; a++) {
        if (!remaining[a].length) continue;
        const u = units[remaining[a][0]];
        const free = allowed[a].filter(s => classGrid[u.c][s] < 0 && teacherGrid[u.t][s] < 0).length;
        const rank = free - remaining[a].length + random() * 0.9;
        if (rank < difficulty) { difficulty = rank; selected = a; }
      }
      const id = remaining[selected].pop()!;
      let nodes = 0;
      const history: [number, number][] = [];
      const move = (unit: number, slot: number) => { history.push([unit, positions[unit]]); put(unit, slot); };
      const rollback = (length: number) => { while (history.length > length) { const [unit, old] = history.pop()!; put(unit, old); } };
      const active = new Set<number>();
      const place = (unit: number, depth: number): boolean => {
        if (++nodes > 2000 || (nodes % 32 === 0 && performance.now() >= deadline)) return false;
        const u = units[unit];
        active.add(unit);
        const candidates = allowed[u.a].map(slot => {
          const conflicts = [...new Set([classGrid[u.c][slot], teacherGrid[u.t][slot]].filter(n => n >= 0))];
          return { slot, conflicts, score: conflicts.length * 1000 + slotHint(unit, slot) + random() * 3 };
        }).filter(x => x.conflicts.every(n => !units[n].fixed && !active.has(n)) && (depth > 0 || x.conflicts.length === 0)).sort((a, b) => a.score - b.score);
        for (const candidate of candidates.slice(0, 12)) {
          const checkpoint = history.length;
          for (const other of candidate.conflicts) move(other, -1);
          move(unit, candidate.slot);
          let ok = true;
          for (const other of candidate.conflicts) {
            // An earlier relocation can have already placed this displaced unit.
            if (positions[other] < 0 && !place(other, depth - 1)) { ok = false; break; }
          }
          if (ok) { active.delete(unit); return true; }
          rollback(checkpoint);
          if (nodes > 2000 || performance.now() >= deadline) break;
        }
        active.delete(unit); return false;
      };
      if (!place(id, 7)) break;
      left--;
    }
    if (positions.every(s => s >= 0)) { complete = true; break; }
  }
  constructionMs = performance.now() - start;
  if (!complete) {
    const timedOut = performance.now() >= deadline;
    reasons.push(timedOut ? 'Hết timeLimitMs trước khi tìm được lịch đầy đủ; chưa kết luận vô nghiệm.' : 'Đã hết số lần thử; chưa tìm được lịch đầy đủ và chưa chứng minh vô nghiệm. Thử seed hoặc maxRestarts khác.');
    return result(timedOut ? 'timeout' : 'search_exhausted');
  }
  const sessionStarts = calendar.periods.map((p, i) => i === 0 || calendar.periods[i - 1].session !== p.session);
  const sessionOffsets = calendar.periods.map((p, i) => calendar.periods.slice(0, i).filter(q => q.session === p.session).length);
  const classPenalty = (c: number): number => {
    let penalty = 0;
    const counts = new Map<number, number[]>(), totals = new Map<number, number>(), pairs = new Map<number, number>();
    for (let day = 0; day < calendar.days.length; day++) {
      let pairedPrevious = false;
      for (let p = 0; p < width; p++) {
        const id = classGrid[c][day * width + p];
        if (id < 0) { pairedPrevious = false; continue; }
        const u = units[id], subject = input.subjects[u.s];
        if (!counts.has(u.s)) counts.set(u.s, calendar.days.map(() => 0));
        counts.get(u.s)![day]++; totals.set(u.s, (totals.get(u.s) ?? 0) + 1);
        if (subject.heavy && sessionOffsets[p] >= 3) penalty += weights.heavy;
        const prev = p > 0 ? classGrid[c][day * width + p - 1] : -1;
        const pair: boolean = !pairedPrevious && !sessionStarts[p] && prev >= 0 && units[prev].s === u.s && units[prev].t === u.t;
        if (pair) pairs.set(u.s, (pairs.get(u.s) ?? 0) + 1);
        pairedPrevious = pair;
      }
    }
    for (const [s, daily] of counts) {
      const subject = input.subjects[s], total = totals.get(s)!, q = Math.floor(total / daily.length), r = total % daily.length;
      penalty += daily.reduce((sum, n) => sum + Math.max(0, n - (subject.maxPerDay ?? 2)), 0) * weights.dailyLimit;
      penalty += (daily.reduce((sum, n) => sum + n * n, 0) - r * (q + 1) ** 2 - (daily.length - r) * q ** 2) / 2 * weights.spread;
      if (subject.double) penalty += Math.max(0, Math.floor(total / 2) - (pairs.get(s) ?? 0)) * weights.double;
    }
    return penalty;
  };
  const teacherPenalty = (t: number): number => {
    let gaps = 0;
    for (let day = 0; day < calendar.days.length; day++) {
      let seen = false, empty = 0;
      for (let p = 0; p < width; p++) {
        if (sessionStarts[p]) { seen = false; empty = 0; }
        if (teacherGrid[t][day * width + p] >= 0) { if (seen) gaps += empty; seen = true; empty = 0; }
        else if (seen) empty++;
      }
    }
    return gaps * weights.gaps;
  };
  let current = input.classes.reduce((sum, _, c) => sum + classPenalty(c), 0) + input.teachers.reduce((sum, _, t) => sum + teacherPenalty(t), 0);
  initialPenalty = current;
  let best = current, bestPositions = positions.slice();
  const movable = units.map((_, id) => id).filter(id => !units[id].fixed);
  for (let i = 0; movable.length && i < maxIterations && performance.now() < deadline; i++) {
    iterations++;
    const a = movable[Math.floor(random() * movable.length)], ua = units[a], from = positions[a];
    const to = allowed[ua.a][Math.floor(random() * allowed[ua.a].length)];
    if (to === from) continue;
    const b = classGrid[ua.c][to], ub = b >= 0 ? units[b] : null;
    if (ub && (ub.fixed || !allowedSets[ub.a].has(from))) continue;
    const busyA = teacherGrid[ua.t][to];
    if (busyA >= 0 && busyA !== b) continue;
    if (ub) { const busyB = teacherGrid[ub.t][from]; if (busyB >= 0 && busyB !== a) continue; }
    const affectedTeachers = [...new Set([ua.t, ...(ub ? [ub.t] : [])])];
    const before = classPenalty(ua.c) + affectedTeachers.reduce((sum, t) => sum + teacherPenalty(t), 0);
    put(a, -1); if (b >= 0) put(b, -1);
    put(a, to); if (b >= 0) put(b, from);
    const after = classPenalty(ua.c) + affectedTeachers.reduce((sum, t) => sum + teacherPenalty(t), 0);
    const delta = after - before, temperature = Math.max(0.1, 8 * (1 - i / maxIterations));
    if (delta <= 0 || random() < Math.exp(-delta / temperature)) {
      current += delta;
      if (current < best) { best = current; bestPositions = positions.slice(); }
    } else {
      put(a, -1); if (b >= 0) put(b, -1);
      put(a, from); if (b >= 0) put(b, to);
    }
  }
  restore(bestPositions);
  const lessons: Lesson[] = units.map((u, id) => {
    const { periods: _periods, ...assignment } = input.assignments[u.a];
    return { ...assignment, ...slots[positions[id]], fixed: u.fixed };
  }).sort((a, b) => a.classId.localeCompare(b.classId, 'vi') || a.day - b.day || slotIds.get(slotKey(a))! - slotIds.get(slotKey(b))!);
  const hardErrors = checkHardConstraints(input, lessons);
  if (hardErrors.length) throw new Error(`Lỗi nội bộ: ${hardErrors.join('; ')}`);
  return result('success', lessons);
}

/** Independent verifier, useful when loading previously exported schedules. */
export function checkHardConstraints(input: TimetableInput, lessons: Lesson[]): string[] {
  validateInput(input);
  const errors: string[] = [], classSlots = new Set<string>(), teacherSlots = new Set<string>();
  const counts = new Map<string, number>();
  const calendar = calendarOf(input);
  const validSlots = new Set(calendar.days.flatMap(day => calendar.periods.map(p => slotKey({ day, period: p.id }))));
  const assignments = new Set(input.assignments.map(assignmentKey));
  for (const lesson of lessons) {
    const key = assignmentKey(lesson), slot = slotKey(lesson);
    if (!assignments.has(key)) { errors.push('Tiết học không thuộc phân công.'); continue; }
    if (!validSlots.has(slot)) errors.push('Tiết học ngoài lịch.');
    const c = JSON.stringify([lesson.classId, slot]), t = JSON.stringify([lesson.teacherId, slot]);
    if (classSlots.has(c)) errors.push(`Trùng lớp ${lesson.classId} tại ${slot}.`);
    if (teacherSlots.has(t)) errors.push(`Trùng GV ${lesson.teacherId} tại ${slot}.`);
    classSlots.add(c); teacherSlots.add(t); counts.set(key, (counts.get(key) ?? 0) + 1);
    const schoolClass = input.classes.find(c => c.id === lesson.classId)!;
    if (schoolClass.available && !schoolClass.available.some(s => slotKey(s) === slot)) errors.push(`Lớp ${lesson.classId} học ngoài lịch cho phép.`);
    if (input.teachers.find(t => t.id === lesson.teacherId)!.unavailable?.some(s => slotKey(s) === slot)) errors.push(`GV ${lesson.teacherId} trùng lịch bận.`);
  }
  for (const a of input.assignments) if (counts.get(assignmentKey(a)) !== a.periods) errors.push(`${a.classId}/${a.subjectId}/${a.teacherId} không đủ số tiết (${counts.get(assignmentKey(a)) ?? 0}/${a.periods}).`);
  for (const f of input.fixed ?? []) if (!lessons.some(l => assignmentKey(l) === assignmentKey(f) && slotKey(l) === slotKey(f) && l.fixed)) errors.push(`Thiếu tiết cố định ${f.classId} tại ${slotKey(f)}.`);
  return errors;
}
