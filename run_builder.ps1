param(
  [int]$WebPort = 3000
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptPath 'run_viewer.ps1') -WebPort $WebPort
