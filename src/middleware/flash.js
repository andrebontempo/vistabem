/**
 * Mensagens flash via cookie (sem sessão no servidor).
 * Uso: req.flash('success', 'Salvo!') → disponível como res.locals.flash na próxima página.
 */
module.exports = function flash(req, res, next) {
  res.locals.flash = null;
  if (req.cookies.vb_flash) {
    try {
      res.locals.flash = JSON.parse(req.cookies.vb_flash);
    } catch {
      /* ignora */
    }
    res.clearCookie('vb_flash', { path: '/' });
  }
  req.flash = (type, message) => {
    res.cookie('vb_flash', JSON.stringify({ type, message }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60000 });
  };
  next();
};
