# MERIDIAN NEAR Smart Contract Build Script
$ErrorActionPreference = "Stop"
Write-Host "Compiling MERIDIAN Smart Contract for wasm32-unknown-unknown..." -ForegroundColor Cyan

$cargoBin = if (Test-Path "D:\cargo\bin\cargo.exe") { "D:\cargo\bin\cargo.exe" } else { "$env:USERPROFILE\.cargo\bin\cargo.exe" }
$contractDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location "$contractDir\meridian_core"
try {
    & $cargoBin build --target wasm32-unknown-unknown --release
    $wasmPath = "$contractDir\meridian_core\target\wasm32-unknown-unknown\release\meridian_core.wasm"
    if (Test-Path $wasmPath) {
        $size = (Get-Item $wasmPath).Length
        Write-Host "Contract compiled successfully!" -ForegroundColor Green
        Write-Host "Binary: $wasmPath ($size bytes)" -ForegroundColor Green
    }
} finally {
    Pop-Location
}
