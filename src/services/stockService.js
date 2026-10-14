const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * Baixa o estoque de forma atômica. Se algum item falhar, desfaz os anteriores.
 * Retorna { ok, failed }.
 */
async function reserve(items) {
  const done = [];
  for (const it of items) {
    const res = await Product.updateOne(
      { _id: it.product, variants: { $elemMatch: { _id: it.variantId, stock: { $gte: it.quantity } } } },
      { $inc: { 'variants.$.stock': -it.quantity, soldCount: it.quantity } }
    );
    if (res.modifiedCount !== 1) {
      await release(done);
      return { ok: false, failed: it };
    }
    done.push(it);
  }
  return { ok: true };
}

async function release(items) {
  for (const it of items) {
    await Product.updateOne(
      { _id: it.product, 'variants._id': it.variantId },
      { $inc: { 'variants.$.stock': it.quantity, soldCount: -it.quantity } }
    );
  }
}

/**
 * Devolve o estoque de um pedido (uma única vez).
 */
async function releaseOrder(order) {
  if (order.stockReleased) return;
  await release(order.items);
  order.stockReleased = true;
}

/**
 * Cancela pedidos aguardando pagamento há mais de `hours` horas e devolve o estoque.
 */
async function expireStaleOrders(hours = 24) {
  const limit = new Date(Date.now() - hours * 60 * 60 * 1000);
  const stale = await Order.find({
    orderStatus: 'Aguardando Pagamento',
    paymentStatus: 'Pendente',
    createdAt: { $lt: limit },
  });
  for (const order of stale) {
    await releaseOrder(order);
    order.paymentStatus = 'Expirado';
    order.orderStatus = 'Cancelado';
    order.statusHistory.push({ status: 'Cancelado', note: 'Pagamento não identificado no prazo.' });
    await order.save();
  }
  if (stale.length) console.log(`[Estoque] ${stale.length} pedido(s) expirado(s) e estoque devolvido.`);
}

module.exports = { reserve, release, releaseOrder, expireStaleOrders };
