const rateLimit = require('express-rate-limit');

/**
 * Proteção CSRF simples: requisições que alteram estado precisam vir da mesma origem.
 * Combinado com cookies SameSite=Lax.
 */
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/api/payments/webhook')) return next();

  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return next();

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    const reqHost = (req.headers.host || '').toLowerCase();
    const forwardedHost = (req.headers['x-forwarded-host'] || '').toLowerCase();

    // Domínios da própria loja sempre permitidos
    const allowedHosts = ['vistabem.com', 'www.vistabem.com', 'localhost', '127.0.0.1'];

    if (process.env.BASE_URL) {
      try {
        allowedHosts.push(new URL(process.env.BASE_URL).host.toLowerCase());
      } catch {}
    }

    // Se a origem do navegador for um domínio autorizado da loja
    if (allowedHosts.some((h) => originHost === h || originHost.endsWith('.' + h))) {
      return next();
    }

    // Se bater com o host da requisição ou proxy reverso
    if (originHost === reqHost || forwardedHost.includes(originHost)) {
      return next();
    }

    // Em desenvolvimento ou testes locais
    if (process.env.NODE_ENV !== 'production' || reqHost.includes('localhost') || reqHost.includes('127.0.0.1')) {
      return next();
    }
  } catch {
    /* origem inválida */
  }

  return res.status(403).send('Origem não permitida.');
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Limite de envios atingido. Tente novamente mais tarde.',
});

/**
 * Remove chaves iniciadas por $ ou contendo "." (prevenção de NoSQL injection)
 */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else sanitize(obj[key]);
  }
  return obj;
}
function mongoSanitize(req, res, next) {
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}

/**
 * Campo honeypot: bots costumam preencher todos os campos.
 */
function honeypot(req, res, next) {
  if (req.body && req.body.website) {
    return res.redirect(req.originalUrl);
  }
  next();
}

module.exports = { sameOrigin, authLimiter, formLimiter, mongoSanitize, honeypot };
