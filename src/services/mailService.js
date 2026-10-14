const nodemailer = require('nodemailer');

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const baseUrl = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Template base com a identidade Vista Bem
 */
function layout(title, content) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F8F5FE;font-family:Arial,Helvetica,sans-serif;color:#2A0F4A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5FE;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(42,15,74,.08);">
<tr><td style="background:linear-gradient(135deg,#07020D,#1E073D 60%,#380C6E);padding:32px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:2px;color:#ffffff;">V<span style="color:#00F0FF;">B</span></div>
<div style="font-size:13px;letter-spacing:6px;color:#00F0FF;margin-top:6px;font-weight:bold;">VISTA BEM</div>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;color:#2A0F4A;">${esc(title)}</h1>
${content}
</td></tr>
<tr><td style="padding:24px 32px 32px;font-size:12px;color:#7A6A92;text-align:center;border-top:1px solid #EDE6FA;">
Vista Bem · Moda que valoriza você<br>
<a href="${baseUrl()}" style="color:#4C1D95;">${baseUrl().replace(/^https?:\/\//, '')}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label) =>
  `<p style="text-align:center;margin:28px 0;"><a href="${href}" style="background:#4C1D95;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block;">${esc(label)}</a></p>`;

function itemsTable(order) {
  const rows = order.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #EDE6FA;font-size:14px;">${esc(i.name)}<br><span style="color:#7A6A92;font-size:12px;">Tam: ${esc(i.size)}${i.color ? ' · Cor: ' + esc(i.color) : ''} · Qtd: ${i.quantity}</span></td>
<td style="padding:10px 0;border-bottom:1px solid #EDE6FA;text-align:right;font-size:14px;white-space:nowrap;">${money(i.price * i.quantity)}</td></tr>`
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}
<tr><td style="padding:6px 0;font-size:14px;color:#7A6A92;">Subtotal</td><td style="text-align:right;font-size:14px;">${money(order.subtotal)}</td></tr>
${order.discount > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#7A6A92;">Descontos</td><td style="text-align:right;font-size:14px;color:#16A34A;">- ${money(order.discount)}</td></tr>` : ''}
<tr><td style="padding:6px 0;font-size:14px;color:#7A6A92;">Frete</td><td style="text-align:right;font-size:14px;">${order.shippingFee > 0 ? money(order.shippingFee) : 'Grátis'}</td></tr>
<tr><td style="padding:10px 0;font-size:16px;font-weight:bold;">Total</td><td style="text-align:right;font-size:16px;font-weight:bold;color:#4C1D95;">${money(order.total)}</td></tr>
</table>`;
}

const orderLink = (order) => `${baseUrl()}/pedido/${order.orderNumber}?k=${order.accessKey}`;

async function send(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Mail] SMTP não configurado. E-mail "${subject}" para ${to} não enviado.`);
    return;
  }
  const fromName = process.env.SMTP_FROM_NAME || 'Vista Bem';
  await t.sendMail({ from: `"${fromName}" <${process.env.SMTP_USER}>`, to, subject, html });
}

const adminEmail = () => process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;

module.exports = {
  send,

  sendWelcome: (user) =>
    send(
      user.email,
      'Bem-vinda à Vista Bem 💜',
      layout(
        `Olá, ${user.name.split(' ')[0]}!`,
        `<p style="font-size:15px;line-height:1.6;">Que alegria ter você com a gente! Sua conta na <strong>Vista Bem</strong> foi criada com sucesso.</p>
<p style="font-size:15px;line-height:1.6;">Explore nossas coleções, salve seus favoritos e acompanhe seus pedidos pela área <em>Minha Conta</em>.</p>
${button(baseUrl() + '/loja', 'Conhecer a loja')}`
      )
    ),

  sendAdminNewUser: (user) =>
    send(
      adminEmail(),
      `Novo cadastro: ${user.name}`,
      layout('Novo cliente cadastrado', `<p>Nome: <strong>${esc(user.name)}</strong><br>E-mail: ${esc(user.email)}<br>Origem: ${user.authProvider}</p>`)
    ),

  sendPasswordReset: (user, link) =>
    send(
      user.email,
      'Redefinição de senha - Vista Bem',
      layout(
        'Redefinir sua senha',
        `<p style="font-size:15px;line-height:1.6;">Recebemos um pedido para redefinir a senha da sua conta. O link abaixo é válido por <strong>1 hora</strong>.</p>
${button(link, 'Criar nova senha')}
<p style="font-size:13px;color:#7A6A92;">Se você não fez este pedido, ignore este e-mail. Sua senha continua a mesma.</p>`
      )
    ),

  sendOrderReceived: (order) =>
    send(
      order.customer.email,
      `Recebemos seu pedido ${order.orderNumber} 🛍️`,
      layout(
        'Pedido recebido!',
        `<p style="font-size:15px;line-height:1.6;">Oi, ${esc(order.customer.name.split(' ')[0])}! Seu pedido <strong>${order.orderNumber}</strong> foi registrado e está aguardando a confirmação do pagamento.</p>
${itemsTable(order)}
${button(orderLink(order), 'Acompanhar pedido')}`
      )
    ),

  sendAdminNewOrder: (order) =>
    send(
      adminEmail(),
      `Novo pedido ${order.orderNumber} - ${money(order.total)}`,
      layout(
        `Novo pedido ${order.orderNumber}`,
        `<p>Cliente: <strong>${esc(order.customer.name)}</strong> (${esc(order.customer.email)})<br>Pagamento: ${order.paymentMethod}</p>${itemsTable(order)}
${button(baseUrl() + '/admin/pedidos/' + order._id, 'Abrir no painel')}`
      )
    ),

  sendPaymentApproved: (order) =>
    send(
      order.customer.email,
      `Pagamento aprovado - Pedido ${order.orderNumber} ✅`,
      layout(
        'Pagamento aprovado!',
        `<p style="font-size:15px;line-height:1.6;">Tudo certo, ${esc(order.customer.name.split(' ')[0])}! O pagamento do pedido <strong>${order.orderNumber}</strong> foi confirmado e já estamos separando suas peças com carinho.</p>
${itemsTable(order)}
${button(orderLink(order), 'Ver meu pedido')}`
      )
    ),

  sendStatusUpdate: (order) => {
    const messages = {
      'Em Separação': 'Suas peças estão sendo separadas e embaladas.',
      Enviado: `Seu pedido saiu para entrega!${order.trackingCode ? ` Código de rastreio: <strong>${esc(order.trackingCode)}</strong>` : ''}`,
      Entregue: 'Seu pedido foi entregue. Esperamos que você ame cada peça! 💜',
      Cancelado: 'Seu pedido foi cancelado. Se tiver dúvidas, fale com a gente.',
      Reembolsado: 'O reembolso do seu pedido foi processado.',
    };
    const msg = messages[order.orderStatus];
    if (!msg) return Promise.resolve();
    return send(
      order.customer.email,
      `Pedido ${order.orderNumber}: ${order.orderStatus}`,
      layout(`Pedido ${order.orderStatus}`, `<p style="font-size:15px;line-height:1.6;">${msg}</p>${button(orderLink(order), 'Acompanhar pedido')}`)
    );
  },

  sendContact: ({ name, email, phone, subject, message }) =>
    send(
      adminEmail(),
      `Contato pelo site: ${subject || 'Mensagem'}`,
      layout(
        'Nova mensagem de contato',
        `<p>Nome: <strong>${esc(name)}</strong><br>E-mail: ${esc(email)}<br>Telefone: ${esc(phone)}</p><p style="white-space:pre-line;background:#F8F5FE;padding:16px;border-radius:12px;">${esc(message)}</p>`
      )
    ),
};
