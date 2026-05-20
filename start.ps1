# Personal OS - Quick Start Script
# Run this in PowerShell from the OS folder

Write-Host "Personal OS - Setup & Start" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install it from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "Installing dependencies (this takes 2-3 minutes)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        exit 1
    }
}

# Check .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host ".env.local not found!" -ForegroundColor Red
    Write-Host "Check the SETUP.md for instructions" -ForegroundColor Yellow
    exit 1
}

# Check if Gemini API key is configured
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    Write-Host ""
    Write-Host "WARNING: Google Gemini API key not configured!" -ForegroundColor Yellow
    Write-Host "AI features won't work until you add it." -ForegroundColor Yellow
    Write-Host "Get a free key at: https://aistudio.google.com/app/apikey" -ForegroundColor Cyan
    Write-Host "Then update GOOGLE_GEMINI_API_KEY in .env.local" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 0 }
}

Write-Host ""
Write-Host "Starting Personal OS..." -ForegroundColor Green
Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev
