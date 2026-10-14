const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { authLimiter, honeypot } = require('../middleware/security');

// Login Local
router.get('/login', authController.getLogin);
router.post('/login', authLimiter, authController.postLogin);

// Cadastro Local
router.get('/cadastro', authController.getRegister);
router.post('/cadastro', authLimiter, honeypot, authController.postRegister);

// Logout
router.get('/logout', authController.logout);

// Recuperação de Senha
router.get('/esqueci-senha', authController.getForgotPassword);
router.post('/esqueci-senha', authLimiter, honeypot, authController.postForgotPassword);
router.get('/redefinir-senha/:token', authController.getResetPassword);
router.post('/redefinir-senha/:token', authController.postResetPassword);

// Google OAuth 2.0
router.get('/auth/google', (req, res, next) => {
  if (!req.app.locals.googleEnabled) {
    req.flash('info', 'Login com Google temporariamente em configuração. Por favor, utilize seu e-mail e senha.');
    return res.redirect('/login');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed', session: false }),
  authController.googleCallback
);

module.exports = router;
