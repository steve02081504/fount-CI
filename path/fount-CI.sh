#!/usr/bin/env bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
CI_DIR=$(dirname "$SCRIPT_DIR")

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
	powershell.exe -noprofile -executionpolicy bypass -file "$CI_DIR\path\fount-CI.ps1" "$@"
	exit $?
fi

FOUNT_SH_PATH=""
if ! FOUNT_SH_PATH=$(command -v fount.sh); then
	echo "Error: 'fount.sh' command not found" >&2
	exit 1
fi

FOUNT_SH_REAL_PATH=$(realpath "$FOUNT_SH_PATH")
FOUNT_DIR=$(dirname "$(dirname "$FOUNT_SH_REAL_PATH")")

if [[ ! -d "$FOUNT_DIR" ]]; then
	echo "Error: Fount directory not found" >&2
	exit 1
fi

FountVMdataDir="$FOUNT_DIR/.vm_data_fountCI/"
mkdir -p "$FountVMdataDir"
ln -sfn "$CI_DIR/default_data/" "$FountVMdataDir"
mkdir -p "$FountVMdataDir/users/CI-user/chars"
mkdir -p "$FountVMdataDir/users/CI-user/settings"
ln -sfn "$FOUNT_DIR" "$CI_DIR/fount"
ln -sfn "$FOUNT_DIR/node_modules" "$CI_DIR/node_modules"

export CI_username='CI-user'
export CI_charname='fount-CI-agent'
export GITHUB_ACTION_PATH="$CI_DIR"
export GITHUB_WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"
export FOUNT_CI_AISOURCE_NAME='fount-CI'

if [[ -z "$FOUNT_CI_TASK" ]]; then
	echo "Error: Set FOUNT_CI_TASK environment variable" >&2
	exit 1
fi

# Inject secrets into AI source config if provided
CONFIG="$FountVMdataDir/users/CI-user/serviceSources/AI/fount-CI/config.json"
if [[ -n "$OPENAI_BASE_URL" && -n "$OPENAI_API_KEY" && -n "$OPENAI_MODEL" ]]; then
	jq \
		--arg url "$OPENAI_BASE_URL" \
		--arg apikey "$OPENAI_API_KEY" \
		--arg model "$OPENAI_MODEL" \
		'.config.url = $url | .config.apikey = $apikey | .config.model = $model' \
		"$CONFIG" > "${CONFIG}.tmp" && mv "${CONFIG}.tmp" "$CONFIG"
fi

cd "$GITHUB_WORKSPACE"
deno run --allow-scripts --allow-all --unstable-npm-lazy-caching -c "$FOUNT_DIR/deno.json" "$CI_DIR/index.mjs"
exit $?
