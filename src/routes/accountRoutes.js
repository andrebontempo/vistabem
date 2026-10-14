const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', accountController.getDashboard);
router.post('/perfil', accountController.updateProfile);

router.get('/pedidos', accountController.getOrders);
router.get('/pedidos/:id', accountController.getOrderDetail);

router.get('/enderecos', accountController.getAddresses);
router.post('/enderecos', accountController.postAddAddress);
router.post('/enderecos/:id/excluir', accountController.deleteAddress);

module.exports = router;
