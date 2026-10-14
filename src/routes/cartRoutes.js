const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/carrinho', cartController.getCart);
router.get('/api/cart', cartController.getMiniCart);
router.post('/api/cart/add', cartController.addItem);
router.post('/api/cart/update', cartController.updateItem);
router.post('/api/cart/remove', cartController.removeItem);
router.post('/api/cart/cupom', cartController.applyCoupon);
router.post('/api/cart/remover-cupom', cartController.removeCoupon);
router.post('/api/cart/cep', cartController.setCep);

module.exports = router;
