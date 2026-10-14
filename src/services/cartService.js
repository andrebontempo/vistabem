const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const shippingService = require('./shippingService');
const settingService = require('./settingService');

const CART_COOKIE = 'vb_cart';
const COUPON_COOKIE = 'vb_coupon';
const CEP_COOKIE = 'vb_cep';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 };

function readRaw(req) {
  try {
    const raw = JSON.parse(req.cookies[CART_COOKIE] || '[]');
    return Array.isArray(raw) ? raw.filter((i) => i && i.p && i.v && i.q > 0) : [];
  } catch {
    return [];
  }
}

function writeRaw(res, items) {
  res.cookie(CART_COOKIE, JSON.stringify(items.slice(0, 50)), COOKIE_OPTS);
}

function count(req) {
  return readRaw(req).reduce((t, i) => t + Number(i.q || 0), 0);
}

/**
 * Monta o carrinho completo a partir do cookie, validando produto, variação e estoque.
 */
async function build(req, { cep, paymentMethod } = {}) {
  const raw = readRaw(req);
  const settings = await settingService.getSettings();
  const ids = [...new Set(raw.map((i) => i.p))].filter((id) => /^[a-f0-9]{24}$/i.test(id));
  const products = await Product.find({ _id: { $in: ids }, active: true });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  const items = [];
  const warnings = [];
  for (const r of raw) {
    const product = byId.get(r.p);
    if (!product) continue;
    const variant = product.variants.id(r.v);
    if (!variant) continue;
    let qty = Math.max(1, parseInt(r.q, 10) || 1);
    if (variant.stock <= 0) {
      warnings.push(`${product.name} (${variant.size}${variant.color ? ' / ' + variant.color : ''}) esgotou.`);
      continue;
    }
    if (qty > variant.stock) {
      qty = variant.stock;
      warnings.push(`Ajustamos a quantidade de ${product.name} para ${qty} (estoque disponível).`);
    }
    const price = product.finalPrice;
    items.push({
      key: `${r.p}:${r.v}`,
      product,
      variant,
      quantity: qty,
      unitPrice: price,
      originalPrice: product.price,
      lineTotal: Math.round(price * qty * 100) / 100,
      image: product.images[0] || '/images/placeholder.svg',
    });
  }

  const subtotal = Math.round(items.reduce((t, i) => t + i.lineTotal, 0) * 100) / 100;
  const itemCount = items.reduce((t, i) => t + i.quantity, 0);

  // Cupom
  let coupon = null;
  let discount = 0;
  let couponMessage = '';
  const code = req.cookies[COUPON_COOKIE];
  if (code && subtotal > 0) {
    const c = await Coupon.findOne({ code: String(code).toUpperCase() });
    if (c) {
      const ev = c.evaluate(subtotal);
      if (ev.ok) {
        coupon = c;
        discount = ev.discount;
      } else couponMessage = ev.message;
    } else couponMessage = 'Cupom não encontrado.';
  }

  // Frete
  const cepValue = cep || req.cookies[CEP_COOKIE] || '';
  const shipping = cepValue && subtotal > 0 ? shippingService.calculate(cepValue, subtotal - discount, settings) : null;
  const shippingFee = shipping ? shipping.fee : 0;

  // Desconto Pix
  let pixDiscount = 0;
  const pixPercent = settings.pixDiscountPercent || 0;
  const pixPreview = Math.round((subtotal - discount) * pixPercent) / 100;
  if (paymentMethod === 'pix') pixDiscount = pixPreview;

  const total = Math.max(0, Math.round((subtotal - discount - pixDiscount + shippingFee) * 100) / 100);

  return {
    items,
    itemCount,
    subtotal,
    coupon,
    couponCode: coupon ? coupon.code : '',
    couponMessage,
    discount,
    cep: cepValue,
    shipping,
    shippingFee,
    pixPercent,
    pixPreview,
    pixDiscount,
    total,
    totalPix: Math.max(0, Math.round((subtotal - discount - pixPreview + shippingFee) * 100) / 100),
    warnings,
    freeShippingThreshold: settings.freeShippingThreshold,
    missingForFree: Math.max(0, settings.freeShippingThreshold - (subtotal - discount)),
  };
}

module.exports = {
  CART_COOKIE,
  COUPON_COOKIE,
  CEP_COOKIE,
  COOKIE_OPTS,
  readRaw,
  writeRaw,
  count,
  build,
};
