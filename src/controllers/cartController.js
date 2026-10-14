const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const cartService = require('../services/cartService');

/**
 * Exibe página do carrinho
 */
exports.getCart = async (req, res, next) => {
  try {
    const cart = await cartService.build(req);
    res.render('shop/cart', {
      title: 'Meu Carrinho de Compras — Vista Bem',
      cart,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retorna dados do carrinho em JSON (para drawer lateral)
 */
exports.getMiniCart = async (req, res, next) => {
  try {
    const cart = await cartService.build(req);
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar carrinho.' });
  }
};

/**
 * Adiciona produto/variação ao carrinho
 */
exports.addItem = async (req, res, next) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      req.flash('danger', 'Produto não encontrado.');
      return res.redirect('back');
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({ error: 'Por favor, selecione o tamanho desejado.' });
      }
      req.flash('danger', 'Selecione o tamanho desejado.');
      return res.redirect('back');
    }

    if (variant.stock <= 0) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({ error: 'Este tamanho está esgotado no momento.' });
      }
      req.flash('danger', 'Este tamanho está esgotado.');
      return res.redirect('back');
    }

    const raw = cartService.readRaw(req);
    const existingIndex = raw.findIndex((i) => i.p === productId && i.v === variantId);

    if (existingIndex > -1) {
      const newQty = raw[existingIndex].q + qty;
      if (newQty > variant.stock) {
        raw[existingIndex].q = variant.stock;
      } else {
        raw[existingIndex].q = newQty;
      }
    } else {
      raw.push({
        p: productId,
        v: variantId,
        q: Math.min(qty, variant.stock),
      });
    }

    cartService.writeRaw(res, raw);

    if (req.xhr || req.headers.accept?.includes('json')) {
      const cart = await cartService.build({ ...req, cookies: { ...req.cookies, [cartService.CART_COOKIE]: JSON.stringify(raw) } });
      return res.json({
        success: true,
        message: 'Produto adicionado à sua sacola!',
        cartCount: cart.itemCount,
        cart,
      });
    }

    req.flash('success', 'Produto adicionado à sua sacola!');
    res.redirect('/carrinho');
  } catch (err) {
    next(err);
  }
};

/**
 * Atualiza quantidade de um item
 */
exports.updateItem = async (req, res, next) => {
  try {
    const { key, quantity } = req.body;
    const [pId, vId] = (key || '').split(':');
    const qty = parseInt(quantity, 10);

    const raw = cartService.readRaw(req);
    const index = raw.findIndex((i) => i.p === pId && i.v === vId);

    if (index > -1) {
      if (qty <= 0) {
        raw.splice(index, 1);
      } else {
        const product = await Product.findById(pId);
        const variant = product?.variants?.id(vId);
        if (variant) {
          raw[index].q = Math.min(qty, variant.stock);
        }
      }
      cartService.writeRaw(res, raw);
    }

    if (req.xhr || req.headers.accept?.includes('json')) {
      const cart = await cartService.build({ ...req, cookies: { ...req.cookies, [cartService.CART_COOKIE]: JSON.stringify(raw) } });
      return res.json({ success: true, cart });
    }

    res.redirect('/carrinho');
  } catch (err) {
    next(err);
  }
};

/**
 * Remove um item do carrinho
 */
exports.removeItem = async (req, res, next) => {
  try {
    const { key } = req.body;
    const [pId, vId] = (key || '').split(':');

    let raw = cartService.readRaw(req);
    raw = raw.filter((i) => !(i.p === pId && i.v === vId));
    cartService.writeRaw(res, raw);

    if (req.xhr || req.headers.accept?.includes('json')) {
      const cart = await cartService.build({ ...req, cookies: { ...req.cookies, [cartService.CART_COOKIE]: JSON.stringify(raw) } });
      return res.json({ success: true, cart });
    }

    req.flash('info', 'Item removido da sacola.');
    res.redirect('/carrinho');
  } catch (err) {
    next(err);
  }
};

/**
 * Aplica cupom de desconto
 */
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const cleanCode = (code || '').trim().toUpperCase();

    if (!cleanCode) {
      req.flash('danger', 'Informe um código de cupom.');
      return res.redirect('/carrinho');
    }

    const coupon = await Coupon.findOne({ code: cleanCode });
    if (!coupon || !coupon.active) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({ error: 'Cupom inválido ou expirado.' });
      }
      req.flash('danger', 'Cupom inválido ou expirado.');
      return res.redirect('/carrinho');
    }

    res.cookie(cartService.COUPON_COOKIE, cleanCode, cartService.COOKIE_OPTS);

    if (req.xhr || req.headers.accept?.includes('json')) {
      const cart = await cartService.build({
        ...req,
        cookies: { ...req.cookies, [cartService.COUPON_COOKIE]: cleanCode },
      });
      return res.json({ success: true, message: 'Cupom aplicado!', cart });
    }

    req.flash('success', `Cupom ${cleanCode} aplicado com sucesso!`);
    res.redirect('/carrinho');
  } catch (err) {
    next(err);
  }
};

/**
 * Remove cupom
 */
exports.removeCoupon = (req, res) => {
  res.clearCookie(cartService.COUPON_COOKIE);
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.json({ success: true, message: 'Cupom removido.' });
  }
  req.flash('info', 'Cupom removido.');
  res.redirect('/carrinho');
};

/**
 * Define CEP de entrega no cookie
 */
exports.setCep = (req, res) => {
  const { cep } = req.body;
  const cleanCep = (cep || '').replace(/\D/g, '');
  if (cleanCep.length === 8) {
    res.cookie(cartService.CEP_COOKIE, cleanCep, cartService.COOKIE_OPTS);
  }
  res.json({ success: true });
};
