# 🛍️ Vista Bem — E-commerce de Moda

Plataforma completa de e-commerce de moda contemporânea e sofisticada (Feminina, Masculina, Infantil e Acessórios), construída em **Node.js, Express, MongoDB, EJS e Docker Compose**.

## 🎨 Identidade Visual
- **Paleta**: Roxo Profundo (`#2A0F4A`), Roxo Real (`#4C1D95`), Lilás Névoa (`#EDE6FA`), Champanhe Dourado (`#D9B26F`).
- **Acessibilidade**: Seletor A+/A- e modo escuro/claro.

## 🚀 Como Iniciar

1. Clone o repositório e configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Instale as dependências e rode o banco:
   ```bash
   npm install
   docker compose up -d mongo
   npm run seed
   npm run dev
   ```

Acesse em seu navegador: `http://localhost:3000`.

Para detalhes completos de deploy, Google OAuth e Mercado Pago, consulte [DOCUMENTACAO.md](DOCUMENTACAO.md).
