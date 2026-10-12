-- Docworm 0014: drop IIC from organizing bodies (no IIC cell in the college).
-- Also moves the one seeded proposal that used it to Department.

-- Guarantee the exact desired list.
UPDATE public.docworm_settings
SET options = COALESCE(options, '{}'::jsonb) || jsonb_build_object(
    'organizingBodies',
    to_jsonb(ARRAY['Department','Student Council','SWDC','NSS','DLLE','R&D Cell','T&P Cell','Other'])
  ),
  updated_at = NOW()
WHERE id = 1;

UPDATE public.docworm_proposals
SET organizing_body = 'Department', updated_at = NOW()
WHERE organizing_body = 'IIC';
