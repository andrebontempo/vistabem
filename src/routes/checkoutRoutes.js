const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { honeypot } = require('../middleware/security');

router.get('/checkout', checkoutController.getCheckout);
router.post('/checkout', honeypot, checkoutController.processOrder);

router.get('/pedido/:orderNumber', checkoutController.getOrderStatus);
router.get('/api/pedido/:orderNumber/status', checkoutController.getOrderStatusApi);

// Webhook Mercado Pago
router.post('/api/payments/webhook', checkoutController.handleWebhook);

module.exports = router;
