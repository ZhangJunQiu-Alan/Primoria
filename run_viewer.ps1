param(
  [int]$WebPort = 3001
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptPath 'run.ps1') -App viewer -WebPort $WebPort
