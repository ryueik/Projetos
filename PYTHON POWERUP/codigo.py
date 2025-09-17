import pyautogui #fazer automações no computador
import time #fazer pausas no código

# pyautogui.write -> escrever um texto
# pyautogui.press -> apertar 1 tecla
# pyautogui.click -> clicar em algum lugar da tela
# pyautogui.hotkey -> combinação de teclas

pyautogui.PAUSE = 1#pausa de 1 segundo após cada comando do pyautogui

# Passo 1: Abrir o navegador e entrar no site - https://dlp.hashtagtreinamentos.com/python/intensivao/login
pyautogui.press("win")
pyautogui.write("mozila")
pyautogui.press("enter")
time.sleep(20) #esperar o navegador abrir                    

pyautogui.write("https://dlp.hashtagtreinamentos.com/python/intensivao/login")
pyautogui.press("enter")
time.sleep(10) #esperar a página carregar


# Passo 2: Fazer login
# preencher o campo de email
pyautogui.position(x=235, y=345)#posição do maouse
pyautogui.press("tab")
pyautogui.write("matheus@gmail.com")
time.sleep(1)

# preencher o campo de senha
pyautogui.press("tab")
pyautogui.write("123456")

pyautogui.press("tab")
pyautogui.press("enter")
time.sleep(10) #esperar a página carregar

# Passo 3: Importar a base de produtos pra cadastrar
import pandas 

tabela = pandas.read_csv("produtos.csv")

print(tabela)

# Passo 4: Cadastrar um produto
for linha in tabela.index: #para cada linha na tabela


    time.sleep(2)
    pyautogui.click (x=856, y=286) #clicar no botão codigo do produto

    codigo = tabela.loc[linha, "codigo"] #pegar o valor da coluna codigo na linha atual
    pyautogui.write(codigo)
    pyautogui.press("tab") #pular pro próximo campo

    marca = tabela.loc[linha, "marca"] #pegar o valor da coluna marca na linha atual
    pyautogui.write(marca)
    pyautogui.press("tab") #pular pro próximo campo

    tipo = tabela.loc[linha, "tipo"] #pegar o valor da coluna tipo na linha atual
    pyautogui.write(tipo)
    pyautogui.press("tab") #pular pro próximo campo

    categoria = str(tabela.loc[linha, "categoria"]) #pegar o valor da coluna categoria na linha atual
    pyautogui.write(categoria)
    pyautogui.press("tab") #pular pro próximo campo

    custo = str(tabela.loc[linha, "custo"] )#pegar o valor da coluna custo na linha atual
    pyautogui.write(custo)
    pyautogui.press("tab") #pular pro próximo campo

    preco_unitario = str(tabela.loc[linha, "preco_unitario"]) #pegar o valor da coluna preco_unitario na linha atual
    pyautogui.write(preco_unitario)
    pyautogui.press("tab") #pular pro próximo campo

    obs = str(tabela.loc[linha, "obs"]) #pegar o valor da coluna obs na linha atual
    
    if obs!="nan":
       pyautogui.write(obs)

    pyautogui.press("tab") #pular pro próximo campo
    pyautogui.press("enter") #salvar o produto
    
    
    
    pyautogui.scroll(10000) #subir a tela até o topo
    


# Passo 5: Repetir o cadastro para todos os produtos da base

time.sleep(2)


