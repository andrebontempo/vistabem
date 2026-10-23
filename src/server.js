const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
require('dotenv').config();

const connectDB = require('./config/db');
const configurePassport = require('./config/passport');
const { loadContext } = require('./middleware/auth');
const { mongoSanitize } = require('./middleware/security');
const maintenanceMiddleware = require('./middleware/maintenance');
const flash = require('./middleware/flash');
const helpers = require('./utils/helpers');
const stockService = require('./services/stockService');

const app = express();
app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.locals.googleEnabled = configurePassport();
Object.assign(app.locals, helpers);
app.locals.baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
app.locals.assetVersion = Date.now().toString(36);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'", 'https://viacep.com.br'],
        'form-action': ["'self'", 'https://accounts.google.com', 'https://*.mercadopago.com.br', 'https://*.mercadopago.com'],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { skip: (req) => req.path.startsWith('/css') || req.path.startsWith('/js') }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize);
app.use(passport.initialize());

app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      } else if (filePath.match(/\.(css|js|jpg|jpeg|png|webp|svg|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      }
    },
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Política profissional de Cache-Control para E-commerce (Prevenção de cache em HTML dinâmico, preços, estoques e sessões)
app.use((req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(flash);
app.use(loadContext);
app.use(maintenanceMiddleware);

// Redirecionamentos de compatibilidade com o antigo WordPress
app.get(['/wp-login.php', '/wp-login'], (req, res) => res.redirect(301, '/login'));
app.get(['/wp-admin', '/wp-admin/*'], (req, res) => res.redirect(301, '/admin'));
app.all(['/xmlrpc.php', '/wp-content/*'], (req, res) => res.status(404).send('Not Found'));

app.use('/', require('./routes/shopRoutes'));
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/cartRoutes'));
app.use('/', require('./routes/checkoutRoutes'));
app.use('/minha-conta', require('./routes/accountRoutes'));
app.use('/admin', require('./routes/adminRoutes'));

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    message: 'Ops! Essa página saiu para dar uma volta. Que tal explorar nossas novidades?',
    code: 404,
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Erro]', err);
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (req.xhr || (req.headers.accept || '').includes('application/json')) {
    return res.status(status).json({ error: status === 500 ? 'Erro interno.' : err.message });
  }
  res.status(status).render('error', {
    title: status === 500 ? 'Algo deu errado' : 'Não foi possível concluir',
    message: status === 500 ? 'Ocorreu um erro inesperado. Tente novamente em instantes.' : err.message,
    code: status,
  });
});

const PORT = process.env.PORT || 3000;

const { autoSeedIfEmpty } = require('./scripts/seed');

connectDB().then(async () => {
  await autoSeedIfEmpty();
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`💜 Vista Bem rodando na porta ${PORT}`);
    console.log(`👉 ${app.locals.baseUrl}`);
    console.log('====================================================');
  });
  // Expira pedidos não pagos a cada 30 minutos
  setInterval(() => stockService.expireStaleOrders(24).catch((e) => console.error(e)), 30 * 60 * 1000);
});

module.exports = app;
