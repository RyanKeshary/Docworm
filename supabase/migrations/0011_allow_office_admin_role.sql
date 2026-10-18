-- Migration: Allow 'Office Admin' in users role check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('Principal', 'Dean', 'HOD', 'Faculty', 'Office Admin'));
