from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename
import os
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium import webdriver as wd
import time

app = Flask(__name__)

# Pasta onde as imagens serão armazenadas temporariamente
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/')
def index():
    return render_template('index.html')  # Carrega o formulário HTML

# Rota para receber os dados do formulário
@app.route('/enviar', methods=['POST'])
def enviar_mensagem():
    try:
        grupos = request.form.get('grupos').split(',')  # Grupos separados por vírgula
        mensagem = request.form.get('mensagem')  # Mensagem a ser enviada
        imagem = request.files['imagem']  # Imagem enviada pelo usuário

        # Salvar a imagem localmente
        filename = secure_filename(imagem.filename)
        imagem_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        imagem.save(imagem_path)

        # Caminho para o chromedriver
        chromedriver_path = "C:/Users/Tatiane Freitas/Downloads/chromedriver-win64 (1)/chromedriver.exe"  # Atualize o caminho

        # Usando o Service para especificar o caminho do chromedriver
        service = Service(chromedriver_path)
        options = Options()
        driver = wd.Chrome(service=service, options=options)

        driver.get("https://web.whatsapp.com")

        # Aguarde o carregamento do WhatsApp Web (pode ser necessário tempo para login)
        time.sleep(15)

        # Encontrar os grupos e enviar a mensagem
        for grupo in grupos:
            try:
                # Buscando o grupo
                grupo_element = driver.find_element(By.XPATH, f'//span[@title="{grupo.strip()}"]')
                grupo_element.click()

                # Encontrando a caixa de mensagem
                mensagem_box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="1"]')
                mensagem_box.send_keys(mensagem)

                # Enviar imagem (se houver)
                anexo_button = driver.find_element(By.XPATH, '//span[@data-icon="attach"]')
                anexo_button.click()

                time.sleep(1)  # Espera o menu de anexos abrir

                imagem_input = driver.find_element(By.XPATH, '//input[@type="file"]')
                imagem_input.send_keys(imagem_path)

                time.sleep(2)  # Aguarda o upload da imagem

                # Enviar a mensagem com a imagem
                enviar_button = driver.find_element(By.XPATH, '//span[@data-icon="send"]')
                enviar_button.click()

                time.sleep(2)  # Espera o envio

            except Exception as e:
                print(f"Erro ao enviar para o grupo {grupo}: {str(e)}")

        # Fechar o navegador
        driver.quit()

        return jsonify({"status": "success", "message": "Mensagem enviada com sucesso!"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
