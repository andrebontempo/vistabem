const Product = require('../models/Product');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const Review = require('../models/Review');
const User = require('../models/User');
const shippingService = require('../services/shippingService');
const settingService = require('../services/settingService');
const mailService = require('../services/mailService');

/**
 * Página Inicial
 */
exports.getHome = async (req, res, next) => {
  try {
    const [banners, categories, allProducts] = await Promise.all([
      Banner.find({ active: true }).sort({ order: 1 }).lean(),
      Category.find({ active: true, parent: null }).sort({ order: 1 }).limit(6).lean(),
      Product.find({ active: true }).populate('category').sort({ createdAt: -1 }).lean(),
    ]);

    const featuredProducts = allProducts.filter((p) => p.featured).slice(0, 8);
    const newArrivals = allProducts.filter((p) => p.isNewArrival).slice(0, 8);
    const bestSellers = [...allProducts].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 8);

    res.render('index', {
      title: 'Vista Bem — Moda Contemporânea e Sofisticada',
      banners,
      categories,
      featuredProducts,
      newArrivals,
      bestSellers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Catálogo Geral / Por Categoria / Busca
 */
exports.getCatalog = async (req, res, next) => {
  try {
    const { categoria } = req.params;
    const { q, sort, size, color, minPrice, maxPrice, page = 1 } = req.query;
    const limit = 16;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * limit;

    const filter = { active: true };
    let currentCategory = null;

    if (categoria) {
      currentCategory = await Category.findOne({ slug: categoria, active: true });
      if (!currentCategory) {
        return res.status(404).render('error', {
          title: 'Categoria Não Encontrada',
          message: 'A categoria solicitada não existe ou foi desativada.',
          code: 404,
        });
      }

      // Se for categoria mãe, incluir produtos das subcategorias também
      const subcategories = await Category.find({ parent: currentCategory._id, active: true });
      const catIds = [currentCategory._id, ...subcategories.map((c) => c._id)];
      filter.category = { $in: catIds };
    }

    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    if (size) {
      filter['variants.size'] = size;
    }

    if (color) {
      filter['variants.color'] = new RegExp(`^${color}$`, 'i');
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'menor-preco') sortOption = { price: 1 };
    else if (sort === 'maior-preco') sortOption = { price: -1 };
    else if (sort === 'mais-vendidos') sortOption = { soldCount: -1 };
    else if (sort === 'nome-az') sortOption = { name: 1 };
    else if (sort === 'novidades') sortOption = { createdAt: -1 };

    const [products, totalProducts, availableCategories] = await Promise.all([
      Product.find(filter).populate('category').sort(sortOption).skip(skip).limit(limit),
      Product.countDocuments(filter),
      Category.find({ active: true, parent: null }).lean(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit) || 1;

    res.render('shop/catalog', {
      title: currentCategory ? `${currentCategory.name} — Vista Bem` : q ? `Busca por "${q}" — Vista Bem` : 'Coleções e Produtos — Vista Bem',
      products,
      currentCategory,
      availableCategories,
      totalProducts,
      currentPage: Math.max(1, parseInt(page, 10)),
      totalPages,
      selectedFilters: {
        sort: sort || 'novidades',
        size: size || '',
        color: color || '',
        minPrice: minPrice || '',
        maxPrice: maxPrice || '',
        q: q || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Detalhe do Produto
 */
exports.getProduct = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, active: true }).populate('category');

    if (!product) {
      return res.status(404).render('error', {
        title: 'Produto Não Encontrado',
        message: 'O produto que você procura não está mais disponível.',
        code: 404,
      });
    }

    const [relatedProducts, reviews] = await Promise.all([
      Product.find({
        category: product.category._id,
        _id: { $ne: product._id },
        active: true,
      }).limit(4),
      Review.find({ product: product._id, approved: true }).populate('user', 'name avatar').sort({ createdAt: -1 }),
    ]);

    res.render('shop/product', {
      title: `${product.name} — Vista Bem`,
      product,
      relatedProducts,
      reviews,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Avaliação de Produto
 */
exports.postReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Você precisa estar logada para avaliar este produto.' });
    }

    const numRating = parseInt(rating, 10);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Nota inválida (escolha de 1 a 5 estrelas).' });
    }

    const review = await Review.findOneAndUpdate(
      { product: id, user: req.user._id },
      { rating: numRating, comment: (comment || '').trim(), approved: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Review.recalc(id);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, message: 'Obrigado por sua avaliação!' });
    }

    req.flash('success', 'Sua avaliação foi registrada com sucesso!');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle Favoritos (Wishlist)
 */
exports.toggleWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Faça login para salvar seus favoritos.', loginRequired: true });
    }

    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const index = user.wishlist.indexOf(id);
    let added = false;

    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(id);
      added = true;
    }

    await user.save();

    res.json({
      success: true,
      added,
      totalWishlist: user.wishlist.length,
      message: added ? 'Produto adicionado aos seus favoritos! 💜' : 'Produto removido dos favoritos.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Página de Favoritos
 */
exports.getWishlist = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect('/login?redirect=/favoritos');
    }

    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { active: true },
      populate: { path: 'category' },
    });

    res.render('account/wishlist', {
      title: 'Meus Favoritos — Vista Bem',
      products: user.wishlist || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cálculo Rápido de Frete via API
 */
exports.calculateShipping = async (req, res) => {
  try {
    const { cep, subtotal = 0 } = req.body;
    const settings = await settingService.getSettings();
    const result = shippingService.calculate(cep, Number(subtotal), settings);

    if (!result) {
      return res.status(400).json({ error: 'CEP inválido. Digite os 8 dígitos do CEP.' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível calcular o frete agora.' });
  }
};

/**
 * Newsletter
 */
exports.subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Por favor, informe um e-mail válido.' });
    }
    // Sucesso simulado / gravado se houver interesse
    res.json({ success: true, message: 'Inscrição confirmada! Você receberá novidades e cupons exclusivos.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar e-mail.' });
  }
};

/**
 * Institucionais
 */
exports.getAbout = (req, res) => {
  res.render('shop/about', { title: 'Sobre a Vista Bem — Nossa Essência' });
};

exports.getContact = (req, res) => {
  res.render('shop/contact', { title: 'Fale Conosco — Atendimento Vista Bem' });
};

exports.postContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      req.flash('danger', 'Por favor, preencha todos os campos obrigatórios.');
      return res.redirect('/contato');
    }

    await mailService.sendContact({ name, email, phone, subject, message });
    req.flash('success', 'Mensagem enviada com sucesso! Em breve entraremos em contato.');
    res.redirect('/contato');
  } catch (err) {
    next(err);
  }
};

exports.getShippingPolicy = (req, res) => {
  res.render('shop/institutional', {
    title: 'Política de Entregas e Frete — Vista Bem',
    sectionTitle: 'Política de Entregas e Frete',
    type: 'shipping',
  });
};

exports.getReturnsPolicy = (req, res) => {
  res.render('shop/institutional', {
    title: 'Trocas e Devoluções — Vista Bem',
    sectionTitle: 'Trocas e Devoluções',
    type: 'returns',
  });
};

exports.getPrivacyPolicy = (req, res) => {
  res.render('shop/institutional', {
    title: 'Política de Privacidade e Cookies — Vista Bem',
    sectionTitle: 'Política de Privacidade (LGPD)',
    type: 'privacy',
  });
};

exports.getTerms = (req, res) => {
  res.render('shop/institutional', {
    title: 'Termos e Condições de Uso — Vista Bem',
    sectionTitle: 'Termos e Condições de Uso',
    type: 'terms',
  });
};
