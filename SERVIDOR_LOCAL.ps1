$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8000
$Prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)

function Get-MimeType([string]$Path) {
    switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8" }
        ".htm"  { "text/html; charset=utf-8" }
        ".js"   { "text/javascript; charset=utf-8" }
        ".mjs"  { "text/javascript; charset=utf-8" }
        ".css"  { "text/css; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".svg"  { "image/svg+xml" }
        ".png"  { "image/png" }
        ".jpg"  { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".gif"  { "image/gif" }
        ".webp" { "image/webp" }
        ".ico"  { "image/x-icon" }
        ".wasm" { "application/wasm" }
        ".mid"  { "audio/midi" }
        ".midi" { "audio/midi" }
        default { "application/octet-stream" }
    }
}

try {
    $listener.Start()
    Clear-Host
    Write-Host "Gesture Synth BR - servidor local" -ForegroundColor Green
    Write-Host ""
    Write-Host "Servidor ativo em: $Prefix" -ForegroundColor Cyan
    Write-Host "Pasta: $Root"
    Write-Host ""
    Write-Host "O navegador sera aberto automaticamente."
    Write-Host "Para encerrar, feche esta janela ou pressione CTRL+C."
    Write-Host ""

    Start-Process $Prefix

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))

        if ([string]::IsNullOrWhiteSpace($requestPath)) {
            $requestPath = "index.html"
        }

        $requested = Join-Path $Root ($requestPath -replace "/", "\")
        $fullPath = [IO.Path]::GetFullPath($requested)
        $rootFull = [IO.Path]::GetFullPath($Root)

        if (-not $fullPath.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
            $context.Response.StatusCode = 403
            $bytes = [Text.Encoding]::UTF8.GetBytes("403 - Acesso negado")
        }
        elseif (Test-Path $fullPath -PathType Container) {
            $index = Join-Path $fullPath "index.html"
            if (Test-Path $index -PathType Leaf) {
                $fullPath = $index
                $bytes = [IO.File]::ReadAllBytes($fullPath)
                $context.Response.ContentType = Get-MimeType $fullPath
                $context.Response.StatusCode = 200
            } else {
                $context.Response.StatusCode = 404
                $bytes = [Text.Encoding]::UTF8.GetBytes("404 - Arquivo nao encontrado")
            }
        }
        elseif (Test-Path $fullPath -PathType Leaf) {
            $bytes = [IO.File]::ReadAllBytes($fullPath)
            $context.Response.ContentType = Get-MimeType $fullPath
            $context.Response.StatusCode = 200
        }
        else {
            $context.Response.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("404 - Arquivo nao encontrado")
        }

        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
    }
}
catch {
    Write-Host ""
    Write-Host "Nao foi possivel iniciar o servidor." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
}
finally {
    if ($listener -and $listener.IsListening) { $listener.Stop() }
    if ($listener) { $listener.Close() }
}
