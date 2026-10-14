/**
 * Vista Bem — Checkout & Pedidos
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. Autopreenchimento de CEP (ViaCEP) ───────────────────────────
  const cepInput = document.getElementById('zipCode');
  const streetInput = document.getElementById('street');
  const neighInput = document.getElementById('neighborhood');
  const cityInput = document.getElementById('city');
  const stateInput = document.getElementById('state');
  const numberInput = document.getElementById('number');

  if (cepInput) {
    cepInput.addEventListener('blur', async () => {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length === 8) {
        try {
          cepInput.classList.add('loading');
          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await res.json();
          if (!data.erro) {
            if (streetInput) streetInput.value = data.logradouro || '';
            if (neighInput) neighInput.value = data.bairro || '';
            if (cityInput) cityInput.value = data.localidade || '';
            if (stateInput) stateInput.value = data.uf || '';
            numberInput?.focus();
          }
        } catch (err) {
          console.warn('ViaCEP erro:', err);
        } finally {
          cepInput.classList.remove('loading');
        }
      }
    });
  }

  // ─── 2. Seleção de Método de Pagamento no Checkout ───────────────────
  const methodCards = document.querySelectorAll('.payment-method-card');
  const methodInput = document.getElementById('selected-payment-method');
  const pixDiscountNote = document.getElementById('pix-discount-note');
  const totalAmountEl = document.getElementById('checkout-total-display');

  methodCards.forEach((card) => {
    card.addEventListener('click', () => {
      methodCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.getAttribute('data-method');
      if (methodInput) methodInput.value = val;

      if (val === 'pix') {
        if (pixDiscountNote) pixDiscountNote.style.display = 'block';
        if (totalAmountEl && totalAmountEl.dataset.totalPix) {
          totalAmountEl.textContent = totalAmountEl.dataset.totalPix;
        }
      } else {
        if (pixDiscountNote) pixDiscountNote.style.display = 'none';
        if (totalAmountEl && totalAmountEl.dataset.totalStandard) {
          totalAmountEl.textContent = totalAmountEl.dataset.totalStandard;
        }
      }
    });
  });

  // ─── 3. Copiar Chave / Código Pix ────────────────────────────────────
  const copyPixBtn = document.getElementById('btn-copy-pix');
  const pixCodeInput = document.getElementById('pix-code-input');

  if (copyPixBtn && pixCodeInput) {
    copyPixBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pixCodeInput.value);
        const originalText = copyPixBtn.textContent;
        copyPixBtn.textContent = 'Código Pix Copiado! ✅';
        copyPixBtn.style.background = 'var(--success)';
        copyPixBtn.style.color = '#fff';
        setTimeout(() => {
          copyPixBtn.textContent = originalText;
          copyPixBtn.style.background = '';
          copyPixBtn.style.color = '';
        }, 3000);
      } catch (e) {
        pixCodeInput.select();
        document.execCommand('copy');
      }
    });
  }

  // ─── 4. Polling ao Vivo do Status do Pedido (Tela de Acompanhamento) ─
  const orderContainer = document.getElementById('order-status-live');
  if (orderContainer) {
    const orderNumber = orderContainer.getAttribute('data-order-number');
    const accessKey = orderContainer.getAttribute('data-access-key');

    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pedido/${orderNumber}/status?k=${accessKey}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.paymentStatus === 'Aprovado') {
          clearInterval(checkInterval);
          window.location.reload();
        }
      } catch (err) {
        console.warn('Polling status erro:', err);
      }
    }, 5000);
  }
});
