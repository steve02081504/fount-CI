param()

$CI_DIR = Split-Path -Parent $PSScriptRoot
$FountCmd = Get-Command fount.ps1 -ErrorAction SilentlyContinue
if (-not $FountCmd) {
	Write-Error "'fount.ps1' command not found"
	exit 1
}

$FOUNT_DIR = Split-Path -Parent (Split-Path -Parent $FountCmd.Source)
$FountVMdataDir = Join-Path $FOUNT_DIR '.vm_data_fountCI'

New-Item -ItemType Directory -Force -Path $FountVMdataDir | Out-Null
cmd /c mklink /J "$FountVMdataDir" "$CI_DIR\default_data" 2>$null
if (-not (Test-Path (Join-Path $FountVMdataDir 'users\CI-user\chars'))) {
	New-Item -ItemType Directory -Force -Path (Join-Path $FountVMdataDir 'users\CI-user\chars') | Out-Null
}
cmd /c mklink /J (Join-Path $CI_DIR 'fount') $FOUNT_DIR 2>$null
cmd /c mklink /J (Join-Path $CI_DIR 'node_modules') (Join-Path $FOUNT_DIR 'node_modules') 2>$null

$env:CI_username = 'CI-user'
$env:CI_charname = 'fount-CI-agent'
$env:GITHUB_ACTION_PATH = $CI_DIR
$env:GITHUB_WORKSPACE = if ($env:GITHUB_WORKSPACE) { $env:GITHUB_WORKSPACE } else { (Get-Location).Path }
$env:FOUNT_CI_AISOURCE_NAME = 'fount-CI'

if (-not $env:FOUNT_CI_TASK) {
	Write-Error 'Set FOUNT_CI_TASK environment variable'
	exit 1
}

$config = Join-Path $FountVMdataDir 'users\CI-user\serviceSources\AI\fount-CI\config.json'
if ($env:OPENAI_BASE_URL -and $env:OPENAI_API_KEY -and $env:OPENAI_MODEL) {
	$data = Get-Content $config -Raw | ConvertFrom-Json
	$data.config.url = $env:OPENAI_BASE_URL
	$data.config.apikey = $env:OPENAI_API_KEY
	$data.config.model = $env:OPENAI_MODEL
	$data | ConvertTo-Json -Depth 10 | Set-Content $config
}

Set-Location $env:GITHUB_WORKSPACE
deno run --allow-scripts --allow-all --unstable-npm-lazy-caching -c (Join-Path $FOUNT_DIR 'deno.json') (Join-Path $CI_DIR 'index.mjs')
exit $LASTEXITCODE
