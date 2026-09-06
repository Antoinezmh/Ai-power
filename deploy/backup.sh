#!/usr/bin/env sh
set -eu

backup_dir="${1:-./backups}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
db_sql_tmp="$backup_dir/.postgres-$timestamp.sql.tmp"
db_tmp="$backup_dir/.postgres-$timestamp.sql.gz.tmp"
files_tmp="$backup_dir/.files-$timestamp.tar.gz.tmp"
db_final="$backup_dir/postgres-$timestamp.sql.gz"
files_final="$backup_dir/files-$timestamp.tar.gz"
api_was_running="false"

mkdir -p "$backup_dir"

cleanup() {
  rm -f "$db_sql_tmp" "$db_tmp" "$files_tmp"
  if [ "$api_was_running" = "true" ]; then
    docker compose start api >/dev/null
  fi
}
trap cleanup EXIT INT TERM

# File metadata and physical files must be snapshotted while uploads/moves are
# quiesced. Dynamic tools reach the file centre through this API, so stopping
# it creates a short, consistent maintenance window.
if docker compose ps --status running --services | grep -qx api; then
  api_was_running="true"
  docker compose stop -t 30 api >/dev/null
fi

docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$db_sql_tmp"
gzip -c "$db_sql_tmp" > "$db_tmp"
gzip -t "$db_tmp"
rm -f "$db_sql_tmp"

docker compose run --rm --no-deps -T api python -c \
  'import sys, tarfile; archive=tarfile.open(fileobj=sys.stdout.buffer, mode="w|gz"); archive.add("/data/files", arcname="files"); archive.close()' \
  > "$files_tmp"
gzip -t "$files_tmp"

mv "$db_tmp" "$db_final"
mv "$files_tmp" "$files_final"

if [ "$api_was_running" = "true" ]; then
  docker compose start api >/dev/null
  api_was_running="false"
fi

find "$backup_dir" -type f \( -name 'postgres-*.sql.gz' -o -name 'files-*.tar.gz' \) \
  -mtime "+$retention_days" -delete

printf 'Backup complete: %s\n' "$backup_dir"
