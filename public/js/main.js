/**
 * Vista Bem — Frontend Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. Acessibilidade A+ / A- (Todas as idades) ──────────────────────
  const currentScale = parseFloat(localStorage.getItem('vb_font_scale')) || 1;
  applyFontScale(currentScale);

  const btnIncrease = document.getElementById('btn-font-increase');
  const btnDecrease = document.getElementById('btn-font-decrease');

  if (btnIncrease) {
    btnIncrease.addEventListener('click', () => {
      let scale = parseFloat(document.documentElement.style.getPropertyValue('--font-scale')) || 1;
      if (scale < 1.35) {
        scale = Math.round((scale + 0.08) * 100) / 100;
        applyFontScale(scale);
      }
    });
  }

  if (btnDecrease) {
    btnDecrease.addEventListener('click', () => {
      let scale = parseFloat(document.documentElement.style.getPropertyValue('--font-scale')) || 1;
      if (scale > 0.85) {
        scale = Math.round((scale - 0.08) * 100) / 100;
        applyFontScale(scale);
      }
    });
  }

  function applyFontScale(scale) {
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem('vb_font_scale', scale);
  }

  // ─── 2. Modo Claro / Escuro Sóbrio ───────────────────────────────────
  const savedTheme = localStorage.getItem('vb_theme_v2') || 'light';
  applyTheme(savedTheme);

  const themeToggleBtns = document.querySelectorAll('.js-theme-toggle, #theme-toggle');
  themeToggleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vb_theme_v2', theme);
    localStorage.setItem('vb_theme', theme);
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#131118' : '#231236');
    }
  }

  // ─── 2.5 Menu Mobile (Gaveta de Navegação) ───────────────────────────
  const openMobileMenuBtn = document.getElementById('open-mobile-menu');
  const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');

  function openMobileMenu() {
    mobileNavOverlay?.classList.add('active');
    mobileNavDrawer?.classList.add('active');
    openMobileMenuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileNavOverlay?.classList.remove('active');
    mobileNavDrawer?.classList.remove('active');
    openMobileMenuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  openMobileMenuBtn?.addEventListener('click', openMobileMenu);
  closeMobileMenuBtn?.addEventListener('click', closeMobileMenu);
  mobileNavOverlay?.addEventListener('click', closeMobileMenu);

  // ─── 3. Drawer da Sacola (Mini Carrinho) ─────────────────────────────
  const drawerOverlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  const openCartBtns = document.querySelectorAll('.open-cart-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');

  function openCart() {
    closeMobileMenu();
    drawerOverlay?.classList.add('active');
    drawer?.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadMiniCart();
  }

  function closeCart() {
    drawerOverlay?.classList.remove('active');
    drawer?.classList.remove('active');
    document.body.style.overflow = '';
  }

  openCartBtns.forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  }));

  closeCartBtn?.addEventListener('click', closeCart);
  drawerOverlay?.addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      closeCart();
    }
  });

  async function loadMiniCart() {
    const body = document.getElementById('drawer-cart-body');
    if (!body) return;
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      if (data.success && data.cart) {
        renderMiniCart(data.cart);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderMiniCart(cart) {
    const body = document.getElementById('drawer-cart-body');
    const footer = document.getElementById('drawer-cart-footer');
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = cart.itemCount || 0;

    if (!cart.items || cart.items.length === 0) {
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:40px 0;">
            <svg class="icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-light);margin:0 auto 12px;"><path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
            <p style="font-weight:600;margin-bottom:6px;">Sua sacola está vazia</p>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">Explore nossas coleções e encontre o look perfeito!</p>
            <a href="/loja" class="btn btn-primary btn-sm">Ver Coleções</a>
          </div>
        `;
      }
      if (footer) footer.style.display = 'none';
      return;
    }

    if (body) {
      body.innerHTML = cart.items.map((item) => `
        <div class="cart-item-row">
          <img src="${item.image}" alt="${item.product.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.product.name}</h4>
            <div class="cart-item-variant">Tam: <strong>${item.variant.size}</strong>${item.variant.color ? ' · ' + item.variant.color : ''}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-weight:700;color:var(--purple-900);">R$ ${item.unitPrice.toFixed(2).replace('.', ',')}</span>
              <div class="qty-control">
                <button type="button" class="qty-btn" onclick="updateCartItem('${item.key}', ${item.quantity - 1})">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button type="button" class="qty-btn" onclick="updateCartItem('${item.key}', ${item.quantity + 1})">+</button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (footer) {
      footer.style.display = 'block';
      const subtotalEl = document.getElementById('drawer-subtotal');
      if (subtotalEl) subtotalEl.textContent = `R$ ${cart.subtotal.toFixed(2).replace('.', ',')}`;
    }
  }

  window.updateCartItem = async (key, quantity) => {
    try {
      const res = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        renderMiniCart(data.cart);
        const countBadges = document.querySelectorAll('.cart-badge-count');
        countBadges.forEach((b) => (b.textContent = data.cart.itemCount));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── 4. Adicionar ao Carrinho via Ajax na PDP ────────────────────────
  const pdpForm = document.getElementById('pdp-add-form');
  if (pdpForm) {
    pdpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(pdpForm);
      const payload = {
        productId: formData.get('productId'),
        variantId: formData.get('variantId'),
        quantity: formData.get('quantity') || 1,
      };

      if (!payload.variantId) {
        showToast('Selecione o tamanho desejado antes de adicionar.', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          openCart();
          showToast(data.message || 'Adicionado à sacola!', 'success');
        } else {
          showToast(data.error || 'Não foi possível adicionar.', 'danger');
        }
      } catch (err) {
        pdpForm.submit();
      }
    });
  }

  // ─── 5. Favoritos (Wishlist) ─────────────────────────────────────────
  const wishlistBtns = document.querySelectorAll('.btn-wishlist');
  wishlistBtns.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/api/favoritos/${id}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (data.loginRequired) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (data.success) {
          btn.classList.toggle('active', data.added);
          showToast(data.message, 'success');
        }
      } catch (err) {
        console.error(err);
      }
    });
  });

  // ─── 6. Galeria de Imagens da PDP ────────────────────────────────────
  const mainImg = document.getElementById('pdp-main-img');
  const thumbs = document.querySelectorAll('.thumb-btn');
  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      thumbs.forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.getAttribute('data-full');
      if (mainImg && src) mainImg.src = src;
    });
  });

  // ─── 7. Toast / Notificação Rápida ───────────────────────────────────
  function showToast(message, type = 'info') {
    let container = document.getElementById('flash-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flash-container';
      container.className = 'flash-container';
      document.body.appendChild(container);
    }
    const alert = document.createElement('div');
    alert.className = `flash-alert flash-${type}`;
    alert.textContent = message;
    container.appendChild(alert);

    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  }

  // Auto-fechar alertas estáticos
  setTimeout(() => {
    document.querySelectorAll('.flash-alert').forEach((el) => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s ease';
      setTimeout(() => el.remove(), 400);
    });
  }, 4500);
});
