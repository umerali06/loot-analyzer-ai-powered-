# Clean Build Script for Lot Analyzer
Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Yellow

# Stop any running processes
Write-Host "🛑 Stopping development server..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean build directories
Write-Host "🗑️ Removing .next directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✅ .next directory removed" -ForegroundColor Green
}

# Clean node_modules (optional, uncomment if needed)
# Write-Host "🗑️ Removing node_modules..." -ForegroundColor Yellow
# if (Test-Path "node_modules") {
#     Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
#     Write-Host "✅ node_modules removed" -ForegroundColor Green
# }

# Clean package-lock.json (optional, uncomment if needed)
# Write-Host "🗑️ Removing package-lock.json..." -ForegroundColor Yellow
# if (Test-Path "package-lock.json") {
#     Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
#     Write-Host "✅ package-lock.json removed" -ForegroundColor Green
# }

# Reinstall dependencies (if node_modules was removed)
# Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
# npm install

# Start development server
Write-Host "🚀 Starting development server..." -ForegroundColor Green
npm run dev
