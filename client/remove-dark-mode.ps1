# Script to remove dark mode classes from all JSX/TSX files

$files = Get-ChildItem -Path "client\src" -Include *.jsx,*.tsx -Recurse

$totalFiles = 0
$modifiedFiles = 0

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content $file.FullName -Raw
    
    # Remove dark: classes - matches patterns like "dark:text-gray-100" or "dark:bg-blue-900/20"
    $newContent = $content -replace '\s*dark:[a-zA-Z0-9\-/]+', ''
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $modifiedFiles++
        Write-Host "Modified: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host "`nTotal files processed: $totalFiles" -ForegroundColor Cyan
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Yellow
Write-Host "Done!" -ForegroundColor Green
