const crypto = require('crypto');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const cartService = require('../services/cartService');
const stockService = require('../services/stockService');
const mercadopagoConfig = require('../config/mercadopago');
const mailService = require('../services/mailService');

/**
 * Renderiza página de checkout
 */
exports.getCheckout = async (req, res, next) => {
  try {
    const cart = await cartService.build(req);
    if (!cart.items || cart.items.length === 0) {
      req.flash('info', 'Sua sacola está vazia.');
      return res.redirect('/carrinho');
    }

    res.render('shop/checkout', {
      title: 'Finalizar Compra — Vista Bem',
      cart,
      user: req.user || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cria o pedido, reserva estoque e dispara pagamento
 */
exports.processOrder = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      cpf,
      zipCode,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      paymentMethod = 'pix',
      notes,
    } = req.body;

    const cleanCep = (zipCode || '').replace(/\D/g, '');
    if (!name || !email || !street || !number || !city || !state || cleanCep.length !== 8) {
      req.flash('danger', 'Por favor, preencha todos os campos obrigatórios do endereço e contato.');
      return res.redirect('/checkout');
    }

    const cart = await cartService.build(req, { cep: cleanCep, paymentMethod });
    if (!cart.items || cart.items.length === 0) {
      req.flash('danger', 'Sua sacola está vazia.');
      return res.redirect('/carrinho');
    }

    if (cart.warnings && cart.warnings.length > 0) {
      req.flash('danger', cart.warnings.join(' '));
      return res.redirect('/carrinho');
    }

    // 1. Montar itens para o pedido
    const orderItems = cart.items.map((i) => ({
      product: i.product._id,
      variantId: i.variant._id,
      sku: i.variant.sku,
      name: i.product.name,
      size: i.variant.size,
      color: i.variant.color,
      price: i.unitPrice,
      quantity: i.quantity,
      image: i.image,
    }));

    // 2. Reserva atômica de estoque
    const reserveRes = await stockService.reserve(orderItems);
    if (!reserveRes.ok) {
      req.flash('danger', 'Sentimos muito! Alguns itens da sua sacola acabaram de esgotar.');
      return res.redirect('/carrinho');
    }

    // 3. Gerar número de pedido único e chave de acesso
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `VB-${today}-${rand}`;
    const accessKey = crypto.randomBytes(16).toString('hex');

    // 4. Salvar pedido no MongoDB
    const order = await Order.create({
      orderNumber,
      user: req.user ? req.user._id : null,
      customer: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: (phone || '').trim(),
        cpf: (cpf || '').trim(),
      },
      items: orderItems,
      subtotal: cart.subtotal,
      discount: cart.discount + (paymentMethod === 'pix' ? cart.pixDiscount : 0),
      couponCode: cart.couponCode || '',
      shippingFee: cart.shippingFee,
      shippingMethod: cart.shipping ? cart.shipping.method : 'Entrega Padrão',
      shippingDays: cart.shipping ? cart.shipping.days : '',
      total: paymentMethod === 'pix' ? cart.totalPix : cart.total,
      shippingAddress: {
        zipCode: cleanCep,
        street: street.trim(),
        number: number.trim(),
        complement: (complement || '').trim(),
        neighborhood: (neighborhood || '').trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
      },
      paymentMethod,
      paymentStatus: 'Pendente',
      orderStatus: 'Aguardando Pagamento',
      statusHistory: [{ status: 'Aguardando Pagamento', note: 'Pedido recebido pelo sistema.' }],
      notes: (notes || '').trim(),
      accessKey,
    });

    // Se houve cupom usado, incrementa contagem
    if (cart.coupon) {
      await Coupon.findByIdAndUpdate(cart.coupon._id, { $inc: { usedCount: 1 } });
    }

    // Limpar carrinho e cupom
    res.clearCookie(cartService.CART_COOKIE);
    res.clearCookie(cartService.COUPON_COOKIE);

    // 5. Integração Mercado Pago
    let redirectUrl = `/pedido/${order.orderNumber}?k=${order.accessKey}`;

    if (paymentMethod === 'mercadopago') {
      if (mercadopagoConfig.isConfigured()) {
        try {
          const pref = await mercadopagoConfig.createPreference(order);
          order.mercadopago.preferenceId = pref.id;
          order.mercadopago.initPoint = pref.initPoint;
          await order.save();
          redirectUrl = pref.initPoint;
        } catch (mpErr) {
          console.error('[MP] Erro ao criar preferência:', mpErr.message);
        }
      }
    } else if (paymentMethod === 'pix') {
      if (mercadopagoConfig.isConfigured()) {
        try {
          const pix = await mercadopagoConfig.createPixPayment(order);
          order.mercadopago.paymentId = pix.paymentId;
          order.mercadopago.pixCode = pix.qrCode;
          order.mercadopago.pixQrBase64 = pix.qrCodeBase64;
          order.mercadopago.pixExpiresAt = pix.expiresAt;
          await order.save();
        } catch (pixErr) {
          console.error('[MP] Erro ao criar PIX:', pixErr.message);
        }
      } else {
        // Fallback local caso token do Mercado Pago ainda não esteja preenchido
        order.mercadopago.pixCode = `00020126580014BR.GOV.BCB.PIX0136vistabem-pix-${order.orderNumber}5204000053039865405${order.total.toFixed(2)}5802BR5920VISTA BEM ECOMMERCE6009SAO PAULO62070503***6304`;
        order.mercadopago.pixExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await order.save();
      }
    }

    // 6. E-mails transacionais assíncronos
    mailService.sendOrderReceived(order).catch((e) => console.error('[Mail] Order received:', e.message));
    mailService.sendAdminNewOrder(order).catch((e) => console.error('[Mail] Admin new order:', e.message));

    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * Tela de status do pedido e pagamento Pix
 */
exports.getOrderStatus = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { k, status } = req.query;

    const query = { orderNumber };
    if (!req.user || req.user.role !== 'admin') {
      if (req.user) {
        query.$or = [{ user: req.user._id }, { accessKey: k }];
      } else {
        query.accessKey = k;
      }
    }

    const order = await Order.findOne(query).populate('items.product');
    if (!order) {
      return res.status(404).render('error', {
        title: 'Pedido Não Encontrado',
        message: 'Não localizamos as informações deste pedido.',
        code: 404,
      });
    }

    // Se retornou do checkout com status approved
    if (status === 'approved' && order.paymentStatus !== 'Aprovado') {
      order.paymentStatus = 'Aprovado';
      order.orderStatus = 'Em Separação';
      order.statusHistory.push({ status: 'Em Separação', note: 'Pagamento confirmado pelo gateway.' });
      await order.save();
      mailService.sendPaymentApproved(order).catch((e) => console.error(e));
    }

    res.render('shop/order-status', {
      title: `Pedido ${order.orderNumber} — Vista Bem`,
      order,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Polling assíncrono para verificar se o Pix já foi pago
 */
exports.getOrderStatusApi = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { k } = req.query;

    const order = await Order.findOne({ orderNumber, accessKey: k }).select('paymentStatus orderStatus trackingCode');
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    res.json({
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      trackingCode: order.trackingCode,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar status.' });
  }
};

/**
 * Webhook do Mercado Pago (IPN em tempo real)
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Validação de assinatura criptográfica se configurada
    if (!mercadopagoConfig.validateSignature(req)) {
      console.warn('[MercadoPago Webhook] Assinatura inválida.');
      return res.sendStatus(401);
    }

    const { query, body } = req;
    const topic = query.topic || body.type;
    const paymentId = query.id || body.data?.id;

    if (topic === 'payment' && paymentId) {
      const paymentData = await mercadopagoConfig.getPayment(paymentId);
      if (paymentData) {
        const orderId = paymentData.external_reference || paymentData.metadata?.order_id;
        if (orderId) {
          const order = await Order.findById(orderId);
          if (order) {
            const prevStatus = order.paymentStatus;
            order.mercadopago.paymentId = String(paymentId);

            if (paymentData.status === 'approved') {
              order.paymentStatus = 'Aprovado';
              if (order.orderStatus === 'Aguardando Pagamento') {
                order.orderStatus = 'Em Separação';
                order.statusHistory.push({ status: 'Em Separação', note: 'Pagamento aprovado via Webhook Mercado Pago.' });
              }
              await order.save();

              if (prevStatus !== 'Aprovado') {
                mailService.sendPaymentApproved(order).catch((e) => console.error('[Mail] Payment approved webhook:', e.message));
              }
            } else if (['rejected', 'cancelled'].includes(paymentData.status)) {
              order.paymentStatus = 'Recusado';
              order.statusHistory.push({ status: 'Cancelado', note: `Pagamento ${paymentData.status}.` });
              await order.save();
            } else if (paymentData.status === 'refunded') {
              order.paymentStatus = 'Reembolsado';
              order.orderStatus = 'Reembolsado';
              order.statusHistory.push({ status: 'Reembolsado', note: 'Pagamento reembolsado.' });
              await stockService.releaseOrder(order);
              await order.save();
              mailService.sendStatusUpdate(order).catch((e) => console.error(e));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[MercadoPago Webhook Err]:', err.message);
  }

  res.sendStatus(200);
};
