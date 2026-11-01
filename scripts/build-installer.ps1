$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    cargo build --release -p atelier-ui --bin Atelier
    if ($LASTEXITCODE -ne 0) { throw "Cargo build failed with exit code $LASTEXITCODE" }
    Copy-Item -LiteralPath 'target\release\Atelier.exe' -Destination 'target\release\Atelier-Setup.exe' -Force
    Write-Host 'Created target\release\Atelier-Setup.exe'
} finally {
    Pop-Location
}
