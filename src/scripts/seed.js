const mongoose = require('mongoose');
const slugify = require('slugify');
require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Attribute = require('../models/Attribute');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const Setting = require('../models/Setting');

async function seed() {
  console.log('====================================================');
  console.log('🌱 Povoando banco de dados inicial — Vista Bem');
  console.log('====================================================');

  await connectDB();

  // 1. Configurações da Loja
  await Setting.deleteMany({});
  await Setting.create({
    storeName: 'Vista Bem',
    storeNotice: 'Frete grátis nas compras acima de R$ 299 · 5% de desconto no Pix · Parcele em até 6x',
    freeShippingThreshold: 299,
    maxInstallments: 6,
    pixDiscountPercent: 5,
    contactEmail: 'atendimento@vistabem.com',
    companyName: 'Vista Bem Moda e Estilo Ltda',
    whatsapp: '(11) 99999-9999',
    instagram: 'https://instagram.com/vistabem',
    shipping: {
      N: { fee: 39.9, days: '8 a 12 dias úteis' },
      NE: { fee: 34.9, days: '7 a 10 dias úteis' },
      CO: { fee: 29.9, days: '5 a 8 dias úteis' },
      SE: { fee: 22.9, days: '3 a 6 dias úteis' },
      S: { fee: 26.9, days: '4 a 7 dias úteis' },
    },
  });
  console.log('✅ Configurações salvas.');

  // 2. Usuário Administrador
  await User.deleteMany({ role: 'admin' });
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vistabem.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'VistaBem@2026';

  await User.create({
    name: 'Administradora Vista Bem',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    authProvider: 'local',
  });
  console.log(`✅ Administrador criado: ${adminEmail} (Senha: ${adminPassword})`);

  // 3. Atributos (Tamanhos e Cores)
  await Attribute.deleteMany({});
  const sizes = [
    { type: 'size', name: 'PP', order: 1 },
    { type: 'size', name: 'P', order: 2 },
    { type: 'size', name: 'M', order: 3 },
    { type: 'size', name: 'G', order: 4 },
    { type: 'size', name: 'GG', order: 5 },
    { type: 'size', name: '36', order: 6 },
    { type: 'size', name: '38', order: 7 },
    { type: 'size', name: '40', order: 8 },
    { type: 'size', name: '42', order: 9 },
    { type: 'size', name: '44', order: 10 },
    { type: 'size', name: 'Único', order: 11 },
  ];
  const colors = [
    { type: 'color', name: 'Roxo Nobre', value: '#4C1D95', order: 1 },
    { type: 'color', name: 'Lilás Névoa', value: '#B79CF2', order: 2 },
    { type: 'color', name: 'Ciano Elétrico', value: '#00F0FF', order: 3 },
    { type: 'color', name: 'Preto Clássico', value: '#1E1B26', order: 4 },
    { type: 'color', name: 'Off-White', value: '#F8F5FE', order: 5 },
    { type: 'color', name: 'Terracota', value: '#9A3412', order: 6 },
  ];
  await Attribute.insertMany([...sizes, ...colors]);
  console.log('✅ Atributos de tamanhos e cores cadastrados.');

  // 4. Categorias (Feminino, Masculino, Infantil, Acessórios)
  await Category.deleteMany({});
  const catFeminino = await Category.create({
    name: 'Feminino',
    slug: 'feminino',
    description: 'Vestidos, blusas, conjuntos e alfaiataria feminina com caimento refinado.',
    image: '/images/categories/categoria-feminino.svg',
    order: 1,
    active: true,
  });

  const catMasculino = await Category.create({
    name: 'Masculino',
    slug: 'masculino',
    description: 'Camisas, calças, polos e bermudas masculinas com toque macio e corte elegante.',
    image: '/images/categories/categoria-masculino.svg',
    order: 2,
    active: true,
  });

  const catInfantil = await Category.create({
    name: 'Infantil',
    slug: 'infantil',
    description: 'Moda confortável, alegre e durável para meninas e meninos.',
    image: '/images/categories/categoria-infantil.svg',
    order: 3,
    active: true,
  });

  const catAcessorios = await Category.create({
    name: 'Acessórios',
    slug: 'acessorios',
    description: 'Bolsas estruturadas, cintos, lenços e detalhes que complementam sua produção.',
    image: '/images/categories/categoria-acessorios.svg',
    order: 4,
    active: true,
  });

  // Subcategorias
  await Category.create([
    { name: 'Vestidos', slug: 'vestidos', parent: catFeminino._id, order: 1 },
    { name: 'Conjuntos & Blazers', slug: 'conjuntos-blazers', parent: catFeminino._id, order: 2 },
    { name: 'Camisas Masculinas', slug: 'camisas-masculinas', parent: catMasculino._id, order: 1 },
    { name: 'Streetwear & Jaquetas', slug: 'streetwear-jaquetas', parent: catMasculino._id, order: 2 },
    { name: 'Bolsas', slug: 'bolsas', parent: catAcessorios._id, order: 1 },
  ]);
  console.log('✅ Categorias principais e subcategorias criadas.');

  // 5. Produtos Iniciais com Imagens em Alta Definição
  await Product.deleteMany({});
  const sampleProducts = [
    {
      name: 'Vestido Midi Canelado Elegance Roxo Nobre',
      slug: 'vestido-midi-canelado-elegance-roxo-nobre',
      shortDescription: 'Caimento fluido com decote suave e cinto fino em fivela ciano elétrico.',
      description: 'Confeccionado em malha canelada de alta densidade que não marca e não desbota. Acompanha cinto fino contemporâneo com fivela e detalhes em ciano elétrico. Perfeito para quem busca sofisticação em eventos sociais ou ambiente de trabalho.',
      category: catFeminino._id,
      price: 289.9,
      salePrice: 249.9,
      images: [
        '/images/products/vestido-midi-roxo.svg',
        '/images/products/vestido-midi-roxo-2.svg',
      ],
      composition: '95% Viscose Vortex, 5% Elastano Premium',
      care: 'Lavagem delicada à mão ou em saco protetor. Não secar em tambor.',
      featured: true,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'VEST-ELEG-P', size: 'P', color: 'Roxo Nobre', colorHex: '#4C1D95', stock: 8 },
        { sku: 'VEST-ELEG-M', size: 'M', color: 'Roxo Nobre', colorHex: '#4C1D95', stock: 12 },
        { sku: 'VEST-ELEG-G', size: 'G', color: 'Roxo Nobre', colorHex: '#4C1D95', stock: 6 },
        { sku: 'VEST-ELEG-GG', size: 'GG', color: 'Roxo Nobre', colorHex: '#4C1D95', stock: 4 },
      ],
    },
    {
      name: 'Blazer Alfaiataria Estruturado Lilás Névoa',
      slug: 'blazer-alfaiataria-estruturado-lilas-nevoa',
      shortDescription: 'Corte acinturado contemporâneo com botões forrados e pesponto ciano.',
      description: 'O clássico reinventado em tom lilás luminoso e forro acetinado. Lapela alongada de corte impecável e abotoamento duplo com detalhe em ciano neon sutil.',
      category: catFeminino._id,
      price: 389.0,
      salePrice: 0,
      images: ['/images/products/blazer-alfaiataria-lilas.svg'],
      composition: '70% Poliéster Crepado, 28% Viscose, 2% Elastano',
      care: 'Lavagem a seco recomendada.',
      featured: true,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'BLAZ-NEV-38', size: '38', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 5 },
        { sku: 'BLAZ-NEV-40', size: '40', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 7 },
        { sku: 'BLAZ-NEV-42', size: '42', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 3 },
      ],
    },
    {
      name: 'Vestido Longo Gala em Seda Lilás Lumina',
      slug: 'vestido-longo-gala-em-seda-lilas-lumina',
      shortDescription: 'Decote degagê cowl neck, fenda lateral e brilho acetinado envolvente.',
      description: 'Peça de alta-costura desenvolvida para ocasiões inesquecíveis. O toque sedoso da viscose acetinada proporciona um caimento deslumbrante e fluidez única.',
      category: catFeminino._id,
      price: 459.0,
      salePrice: 399.0,
      images: ['/images/products/vestido-festa-lilas.svg'],
      composition: '100% Viscose Acetinada Tipo Seda',
      care: 'Lavagem exclusivamente a seco.',
      featured: true,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'VEST-GALA-38', size: '38', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 4 },
        { sku: 'VEST-GALA-40', size: '40', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 5 },
      ],
    },
    {
      name: 'Calça Pantalona Alfaiataria Noite Profunda',
      slug: 'calca-pantalona-alfaiataria-noite-profunda',
      shortDescription: 'Cós alto estruturado, passantes elegantes e vinco impecável.',
      description: 'A alfaiataria que alonga a silhueta. Tecido encorpado que não amassa com facilidade e caimento impecável do cós à barra.',
      category: catFeminino._id,
      price: 279.0,
      salePrice: 239.0,
      images: ['/images/products/calca-pantalona-preta.svg'],
      composition: '96% Poliéster Premium, 4% Elastano',
      care: 'Lavar em água fria. Secar à sombra.',
      featured: false,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'CALC-PAN-36', size: '36', color: 'Preto Clássico', colorHex: '#1E1B26', stock: 6 },
        { sku: 'CALC-PAN-38', size: '38', color: 'Preto Clássico', colorHex: '#1E1B26', stock: 8 },
        { sku: 'CALC-PAN-40', size: '40', color: 'Preto Clássico', colorHex: '#1E1B26', stock: 7 },
      ],
    },
    {
      name: 'Camisa Linho Pura Fibra Confort Masculina',
      slug: 'camisa-linho-pura-fibra-confort-masculina',
      shortDescription: 'Linho nobre puro respirável com colarinho estruturado e botões perolados.',
      description: 'Modelagem moderna que une sofisticação e conforto térmico excepcional. Perfeita para composições elegantes no dia a dia ou finais de semana.',
      category: catMasculino._id,
      price: 259.9,
      salePrice: 219.9,
      images: ['/images/products/camisa-linho-offwhite.svg'],
      composition: '100% Linho puro certificado',
      care: 'Lavar à mão ou em ciclo delicado com água fria.',
      featured: true,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'CAM-LIN-M', size: 'M', color: 'Off-White', colorHex: '#F8F5FE', stock: 10 },
        { sku: 'CAM-LIN-G', size: 'G', color: 'Off-White', colorHex: '#F8F5FE', stock: 8 },
        { sku: 'CAM-LIN-GG', size: 'GG', color: 'Off-White', colorHex: '#F8F5FE', stock: 4 },
      ],
    },
    {
      name: 'Jaqueta Corta-Vento Streetwear Ciano Neon',
      slug: 'jaqueta-corta-vento-streetwear-ciano-neon',
      shortDescription: 'Design esportivo de luxo com tecido repelente à água e recortes geométricos.',
      description: 'Peça statement com visual cyberpunk contemporâneo. Conta com zíper impermeável ciano luminoso, capuz anatômico e bolsos laterais com fechamento seguro.',
      category: catMasculino._id,
      price: 349.0,
      salePrice: 299.0,
      images: ['/images/products/jaqueta-corta-vento-ciano.svg'],
      composition: '100% Poliamida com membrana hidrofóbica',
      care: 'Lavar com sabão neutro sem amaciante.',
      featured: true,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'JAQ-CIAN-P', size: 'P', color: 'Ciano Elétrico', colorHex: '#00F0FF', stock: 6 },
        { sku: 'JAQ-CIAN-M', size: 'M', color: 'Ciano Elétrico', colorHex: '#00F0FF', stock: 9 },
        { sku: 'JAQ-CIAN-G', size: 'G', color: 'Ciano Elétrico', colorHex: '#00F0FF', stock: 5 },
      ],
    },
    {
      name: 'Conjunto Algodão Prime Infantil Menina',
      slug: 'conjunto-algodao-prime-infantil-menina',
      shortDescription: 'Blusinha charmosa com fru-fru nos ombros e shortinho com lacinho ciano.',
      description: 'Confeccionado em algodão egípcio puro e antialérgico, garantindo liberdade total para brincar com muito estilo e frescor.',
      category: catInfantil._id,
      price: 149.9,
      salePrice: 129.9,
      images: ['/images/products/conjunto-infantil-lilas.svg'],
      composition: '100% Algodão egípcio sustentável',
      care: 'Lavar em água fria com sabão neutro infantil.',
      featured: false,
      isNewArrival: true,
      active: true,
      variants: [
        { sku: 'CONJ-INF-04', size: '4 anos', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 6 },
        { sku: 'CONJ-INF-06', size: '6 anos', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 6 },
        { sku: 'CONJ-INF-08', size: '8 anos', color: 'Lilás Névoa', colorHex: '#B79CF2', stock: 4 },
      ],
    },
    {
      name: 'Bolsa Baguette Couro Legítimo com Alça Metálica Ciano',
      slug: 'bolsa-baguette-couro-legitimo-com-alca-metalica-ciano',
      shortDescription: 'Design italiano com fecho monograma VB em banho ciano espelhado.',
      description: 'Bolsa compacta e ultra elegante com espaço ideal para smartphone, carteira e maquiagem. Alça em corrente articulada e couro de acabamento acetinado nobre.',
      category: catAcessorios._id,
      price: 320.0,
      salePrice: 289.0,
      images: ['/images/products/bolsa-baguette-couro.svg'],
      composition: '100% Couro Bovino Genuíno com ferragens tratadas',
      care: 'Limpar apenas com flanela seca macia.',
      featured: true,
      isNewArrival: false,
      active: true,
      variants: [
        { sku: 'BOL-BAG-PRETA', size: 'Único', color: 'Preto Clássico', colorHex: '#1E1B26', stock: 5 },
        { sku: 'BOL-BAG-ROXA', size: 'Único', color: 'Roxo Nobre', colorHex: '#4C1D95', stock: 4 },
      ],
    },
  ];

  await Product.insertMany(sampleProducts);
  console.log(`✅ ${sampleProducts.length} produtos de exemplo cadastrados com sucesso.`);

  // 6. Cupons de Desconto
  await Coupon.deleteMany({});
  await Coupon.create([
    {
      code: 'BEMVINDA10',
      description: '10% de desconto na primeira compra',
      type: 'percent',
      value: 10,
      minAmount: 150,
      active: true,
    },
    {
      code: 'VISTABEM20',
      description: 'R$ 20 de desconto em compras acima de R$ 200',
      type: 'fixed',
      value: 20,
      minAmount: 200,
      active: true,
    },
  ]);
  console.log('✅ Cupons promocionais cadastrados (BEMVINDA10 e VISTABEM20).');

  console.log('====================================================');
  console.log('✨ Seed concluído com sucesso!');
  console.log('====================================================');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
