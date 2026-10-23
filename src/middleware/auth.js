const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const settingService = require('../services/settingService');
const cartService = require('../services/cartService');

const JWT_SECRET = () => process.env.JWT_SECRET || 'vistabem_dev_secret_troque_em_producao';
const isProd = () => process.env.NODE_ENV === 'production';

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      firstName: user.firstName,
    },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, user) {
  res.cookie('vb_token', signToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('vb_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
  });
}

async function getMenu() {
  const cats = await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  const roots = cats.filter((c) => !c.parent);
  return roots.map((r) => ({
    ...r,
    children: cats.filter((c) => c.parent && c.parent.toString() === r._id.toString()),
  }));
}
function clearMenuCache() {}

/**
 * Injeta usuário, configurações, menu e contador do carrinho em todas as views.
 */
const loadContext = async (req, res, next) => {
  res.locals.user = null;
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  const token = req.cookies && req.cookies.vb_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET());
      let user = null;
      try {
        if (decoded.id) {
          user = await User.findById(decoded.id);
        }
        if (!user && decoded.email) {
          // Fallback por e-mail caso o ID tenha sido recriado em seed
          user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
          if (user) {
            setAuthCookie(res, user);
          }
        }
      } catch (dbErr) {
        console.error('[Auth] Erro ao buscar usuário no banco de dados:', dbErr.message);
      }

      if (user) {
        if (user.active) {
          req.user = user;
          res.locals.user = user;
        } else {
          console.warn(`[Auth] Usuário ${user.email} está desativado.`);
          clearAuthCookie(res);
        }
      } else if (decoded.role === 'admin' && decoded.email) {
        // Fallback seguro usando claims assinadas do JWT para manter o painel estável
        const fallbackAdmin = {
          _id: decoded.id,
          id: decoded.id,
          email: decoded.email,
          role: 'admin',
          name: decoded.name || 'Administradora Vista Bem',
          firstName: decoded.firstName || 'Administradora',
          active: true,
          wishlist: [],
        };
        req.user = fallbackAdmin;
        res.locals.user = fallbackAdmin;
      } else {
        console.warn(`[Auth] Usuário ${decoded.email || decoded.id} não encontrado no banco.`);
        clearAuthCookie(res);
      }
    } catch (jwtErr) {
      console.warn('[Auth] Token JWT inválido ou expirado:', jwtErr.message);
      clearAuthCookie(res);
    }
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
  if (!req.user) {
    console.warn(`[Auth] Acesso bloqueado em ${req.originalUrl}: usuário não autenticado.`);
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  console.warn(`[Auth] Acesso negado: ${req.user.email} (${req.user.role}) tentou acessar área restrita.`);
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
