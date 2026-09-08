$ErrorActionPreference = 'Stop'
$downloadDirectory = Join-Path $PSScriptRoot '../tmp/location-import'
New-Item -ItemType Directory -Force -Path $downloadDirectory | Out-Null
Invoke-WebRequest -Uri 'https://download.geonames.org/export/zip/IN.zip' -OutFile (Join-Path $downloadDirectory 'IN.zip') -TimeoutSec 90
Expand-Archive -LiteralPath (Join-Path $downloadDirectory 'IN.zip') -DestinationPath (Join-Path $downloadDirectory 'postal') -Force
Invoke-WebRequest -Uri 'https://download.geonames.org/export/dump/cities500.zip' -OutFile (Join-Path $downloadDirectory 'cities500.zip') -TimeoutSec 90
Expand-Archive -LiteralPath (Join-Path $downloadDirectory 'cities500.zip') -DestinationPath (Join-Path $downloadDirectory 'cities') -Force
Invoke-WebRequest -Uri 'https://download.geonames.org/export/dump/admin1CodesASCII.txt' -OutFile (Join-Path $downloadDirectory 'admin1.txt') -TimeoutSec 45
$bankQuery = '[out:json][timeout:60];area["ISO3166-1"="IN"][admin_level=2]->.india;nwr["amenity"="bank"](area.india);out center tags;'
Invoke-WebRequest -Uri 'https://overpass-api.de/api/interpreter' -Method Post -Body @{data=$bankQuery} -UserAgent 'Kaarva-SIH/1.0 (https://github.com/akshatXD-hash/sih-2026-website)' -OutFile (Join-Path $downloadDirectory 'india-banks.json') -TimeoutSec 90
Write-Output 'Source files downloaded. Run npm run db:locations after applying migrations.'
