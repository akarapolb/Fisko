#!/usr/bin/env bash
# Assemble the Fisko prototype from src/ into:
#   fisko-prototype.html  - artifact page (no doctype/head; the publisher wraps it).
#                           Excludes real-agency sample data (files named *data-dpt*).
#   Fisko_Prototype.html  - standalone file that opens directly in a browser; includes every sample.
set -euo pipefail
cd "$(dirname "$0")/.."

scripts() { # $1 = filename pattern to leave out
  printf '<script>\n'
  for f in src/js/*.js; do
    case "$(basename "$f")" in $1) continue ;; esac
    printf '\n/* ---- %s ---- */\n' "$(basename "$f")"; cat "$f"
  done
  printf '</script>\n'
}

{
  cat src/head.html
  printf '<style>\n'; cat src/styles.css; printf '</style>\n'
  cat src/body.html
  scripts '*data-dpt*'
} > fisko-prototype.html

{
  printf '<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  grep -v 'claude:viewport-fit-sides' src/head.html
  printf '<style>\n'; cat src/styles.css; printf '</style>\n</head>\n<body>\n'
  cat src/body.html
  scripts '__none__'
  printf '</body>\n</html>\n'
} > Fisko_Prototype.html

wc -c fisko-prototype.html Fisko_Prototype.html
