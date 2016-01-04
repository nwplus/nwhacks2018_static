#!/usr/bin/bash

containsElement () {
  local e
  for e in "${@:2}"; do [[ "$e" == "$1" ]] && return 0; done
  return 1
}

elems=("build.html" "build.js")

while true; do
  change=$(inotifywait -r -q -e close_write,moved_to,create .)
  change=${change#./ * }
  containsElement $change $elems
  if [ $? = 1 ]; then
    echo "File changed: $change"
    make clean build
  fi
done
