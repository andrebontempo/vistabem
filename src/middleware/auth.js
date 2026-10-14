const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const settingService = require('../services/settingService');
const cartService = require('../services/cartService');

const JWT_SECRET = () => process.env.JWT_SECRET || 'vistabem_dev_secret_troque_em_producao';
const isProd = () => process.env.NODE_ENV === 'production';

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, JWT_SECRET(), { expiresIn: '7d' });
}

function setAuthCookie(res, user) {
  res.cookie('vb_token', signToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('vb_token');
}

let menuCache = null;
let menuAt = 0;
async function getMenu() {
  if (menuCache && Date.now() - menuAt < 60000) return menuCache;
  const cats = await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  const roots = cats.filter((c) => !c.parent);
  menuCache = roots.map((r) => ({
    ...r,
    children: cats.filter((c) => c.parent && c.parent.toString() === r._id.toString()),
  }));
  menuAt = Date.now();
  return menuCache;
}
function clearMenuCache() {
  menuCache = null;
}

/**
 * Injeta usuário, configurações, menu e contador do carrinho em todas as views.
 */
const loadContext = async (req, res, next) => {
  res.locals.user = null;
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  try {
    const token = req.cookies.vb_token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET());
      const user = await User.findById(decoded.id);
      if (user && user.active) {
        req.user = user;
        res.locals.user = user;
      } else clearAuthCookie(res);
    }
  } catch {
    clearAuthCookie(res);
  }

  try {
    res.locals.settings = await settingService.getSettings();
    if (!req.path.startsWith('/admin') && !req.path.startsWith('/api')) {
      res.locals.menu = await getMenu();
    }
  } catch (e) {
    res.locals.settings = {};
    res.locals.menu = [];
  }
  res.locals.menu = res.locals.menu || [];
  res.locals.cartCount = cartService.count(req);
  res.locals.wishlistIds = req.user ? req.user.wishlist.map((id) => id.toString()) : [];
  next();
};

const wantsJson = (req) => req.xhr || (req.headers.accept || '').includes('application/json') || req.path.startsWith('/api');

const protect = (req, res, next) => {
  if (req.user) return next();
  if (wantsJson(req)) return res.status(401).json({ error: 'Faça login para continuar.', login: true });
  return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  if (!req.user) return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  if (wantsJson(req)) return res.status(403).json({ error: 'Acesso restrito.' });
  return res.status(403).render('error', {
    title: 'Acesso negado',
    message: 'Você não tem permissão para acessar esta área.',
  });
};

module.exports = {
  loadContext,
  protect,
  adminOnly,
  setAuthCookie,
  clearAuthCookie,
  clearMenuCache,
};
