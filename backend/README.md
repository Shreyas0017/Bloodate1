Image upload retention and cleanup

Environment variables (examples are in `.env.example`):
- `CLEAN_LOCAL_AFTER_UPLOAD` — if `true`, the backend deletes the local copy immediately after a successful cloud upload.
- `LOCAL_UPLOAD_RETENTION_DAYS` — number of days to keep local upload files before the cleanup script removes them.

Manual cleanup

Run the cleanup script which deletes local files older than `LOCAL_UPLOAD_RETENTION_DAYS` (skips files that have no cloud URL in the DB):

```bash
cd bloodate_1/backend
npm run clean:uploads
```

Notes
- The backend upload handler already respects `CLEAN_LOCAL_AFTER_UPLOAD`.
- The cleanup script consults the `Upload` records (via Prisma) and will avoid deleting local-only files that have no cloud URL/publicId.
