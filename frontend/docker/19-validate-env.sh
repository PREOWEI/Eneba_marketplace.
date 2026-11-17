#!/bin/sh
set -eu
: "${BACKEND_URL:?Set BACKEND_URL to the backend HTTPS origin}"
: "${PORT:=10000}"
case "$PORT" in ''|*[!0-9]*) echo "PORT must be numeric" >&2; exit 1;; esac
[ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || exit 1
# An origin only: no path, trailing slash, user info or configuration injection.
printf '%s\n' "$BACKEND_URL" | grep -Eq '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]+)?$' || {
    echo "BACKEND_URL must be an HTTPS origin without a trailing slash or path" >&2
    exit 1
}
