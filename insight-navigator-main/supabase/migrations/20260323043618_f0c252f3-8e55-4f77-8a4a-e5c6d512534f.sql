-- Add dataset versioning, upload activity, project metadata, snapshots, collaborators, and templates support
CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'upload',
  file_url TEXT,
  file_size BIGINT,
  row_count INTEGER DEFAULT 0,
  column_count INTEGER DEFAULT 0,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, version_number)
);

ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dataset versions"
ON public.dataset_versions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dataset versions"
ON public.dataset_versions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dataset versions"
ON public.dataset_versions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dataset versions"
ON public.dataset_versions
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset_created
ON public.dataset_versions(dataset_id, created_at DESC);

ALTER TABLE public.datasets
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.dataset_versions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quality_report JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS preview_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  collaborator_email TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'view',
  invite_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, collaborator_email)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view collaborators"
ON public.project_collaborators
FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can insert collaborators"
ON public.project_collaborators
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update collaborators"
ON public.project_collaborators
FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete collaborators"
ON public.project_collaborators
FOR DELETE
USING (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project
ON public.project_collaborators(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  snapshot_name TEXT NOT NULL,
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project snapshots"
ON public.project_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project snapshots"
ON public.project_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project snapshots"
ON public.project_snapshots
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_created
ON public.project_snapshots(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_label TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project activity"
ON public.project_activity
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project activity"
ON public.project_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project activity"
ON public.project_activity
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_project_activity_project_created
ON public.project_activity(project_id, created_at DESC);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS thumbnail_config JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_summary TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_edited_by TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.create_project_snapshot(
  _project_id UUID,
  _snapshot_name TEXT DEFAULT 'Snapshot'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _snapshot_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  INSERT INTO public.project_snapshots (project_id, user_id, snapshot_name, snapshot_data)
  SELECT
    p.id,
    _user_id,
    COALESCE(NULLIF(_snapshot_name, ''), 'Snapshot'),
    jsonb_build_object(
      'project', to_jsonb(p),
      'datasets', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.datasets d WHERE d.project_id = p.id), '[]'::jsonb),
      'visualizations', COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM public.visualizations v WHERE v.project_id = p.id), '[]'::jsonb)
    )
  FROM public.projects p
  WHERE p.id = _project_id
  RETURNING id INTO _snapshot_id;

  INSERT INTO public.project_activity(project_id, user_id, activity_type, activity_label, metadata)
  VALUES (_project_id, _user_id, 'snapshot_created', 'Project snapshot saved', jsonb_build_object('snapshot_id', _snapshot_id));

  RETURN _snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_dataset_version(
  _dataset_id UUID,
  _version_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _version RECORD;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO _version
  FROM public.dataset_versions
  WHERE id = _version_id
    AND dataset_id = _dataset_id
    AND user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  UPDATE public.datasets
  SET
    current_version_id = _version.id,
    file_url = _version.file_url,
    file_size = _version.file_size,
    row_count = _version.row_count,
    column_count = _version.column_count,
    columns = _version.columns,
    preview_rows = _version.preview_rows,
    quality_report = _version.quality_report,
    ai_insights = _version.ai_insights,
    updated_at = now()
  WHERE id = _dataset_id
    AND user_id = _user_id;

  INSERT INTO public.project_activity(project_id, user_id, activity_type, activity_label, metadata)
  SELECT project_id, _user_id, 'dataset_reverted', 'Dataset reverted to previous version', jsonb_build_object('dataset_id', _dataset_id, 'version_id', _version_id)
  FROM public.datasets
  WHERE id = _dataset_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'datasets' THEN
    INSERT INTO public.project_activity(project_id, user_id, activity_type, activity_label, metadata)
    VALUES (
      NEW.project_id,
      NEW.user_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'dataset_uploaded' ELSE 'dataset_updated' END,
      CASE WHEN TG_OP = 'INSERT' THEN 'Dataset uploaded' ELSE 'Dataset updated' END,
      jsonb_build_object('dataset_id', NEW.id, 'dataset_name', NEW.name)
    );
  ELSIF TG_TABLE_NAME = 'visualizations' THEN
    INSERT INTO public.project_activity(project_id, user_id, activity_type, activity_label, metadata)
    VALUES (
      NEW.project_id,
      NEW.user_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'chart_created' ELSE 'chart_updated' END,
      CASE WHEN TG_OP = 'INSERT' THEN 'Visualization created' ELSE 'Visualization updated' END,
      jsonb_build_object('visualization_id', NEW.id, 'visualization_name', NEW.name, 'chart_type', NEW.chart_type)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_dataset_activity ON public.datasets;
CREATE TRIGGER log_dataset_activity
AFTER INSERT OR UPDATE ON public.datasets
FOR EACH ROW
WHEN (NEW.project_id IS NOT NULL)
EXECUTE FUNCTION public.log_project_activity();

DROP TRIGGER IF EXISTS log_visualization_activity ON public.visualizations;
CREATE TRIGGER log_visualization_activity
AFTER INSERT OR UPDATE ON public.visualizations
FOR EACH ROW
WHEN (NEW.project_id IS NOT NULL)
EXECUTE FUNCTION public.log_project_activity();