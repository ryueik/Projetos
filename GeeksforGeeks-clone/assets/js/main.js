// Exemplo de animação para os elementos ao rolar a página
window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.feature-item');
    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            element.classList.add('in-view');
        }
    });
});

// Código para interações futuras, animações, etc
document.addEventListener('DOMContentLoaded', function() {
    console.log("GFG Clone Loaded!");
});

// script simples para simular o envio de comentários
document.addEventListener('DOMContentLoaded', function () {
    const commentForm = document.querySelector('.comment-form');
    const commentInput = document.querySelector('.comment-form textarea');
    const commentsSection = document.querySelector('.comments-section');

    commentForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const commentText = commentInput.value;
        if (commentText) {
            const newComment = document.createElement('div');
            newComment.classList.add('comment');
            newComment.innerHTML = `<p><strong>Usuário:</strong> ${commentText}</p>`;
            commentsSection.appendChild(newComment);

            commentInput.value = ''; // limpa o campo de texto
        }
    });
});
