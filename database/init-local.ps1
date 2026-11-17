# Espera a que SQL Server acepte conexiones y aplica esquema + seed.
#
# Uso:
#   ./database/init-local.ps1           # idempotente: solo aplica lo que falta
#   ./database/init-local.ps1 -Reset    # borra el volumen y recarga desde cero
#
# Requiere Docker Desktop en ejecución.

[CmdletBinding()]
param(
    [switch]$Reset,
    [string]$SaPassword = $(if ($env:MSSQL_SA_PASSWORD) { $env:MSSQL_SA_PASSWORD } else { 'MaziLocal#2026' }),
    [string]$Container = 'maziapp-sql',
    [string]$Database = 'mazi_sqri_qa'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$sqlcmd = '/opt/mssql-tools18/bin/sqlcmd'

function Invoke-SqlFile([string]$LocalPath, [string]$RemotePath) {
    Write-Host "  -> $LocalPath" -ForegroundColor Cyan
    docker cp $LocalPath "${Container}:${RemotePath}" | Out-Null
    docker exec $Container $sqlcmd -S localhost -U sa -P $SaPassword -C -b -f 65001 -i $RemotePath
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd fallo al ejecutar $LocalPath (exit $LASTEXITCODE)"
    }
}

function Invoke-SqlScalar([string]$Query, [string]$Db = 'master') {
    $raw = docker exec $Container $sqlcmd -S localhost -U sa -P $SaPassword -C -b -d $Db -h -1 -W -Q "SET NOCOUNT ON; $Query"
    if ($LASTEXITCODE -ne 0) { throw "sqlcmd fallo al consultar: $Query" }
    return ($raw | Where-Object { $_ -and $_.Trim() -ne '' } | Select-Object -First 1).Trim()
}

Write-Host '== Mazi Flow - base de datos local ==' -ForegroundColor Green

if ($Reset) {
    Write-Host 'Eliminando contenedor y volumen...' -ForegroundColor Yellow
    docker compose down -v
}

Write-Host 'Levantando SQL Server 2022...' -ForegroundColor Green
# `2>&1 | Out-Null`: docker escribe el progreso en stderr y con
# $ErrorActionPreference='Stop' PowerShell lo trataria como excepcion.
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker compose up fallo' }

Write-Host 'Esperando disponibilidad (puede tardar ~30s en el primer arranque)...' -ForegroundColor Green
$ready = $false
for ($i = 1; $i -le 60; $i++) {
    docker exec $Container $sqlcmd -S localhost -U sa -P $SaPassword -C -b -Q 'SELECT 1' -o /dev/null 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 3
}

if (-not $ready) {
    throw 'SQL Server no respondio en 180s. Revisar: docker logs maziapp-sql'
}
Write-Host 'SQL Server listo.' -ForegroundColor Green

$dbExists = Invoke-SqlScalar "SELECT COUNT(*) FROM sys.databases WHERE name = N'$Database';"
$tableCount = 0
if ($dbExists -eq '1') {
    $tableCount = [int](Invoke-SqlScalar 'SELECT COUNT(*) FROM sys.tables;' $Database)
}

if ($tableCount -ge 14) {
    Write-Host "Esquema ya aplicado ($tableCount tablas). Se omite." -ForegroundColor Yellow
} else {
    Write-Host 'Aplicando esquema...' -ForegroundColor Green
    Invoke-SqlFile (Join-Path $root 'database/init/01-schema.sql') '/tmp/01-schema.sql'
}

Write-Host 'Aplicando datos de desarrollo...' -ForegroundColor Green
Invoke-SqlFile (Join-Path $root 'database/init/02-seed-dev.sql') '/tmp/02-seed-dev.sql'

$finalTables = Invoke-SqlScalar 'SELECT COUNT(*) FROM sys.tables;' $Database
$contactos = Invoke-SqlScalar 'SELECT COUNT(*) FROM dbo.Contactos;' $Database
$reportes = Invoke-SqlScalar 'SELECT COUNT(*) FROM dbo.Reportes;' $Database

Write-Host ''
Write-Host "  Tablas:    $finalTables" -ForegroundColor Green
Write-Host "  Contactos: $contactos" -ForegroundColor Green
Write-Host "  Reportes:  $reportes" -ForegroundColor Green
Write-Host ''
Write-Host 'Listo. Cadena local: Server=localhost,14333;Database=mazi_sqri_qa;User Id=sa' -ForegroundColor Green
