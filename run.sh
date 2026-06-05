#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
exec bash "$SCRIPT_DIR/path/fount-CI.sh" "$@"
