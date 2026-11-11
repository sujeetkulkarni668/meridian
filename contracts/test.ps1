$ErrorActionPreference = "Stop"
Write-Host "Running MERIDIAN Rust Smart Contract Unit Tests..." -ForegroundColor Cyan

# Prepend WinLibs MinGW bin to ensure dlltool and assembler are available for Windows native tests
$env:PATH = "D:\winlibs\mingw64\bin;$env:PATH"

cargo test --manifest-path contracts/meridian_core/Cargo.toml
if ($LASTEXITCODE -ne 0) {
    Write-Error "Contract unit tests failed!"
    exit $LASTEXITCODE
}
Write-Host "All MERIDIAN Smart Contract Unit Tests Passed!" -ForegroundColor Green
