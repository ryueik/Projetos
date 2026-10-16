<#
.SYNOPSIS
    Remove (ou move para quarentena) arquivos mais antigos que a regra de retenção.

.DESCRIPTION
    Equivalente PowerShell do limpeza.py. Varre os diretórios informados, compara
    a data de modificação (ou criação) com a retenção e registra tudo em um log
    de auditoria CSV + JSON. Suporta -WhatIf e -Confirm (SupportsShouldProcess).

.EXAMPLE
    .\Limpeza-Arquivos.ps1 -Path C:\Temp -WhatIf
    Mostra o que seria removido, sem alterar nada.

.EXAMPLE
    .\Limpeza-Arquivos.ps1 -Path C:\Temp, D:\Exportacoes -Days 15 -Include *.log, *.tmp

.EXAMPLE
    .\Limpeza-Arquivos.ps1 -Path C:\Temp -QuarantinePath D:\Quarentena -RemoveEmptyFolders
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)]
    [string[]] $Path,

    [ValidateRange(1, 36500)]
    [int] $Days = 30,

    [ValidateSet('Modificacao', 'Criacao', 'Ambos')]
    [string] $Criterio = 'Modificacao',

    [string[]] $Include = @(),

    [string[]] $Exclude = @(),

    [string[]] $ProtectedExtensions = @('.db', '.sqlite', '.mdf', '.ldf', '.pst', '.key', '.pem', '.kdbx'),

    [string] $QuarantinePath,

    [switch] $RemoveEmptyFolders,

    [string] $AuditPath = (Join-Path $PSScriptRoot 'auditoria')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$agora = Get-Date
$limite = $agora.AddDays(-$Days)
$itens = New-Object System.Collections.Generic.List[object]
$liberado = [int64]0
$erros = 0

function Test-DiretorioPerigoso([string] $dir) {
    $full = (Resolve-Path -LiteralPath $dir).ProviderPath.TrimEnd('\', '/')
    $raiz = [System.IO.Path]::GetPathRoot($full).TrimEnd('\', '/')
    $perigosos = @($env:SystemRoot, $env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:USERPROFILE, $HOME) |
        Where-Object { $_ } | ForEach-Object { $_.TrimEnd('\', '/') }
    return ($full -eq $raiz) -or ($perigosos -contains $full)
}

function Test-Padrao([string] $relativo, [string] $nome, [string[]] $padroes) {
    foreach ($p in $padroes) {
        if ($nome -like $p -or $relativo -like $p -or $relativo.Replace('\', '/') -like $p.Replace('\', '/')) { return $p }
    }
    return $null
}

foreach ($dir in $Path) {
    if (-not (Test-Path -LiteralPath $dir -PathType Container)) {
        Write-Warning "Diretório não encontrado: $dir"
        continue
    }
    if (Test-DiretorioPerigoso $dir) {
        Write-Warning "Recusado: $dir é a raiz do disco ou uma pasta de sistema/perfil. Use uma subpasta."
        continue
    }
    $base = (Resolve-Path -LiteralPath $dir).ProviderPath.TrimEnd('\', '/')

    # -Attributes !ReparsePoint evita seguir junções e links simbólicos.
    Get-ChildItem -LiteralPath $base -File -Recurse -Force -Attributes !ReparsePoint -ErrorAction SilentlyContinue |
        ForEach-Object {
            $f = $_
            $rel = $f.FullName.Substring($base.Length).TrimStart('\', '/')
            $ref = switch ($Criterio) {
                'Criacao' { $f.CreationTime }
                'Ambos'   { if ($f.CreationTime -gt $f.LastWriteTime) { $f.CreationTime } else { $f.LastWriteTime } }
                default   { $f.LastWriteTime }
            }
            $idade = [math]::Round(($agora - $ref).TotalDays, 1)
            $acao = 'manter'; $motivo = ''; $resultado = 'ignorado'; $erro = ''

            if ($ProtectedExtensions -contains $f.Extension.ToLower()) {
                $acao = 'protegido'; $motivo = "extensão protegida ($($f.Extension))"
            } elseif ($p = Test-Padrao $rel $f.Name $Exclude) {
                $acao = 'excluido'; $motivo = "padrão de exclusão ($p)"
            } elseif ($Include.Count -gt 0 -and -not (Test-Padrao $rel $f.Name $Include)) {
                $motivo = 'fora dos padrões de inclusão'
            } elseif ($ref -gt $limite) {
                $motivo = "$([math]::Floor($idade)) dia(s) < $Days"
            } else {
                $acao = if ($QuarantinePath) { 'quarentena' } else { 'remover' }
                $motivo = "$([math]::Floor($idade)) dia(s) >= $Days"
                $resultado = 'simulado'
                $descricao = if ($QuarantinePath) { "Mover para quarentena ($idade dias)" } else { "Excluir ($idade dias)" }

                if ($PSCmdlet.ShouldProcess($f.FullName, $descricao)) {
                    try {
                        if ($QuarantinePath) {
                            $destino = Join-Path (Join-Path $QuarantinePath (Split-Path $base -Leaf)) $rel
                            New-Item -ItemType Directory -Path (Split-Path $destino -Parent) -Force | Out-Null
                            if (Test-Path -LiteralPath $destino) {
                                $destino = [System.IO.Path]::ChangeExtension($destino, "$((Get-Date).Ticks)$($f.Extension)")
                            }
                            Move-Item -LiteralPath $f.FullName -Destination $destino
                            $motivo += " -> $destino"
                        } else {
                            Remove-Item -LiteralPath $f.FullName -Force
                        }
                        $resultado = 'ok'
                        $liberado += $f.Length
                    } catch {
                        $resultado = 'erro'; $erro = $_.Exception.Message; $erros++
                    }
                } else {
                    $liberado += $f.Length
                }
            }

            $itens.Add([pscustomobject]@{
                caminho       = $f.FullName
                tamanho       = $f.Length
                criado_em     = $f.CreationTime.ToString('s')
                modificado_em = $f.LastWriteTime.ToString('s')
                idade_dias    = $idade
                acao          = $acao
                motivo        = $motivo
                resultado     = $resultado
                erro          = $erro
            })
        }

    if ($RemoveEmptyFolders) {
        Get-ChildItem -LiteralPath $base -Directory -Recurse -Force -Attributes !ReparsePoint |
            Sort-Object { $_.FullName.Length } -Descending |
            Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force | Select-Object -First 1) } |
            ForEach-Object {
                if ($PSCmdlet.ShouldProcess($_.FullName, 'Remover pasta vazia')) { Remove-Item -LiteralPath $_.FullName -Force }
            }
    }
}

# ---- Auditoria ----------------------------------------------------------------
# Com -WhatIf, os logs também ficam só na simulação (não são gravados).
$candidatos = @($itens | Where-Object { $_.acao -in 'remover', 'quarentena' })
$modo = if ($WhatIfPreference) { 'simulacao' } elseif ($QuarantinePath) { 'quarentena' } else { 'exclusao' }
$carimbo = $agora.ToString('yyyyMMdd_HHmmss')
if (-not $WhatIfPreference) {
    New-Item -ItemType Directory -Path $AuditPath -Force | Out-Null
    $candidatos | Export-Csv -Path (Join-Path $AuditPath "limpeza_$carimbo.csv") -Delimiter ';' -NoTypeInformation -Encoding UTF8
    [pscustomobject]@{
        inicio          = $agora.ToString('s')
        fim             = (Get-Date).ToString('s')
        modo            = $modo
        dias            = $Days
        criterio        = $Criterio
        diretorios      = $Path
        analisados      = $itens.Count
        candidatos      = $candidatos.Count
        bytes_liberados = $liberado
        erros           = $erros
        itens           = $candidatos
    } | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $AuditPath "limpeza_$carimbo.json") -Encoding UTF8
}

Write-Host ''
Write-Host "== Limpeza de arquivos · $($modo.ToUpper()) =="
Write-Host ("Analisados: {0} · candidatos: {1} · erros: {2}" -f $itens.Count, $candidatos.Count, $erros)
Write-Host ("Espaço {0}: {1:N1} MB" -f $(if ($WhatIfPreference) { 'que seria liberado' } else { 'liberado' }), ($liberado / 1MB))
if (-not $WhatIfPreference) { Write-Host "Auditoria: $AuditPath\limpeza_$carimbo.(csv|json)" }

if ($erros -gt 0) { exit 1 }
