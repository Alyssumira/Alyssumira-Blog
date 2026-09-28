param()
# og-verify.ps1 -- independent GDI+ reverify for the OG card pipeline.
# Why this file exists: headless Edge prints "N bytes written to file" and exits 0 even when those
# bytes are not a decodable image. GDI+ actually decodes the frame, so it can falsify a bad header.
# Invoked as: powershell.exe -NoProfile -ExecutionPolicy Bypass -File og-verify.ps1 <png> [<png> ...]
# Output: one ASCII-labelled line per file, then GDIPLUS_REVERIFY_COUNT=<n>.
# Labels are ASCII on purpose: this box garbles non-ASCII in PowerShell console output.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$paths = @()
foreach ($a in $args) {
  if (Test-Path -LiteralPath $a) {
    $paths += (Resolve-Path -LiteralPath $a).Path
  } else {
    Write-Output ("FILE=" + $a + " MISSING")
    exit 5
  }
}
if ($paths.Count -eq 0) {
  Write-Output 'GDIPLUS_NO_INPUT'
  exit 3
}
foreach ($p in $paths) {
  $bytes = [System.IO.File]::ReadAllBytes($p)
  $md5 = (Get-FileHash -Algorithm MD5 -LiteralPath $p).Hash.Replace('-','').Substring(0,8).ToUpper()
  $fs = [System.IO.File]::Open($p, 'Open', 'Read', 'None')
  try {
    $img = New-Object System.Drawing.Bitmap($fs)
    try {
      $line = "FILE=" + $p + " WIDTH=" + $img.Width + " HEIGHT=" + $img.Height
      $line = $line + " PIXFMT=" + $img.PixelFormat + " BYTES=" + $bytes.Length + " MD5=" + $md5
      Write-Output $line
    } finally {
      $img.Dispose()
    }
  } catch {
    Write-Output ("FILE=" + $p + " GDIPLUS_DECODE_FAILED=" + $_.Exception.GetType().Name + " BYTES=" + $bytes.Length)
    exit 4
  } finally {
    $fs.Dispose()
  }
}
Write-Output ("GDIPLUS_REVERIFY_COUNT=" + $paths.Count)
