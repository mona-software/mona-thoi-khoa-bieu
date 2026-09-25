import { xepThoiKhoaBieu, checkHardConstraints } from '../dist/index.js';

export function benchmarkInput() {
  const classes = Array.from({ length: 30 }, (_, i) => ({ id: `L${i + 1}` }));
  const teachers = Array.from({ length: 45 }, (_, i) => ({ id: `GV${i + 1}`, unavailable: [] }));
  const subjects = Array.from({ length: 10 }, (_, i) => ({ id: `M${i + 1}`, double: i < 2, heavy: i < 3 }));
  const counts = new Map(), fixed = [];
  // Known feasible witness: each slot has distinct teachers; all 45 teachers teach 20 periods.
  const occupied = teachers.map(() => new Set());
  for (let c = 0; c < 30; c++) for (let slot = 0; slot < 30; slot++) {
    const t = (c + slot * 3) % 45, s = Math.floor(slot / 3);
    const key = JSON.stringify([c, s, t]);
    counts.set(key, (counts.get(key) ?? 0) + 1); occupied[t].add(slot);
    if (slot === 0) fixed.push({ classId: classes[c].id, subjectId: subjects[s].id, teacherId: teachers[t].id, day: 2, period: 1 });
  }
  teachers.forEach((t, i) => {
    const slot = Array.from({ length: 30 }, (_, n) => n).find(s => !occupied[i].has(s));
    t.unavailable.push({ day: 2 + Math.floor(slot / 5), period: 1 + slot % 5 });
  });
  const assignments = [...counts].map(([key, periods]) => { const [c, s, t] = JSON.parse(key); return { classId: classes[c].id, subjectId: subjects[s].id, teacherId: teachers[t].id, periods }; });
  return { classes, teachers, subjects, assignments, fixed };
}
if (process.argv[1]?.endsWith('benchmark.mjs')) {
  const input = benchmarkInput();
  const result = xepThoiKhoaBieu(input, { seed: 42, timeLimitMs: 5000 });
  console.log(JSON.stringify({ classes: 30, teachers: 45, periods: 900, status: result.status, hardErrors: result.status === 'success' ? checkHardConstraints(input, result.lessons) : result.reasons, ...result.stats, penalty: result.penalty }, null, 2));
  if (result.status !== 'success' || result.stats.constructionMs >= 5000 || checkHardConstraints(input, result.lessons).length) process.exitCode = 1;
}
