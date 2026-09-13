'===========================================================================
' Split-PDF.vbs
' PDF-Splitter-Utility — versão WSH (cscript.exe) para ambientes legados.
'
' Estratégia:
'   * Enumera PDFs > 4 MB via FileSystemObject.
'   * Obtém contagem de páginas via `qpdf --show-npages` ou `pdftk dump_data`.
'   * Calcula fatias respeitando limite configurável (padrão 3.8 MB).
'   * Invoca `qpdf --pages` ou `pdftk cat` para cada fatia.
'   * Gera relatório de auditoria `log_divisao.txt`.
'
' Uso:
'   cscript //nologo Split-PDF.vbs [pasta_entrada] [pasta_saida] [limiteMB]
'
'===========================================================================

Option Explicit

' ------------------------- Constantes -------------------------------------
Const MB                = 1048576
Const DEFAULT_LIMIT_MB  = 3.8
Const MIN_TRIGGER_MB    = 4.0
Const SAFETY_FACTOR     = 0.97
Const LOG_FILE          = "log_divisao.txt"
Const TITLE             = "PDF-Splitter-Utility (VBScript/WSH)"

' ------------------------- Variáveis globais ------------------------------
Dim fso, shell, logStream
Dim inputFolder, outputFolder, limitMB
Dim backend, backendPath
Dim totalParts, startTime

Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

'===========================================================================
'  ENTRY POINT
'===========================================================================
Sub Main()
    ParseArguments
    ResolveBackend
    InitLog

    WriteLog "==============================================================="
    WriteLog " " & TITLE
    WriteLog "==============================================================="
    WriteLog "Entrada : " & inputFolder
    WriteLog "Saída   : " & outputFolder
    WriteLog "Limite  : " & FormatNumber(limitMB, 2) & " MB"
    WriteLog "Backend : " & backend & " (" & backendPath & ")"
    WriteLog "Data    : " & Now
    WriteLog "---------------------------------------------------------------"

    If Not fso.FolderExists(inputFolder) Then
        WriteLog "[ERRO] Pasta de entrada não existe: " & inputFolder
        CloseLog
        WScript.Quit 1
    End If

    If Not fso.FolderExists(outputFolder) Then
        fso.CreateFolder outputFolder
        WriteLog "[OK] Pasta de saída criada: " & outputFolder
    End If

    totalParts = 0
    startTime  = Timer

    ProcessFolder inputFolder

    Dim elapsed
    elapsed = Timer - startTime
    WriteLog "---------------------------------------------------------------"
    WriteLog "[FIM] Total de partes geradas: " & totalParts
    WriteLog "[FIM] Tempo total: " & FormatNumber(elapsed, 2) & " s"
    WriteLog "==============================================================="

    CloseLog
End Sub

'===========================================================================
'  Parsing de argumentos
'===========================================================================
Sub ParseArguments()
    Dim args
    Set args = WScript.Arguments

    If args.Count >= 1 Then
        inputFolder = args(0)
    Else
        inputFolder = fso.GetAbsolutePathName(".")
    End If

    If args.Count >= 2 Then
        outputFolder = args(1)
    Else
        outputFolder = fso.BuildPath(inputFolder, "pdf_split_output")
    End If

    If args.Count >= 3 Then
        On Error Resume Next
        limitMB = CDbl(Replace(args(2), ",", "."))
        If Err.Number <> 0 Then
            limitMB = DEFAULT_LIMIT_MB
            Err.Clear
        End If
        On Error GoTo 0
    Else
        limitMB = DEFAULT_LIMIT_MB
    End If
End Sub

'===========================================================================
'  Detecção do backend (qpdf preferencial, pdftk como fallback)
'===========================================================================
Sub ResolveBackend()
    backend     = ""
    backendPath = ""

    backendPath = FindInPath("qpdf.exe")
    If backendPath <> "" Then
        backend = "qpdf"
        Exit Sub
    End If

    backendPath = FindInPath("pdftk.exe")
    If backendPath <> "" Then
        backend = "pdftk"
        Exit Sub
    End If

    WScript.Echo "[ERRO] Nem 'qpdf' nem 'pdftk' foram encontrados no PATH."
    WScript.Echo "       Instale um dos dois e adicione ao PATH do sistema."
    WScript.Quit 2
End Sub

Function FindInPath(exeName)
    Dim pathVar, parts, i, candidate
    FindInPath = ""
    pathVar = shell.ExpandEnvironmentStrings("%PATH%")
    parts = Split(pathVar, ";")
    For i = 0 To UBound(parts)
        candidate = fso.BuildPath(Trim(parts(i)), exeName)
        If fso.FileExists(candidate) Then
            FindInPath = candidate
            Exit Function
        End If
    Next
End Function

'===========================================================================
'  Log de auditoria
'===========================================================================
Sub InitLog()
    Dim logPath
    logPath = fso.BuildPath(outputFolder, LOG_FILE)
    Set logStream = fso.OpenTextFile(logPath, 8, True) ' 8 = ForAppending
End Sub

Sub WriteLog(msg)
    WScript.Echo msg
    If Not logStream Is Nothing Then
        logStream.WriteLine "[" & Now & "] " & msg
    End If
End Sub

Sub CloseLog()
    If Not logStream Is Nothing Then
        logStream.Close
        Set logStream = Nothing
    End If
End Sub

'===========================================================================
'  Varredura recursiva de pasta
'===========================================================================
Sub ProcessFolder(folderPath)
    Dim folder, file, sub
    Set folder = fso.GetFolder(folderPath)

    For Each file In folder.Files
        If LCase(fso.GetExtensionName(file.Name)) = "pdf" Then
            If file.Size > (MIN_TRIGGER_MB * MB) Then
                ProcessPdfFile file
            End If
        End If
    Next

    For Each sub In folder.SubFolders
        ProcessFolder sub.Path
    Next
End Sub

'===========================================================================
'  Processamento de um PDF
'===========================================================================
Sub ProcessPdfFile(file)
    Dim sizeMB, pages, parts, i
    sizeMB = file.Size / MB

    WriteLog ""
    WriteLog "=== Processando: " & file.Name & " (" & FormatNumber(sizeMB, 2) & " MB) ==="

    pages = GetPageCount(file.Path)
    If pages <= 0 Then
        WriteLog "  [AVISO] Não foi possível obter a contagem de páginas. Ignorando."
        Exit Sub
    End If

    WriteLog "  Páginas detectadas: " & pages

    ' Fatiamento
    Dim limitBytes, avgPerPage, pagesPerPart
    limitBytes  = limitMB * MB
    avgPerPage  = file.Size / pages
    pagesPerPart = Int((limitBytes * SAFETY_FACTOR) / avgPerPage)
    If pagesPerPart < 1 Then pagesPerPart = 1

    Dim startPage, partNo, cnt, endPage, outName, outPath
    startPage = 1
    partNo    = 1

    Do While startPage <= pages
        cnt = pagesPerPart
        If (startPage + cnt - 1) > pages Then cnt = pages - startPage + 1
        endPage = startPage + cnt - 1

        outName = fso.GetBaseName(file.Name) & "_parte_" & Pad3(partNo) & ".pdf"
        outPath = fso.BuildPath(outputFolder, outName)

        ' Reduz enquanto a fatia exceder o limite
        Do While cnt > 1
            ExtractSlice file.Path, startPage, endPage, outPath
            If FileSizeMB(outPath) <= limitMB Then Exit Do
            cnt = cnt - 1
            endPage = startPage + cnt - 1
        Loop

        ' Tenta crescer enquanto ainda couber
        Do While (endPage < pages)
            Dim tryEnd, tryPath, trySize
            tryEnd  = endPage + 1
            tryPath = fso.BuildPath(outputFolder, "_tmp_" & outName)
            ExtractSlice file.Path, startPage, tryEnd, tryPath
            trySize = FileSizeMB(tryPath)
            If trySize <= limitMB Then
                fso.DeleteFile outPath, True
                fso.MoveFile tryPath, outPath
                endPage = tryEnd
                cnt = endPage - startPage + 1
            Else
                fso.DeleteFile tryPath, True
                Exit Do
            End If
        Loop

        If Not fso.FileExists(outPath) Then
            ExtractSlice file.Path, startPage, endPage, outPath
        End If

        WriteLog "  -> " & outName & "  |  " & _
                 FormatNumber(FileSizeMB(outPath), 2) & " MB  |  pág. " & _
                 startPage & "-" & endPage

        totalParts = totalParts + 1
        startPage  = endPage + 1
        partNo     = partNo + 1
    Loop
End Sub

'===========================================================================
'  Contagem de páginas via backend
'===========================================================================
Function GetPageCount(pdfPath)
    Dim exec, out
    GetPageCount = 0

    On Error Resume Next
    If backend = "qpdf" Then
        Set exec = shell.Exec("""" & backendPath & """ --show-npages """ & pdfPath & """")
        Do While exec.Status = 0
            WScript.Sleep 30
        Loop
        out = Trim(exec.StdOut.ReadAll)
        If IsNumeric(out) Then GetPageCount = CLng(out)
    ElseIf backend = "pdftk" Then
        Set exec = shell.Exec("""" & backendPath & """ """ & pdfPath & """ dump_data")
        Do While exec.Status = 0
            WScript.Sleep 30
        Loop
        out = exec.StdOut.ReadAll
        Dim re, matches
        Set re = New RegExp
        re.Pattern = "NumberOfPages:\s*(\d+)"
        re.IgnoreCase = True
        Set matches = re.Execute(out)
        If matches.Count > 0 Then GetPageCount = CLng(matches(0).SubMatches(0))
    End If
    On Error GoTo 0
End Function

'===========================================================================
'  Extração de fatia
'===========================================================================
Sub ExtractSlice(src, firstPage, lastPage, dst)
    Dim cmd
    If backend = "qpdf" Then
        cmd = """" & backendPath & """ """ & src & """ --pages . " & _
              firstPage & "-" & lastPage & " -- """ & dst & """"
    Else
        cmd = """" & backendPath & """ """ & src & """ cat " & _
              firstPage & "-" & lastPage & " output """ & dst & """"
    End If
    shell.Run cmd, 0, True
End Sub

'===========================================================================
'  Utilitários
'===========================================================================
Function FileSizeMB(path)
    On Error Resume Next
    If fso.FileExists(path) Then
        FileSizeMB = fso.GetFile(path).Size / MB
    Else
        FileSizeMB = 0
    End If
    On Error GoTo 0
End Function

Function Pad3(n)
    Pad3 = Right("000" & n, 3)
End Function

'===========================================================================
'  Início
'===========================================================================
Main
