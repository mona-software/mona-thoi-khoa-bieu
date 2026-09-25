import type { TimetableInput } from './types';
import { InputError, validateInput } from './validation';

/** RFC 4180-style reader: UTF-8 BOM, escaped quotes, multiline fields, comma/semicolon. */
export function parseCsv(text: string): Record<string, string>[] {
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim()) return [];
  let quoted = false, delimiter = ',', commas = 0, semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted; }
    if (!quoted && (ch === '\n' || ch === '\r')) break;
    if (!quoted && ch === ',') commas++;
    if (!quoted && ch === ';') semicolons++;
  }
  if (semicolons > commas) delimiter = ';';
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuote = false, closedQuote = false;
  const pushField = () => { row.push(field); field = ''; closedQuote = false; };
  const pushRow = () => { pushField(); if (row.some(v => v.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuote = false; closedQuote = true; } }
      else field += ch;
    } else if (ch === '"') {
      if (field !== '' || closedQuote) throw new InputError('CSV: dấu nháy sai vị trí.');
      inQuote = true;
    } else if (ch === delimiter) pushField();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else { if (closedQuote) throw new InputError('CSV: ký tự thừa sau dấu nháy đóng.'); field += ch; }
  }
  if (inQuote) throw new InputError('CSV: thiếu dấu nháy đóng.');
  if (field.length || row.length || closedQuote) pushRow();
  if (!rows.length) return [];
  const headers = rows.shift()!.map(normalizeHeader);
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new InputError('CSV: tên cột rỗng hoặc trùng sau khi chuẩn hóa.');
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new InputError(`CSV: dòng dữ liệu ${i + 1} có ${values.length} cột, cần ${headers.length}.`);
    return Object.fromEntries(headers.map((h, j) => [h, values[j].trim()]));
  });
}
function normalizeHeader(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[\s-]+/g, '_');
}
function csvRequired(row: Record<string, string>, column: string, file: string): string {
  if (!row[column]) throw new InputError(`${file}: thiếu cột/giá trị ${column}.`);
  return row[column];
}
function csvInteger(value: string, field: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new InputError(`${field} phải là số nguyên.`);
  return Number(value);
}
function csvBoolean(value: string | undefined, field: string): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (/^(true|1|co|có)$/i.test(value)) return true;
  if (/^(false|0|khong|không)$/i.test(value)) return false;
  throw new InputError(`${field} phải là true/false, 1/0 hoặc có/không.`);
}
export interface CsvInput { lop: string; phanCong: string; ban?: string }
export function inputFromCsv(files: CsvInput): TimetableInput {
  const classRows = parseCsv(files.lop), assignmentRows = parseCsv(files.phanCong), unavailableRows = parseCsv(files.ban ?? '');
  const classes = classRows.map(row => ({ id: csvRequired(row, 'lop', 'lop.csv'), ...(row.ten_lop ? { name: row.ten_lop } : {}) }));
  const teachers = new Map<string, TimetableInput['teachers'][number]>();
  const subjects = new Map<string, TimetableInput['subjects'][number]>();
  const assignments = assignmentRows.map(row => {
    const classId = csvRequired(row, 'lop', 'phan-cong.csv'), subjectId = csvRequired(row, 'mon', 'phan-cong.csv'), teacherId = csvRequired(row, 'giao_vien', 'phan-cong.csv');
    if (!teachers.has(teacherId)) teachers.set(teacherId, { id: teacherId, unavailable: [] });
    const double = csvBoolean(row.tiet_doi, 'tiet_doi'), heavy = csvBoolean(row.mon_nang, 'mon_nang');
    const maxPerDay = row.toi_da_moi_ngay ? csvInteger(row.toi_da_moi_ngay, 'toi_da_moi_ngay') : undefined;
    const subject = subjects.get(subjectId) ?? { id: subjectId };
    for (const [key, value] of Object.entries({ double, heavy, maxPerDay })) {
      if (value === undefined) continue;
      const old = subject[key as keyof typeof subject];
      if (old !== undefined && old !== value) throw new InputError(`Môn ${subjectId}: cấu hình ${key} không nhất quán giữa các dòng CSV.`);
      Object.assign(subject, { [key]: value });
    }
    subjects.set(subjectId, subject);
    return { classId, subjectId, teacherId, periods: csvInteger(csvRequired(row, 'so_tiet', 'phan-cong.csv'), 'so_tiet') };
  });
  for (const row of unavailableRows) {
    const teacherId = csvRequired(row, 'giao_vien', 'ban.csv'), teacher = teachers.get(teacherId);
    if (!teacher) throw new InputError(`ban.csv: GV ${teacherId} chưa có trong phân công.`);
    teacher.unavailable!.push({ day: csvInteger(csvRequired(row, 'thu', 'ban.csv'), 'thu'), period: csvInteger(csvRequired(row, 'tiet', 'ban.csv'), 'tiet') });
  }
  const input = { classes, teachers: [...teachers.values()], subjects: [...subjects.values()], assignments };
  validateInput(input); return input;
}

/** BOM + CRLF for Excel; text starting with a formula marker is escaped. */
export function encodeCsv(rows: (string | number)[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\r\n') + '\r\n';
}
