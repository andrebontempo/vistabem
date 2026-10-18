/**
 * Middleware para Modo de Manutenção Programada — Vista Bem
 *
 * Permite que o administrador ative a tela de manutenção a qualquer momento pelo painel,
 * retornando status HTTP 503 com cabeçalho Retry-After para preservação do SEO.
 * Administradores autenticados mantêm acesso completo para pré-visualização.
 */

const maintenanceMiddleware = (req, res, next) => {
  const isEnvMaintenance = process.env.MAINTENANCE_MODE === 'true';
  const isDbMaintenance = !!(res.locals.settings && res.locals.settings.isMaintenanceMode);
  const isMaintenanceActive = isEnvMaintenance || isDbMaintenance;

  // Se o modo de manutenção não estiver ativo, segue normalmente
  if (!isMaintenanceActive) {
    return next();
  }

  const currentPath = req.path || '';
  const originalUrl = req.originalUrl || '';

  // 1. Rotas essenciais sempre liberadas:
  // - Painel administrativo (/admin)
  // - Autenticação (/login, /logout, /auth, /esqueci-minha-senha, /redefinir-senha)
  // - Monitoramento (/health)
  // - Arquivos estáticos, manifesto PWA, service worker e mídias
  const isAllowedRoute =
    originalUrl.startsWith('/admin') ||
    currentPath.startsWith('/admin') ||
    currentPath === '/login' ||
    currentPath === '/logout' ||
    currentPath.startsWith('/auth') ||
    currentPath.startsWith('/esqueci-minha-senha') ||
    currentPath.startsWith('/redefinir-senha') ||
    currentPath === '/health' ||
    currentPath.startsWith('/css') ||
    currentPath.startsWith('/js') ||
    currentPath.startsWith('/images') ||
    currentPath.startsWith('/uploads') ||
    currentPath === '/favicon.ico' ||
    currentPath === '/favicon.svg' ||
    currentPath === '/manifest.json' ||
    currentPath === '/sw.js' ||
    /\.(css|js|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|map)$/i.test(currentPath);

  if (isAllowedRoute) {
    return next();
  }

  // 2. Administrador autenticado tem bypass para navegar e testar a loja livremente
  if (req.user && req.user.role === 'admin') {
    res.locals.inMaintenanceBypass = true;
    return next();
  }

  // 3. Visitantes comuns: Retornar HTTP 503 (Service Unavailable) com Retry-After para SEO
  res.status(503);
  res.setHeader('Retry-After', '3600'); // Solicita aos motores de busca retorno em 1 hora

  // Se for chamada de API / AJAX
  if (req.xhr || (req.headers.accept || '').includes('application/json') || currentPath.startsWith('/api')) {
    return res.json({
      error: 'Loja em Manutenção Programada',
      message:
        res.locals.settings?.maintenanceMessage ||
        'Estamos preparando novidades e melhorias em nossas coleções de moda. Voltaremos muito em breve!',
      estimatedReturn: res.locals.settings?.maintenanceEstimatedReturn || null,
    });
  }

  // Renderizar a tela de manutenção com a identidade visual do Vista Bem
  return res.render('maintenance', {
    title: res.locals.settings?.maintenanceTitle || 'Estamos em Manutenção Programada',
    message:
      res.locals.settings?.maintenanceMessage ||
      'Estamos aprimorando nossa loja com novas coleções exclusivas de moda. Em instantes estaremos de volta para você!',
    estimatedReturn: res.locals.settings?.maintenanceEstimatedReturn || '',
    whatsapp: res.locals.settings?.whatsapp || '',
    instagram: res.locals.settings?.instagram || '',
  });
};

module.exports = maintenanceMiddleware;
