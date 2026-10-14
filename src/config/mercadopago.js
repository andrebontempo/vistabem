const crypto = require('crypto');
const { MercadoPagoConfig, Preference, Payment, PaymentRefund } = require('mercadopago');

let client = null;
function getClient() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return null;
  if (!client) client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  return client;
}

const isConfigured = () => !!process.env.MERCADOPAGO_ACCESS_TOKEN;
const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

function notificationUrl() {
  const url = (process.env.WEBHOOK_URL || process.env.BASE_URL || '').replace(/\/$/, '');
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) return undefined;
  return `${url}/api/payments/webhook`;
}

function splitName(full) {
  const parts = (full || 'Cliente').trim().split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(' ') || 'Vista Bem' };
}

/**
 * Checkout Pro (cartão de crédito, boleto, saldo MP)
 */
async function createPreference(order, maxInstallments = 6) {
  const { first, last } = splitName(order.customer.name);
  const orderUrl = `${baseUrl()}/pedido/${order.orderNumber}?k=${order.accessKey}`;

  // Um único item com o total evita divergência de arredondamento com cupom/frete
  const body = {
    items: [
      {
        id: order.orderNumber,
        title: `Pedido ${order.orderNumber} - Vista Bem`,
        description: order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ').slice(0, 250),
        quantity: 1,
        unit_price: Number(order.total.toFixed(2)),
        currency_id: 'BRL',
      },
    ],
    payer: {
      name: first,
      surname: last,
      email: order.customer.email,
    },
    payment_methods: {
      installments: maxInstallments,
    },
    back_urls: {
      success: `${orderUrl}&status=approved`,
      failure: `${orderUrl}&status=failure`,
      pending: `${orderUrl}&status=pending`,
    },
    auto_return: 'approved',
    external_reference: order._id.toString(),
    notification_url: notificationUrl(),
    statement_descriptor: 'VISTABEM',
    metadata: { order_id: order._id.toString(), order_number: order.orderNumber },
  };

  const res = await new Preference(getClient()).create({ body });
  return { id: res.id, initPoint: res.init_point };
}

/**
 * Pix direto (QR Code + copia e cola na própria loja)
 */
async function createPixPayment(order) {
  const { first, last } = splitName(order.customer.name);
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  const cpf = (order.customer.cpf || '').replace(/\D/g, '');

  const body = {
    transaction_amount: Number(order.total.toFixed(2)),
    description: `Pedido ${order.orderNumber} - Vista Bem`,
    payment_method_id: 'pix',
    date_of_expiration: expires.toISOString().replace('Z', '-00:00'),
    payer: {
      email: order.customer.email,
      first_name: first,
      last_name: last,
      ...(cpf.length === 11 ? { identification: { type: 'CPF', number: cpf } } : {}),
    },
    external_reference: order._id.toString(),
    notification_url: notificationUrl(),
    metadata: { order_id: order._id.toString(), order_number: order.orderNumber },
  };

  const res = await new Payment(getClient()).create({
    body,
    requestOptions: { idempotencyKey: `pix-${order._id}` },
  });
  const poi = res.point_of_interaction?.transaction_data || {};
  return {
    paymentId: String(res.id || ''),
    qrCode: poi.qr_code || '',
    qrCodeBase64: poi.qr_code_base64 || '',
    expiresAt: expires,
  };
}

async function getPayment(id) {
  return new Payment(getClient()).get({ id });
}

async function refundPayment(paymentId) {
  return new PaymentRefund(getClient()).create({ payment_id: paymentId, body: {} });
}

/**
 * Valida o header x-signature do webhook (quando MERCADOPAGO_WEBHOOK_SECRET estiver definido)
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function validateSignature(req) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.trim().split('=').map((s) => s.trim()))
  );
  const dataId = String(req.query['data.id'] || req.body?.data?.id || '').toLowerCase();
  let manifest = `id:${dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;

  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(parts.v1 || ''));
  } catch {
    return false;
  }
}

module.exports = {
  isConfigured,
  createPreference,
  createPixPayment,
  getPayment,
  refundPayment,
  validateSignature,
};
