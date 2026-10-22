const slugify = require('slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Attribute = require('../models/Attribute');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const Review = require('../models/Review');
const User = require('../models/User');
const Setting = require('../models/Setting');
const settingService = require('../services/settingService');
const { clearMenuCache } = require('../middleware/auth');
const mailService = require('../services/mailService');
const stockService = require('../services/stockService');

/**
 * Dashboard Administrativo
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      monthOrders,
      todayOrders,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: { $in: ['Aguardando Pagamento', 'Em Separação'] } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: firstDayMonth }, paymentStatus: 'Aprovado' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, paymentStatus: 'Aprovado' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Product.find({ 'variants.stock': { $lte: 3 }, active: true }).limit(5),
      Order.find().sort({ createdAt: -1 }).limit(8),
    ]);

    const monthRevenue = monthOrders[0]?.total || 0;
    const todayRevenue = todayOrders[0]?.total || 0;
    const monthSalesCount = monthOrders[0]?.count || 0;
    const averageTicket = monthSalesCount > 0 ? monthRevenue / monthSalesCount : 0;

    res.render('admin/dashboard', {
      title: 'Painel de Controle — Vista Bem',
      stats: {
        totalOrders,
        pendingOrders,
        monthRevenue,
        todayRevenue,
        averageTicket,
      },
      lowStockProducts,
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PRODUTOS
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { q, category } = req.query;
    const filter = {};
    if (q) filter.name = new RegExp(q, 'i');
    if (category) filter.category = category;

    const [products, categories] = await Promise.all([
      Product.find(filter).populate('category').sort({ createdAt: -1 }),
      Category.find().lean(),
    ]);

    res.render('admin/products', {
      title: 'Gerenciar Produtos — Vista Bem',
      products,
      categories,
      query: req.query,
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product = null;

    if (id) {
      product = await Product.findById(id);
    }

    const [categories, sizes, colors] = await Promise.all([
      Category.find({ active: true }).lean(),
      Attribute.find({ type: 'size' }).sort({ order: 1 }).lean(),
      Attribute.find({ type: 'color' }).sort({ order: 1 }).lean(),
    ]);

    res.render('admin/product-form', {
      title: product ? `Editar Produto: ${product.name}` : 'Novo Produto — Vista Bem',
      product: product || {},
      categories,
      sizes,
      colors,
    });
  } catch (err) {
    next(err);
  }
};

exports.postProductForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      shortDescription,
      description,
      category,
      price,
      salePrice,
      composition,
      care,
      featured,
      isNewArrival,
      active,
      existingImages = [],
      // Variações
      variantSku = [],
      variantSize = [],
      variantColor = [],
      variantColorHex = [],
      variantStock = [],
    } = req.body;

    const slug = slugify(name, { lower: true, strict: true });

    // Monta lista de imagens combinando imagens já existentes com novas enviadas
    const keptImages = Array.isArray(existingImages) ? existingImages : existingImages ? [existingImages] : [];
    const newImages = req.savedImages || [];
    const images = [...keptImages, ...newImages];

    // Monta variações
    const skus = Array.isArray(variantSku) ? variantSku : [variantSku];
    const sizes = Array.isArray(variantSize) ? variantSize : [variantSize];
    const colors = Array.isArray(variantColor) ? variantColor : [variantColor];
    const hexes = Array.isArray(variantColorHex) ? variantColorHex : [variantColorHex];
    const stocks = Array.isArray(variantStock) ? variantStock : [variantStock];

    const variants = [];
    for (let i = 0; i < skus.length; i++) {
      if (skus[i] || sizes[i]) {
        variants.push({
          sku: skus[i] || `${slug.slice(0, 6).toUpperCase()}-${i + 1}`,
          size: sizes[i] || 'Único',
          color: colors[i] || '',
          colorHex: hexes[i] || '',
          stock: Math.max(0, parseInt(stocks[i], 10) || 0),
        });
      }
    }

    const data = {
      name: name.trim(),
      slug,
      shortDescription: (shortDescription || '').trim(),
      description: (description || '').trim(),
      category,
      price: Number(price),
      salePrice: Number(salePrice) || 0,
      images,
      variants,
      composition: (composition || '').trim(),
      care: (care || '').trim(),
      featured: featured === 'on',
      isNewArrival: isNewArrival === 'on',
      active: active === 'on',
    };

    if (id) {
      await Product.findByIdAndUpdate(id, data);
      req.flash('success', 'Produto atualizado com sucesso!');
    } else {
      await Product.create(data);
      req.flash('success', 'Produto cadastrado com sucesso!');
    }

    res.redirect('/admin/produtos');
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    req.flash('info', 'Produto excluído.');
    res.redirect('/admin/produtos');
  } catch (err) {
    next(err);
  }
};

/**
 * CATEGORIAS
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate('parent').sort({ order: 1, name: 1 });
    res.render('admin/categories', {
      title: 'Gerenciar Categorias — Vista Bem',
      categories,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    let category = null;
    if (id) category = await Category.findById(id);

    const parentCategories = await Category.find({ parent: null, _id: { $ne: id } });

    res.render('admin/category-form', {
      title: category ? `Editar Categoria: ${category.name}` : 'Nova Categoria — Vista Bem',
      category: category || {},
      parentCategories,
    });
  } catch (err) {
    next(err);
  }
};

exports.postCategoryForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parent, order, active, existingImage } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    let image = existingImage || '';
    if (req.savedImages && req.savedImages[0]) {
      image = req.savedImages[0];
    }

    const data = {
      name: name.trim(),
      slug,
      description: (description || '').trim(),
      parent: parent || null,
      order: parseInt(order, 10) || 99,
      active: active === 'on',
      image,
    };

    if (id) {
      await Category.findByIdAndUpdate(id, data);
      req.flash('success', 'Categoria atualizada!');
    } else {
      await Category.create(data);
      req.flash('success', 'Categoria criada!');
    }

    clearMenuCache();
    res.redirect('/admin/categorias');
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    clearMenuCache();
    req.flash('info', 'Categoria removida.');
    res.redirect('/admin/categorias');
  } catch (err) {
    next(err);
  }
};

/**
 * ATRIBUTOS (TAMANHOS E CORES)
 */
exports.getAttributes = async (req, res, next) => {
  try {
    const [sizes, colors] = await Promise.all([
      Attribute.find({ type: 'size' }).sort({ order: 1 }),
      Attribute.find({ type: 'color' }).sort({ order: 1 }),
    ]);
    res.render('admin/attributes', {
      title: 'Tamanhos e Cores — Vista Bem',
      sizes,
      colors,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAttribute = async (req, res, next) => {
  try {
    const { type, name, value, order } = req.body;
    if (!type || !name) {
      req.flash('danger', 'Tipo e Nome são obrigatórios.');
      return res.redirect('/admin/atributos');
    }

    await Attribute.create({
      type,
      name: name.trim(),
      value: (value || '').trim(),
      order: parseInt(order, 10) || 99,
    });

    req.flash('success', 'Atributo cadastrado!');
    res.redirect('/admin/atributos');
  } catch (err) {
    next(err);
  }
};

exports.deleteAttribute = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Attribute.findByIdAndDelete(id);
    req.flash('info', 'Atributo removido.');
    res.redirect('/admin/atributos');
  } catch (err) {
    next(err);
  }
};

/**
 * PEDIDOS
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;
    if (q) {
      filter.$or = [
        { orderNumber: new RegExp(q, 'i') },
        { 'customer.name': new RegExp(q, 'i') },
        { 'customer.email': new RegExp(q, 'i') },
      ];
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.render('admin/orders', {
      title: 'Gerenciar Pedidos — Vista Bem',
      orders,
      orderStatuses: Order.ORDER_STATUS,
      selectedStatus: status || '',
      searchQuery: q || '',
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('items.product');
    if (!order) {
      req.flash('danger', 'Pedido não encontrado.');
      return res.redirect('/admin/pedidos');
    }

    res.render('admin/order-detail', {
      title: `Detalhes do Pedido ${order.orderNumber} — Vista Bem`,
      order,
      orderStatuses: Order.ORDER_STATUS,
      paymentStatuses: Order.PAYMENT_STATUS,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus, trackingCode, note } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      req.flash('danger', 'Pedido não encontrado.');
      return res.redirect('/admin/pedidos');
    }

    const statusChanged = orderStatus && order.orderStatus !== orderStatus;
    const paymentChanged = paymentStatus && order.paymentStatus !== paymentStatus;

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (trackingCode !== undefined) order.trackingCode = trackingCode.trim();

    order.statusHistory.push({
      status: order.orderStatus,
      note: note || `Atualizado pelo administrador para ${order.orderStatus}`,
      at: new Date(),
    });

    if (['Cancelado', 'Reembolsado'].includes(order.orderStatus)) {
      await stockService.releaseOrder(order);
    }

    await order.save();

    if (statusChanged) {
      mailService.sendStatusUpdate(order).catch((e) => console.error('[Mail] Status update err:', e.message));
    }
    if (paymentChanged && paymentStatus === 'Aprovado') {
      mailService.sendPaymentApproved(order).catch((e) => console.error('[Mail] Payment approved err:', e.message));
    }

    req.flash('success', `Pedido ${order.orderNumber} atualizado com sucesso!`);
    res.redirect(`/admin/pedidos/${id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * CUPONS
 */
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render('admin/coupons', {
      title: 'Cupons de Desconto — Vista Bem',
      coupons,
    });
  } catch (err) {
    next(err);
  }
};

exports.postCoupon = async (req, res, next) => {
  try {
    const { code, description, type, value, minAmount, maxUses, expiresAt, active } = req.body;
    await Coupon.create({
      code: code.trim().toUpperCase(),
      description: (description || '').trim(),
      type: type || 'percent',
      value: Number(value),
      minAmount: Number(minAmount) || 0,
      maxUses: parseInt(maxUses, 10) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: active === 'on',
    });

    req.flash('success', 'Cupom cadastrado com sucesso!');
    res.redirect('/admin/cupons');
  } catch (err) {
    next(err);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    req.flash('info', 'Cupom excluído.');
    res.redirect('/admin/cupons');
  } catch (err) {
    next(err);
  }
};

/**
 * BANNERS
 */
exports.getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1 });
    res.render('admin/banners', {
      title: 'Banners da Home — Vista Bem',
      banners,
    });
  } catch (err) {
    next(err);
  }
};

exports.postBanner = async (req, res, next) => {
  try {
    const { title, subtitle, buttonText, link, order, active } = req.body;
    const image = req.savedImages && req.savedImages[0] ? req.savedImages[0] : '';

    await Banner.create({
      title: (title || '').trim(),
      subtitle: (subtitle || '').trim(),
      buttonText: (buttonText || 'Ver Coleção').trim(),
      link: (link || '/loja').trim(),
      image,
      order: parseInt(order, 10) || 99,
      active: active === 'on',
    });

    req.flash('success', 'Banner criado com sucesso!');
    res.redirect('/admin/banners');
  } catch (err) {
    next(err);
  }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Banner.findByIdAndDelete(id);
    req.flash('info', 'Banner excluído.');
    res.redirect('/admin/banners');
  } catch (err) {
    next(err);
  }
};

/**
 * AVALIAÇÕES
 */
exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().populate('product').populate('user').sort({ createdAt: -1 });
    res.render('admin/reviews', {
      title: 'Moderação de Avaliações — Vista Bem',
      reviews,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleApproveReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (review) {
      review.approved = !review.approved;
      await review.save();
      await Review.recalc(review.product);
      req.flash('success', `Avaliação ${review.approved ? 'aprovada' : 'ocultada'}!`);
    }
    res.redirect('/admin/avaliacoes');
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (review) await Review.recalc(review.product);
    req.flash('info', 'Avaliação excluída.');
    res.redirect('/admin/avaliacoes');
  } catch (err) {
    next(err);
  }
};

/**
 * CLIENTES & GESTÃO DE CONTAS
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { q, role } = req.query;
    const Order = require('../models/Order');

    const filter = {};
    if (role && ['customer', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [users, totalUsers, totalAdmins, totalCustomers, orderCounts, emailOrderCounts] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'customer' }),
      Order.aggregate([
        { $match: { user: { $ne: null } } },
        { $group: { _id: '$user', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { user: null, 'customer.email': { $exists: true, $ne: '' } } },
        { $group: { _id: { $toLower: '$customer.email' }, total: { $sum: 1 } } },
      ]),
    ]);

    const orderCountMap = {};
    orderCounts.forEach((o) => {
      if (o._id) orderCountMap[o._id.toString()] = o.total;
    });
    emailOrderCounts.forEach((o) => {
      if (o._id) orderCountMap[o._id.toLowerCase()] = o.total;
    });

    res.render('admin/users', {
      title: 'Gestão de Usuários e Clientes Cadastrados — Vista Bem',
      users,
      orderCountMap,
      stats: {
        total: totalUsers,
        admins: totalAdmins,
        customers: totalCustomers,
      },
      currentRole: role || 'all',
      searchQuery: q || '',
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    let targetUser = null;

    if (id) {
      targetUser = await User.findById(id);
      if (!targetUser) {
        req.flash('danger', 'Usuário não encontrado.');
        return res.redirect('/admin/clientes');
      }
    } else {
      targetUser = {
        name: '',
        email: '',
        phone: '',
        role: 'customer',
        addresses: [],
      };
    }

    const defaultAddress =
      (targetUser.addresses && targetUser.addresses.find((a) => a.isDefault)) ||
      (targetUser.addresses && targetUser.addresses[0]) ||
      {};

    res.render('admin/user-form', {
      title: id ? `Editar Usuário — ${targetUser.name}` : 'Adicionar Novo Usuário / Cliente — Vista Bem',
      targetUser,
      address: defaultAddress,
      isEdit: !!id,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUserForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      role,
      password,
      zipCode,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    } = req.body;

    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').toLowerCase().trim();
    const trimmedPhone = (phone || '').trim();
    const trimmedPassword = (password || '').trim();
    const selectedRole = role === 'admin' ? 'admin' : 'customer';

    if (!trimmedName || !trimmedEmail) {
      req.flash('danger', 'Nome completo e e-mail são obrigatórios.');
      return res.redirect(id ? `/admin/clientes/${id}/editar` : '/admin/clientes/novo');
    }

    // Se for novo usuário, senha é obrigatória
    if (!id && (!trimmedPassword || trimmedPassword.length < 6)) {
      req.flash('danger', 'Para novos usuários, a senha é obrigatória e deve possuir no mínimo 6 caracteres.');
      return res.redirect('/admin/clientes/novo');
    }

    // Se for edição e informou senha, deve ter ao menos 6 caracteres
    if (id && trimmedPassword && trimmedPassword.length < 6) {
      req.flash('danger', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return res.redirect(`/admin/clientes/${id}/editar`);
    }

    // Checar duplicidade de e-mail
    const emailConflictQuery = { email: trimmedEmail };
    if (id) {
      emailConflictQuery._id = { $ne: id };
    }
    const emailExists = await User.findOne(emailConflictQuery);
    if (emailExists) {
      req.flash('danger', `Já existe uma conta registrada com o e-mail "${trimmedEmail}".`);
      return res.redirect(id ? `/admin/clientes/${id}/editar` : '/admin/clientes/novo');
    }

    let userToSave;

    if (id) {
      userToSave = await User.findById(id).select('+password');
      if (!userToSave) {
        req.flash('danger', 'Usuário não encontrado.');
        return res.redirect('/admin/clientes');
      }

      // Validação de mudança de papel do próprio usuário conectado
      if (userToSave._id.toString() === req.user._id.toString() && selectedRole !== userToSave.role) {
        req.flash('warning', 'Você não pode alterar o perfil de permissão da sua própria conta logada.');
      } else if (userToSave.role === 'admin' && selectedRole === 'customer') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          req.flash('danger', 'Operação bloqueada: o sistema precisa manter pelo menos um administrador ativo.');
          return res.redirect(`/admin/clientes/${id}/editar`);
        }
        userToSave.role = selectedRole;
      } else {
        userToSave.role = selectedRole;
      }

      userToSave.name = trimmedName;
      userToSave.email = trimmedEmail;
      userToSave.phone = trimmedPhone;

      if (trimmedPassword) {
        userToSave.password = trimmedPassword;
        userToSave.authProvider = 'local';
      }
    } else {
      userToSave = new User({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        role: selectedRole,
        password: trimmedPassword,
        authProvider: 'local',
        active: true,
      });
    }

    // Tratar endereço
    const hasAddressData = (zipCode || street || city || neighborhood || number);
    if (hasAddressData) {
      if (!userToSave.addresses || userToSave.addresses.length === 0) {
        userToSave.addresses = [
          {
            label: 'Principal',
            zipCode: (zipCode || '').trim(),
            street: (street || '').trim(),
            number: (number || '').trim(),
            complement: (complement || '').trim(),
            neighborhood: (neighborhood || '').trim(),
            city: (city || '').trim(),
            state: (state || '').toUpperCase().trim(),
            isDefault: true,
          },
        ];
      } else {
        const addr = userToSave.addresses.find((a) => a.isDefault) || userToSave.addresses[0];
        addr.zipCode = (zipCode || '').trim();
        addr.street = (street || '').trim();
        addr.number = (number || '').trim();
        addr.complement = (complement || '').trim();
        addr.neighborhood = (neighborhood || '').trim();
        addr.city = (city || '').trim();
        addr.state = (state || '').toUpperCase().trim();
      }
    }

    await userToSave.save();

    req.flash(
      'success',
      id
        ? `Dados de "${userToSave.name}" atualizados com sucesso.`
        : `Conta de ${selectedRole === 'admin' ? 'Administrador' : 'Cliente'} criada com sucesso para "${userToSave.name}".`
    );
    res.redirect('/admin/clientes');
  } catch (err) {
    next(err);
  }
};

exports.postCreateUser = exports.postUserForm;

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id);

    if (!targetUser) {
      req.flash('danger', 'Usuário não encontrado.');
      return res.redirect('/admin/clientes');
    }

    // Não permitir que o usuário conectado exclua a si mesmo
    if (targetUser._id.toString() === req.user._id.toString()) {
      req.flash('danger', 'Você não pode excluir sua própria conta conectada.');
      return res.redirect('/admin/clientes');
    }

    // Se for admin, impedir exclusão se for o único admin do sistema
    if (targetUser.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        req.flash('danger', 'Operação bloqueada: o sistema precisa manter ao menos um administrador ativo.');
        return res.redirect('/admin/clientes');
      }
    }

    const Order = require('../models/Order');
    const Review = require('../models/Review');

    // Desassociar os pedidos para preservar o histórico financeiro
    await Order.updateMany({ user: targetUser._id }, { $set: { user: null } });

    // Excluir avaliações associadas
    await Review.deleteMany({ user: targetUser._id });

    // Excluir o usuário
    await User.findByIdAndDelete(id);

    req.flash('success', `A conta de "${targetUser.name}" (${targetUser.email}) foi excluída definitivamente.`);
    res.redirect('/admin/clientes');
  } catch (err) {
    next(err);
  }
};

exports.postUpdateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['customer', 'admin'].includes(role)) {
      req.flash('danger', 'Perfil de usuário inválido.');
      return res.redirect('/admin/clientes');
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      req.flash('danger', 'Usuário não encontrado.');
      return res.redirect('/admin/clientes');
    }

    // Não permitir que o usuário logado altere o próprio papel
    if (targetUser._id.toString() === req.user._id.toString()) {
      req.flash('warning', 'Você não pode alterar o perfil da sua própria conta conectada.');
      return res.redirect('/admin/clientes');
    }

    // Se estiver despromovendo para customer, garantir que ainda haja ao menos 1 outro administrador ativo
    if (role === 'customer' && targetUser.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        req.flash('danger', 'Não é possível despromover este administrador. O sistema precisa ter pelo menos um administrador ativo.');
        return res.redirect('/admin/clientes');
      }
    }

    targetUser.role = role;
    await targetUser.save();

    if (role === 'admin') {
      req.flash('success', `O usuário "${targetUser.name}" foi promovido a Administrador com sucesso.`);
    } else {
      req.flash('success', `As permissões de Administrador de "${targetUser.name}" foram revogadas. O usuário agora é Cliente.`);
    }

    res.redirect('/admin/clientes');
  } catch (err) {
    next(err);
  }
};

exports.postUpdateUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    const trimmedPassword = (new_password || '').trim();
    if (!trimmedPassword || trimmedPassword.length < 6) {
      req.flash('danger', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return res.redirect('/admin/clientes');
    }

    const targetUser = await User.findById(id).select('+password');
    if (!targetUser) {
      req.flash('danger', 'Usuário não encontrado.');
      return res.redirect('/admin/clientes');
    }

    targetUser.password = trimmedPassword;
    targetUser.authProvider = 'local';
    await targetUser.save();

    req.flash('success', `Senha do usuário "${targetUser.name}" (${targetUser.email}) atualizada com sucesso!`);
    res.redirect('/admin/clientes');
  } catch (err) {
    next(err);
  }
};

exports.postUpdateAdminOwnPassword = async (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const currentUser = await User.findById(req.user._id).select('+password');

    if (!currentUser) {
      req.flash('danger', 'Usuário administrador não encontrado.');
      return res.redirect('/admin/configuracoes');
    }

    if (currentUser.password && current_password) {
      const isMatch = await currentUser.matchPassword(current_password.trim());
      if (!isMatch) {
        req.flash('danger', 'A senha atual informada está incorreta.');
        return res.redirect('/admin/configuracoes');
      }
    }

    const trimmedNew = (new_password || '').trim();
    const trimmedConfirm = (confirm_password || '').trim();

    if (!trimmedNew || trimmedNew.length < 6) {
      req.flash('danger', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return res.redirect('/admin/configuracoes');
    }

    if (trimmedNew !== trimmedConfirm) {
      req.flash('danger', 'A confirmação de senha não coincide com a nova senha.');
      return res.redirect('/admin/configuracoes');
    }

    currentUser.password = trimmedNew;
    currentUser.authProvider = 'local';
    await currentUser.save();

    req.flash('success', 'Sua senha de administrador foi atualizada com sucesso!');
    res.redirect('/admin/configuracoes');
  } catch (err) {
    next(err);
  }
};

/**
 * CONFIGURAÇÕES
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await settingService.getSettings();
    res.render('admin/settings', {
      title: 'Configurações da Loja — Vista Bem',
      settings,
    });
  } catch (err) {
    next(err);
  }
};

exports.postSettings = async (req, res, next) => {
  try {
    const {
      storeName,
      storeNotice,
      freeShippingThreshold,
      pixDiscountPercent,
      whatsapp,
      instagram,
      facebook,
      tiktok,
      contactEmail,
      companyName,
      cnpj,
      address,
      // Modo de manutenção
      isMaintenanceMode,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceEstimatedReturn,
      maintenanceSettingsIncluded,
      // Tabela de frete
      shippingN_fee, shippingN_days,
      shippingNE_fee, shippingNE_days,
      shippingCO_fee, shippingCO_days,
      shippingSE_fee, shippingSE_days,
      shippingS_fee, shippingS_days,
    } = req.body;

    const data = {
      storeName: (storeName || 'Vista Bem').trim(),
      storeNotice: (storeNotice || '').trim(),
      freeShippingThreshold: Number(freeShippingThreshold) || 299,
      pixDiscountPercent: Number(pixDiscountPercent) || 5,
      whatsapp: (whatsapp || '').trim(),
      instagram: (instagram || '').trim(),
      facebook: (facebook || '').trim(),
      tiktok: (tiktok || '').trim(),
      contactEmail: (contactEmail || '').trim(),
      companyName: (companyName || '').trim(),
      cnpj: (cnpj || '').trim(),
      address: (address || '').trim(),
    };

    if (maintenanceSettingsIncluded === '1') {
      data.isMaintenanceMode = isMaintenanceMode === 'true' || isMaintenanceMode === 'on' || isMaintenanceMode === '1';
      if (typeof maintenanceTitle !== 'undefined') data.maintenanceTitle = (maintenanceTitle || '').trim();
      if (typeof maintenanceMessage !== 'undefined') data.maintenanceMessage = (maintenanceMessage || '').trim();
      if (typeof maintenanceEstimatedReturn !== 'undefined') {
        data.maintenanceEstimatedReturn = (maintenanceEstimatedReturn || '').trim();
      }
    } else if (typeof isMaintenanceMode !== 'undefined') {
      data.isMaintenanceMode = isMaintenanceMode === 'true' || isMaintenanceMode === 'on' || isMaintenanceMode === '1';
    }

    data.shipping = {
      N: { fee: Number(shippingN_fee) || 39.9, days: shippingN_days || '8 a 12 dias' },
      NE: { fee: Number(shippingNE_fee) || 34.9, days: shippingNE_days || '7 a 10 dias' },
      CO: { fee: Number(shippingCO_fee) || 29.9, days: shippingCO_days || '5 a 8 dias' },
      SE: { fee: Number(shippingSE_fee) || 22.9, days: shippingSE_days || '3 a 6 dias' },
      S: { fee: Number(shippingS_fee) || 26.9, days: shippingS_days || '4 a 7 dias' },
    };

    let s = await Setting.findOne();
    if (!s) s = new Setting();
    Object.assign(s, data);
    await s.save();

    settingService.clearCache();
    req.flash('success', 'Configurações atualizadas com sucesso!');
    res.redirect('/admin/configuracoes');
  } catch (err) {
    next(err);
  }
};
