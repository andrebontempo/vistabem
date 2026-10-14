const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { honeypot, formLimiter } = require('../middleware/security');

// Home & Catálogo
router.get('/', shopController.getHome);
router.get('/loja', shopController.getCatalog);
router.get('/categoria/:categoria', shopController.getCatalog);
router.get('/busca', shopController.getCatalog);

// Produto
router.get('/produto/:slug', shopController.getProduct);
router.post('/produto/:id/avaliar', shopController.postReview);

// Favoritos (Wishlist)
router.get('/favoritos', shopController.getWishlist);
router.post('/api/favoritos/:id', shopController.toggleWishlist);

// APIs Rápidas
router.post('/api/frete', shopController.calculateShipping);
router.post('/api/newsletter', shopController.subscribeNewsletter);

// Institucionais
router.get('/sobre', shopController.getAbout);
router.get('/contato', shopController.getContact);
router.post('/contato', formLimiter, honeypot, shopController.postContact);
router.get('/politica-frete', shopController.getShippingPolicy);
router.get('/trocas-devolucoes', shopController.getReturnsPolicy);
router.get('/privacidade', shopController.getPrivacyPolicy);
router.get('/termos', shopController.getTerms);

module.exports = router;
