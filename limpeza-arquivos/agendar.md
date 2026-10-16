# Agendando a limpeza

Rode sempre uma **simulação** antes de agendar a versão que altera arquivos e confira o log em `auditoria/`.

## Windows · Agendador de Tarefas

### PowerShell (`Limpeza-Arquivos.ps1`)

Teste primeiro:

```powershell
.\Limpeza-Arquivos.ps1 -Path "D:\Exportacoes" -Days 30 -WhatIf
```

Agende todo dia às 02:00 (rode o PowerShell como administrador):

```powershell
$acao = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Automacoes\limpeza-arquivos\Limpeza-Arquivos.ps1" -Path "D:\Exportacoes","C:\Temp\Relatorios" -Days 30 -QuarantinePath "D:\Quarentena" -Confirm:$false'
$gatilho = New-ScheduledTaskTrigger -Daily -At 2am
$config  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "Limpeza de Arquivos" -Action $acao -Trigger $gatilho -Settings $config `
  -User "SYSTEM" -RunLevel Highest -Description "Retenção de 30 dias com quarentena"
```

### Python (`limpeza.py`) via `schtasks`

```bat
schtasks /Create /TN "Limpeza de Arquivos (Python)" /SC DAILY /ST 02:00 /RU SYSTEM ^
  /TR "\"C:\Python313\python.exe\" \"C:\Automacoes\limpeza-arquivos\limpeza.py\" D:\Exportacoes --dias 30 --executar --quarentena D:\Quarentena --auditoria C:\Automacoes\limpeza-arquivos\auditoria"
```

Para conferir ou rodar na hora:

```bat
schtasks /Query /TN "Limpeza de Arquivos (Python)" /V /FO LIST
schtasks /Run   /TN "Limpeza de Arquivos (Python)"
```

## Linux/macOS · cron

Edite com `crontab -e` e adicione (todo dia às 02:00, com log da saída):

```cron
0 2 * * * /usr/bin/python3 /opt/limpeza-arquivos/limpeza.py /srv/exportacoes /var/tmp/relatorios --dias 30 --executar --quarentena /srv/quarentena --auditoria /opt/limpeza-arquivos/auditoria >> /var/log/limpeza-arquivos.log 2>&1
```

E uma segunda tarefa, semanal, que esvazia a quarentena após mais 30 dias:

```cron
30 3 * * 0 /usr/bin/python3 /opt/limpeza-arquivos/limpeza.py /srv/quarentena --dias 30 --executar --remover-pastas-vazias --auditoria /opt/limpeza-arquivos/auditoria
```

## Boas práticas

- Comece com `--quarentena` (ou `-QuarantinePath`) e só passe para exclusão definitiva depois de alguns ciclos sem reclamações.
- Use `--excluir` / `-Exclude` para pastas que nunca devem ser tocadas (ex.: `"*/manter/*"`).
- As extensões de banco de dados e chaves (`.db`, `.mdf`, `.pst`, `.key`, `.pem`, ...) já vêm protegidas.
- Os dois scripts recusam a raiz do disco, a pasta do usuário e pastas de sistema.
- Guarde os arquivos de `auditoria/` pelo prazo exigido pela política de retenção da empresa.
