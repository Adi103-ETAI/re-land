-- ============================================================
-- LANDLENS · 08 — Storage (bucket + policies for document files)
-- ============================================================

-- Create the private "documents" bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/bmp'
  ]
)
on conflict (id) do nothing;

-- ── Storage policies ────────────────────────────────────────
drop policy if exists "authenticated can upload documents" on storage.objects;
create policy "authenticated can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "authenticated can read documents" on storage.objects;
create policy "authenticated can read documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "authenticated can update documents" on storage.objects;
create policy "authenticated can update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "authenticated can delete documents" on storage.objects;
create policy "authenticated can delete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');
