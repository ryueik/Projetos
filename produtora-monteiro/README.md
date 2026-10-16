# Portal Produtora Monteiro

Portal institucional desenvolvido para a **Produtora Monteiro**, empresa de produção audiovisual. O site em produção está em **<https://produtoramonteiro.com/>**.

Esta pasta guarda uma **versão demonstrativa** (`index.html`) que recria a estrutura do portal com conteúdo ilustrativo, no mesmo sistema visual do painel de projetos. Ela não tem clientes, depoimentos ou números reais: o conteúdo oficial está no site da produtora.

## Destaques do projeto

| Área | O que foi feito |
|:---|:---|
| **Full stack** | Site institucional com páginas de serviços, portfólio e contato, e formulário de orçamento integrado ao back-end. |
| **SEO técnico** | HTML semântico, `title`/`description` por página, Open Graph e Twitter Card, URL canônica e dados estruturados `Organization` em JSON-LD. |
| **Banco de dados** | Pedidos de orçamento e conteúdo do portfólio persistidos, com validação no servidor antes de gravar. |
| **Segurança** | Validação de entrada no cliente e no servidor, honeypot contra spam no formulário, HTTPS e nenhum dado sensível exposto no front-end. |
| **Performance e UX** | Layout responsivo, tema claro/escuro, animações leves que respeitam `prefers-reduced-motion`. |

## Versão demonstrativa

- **Hero** com visual de “monitor de gravação” feito só com CSS (sem imagens externas).
- **Serviços**: vídeo institucional, cobertura de eventos, fotografia, conteúdo para redes, edição e pós-produção, áudio e locução.
- **Portfólio** com filtro por categoria e capas em gradiente (placeholders).
- **Processo** em quatro etapas: briefing, pré-produção, captação, pós e entrega.
- **Contato** com validação no navegador (nome, e-mail, telefone opcional, serviço, mensagem, consentimento) e honeypot. Ao enviar, abre o aplicativo de e-mail do visitante com a mensagem pronta (`mailto:`). Nada é enviado a servidores nesta versão.
- **SEO**: meta description, Open Graph, Twitter Card, `canonical` apontando para o site oficial e JSON-LD `Organization`.

## Como abrir

```bash
# na raiz do repositório
python -m http.server 8000
# depois abra http://localhost:8000/produtora-monteiro/
```

A página usa o tema compartilhado do repositório (`../assets/css/theme.css` e `../assets/js/theme.js`).

## Tecnologias

`HTML5` · `CSS3` · `JavaScript` · `SEO` · `JSON-LD`
