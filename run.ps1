param(
  [ValidateSet('builder', 'viewer')]
  [string]$App = 'builder',
  [int]$WebPort = 3000
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

if ([string]::IsNullOrWhiteSpace($env:VITE_SUPABASE_URL) -and -not [string]::IsNullOrWhiteSpace($env:SUPABASE_URL)) {
  [System.Environment]::SetEnvironmentVariable('VITE_SUPABASE_URL', $env:SUPABASE_URL, 'Process')
}

if ([string]::IsNullOrWhiteSpace($env:VITE_SUPABASE_ANON_KEY) -and -not [string]::IsNullOrWhiteSpace($env:SUPABASE_ANON_KEY)) {
  [System.Environment]::SetEnvironmentVariable('VITE_SUPABASE_ANON_KEY', $env:SUPABASE_ANON_KEY, 'Process')
}

$flutterArgs = @(
  '-d',
  'chrome',
  '--web-port',
  "$WebPort",
  "--dart-define=SUPABASE_URL=$($env:SUPABASE_URL)",
  "--dart-define=SUPABASE_ANON_KEY=$($env:SUPABASE_ANON_KEY)"
)

if (-not [string]::IsNullOrWhiteSpace($env:GEMINI_API_KEY)) {
  $flutterArgs += "--dart-define=GEMINI_API_KEY=$($env:GEMINI_API_KEY)"
}

if (-not [string]::IsNullOrWhiteSpace($env:GEMINI_MODEL)) {
  $flutterArgs += "--dart-define=GEMINI_MODEL=$($env:GEMINI_MODEL)"
}

if ($App -eq 'builder') {
  Push-Location $root
  try {
    & pnpm --filter @primoria/builder dev -- --host 0.0.0.0 --port $WebPort
  }
  finally {
    Pop-Location
  }
}
else {
  $targetDir = Join-Path $root 'Viewer'

  Push-Location $targetDir
  try {
    & flutter run @flutterArgs
  }
  finally {
    Pop-Location
  }
}
