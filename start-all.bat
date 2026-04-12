@echo off
setlocal
set SCRIPT_DIR=%~dp0

start powershell -NoExit -Command "Set-Location -LiteralPath '%SCRIPT_DIR%backend'; mvn spring-boot:run"
start powershell -NoExit -Command "Set-Location -LiteralPath '%SCRIPT_DIR%frontend'; if (!(Test-Path node_modules)) { npm install }; npm run dev"

endlocal
