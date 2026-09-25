import { mkdir, writeFile } from 'node:fs/promises';
// Illustrative allocations, not an official curriculum or real school's data.
const classes = [6, 7, 8, 9].flatMap(grade => [1, 2, 3].map(n => ({ id: `${grade}A${n}` })));
const teacherNames = ['Lan', 'Minh', 'Hương', 'Tuấn', 'Hoa', 'Nam', 'Hà', 'Phong', 'Mai', 'Hùng', 'Ngọc', 'Sơn', 'Linh', 'Quân', 'Thảo', 'An', 'Bình', 'Chi', 'Dũng', 'Yến'];
const teachers = teacherNames.map((name, i) => ({ id: `GV${String(i + 1).padStart(2, '0')}`, name, unavailable: [{ day: 3 + i % 4, period: 1 + i % 5 }] }));
const subjects = [
  { id: 'Toan', name: 'Toán', heavy: true, double: true },
  { id: 'Van', name: 'Ngữ văn', double: true },
  { id: 'Anh', name: 'Tiếng Anh' },
  { id: 'KHTN', name: 'Khoa học tự nhiên', heavy: true },
  { id: 'LSDL', name: 'Lịch sử và Địa lí' },
  { id: 'Tin', name: 'Tin học' }, { id: 'CongNghe', name: 'Công nghệ' },
  { id: 'GDCD', name: 'Giáo dục công dân' }, { id: 'GDTC', name: 'Giáo dục thể chất' },
  { id: 'NgheThuat', name: 'Nghệ thuật' }, { id: 'HDTN', name: 'Hoạt động trải nghiệm' },
  { id: 'ChaoCo', name: 'Chào cờ' }, { id: 'SinhHoat', name: 'Sinh hoạt lớp' },
  { id: 'GDDP', name: 'Giáo dục địa phương' },
];
const curriculum = [['Toan', 4], ['Van', 4], ['Anh', 3], ['KHTN', 4], ['LSDL', 3], ['Tin', 1], ['CongNghe', 1], ['GDCD', 1], ['GDTC', 2], ['NgheThuat', 2], ['HDTN', 1], ['ChaoCo', 1], ['SinhHoat', 1], ['GDDP', 1]];
const assignments = [], fixed = [];
classes.forEach((c, index) => {
  curriculum.forEach(([subjectId, periods], s) => {
    const teacherIndex = s < 5 ? s * 2 + index % 2 : s < 10 ? s + 5 : s < 13 ? index : 15 + index % 5;
    const a = { classId: c.id, subjectId, teacherId: teachers[teacherIndex].id, periods };
    assignments.push(a);
    if (subjectId === 'ChaoCo' || subjectId === 'SinhHoat') fixed.push({ classId: a.classId, subjectId, teacherId: a.teacherId, day: subjectId === 'ChaoCo' ? 2 : 7, period: subjectId === 'ChaoCo' ? 1 : 5 });
  });
});
const school = { classes, teachers, subjects, assignments, fixed };
await mkdir('examples/thcs', { recursive: true });
await writeFile('examples/thcs/input.json', JSON.stringify(school, null, 2) + '\n');
await writeFile('examples/thcs/lop.csv', 'lop,ten_lop\n' + classes.map(c => `${c.id},Lớp ${c.id}`).join('\n') + '\n');
await writeFile('examples/thcs/phan-cong.csv', 'lop,mon,giao_vien,so_tiet,tiet_doi,mon_nang,toi_da_moi_ngay\n' + assignments.map(a => {
  const s = subjects.find(s => s.id === a.subjectId);
  return [a.classId, s.name, a.teacherId, a.periods, s.double ?? false, s.heavy ?? false, 2].join(',');
}).join('\n') + '\n');
await writeFile('examples/thcs/ban.csv', 'giao_vien,thu,tiet\n' + teachers.flatMap(t => t.unavailable.map(s => `${t.id},${s.day},${s.period}`)).join('\n') + '\n');
const centre = {
  calendar: { days: [2, 3, 4, 5, 6, 7], periods: [{ id: 1, label: 'Ca 1 · 17:30', session: 'toi' }, { id: 2, label: 'Ca 2 · 18:30', session: 'toi' }, { id: 3, label: 'Ca 3 · 19:30', session: 'toi' }] },
  classes: [ { id: 'Starters', available: [2, 4, 6].flatMap(day => [1, 2].map(period => ({ day, period }))) }, { id: 'Movers' }, { id: 'IELTS' } ],
  teachers: [{ id: 'Mai', unavailable: [{ day: 3, period: 1 }] }, { id: 'David', unavailable: [{ day: 7, period: 3 }] }],
  subjects: [{ id: 'English', name: 'Tiếng Anh', double: true }, { id: 'Speaking', name: 'Giao tiếp' }],
  assignments: [ { classId: 'Starters', subjectId: 'English', teacherId: 'Mai', periods: 4 }, { classId: 'Movers', subjectId: 'English', teacherId: 'Mai', periods: 4 }, { classId: 'IELTS', subjectId: 'English', teacherId: 'David', periods: 4 }, { classId: 'IELTS', subjectId: 'Speaking', teacherId: 'Mai', periods: 2 } ],
  fixed: [{ classId: 'Starters', subjectId: 'English', teacherId: 'Mai', day: 2, period: 1 }],
};
await mkdir('examples/trung-tam', { recursive: true });
await writeFile('examples/trung-tam/input.json', JSON.stringify(centre, null, 2) + '\n');
console.log('Đã tạo dữ liệu mẫu THCS 12 lớp/20 GV và trung tâm 3 ca tối.');
