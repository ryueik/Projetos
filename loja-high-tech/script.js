// Carrinho de Compras
let cart = [];

// Carregar produtos do Firebase
function loadProducts() {
    // Implementação do Firebase
}

// Adicionar ao carrinho
function addToCart(product) {
    cart.push(product);
    updateCartCount();
}

// Atualizar contador do carrinho
function updateCartCount() {
    document.querySelector('.cart-count').textContent = cart.length;
}

// Menu Mobile
document.querySelector('.menu-toggle').addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('active');
});

// Animação de hover nos produtos
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});