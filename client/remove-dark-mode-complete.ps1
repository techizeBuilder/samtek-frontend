# PowerShell script to remove all dark mode classes from React files

$clientSrcPath = "d:\inventory\TechiziBuilder\03-12-2025(sunrize)\Sunrise-Full-Application\client\src"
$files = Get-ChildItem -Path $clientSrcPath -Recurse -Include *.jsx,*.js,*.tsx,*.ts

$totalFiles = 0
$modifiedFiles = 0

Write-Host "Starting dark mode removal process..." -ForegroundColor Cyan
Write-Host "Processing $($files.Count) files..." -ForegroundColor Cyan

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Remove dark: prefixed Tailwind classes
    # Pattern 1: dark:class-name (with space or quote after)
    $content = $content -replace '\s+dark:[a-zA-Z0-9_/\[\]\-\.\:]+(?=[\s"\''`>])', ''
    
    # Pattern 2: Remove empty className=""
    $content = $content -replace 'className="\s*"', ''
    
    # Pattern 3: Clean up double spaces in className
    $content = $content -replace 'className="([^"]*?)\s{2,}([^"]*?)"', 'className="$1 $2"'
    
    # Pattern 4: Clean up trailing/leading spaces in className
    $content = $content -replace 'className="\s+([^"]*?)"', 'className="$1"'
    $content = $content -replace 'className="([^"]*?)\s+"', 'className="$1"'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $modifiedFiles++
        Write-Host "Modified: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nDark mode removal complete!" -ForegroundColor Cyan
Write-Host "Total files processed: $totalFiles" -ForegroundColor Yellow
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Yellow
Write-Host "`nAll dark mode classes have been removed from the UI." -ForegroundColor Green
