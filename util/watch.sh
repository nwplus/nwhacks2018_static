#!/usr/bin/bash

while true; do
  change=$(inotifywait -r -q -e close_write,moved_to,create .)
  change=${change#./ * }
  if [ "$change" != "build.html" ]; then
    echo "File changed: $change"
    make clean build &
  fi
done
