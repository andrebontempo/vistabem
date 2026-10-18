# 🛍️ Vista Bem — Documentação Técnica & Operacional

> E-commerce de moda contemporânea e sofisticada (Feminino, Masculino, Infantil e Acessórios), construído em **Node.js, Express, MongoDB, EJS e Docker Compose**, baseado na arquitetura comprovada do projeto *O Que É Isso?*.

---

## 📋 1. Visão Geral da Stack

- **Linguagem & Runtime**: Node.js 20 (LTS Alpine no Docker).
- **Framework Web**: Express 4 com Helmet, Compression, Morgan e Cookie-Parser.
- **View Engine**: EJS com componentes dinâmicos e design editorial refinado.
- **Banco de Dados**: MongoDB 7.0 via Mongoose ODM com índices de busca e timestamps.
- **Segurança**:
  - Helmet com Content Security Policy configurado.
  - Rate limiting para autenticação e envios de formulário.
  - Sanitização NoSQL contra injeção de operadores.
  - Proteção anti-bot por campo honeypot e Same-Origin policy.
  - Senhas criptografadas com bcryptjs (10 rounds) e tokens JWT em cookies httpOnly e SameSite=Lax.
- **Identidade Visual**:
  - Paleta: Roxo profundo (`#2A0F4A`), Roxo nobre (`#4C1D95`), Roxo médio (`#7C3AED`), Lilás suave (`#EDE6FA`), Lilás névoa (`#F8F5FE`) e Champanhe/Dourado (`#D9B26F`).
  - Tipografia: Bodoni Moda (títulos) + Plus Jakarta Sans (leitura).
  - Ícones: SVG inline com traço consistente (sem dependência de fontes externas pesadas).
  - Acessibilidade: seletor de fonte dinâmico A+/A- e modo escuro/claro com persistência local.
- **PWA (Progressive Web App)**: Service Worker com cache estratégico de assets estáticos e manifesto para instalação em celular.

---

## ⚙️ 2. Variáveis de Ambiente (`.env`)

Na raiz da aplicação (`/opt/docker/vistabem/.env` na VPS Hostinger ou localmente):

```env
# Servidor & Banco de Dados
NODE_ENV=production
PORT=80
MONGODB_URI=mongodb://mongo:27017/vistabem
JWT_SECRET=sua_chave_jwt_super_secreta_vistabem_2026

# URLs da Aplicação
BASE_URL=https://vistabem.com
WEBHOOK_URL=https://vistabem.com

# Google OAuth 2.0
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_CALLBACK_URL=https://vistabem.com/auth/google/callback

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_access_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_do_webhook

# E-mail SMTP (Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=atendimento@vistabem.com
SMTP_PASS=sua_senha_do_email
SMTP_FROM_NAME="Vista Bem"
ADMIN_ALERT_EMAIL=atendimento@vistabem.com

# Administrador Inicial (usado no seed)
ADMIN_EMAIL=admin@vistabem.com
ADMIN_PASSWORD=VistaBem@2026
```

---

## 🔐 3. Autenticação com Google OAuth 2.0

### Configuração no Google Cloud Console:
1. Acesse o **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Crie ou selecione o projeto do e-commerce.
3. Em **APIs e Serviços > Credenciais**, selecione ou crie um **ID do cliente OAuth 2.0** do tipo *Aplicativo da Web*.
4. Adicione nas **Origens JavaScript autorizadas**:
   - `https://vistabem.com`
   - `http://localhost:3000` (para testes locais)
5. Adicione nos **URIs de redirecionamento autorizados**:
   - `https://vistabem.com/auth/google/callback`
   - `http://localhost:3000/auth/google/callback`
6. Salve o Client ID e Client Secret no seu `.env`.

---

## 💳 4. Integração Mercado Pago (Pix & Checkout Pro)

1. **Pix Direto**:
   - Gera QR Code e chave Copia e Cola na própria loja com desconto de 5% configurável.
   - A tela de acompanhamento faz polling automático e recarrega instantaneamente quando o pagamento é detectado.
2. **Checkout Pro (Cartão de Crédito e Boleto)**:
   - Permite parcelamento em até 6x sem juros (ou configurável no painel).
3. **Webhook (`POST /api/payments/webhook`)**:
   - Recebe as notificações de pagamento aprovado em tempo real.
   - Atualiza o pedido para `Aprovado` e status para `Em Separação`.
   - Se houver cancelamento ou reembolso, devolve o estoque automaticamente.

---

## ✉️ 5. Notificações por E-mail (Hostinger SMTP)

O serviço de e-mail (`src/services/mailService.js`) envia mensagens formatadas na paleta e logotipo da marca:

1. **Boas-vindas**: enviado ao cliente ao cadastrar-se.
2. **Alerta de Novo Usuário**: notifica a administração sobre novos clientes.
3. **Pedido Recebido**: resumo com itens, endereço e botão de acompanhamento.
4. **Alerta de Venda**: notifica a administração para preparar o envio.
5. **Pagamento Aprovado**: aviso ao cliente de confirmação de pagamento.
6. **Atualização de Envio com Rastreio**: enviado ao despachar a mercadoria com link dos Correios.
7. **Redefinição de Senha**: link seguro temporário com expiração em 1 hora.

---

## 🐳 6. Deploy & Docker

### Arquitetura de Containers:
- `vistabem-app`: Container Node 20 Alpine rodando a aplicação na rede interna e conectado à rede externa `proxy`.
- `vistabem-mongo`: Container MongoDB 7 com volume persistente de dados `mongo_data`.
- `uploads_data`: Volume persistente compartilhado para fotos de produtos e categorias em WebP.

### Deploy Automático (CI/CD via GitHub Actions):
Conforme a regra do projeto, **não realizamos acesso SSH manual na VPS**. O deploy é acionado automaticamente a cada `git push origin main` pelo workflow `.github/workflows/deploy.yml`, que invoca o script `deploy.sh` na VPS:
1. Puxa as atualizações do branch `main`.
2. Executa `git clean` preservando `.env` e volumes.
3. Executa `docker compose up -d --build --remove-orphans`.

---

## 🚀 7. Comandos de Utilidade

- **Executar o Povoamento Inicial (Seed)**:
  ```bash
  npm run seed
  # Ou no Docker:
  docker exec -it vistabem-app npm run seed
  ```
- **Iniciar em Modo de Desenvolvimento**:
  ```bash
  npm run dev
  ```
- **Ver Logs da Aplicação**:
  ```bash
  docker logs -f vistabem-app
  ```

---

## 🛠️ 8. Modo de Manutenção Programada

O e-commerce conta com um sistema de manutenção inteligente e seguro, desenvolvido com as melhores práticas de SEO e experiência do usuário:

- **Ativação Simples via Painel**: Pode ser ativado ou desativado em **Painel Administrativo > Configurações Gerais**.
- **Preservação de SEO (Google)**: Visitantes e robôs de busca recebem status **HTTP 503 (Service Unavailable)** juntamente com o cabeçalho `Retry-After: 3600` (1 hora) e meta tags `noindex, nofollow, noarchive`, garantindo que indexações, palavras-chave e posições no Google não sejam perdidas durante manutenções.
- **Bypass de Administrador (Pré-visualização)**: Usuários logados com papel de `admin` continuam navegando normalmente por toda a loja virtual, com um banner indicativo no topo informando que a loja está em modo de pré-visualização.
- **Áreas Sempre Liberadas**: As rotas de login (`/login`, `/auth`, etc.), o painel de gestão (`/admin`), o health check (`/health`) e os assets estáticos continuam sempre acessíveis.
- **Personalização Dinâmica**:
  - Título customizado da página.
  - Mensagem explicativa aos clientes.
  - Previsão de retorno opcional (ex: "Hoje às 20h").
  - Botões de contato direto para suporte no WhatsApp e acompanhamento no Instagram.
- **Ativação por Variável de Ambiente (Opcional)**: Também pode ser forçado via `.env` definindo `MAINTENANCE_MODE=true`.

