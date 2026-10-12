-- Docworm 0013: new organizing bodies (DLLE, R&D Cell, T&P Cell) and
-- audience Other option. Merges into the stored settings row so live
-- deployments pick them up; fresh seeds already carry them via DEFAULT_OPTIONS.

UPDATE public.docworm_settings
SET options = COALESCE(options, '{}'::jsonb)
  || jsonb_build_object(
    'organizingBodies',
    COALESCE(
      (SELECT jsonb_agg(DISTINCT v) FROM (
        SELECT jsonb_array_elements_text(COALESCE(options->'organizingBodies', '[]'::jsonb)) AS v
        UNION ALL
        SELECT unnest(ARRAY['Department','Student Council','SWDC','IIC','NSS','DLLE','R&D Cell','T&P Cell','Other'])
      ) s),
      '[]'::jsonb
    ),
    'audiences',
    COALESCE(
      (SELECT jsonb_agg(DISTINCT v) FROM (
        SELECT jsonb_array_elements_text(COALESCE(options->'audiences', '[]'::jsonb)) AS v
        UNION ALL
        SELECT unnest(ARRAY['Students','Staff','Both','External participants','Alumni','Other'])
      ) s),
      '[]'::jsonb
    )
  ),
  updated_at = NOW()
WHERE id = 1;

INSERT INTO public.docworm_settings (id, options, letterhead, updated_at)
SELECT 1,
  jsonb_build_object(
    'organizingBodies', to_jsonb(ARRAY['Department','Student Council','SWDC','IIC','NSS','DLLE','R&D Cell','T&P Cell','Other']),
    'audiences', to_jsonb(ARRAY['Students','Staff','Both','External participants','Alumni','Other'])
  ),
  '{}'::jsonb, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.docworm_settings WHERE id = 1);
