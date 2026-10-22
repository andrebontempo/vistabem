const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const { upload, processImages } = require('../middleware/upload');

// Todas as rotas admin exigem login de usuário com role 'admin'
router.use(protect, adminOnly);

// Dashboard
router.get('/', adminController.getDashboard);

// Produtos
router.get('/produtos', adminController.getProducts);
router.get('/produtos/novo', adminController.getProductForm);
router.post(
  '/produtos/novo',
  upload.array('images', 8),
  processImages('prod', 1400),
  adminController.postProductForm
);
router.get('/produtos/:id/editar', adminController.getProductForm);
router.post(
  '/produtos/:id/editar',
  upload.array('images', 8),
  processImages('prod', 1400),
  adminController.postProductForm
);
router.post('/produtos/:id/excluir', adminController.deleteProduct);

// Categorias
router.get('/categorias', adminController.getCategories);
router.get('/categorias/nova', adminController.getCategoryForm);
router.post(
  '/categorias/nova',
  upload.single('image'),
  processImages('cat', 1000),
  adminController.postCategoryForm
);
router.get('/categorias/:id/editar', adminController.getCategoryForm);
router.post(
  '/categorias/:id/editar',
  upload.single('image'),
  processImages('cat', 1000),
  adminController.postCategoryForm
);
router.post('/categorias/:id/excluir', adminController.deleteCategory);

// Atributos (Tamanhos e Cores)
router.get('/atributos', adminController.getAttributes);
router.post('/atributos', adminController.postAttribute);
router.post('/atributos/:id/excluir', adminController.deleteAttribute);

// Pedidos
router.get('/pedidos', adminController.getOrders);
router.get('/pedidos/:id', adminController.getOrderDetail);
router.post('/pedidos/:id/status', adminController.postUpdateOrderStatus);

// Cupons
router.get('/cupons', adminController.getCoupons);
router.post('/cupons', adminController.postCoupon);
router.post('/cupons/:id/excluir', adminController.deleteCoupon);

// Banners
router.get('/banners', adminController.getBanners);
router.post(
  '/banners',
  upload.single('image'),
  processImages('banner', 1920),
  adminController.postBanner
);
router.post('/banners/:id/excluir', adminController.deleteBanner);

// Avaliações
router.get('/avaliacoes', adminController.getReviews);
router.post('/avaliacoes/:id/aprovar', adminController.toggleApproveReview);
router.post('/avaliacoes/:id/excluir', adminController.deleteReview);

// Clientes & Gestão de Acessos
router.get('/clientes', adminController.getUsers);
router.get('/clientes/novo', adminController.getUserForm);
router.post('/clientes/novo', adminController.postUserForm);
router.get('/clientes/:id/editar', adminController.getUserForm);
router.post('/clientes/:id/editar', adminController.postUserForm);
router.post('/clientes/:id/role', adminController.postUpdateUserRole);
router.post('/clientes/:id/senha', adminController.postUpdateUserPassword);
router.post('/clientes/:id/excluir', adminController.deleteUser);

// Alteração de senha do próprio administrador logado
router.post('/perfil/senha', adminController.postUpdateAdminOwnPassword);

// Configurações
router.get('/configuracoes', adminController.getSettings);
router.post('/configuracoes', adminController.postSettings);

module.exports = router;
