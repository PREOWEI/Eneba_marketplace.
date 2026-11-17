#!/bin/sh
set -eu
: "${PORT:=10000}"
case "$PORT" in ''|*[!0-9]*) echo "PORT must be numeric" >&2; exit 1;; esac
[ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || exit 1
export PORT
apache2ctl -t
exec apache2-foreground
