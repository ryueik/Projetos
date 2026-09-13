<#
.SYNOPSIS
    Split-PDF.ps1 — Divisão inteligente de PDFs pesados (versão PowerShell nativa).

.DESCRIPTION
    Utilitário corporativo para Windows voltado a administradores de rede e
    sistemas que precisam adequar PDFs pesados (ex.: petições do PJe/eproc)
    ao limite estrito de upload de 4 MB.

    Backends suportados (detecção automática, na ordem):
      1) PdfSharp  — via assembly .NET (parâmetro -PdfSharpDll ou NuGet local)
      2) qpdf      — CLI amplamente disponível
      3) pdftk     — CLI legado

.PARAMETER InputFolder
    Pasta com os PDFs de entrada. Padrão: diretório atual.

.PARAMETER OutputFolder
    Pasta onde as partes serão gravadas. Padrão: .\pdf_split_output

.PARAMETER MaxSizeMB
    Limite máximo por parte (MB). Padrão: 3.8

.PARAMETER MinSizeMB
    Tamanho mínimo para um PDF ser considerado "pesado" e entrar na fila.
    Padrão: 4.0 (filtro `Length -gt 4MB`).

.PARAMETER PdfSharpDll
    Caminho opcional para PdfSharp.dll.

.PARAMETER Recurse
    Se presente, varre subpastas recursivamente.

.EXAMPLE
    .\Split-PDF.ps1 -InputFolder C:\Peticoes -OutputFolder C:\Peticoes\split -MaxSizeMB 3.8


#>

[CmdletBinding()]
param(
    [string]$InputFolder  = (Get-Location).Path,
    [string]$OutputFolder = (Join-Path (Get-Location).Path 'pdf_split_output'),
    [double]$MaxSizeMB    = 3.8,
    [double]$MinSizeMB    = 4.0,
    [string]$PdfSharpDll  = '',
    [switch]$Recurse
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

#region ------------------------- Helpers de log -------------------------
function Write-Log {
    param(
        [Parameter(Mandatory)] [string]$Message,
        [ValidateSet('INFO','OK','WARN','ERR','STEP','DIM')]
        [string]$Level = 'INFO'
    )

    $ts    = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    $color = switch ($Level) {
        'INFO' { 'Gray'    }
        'OK'   { 'Green'   }
        'WARN' { 'Yellow'  }
        'ERR'  { 'Red'     }
        'STEP' { 'Cyan'    }
        'DIM'  { 'DarkGray'}
    }
    Write-Host ("[{0}] [{1,-4}] {2}" -f $ts, $Level, $Message) -ForegroundColor $color
}
#endregion

#region --------------------- Detecção de backend ------------------------
function Initialize-PdfBackend {
    param([string]$PdfSharpPath)

    $backend = [pscustomobject]@{
        Name    = $null
        PdfSharp= $null
        Qpdf    = $null
        Pdftk   = $null
    }

    # 1) PdfSharp -------------------------------------------------------
    if ($PdfSharpPath -and (Test-Path $PdfSharpPath)) {
        try {
            Add-Type -Path $PdfSharpPath -ErrorAction Stop
            $backend.Name     = 'PdfSharp'
            $backend.PdfSharp = $PdfSharpPath
            Write-Log "Backend selecionado: PdfSharp ($PdfSharpPath)" OK
            return $backend
        }
        catch {
            Write-Log "Falha ao carregar PdfSharp em '$PdfSharpPath': $_" WARN
        }
    }

    # 2) qpdf -----------------------------------------------------------
    $qpdf = Get-Command qpdf -ErrorAction SilentlyContinue
    if ($qpdf) {
        $backend.Name = 'qpdf'
        $backend.Qpdf = $qpdf.Source
        Write-Log "Backend selecionado: qpdf ($($qpdf.Source))" OK
        return $backend
    }

    # 3) pdftk ----------------------------------------------------------
    $pdftk = Get-Command pdftk -ErrorAction SilentlyContinue
    if ($pdftk) {
        $backend.Name = 'pdftk'
        $backend.Pdftk = $pdftk.Source
        Write-Log "Backend selecionado: pdftk ($($pdftk.Source))" OK
        return $backend
    }

    Write-Log "Nenhum backend PDF disponível. Instale 'qpdf' ou 'pdftk', ou informe -PdfSharpDll." ERR
    return $backend
}
#endregion

#region --------------------- Funções de leitura -------------------------
function Get-PdfPageCount {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)]$Backend
    )

    switch ($Backend.Name) {
        'PdfSharp' {
            $doc = [PdfSharp.Pdf.IO.PdfReader]::Open($Path, [PdfSharp.Pdf.IO.PdfDocumentOpenMode]::Import)
            try { return [int]$doc.PageCount }
            finally { $doc.Close() }
        }
        'qpdf' {
            $out = & $Backend.Qpdf --show-npages $Path 2>$null
            return [int]($out | Select-Object -First 1)
        }
        'pdftk' {
            $dump = & $Backend.Pdftk $Path dump_data 2>$null
            $line = $dump | Select-String -Pattern 'NumberOfPages:\s*(\d+)' | Select-Object -First 1
            if ($line -and $line.Matches.Count -gt 0) {
                return [int]$line.Matches[0].Groups[1].Value
            }
        }
    }
    return 0
}

function Get-PdfMetadata {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)]$Backend
    )

    $info = [pscustomobject]@{
        Path    = $Path
        Name    = [System.IO.Path]::GetFileName($Path)
        SizeMB  = [math]::Round((Get-Item $Path).Length / 1MB, 2)
        Pages   = 0
        Title   = ''
        Author  = ''
    }

    switch ($Backend.Name) {
        'PdfSharp' {
            $doc = [PdfSharp.Pdf.IO.PdfReader]::Open($Path, [PdfSharp.Pdf.IO.PdfDocumentOpenMode]::Import)
            try {
                $info.Pages  = [int]$doc.PageCount
                $info.Title  = [string]$doc.Info.Title
                $info.Author = [string]$doc.Info.Author
            } finally { $doc.Close() }
        }
        default {
            $info.Pages = Get-PdfPageCount -Path $Path -Backend $Backend
        }
    }
    return $info
}
#endregion

#region --------------------- Extração de fatia --------------------------
function New-PdfSlice {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][int]$FirstPage,
        [Parameter(Mandatory)][int]$LastPage,
        [Parameter(Mandatory)][string]$Destination,
        [Parameter(Mandatory)]$Backend
    )

    switch ($Backend.Name) {
        'PdfSharp' {
            $src = [PdfSharp.Pdf.IO.PdfReader]::Open($Source, [PdfSharp.Pdf.IO.PdfDocumentOpenMode]::Import)
            $dst = New-Object PdfSharp.Pdf.PdfDocument
            try {
                for ($i = $FirstPage - 1; $i -lt $LastPage; $i++) {
                    $dst.AddPage($src.Pages[$i])
                }
                $dst.Save($Destination)
            }
            finally {
                $dst.Close()
                $src.Close()
            }
        }
        'qpdf' {
            & $Backend.Qpdf $Source --pages . "$FirstPage-$LastPage" -- $Destination | Out-Null
        }
        'pdftk' {
            & $Backend.Pdftk $Source cat "$FirstPage-$LastPage" output $Destination | Out-Null
        }
    }
}
#endregion

#region --------------------- Divisão principal --------------------------
function Split-PdfFile {
    param(
        [Parameter(Mandatory)]$PdfInfo,
        [Parameter(Mandatory)][string]$OutputFolder,
        [Parameter(Mandatory)][double]$MaxSizeMB,
        [Parameter(Mandatory)]$Backend
    )

    $limitBytes = [int64]($MaxSizeMB * 1MB)
    $baseName   = [System.IO.Path]::GetFileNameWithoutExtension($PdfInfo.Name)

    $totalPages = [int]$PdfInfo.Pages
    if ($totalPages -le 0) {
        Write-Log "  -> Sem páginas detectáveis; ignorando." WARN
        return @()
    }

    $avgPerPage = (Get-Item $PdfInfo.Path).Length / [math]::Max($totalPages, 1)
    $hint       = [math]::Max(1, [int](($limitBytes * 0.97) / $avgPerPage))

    $parts   = @()
    $start   = 1
    $partNo  = 1

    while ($start -le $totalPages) {
        # Cresce até estourar
        $count = [math]::Min($hint, ($totalPages - $start + 1))
        $end   = $start + $count - 1

        $tmpName = "{0}_tmp_{1:d3}.pdf" -f $baseName, $partNo
        $tmpPath = Join-Path $OutputFolder $tmpName

        New-PdfSlice -Source $PdfInfo.Path -FirstPage $start -LastPage $end `
                     -Destination $tmpPath -Backend $Backend

        while ((Get-Item $tmpPath).Length -gt $limitBytes -and $count -gt 1) {
            $count--
            $end = $start + $count - 1
            Remove-Item $tmpPath -Force -ErrorAction SilentlyContinue
            New-PdfSlice -Source $PdfInfo.Path -FirstPage $start -LastPage $end `
                         -Destination $tmpPath -Backend $Backend
        }

        # Tenta crescer enquanto couber
        while (($start + $count) -le $totalPages) {
            $candidateCount = $count + 1
            $candidateEnd   = $start + $candidateCount - 1
            $candPath       = Join-Path $OutputFolder ("{0}_cand.pdf" -f $baseName)

            New-PdfSlice -Source $PdfInfo.Path -FirstPage $start -LastPage $candidateEnd `
                         -Destination $candPath -Backend $Backend

            if ((Get-Item $candPath).Length -le $limitBytes) {
                $count = $candidateCount
                $end   = $candidateEnd
                Move-Item $candPath $tmpPath -Force
            } else {
                Remove-Item $candPath -Force -ErrorAction SilentlyContinue
                break
            }
        }

        $finalName = "{0}_parte_{1:d3}.pdf" -f $baseName, $partNo
        $finalPath = Join-Path $OutputFolder $finalName
        Move-Item $tmpPath $finalPath -Force

        $sizeMB = [math]::Round((Get-Item $finalPath).Length / 1MB, 2)
        Write-Log ("  -> {0}  |  {1} MB  |  pág. {2}-{3}" -f $finalName, $sizeMB, $start, $end) OK

        $parts += $finalPath
        $start  = $end + 1
        $partNo++
    }

    return $parts
}
#endregion

#region --------------------- Pipeline principal -------------------------
function Invoke-SplitPdf {
    param(
        [string]$InputFolder,
        [string]$OutputFolder,
        [double]$MaxSizeMB,
        [double]$MinSizeMB,
        [string]$PdfSharpDll,
        [switch]$Recurse
    )

    Write-Log "===============================================================" STEP
    Write-Log " PDF-Splitter-Utility  —  PowerShell Backend" STEP
    Write-Log "===============================================================" STEP
    Write-Log "Entrada : $InputFolder"
    Write-Log "Saída   : $OutputFolder"
    Write-Log "Limite  : $MaxSizeMB MB   (filtro mínimo: $MinSizeMB MB)"
    Write-Log "Recursivo: $([bool]$Recurse)"

    if (-not (Test-Path $InputFolder)) {
        Write-Log "Pasta de entrada inexistente: $InputFolder" ERR
        return
    }

    if (-not (Test-Path $OutputFolder)) {
        New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
        Write-Log "Pasta de saída criada: $OutputFolder" OK
    }

    $backend = Initialize-PdfBackend -PdfSharpPath $PdfSharpDll
    if (-not $backend.Name) { return }

    $gciParams = @{ Path = $InputFolder; Filter = '*.pdf'; File = $true }
    if ($Recurse) { $gciParams.Recurse = $true }

    $candidates = Get-ChildItem @gciParams |
                  Where-Object { $_.Length -gt ($MinSizeMB * 1MB) }

    if (-not $candidates) {
        Write-Log "Nenhum PDF acima de $MinSizeMB MB encontrado." WARN
        return
    }

    Write-Log ("Encontrado(s) {0} arquivo(s) para processar." -f $candidates.Count) STEP

    $global:totalParts = 0
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    foreach ($file in $candidates) {
        Write-Log "`n=== Processando: $($file.Name) ===" STEP

        $meta = Get-PdfMetadata -Path $file.FullName -Backend $backend
        Write-Log ("  Tamanho: {0} MB  |  Páginas: {1}" -f $meta.SizeMB, $meta.Pages) DIM

        try {
            $parts = Split-PdfFile -PdfInfo $meta -OutputFolder $OutputFolder `
                                   -MaxSizeMB $MaxSizeMB -Backend $backend
            $global:totalParts += $parts.Count
        }
        catch {
            Write-Log "  [ERRO] Falha ao dividir '$($file.Name)': $_" ERR
        }
    }

    $sw.Stop()
    Write-Log "`n===============================================================" STEP
    Write-Log ("CONCLUÍDO — {0} parte(s) em {1:N2} s" -f $global:totalParts, $sw.Elapsed.TotalSeconds) OK
    Write-Log ("Saída: {0}" -f $OutputFolder) OK
    Write-Log "===============================================================" STEP
}
#endregion

# ------------------------- Execução ------------------------------------
Invoke-SplitPdf -InputFolder $InputFolder `
                -OutputFolder $OutputFolder `
                -MaxSizeMB $MaxSizeMB `
                -MinSizeMB $MinSizeMB `
                -PdfSharpDll $PdfSharpDll `
                -Recurse:$Recurse
