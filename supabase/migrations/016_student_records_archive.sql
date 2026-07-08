-- 016_student_records_archive.sql
-- Registrar epic, sub-épico B (student records): "archive" a student record without ever
-- permanently deleting it (per the epic's explicit restriction). A nullable timestamp is enough —
-- archived students are simply excluded from the default list view.

alter table public.profiles add column if not exists archived_at timestamptz;
