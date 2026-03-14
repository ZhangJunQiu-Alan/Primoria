$env:CHROME_EXECUTABLE = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
Set-Location 'G:\Github\Primoria\Primoria\Viewer'
& 'C:\flutter\bin\flutter.bat' run -d web-server --web-port 3001
