 // Função para alternar o tema
 const toggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');

  // Mudar ícone do botão
  if (document.body.classList.contains('dark-mode')) {
    themeIcon.textContent = '☀️';
  } else {
    themeIcon.textContent = '🌙';
  }
});

// Função para adicionar mensagens no chat
function addMessage(message, sender) {
    var messageElement = document.createElement('div');
    messageElement.classList.add(sender);
    messageElement.innerText = message;
    document.getElementById('chat-messages').appendChild(messageElement);
}

// Função para simular as respostas do assistente
function responderAssistente(userMessage) {
    userMessage = userMessage.toLowerCase();
    if (userMessage.includes("preço")) {
        return "O preço varia conforme o tipo de site. Entre em contato para mais detalhes.";
    } else if (userMessage.includes("site")) {
        return "Nós criamos sites personalizados de acordo com suas necessidades!";
    } else {
        return "Desculpe, não entendi. Pode repetir?";
    }
}
