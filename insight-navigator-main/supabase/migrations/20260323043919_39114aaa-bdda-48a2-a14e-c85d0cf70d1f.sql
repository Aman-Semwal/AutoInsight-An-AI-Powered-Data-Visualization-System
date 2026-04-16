CREATE OR REPLACE FUNCTION public.restore_project_snapshot(
  _snapshot_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _project_id UUID;
  _snapshot_data JSONB;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT project_id, snapshot_data
  INTO _project_id, _snapshot_data
  FROM public.project_snapshots
  WHERE id = _snapshot_id
    AND user_id = _user_id;

  IF _project_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot not found';
  END IF;

  DELETE FROM public.visualizations
  WHERE project_id = _project_id
    AND user_id = _user_id;

  DELETE FROM public.datasets
  WHERE project_id = _project_id
    AND user_id = _user_id;

  UPDATE public.projects
  SET
    name = COALESCE(_snapshot_data->'project'->>'name', name),
    description = COALESCE(_snapshot_data->'project'->>'description', description),
    tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(_snapshot_data->'project'->'tags', '[]'::jsonb))), tags),
    thumbnail_config = COALESCE(_snapshot_data->'project'->'thumbnail_config', thumbnail_config),
    ai_summary = COALESCE(_snapshot_data->'project'->>'ai_summary', ai_summary),
    last_opened_at = now(),
    is_template = COALESCE((_snapshot_data->'project'->>'is_template')::BOOLEAN, is_template),
    template_category = COALESCE(_snapshot_data->'project'->>'template_category', template_category),
    last_edited_by = COALESCE(_snapshot_data->'project'->>'last_edited_by', last_edited_by),
    updated_at = now()
  WHERE id = _project_id
    AND user_id = _user_id;

  INSERT INTO public.datasets (
    id, user_id, project_id, name, file_type, file_url, file_size,
    row_count, column_count, status, created_at, updated_at, columns,
    ai_insights, quality_report, preview_rows, last_opened_at, tags
  )
  SELECT
    d.id, d.user_id, d.project_id, d.name, d.file_type, d.file_url, d.file_size,
    d.row_count, d.column_count, d.status, d.created_at, now(), d.columns,
    d.ai_insights, COALESCE(d.quality_report, '{}'::jsonb), COALESCE(d.preview_rows, '[]'::jsonb), d.last_opened_at,
    COALESCE(d.tags, ARRAY[]::TEXT[])
  FROM jsonb_to_recordset(COALESCE(_snapshot_data->'datasets', '[]'::jsonb)) AS d(
    id UUID,
    user_id UUID,
    project_id UUID,
    name TEXT,
    file_type TEXT,
    file_url TEXT,
    file_size BIGINT,
    row_count INTEGER,
    column_count INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    columns JSONB,
    ai_insights JSONB,
    quality_report JSONB,
    preview_rows JSONB,
    last_opened_at TIMESTAMPTZ,
    tags TEXT[]
  );

  INSERT INTO public.visualizations (
    id, user_id, dataset_id, project_id, config, created_at, name, chart_type, updated_at, ai_explanation
  )
  SELECT
    v.id, v.user_id, v.dataset_id, v.project_id, v.config, v.created_at, v.name, v.chart_type, now(), v.ai_explanation
  FROM jsonb_to_recordset(COALESCE(_snapshot_data->'visualizations', '[]'::jsonb)) AS v(
    id UUID,
    user_id UUID,
    dataset_id UUID,
    project_id UUID,
    config JSONB,
    created_at TIMESTAMPTZ,
    name TEXT,
    chart_type TEXT,
    updated_at TIMESTAMPTZ,
    ai_explanation TEXT
  );

  INSERT INTO public.project_activity(project_id, user_id, activity_type, activity_label, metadata)
  VALUES (_project_id, _user_id, 'snapshot_restored', 'Project restored from snapshot', jsonb_build_object('snapshot_id', _snapshot_id));

  RETURN _project_id;
END;
$$;