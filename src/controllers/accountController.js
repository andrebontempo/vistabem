const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Dashboard Minha Conta
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
    res.render('account/dashboard', {
      title: 'Minha Conta — Vista Bem',
      orders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Meus Pedidos
 */
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render('account/orders', {
      title: 'Meus Pedidos — Vista Bem',
      orders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Detalhe de um Pedido
 */
exports.getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ _id: id, user: req.user._id }).populate('items.product');

    if (!order) {
      req.flash('danger', 'Pedido não encontrado.');
      return res.redirect('/minha-conta/pedidos');
    }

    res.render('account/order-detail', {
      title: `Pedido ${order.orderNumber} — Vista Bem`,
      order,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Gestão de Endereços
 */
exports.getAddresses = (req, res) => {
  res.render('account/addresses', {
    title: 'Meus Endereços — Vista Bem',
  });
};

exports.postAddAddress = async (req, res, next) => {
  try {
    const { label, recipient, zipCode, street, number, complement, neighborhood, city, state, isDefault } = req.body;
    const cleanCep = (zipCode || '').replace(/\D/g, '');

    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push({
      label: label || 'Casa',
      recipient: recipient || user.name,
      zipCode: cleanCep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state: (state || '').toUpperCase(),
      isDefault: isDefault === 'on' || user.addresses.length === 0,
    });

    await user.save();
    req.flash('success', 'Endereço salvo com sucesso!');
    res.redirect('/minha-conta/enderecos');
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    user.addresses.pull({ _id: id });
    await user.save();
    req.flash('info', 'Endereço removido.');
    res.redirect('/minha-conta/enderecos');
  } catch (err) {
    next(err);
  }
};

/**
 * Atualizar Perfil e Senha
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, cpf, currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    user.name = (name || user.name).trim();
    user.phone = (phone || '').trim();
    user.cpf = (cpf || '').trim();

    if (newPassword) {
      if (user.authProvider === 'local') {
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
          req.flash('danger', 'Sua senha atual está incorreta.');
          return res.redirect('/minha-conta');
        }
      }
      if (newPassword.length < 6) {
        req.flash('danger', 'A nova senha deve ter no mínimo 6 caracteres.');
        return res.redirect('/minha-conta');
      }
      if (newPassword !== confirmPassword) {
        req.flash('danger', 'A confirmação de senha não confere.');
        return res.redirect('/minha-conta');
      }
      user.password = newPassword;
      user.authProvider = 'local';
    }

    await user.save();
    req.flash('success', 'Seus dados foram atualizados com sucesso!');
    res.redirect('/minha-conta');
  } catch (err) {
    next(err);
  }
};
