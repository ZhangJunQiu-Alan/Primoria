param(
  [ValidateSet('builder', 'viewer')]
  [string]$App = 'builder'
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root '.env'

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
      return
    }

    $idx = $line.IndexOf('=')
    if ($idx -lt 1) {
      return
    }

    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

$flutterArgs = @(
  '-d',
  'chrome',
  "--dart-define=SUPABASE_URL=$($env:SUPABASE_URL)",
  "--dart-define=SUPABASE_ANON_KEY=$($env:SUPABASE_ANON_KEY)"
)

if (-not [string]::IsNullOrWhiteSpace($env:GEMINI_API_KEY)) {
  $flutterArgs += "--dart-define=GEMINI_API_KEY=$($env:GEMINI_API_KEY)"
}

if (-not [string]::IsNullOrWhiteSpace($env:GEMINI_MODEL)) {
  $flutterArgs += "--dart-define=GEMINI_MODEL=$($env:GEMINI_MODEL)"
}

$appDir = if ($App -eq 'builder') { 'Builder' } else { 'Viewer' }
$targetDir = Join-Path $root $appDir

Push-Location $targetDir
try {
  & flutter run @flutterArgs
}
finally {
  Pop-Location
}
