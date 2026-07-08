-- 014_registrar_role_enum.sql
-- Registrar epic, sub-épico A (foundation): add the 'registrar' role.
--
-- This is kept as its own migration file, with nothing else in it, because PostgreSQL does not
-- allow a newly added enum value to be used (in a policy, function, or check constraint) within
-- the same transaction that added it. Migration 015 depends on this one having been committed
-- first.

alter type public.user_role add value if not exists 'registrar';
