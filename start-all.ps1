param(
    [switch]$Backend = $true,
    [switch]$Frontend = $true
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

function Start-PowerShellWindow {
    param(
        [string]$WorkingDirectory,
        [string]$Command
    )

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$WorkingDirectory'; $Command"
}

if ($Backend) {
    Start-PowerShellWindow -WorkingDirectory $backendDir -Command 'mvn spring-boot:run'
}

if ($Frontend) {
    Start-PowerShellWindow -WorkingDirectory $frontendDir -Command 'if (!(Test-Path node_modules)) { npm install }; npm run dev'
}
