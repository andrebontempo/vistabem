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
    { type: 'color', name: 'Dourado Champanhe', value: '#D9B26F', order: 3 },
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
    order: 1,
    active: true,
  });

  const catMasculino = await Category.create({
    name: 'Masculino',
    slug: 'masculino',
    description: 'Camisas, calças, polos e bermudas masculinas com toque macio e corte elegante.',
    order: 2,
    active: true,
  });

  const catInfantil = await Category.create({
    name: 'Infantil',
    slug: 'infantil',
    description: 'Moda confortável, alegre e durável para meninas e meninos.',
    order: 3,
    active: true,
  });

  const catAcessorios = await Category.create({
    name: 'Acessórios',
    slug: 'acessorios',
    description: 'Bolsas estruturadas, cintos, lenços e detalhes que complementam sua produção.',
    order: 4,
    active: true,
  });

  // Subcategorias
  await Category.create([
    { name: 'Vestidos', slug: 'vestidos', parent: catFeminino._id, order: 1 },
    { name: 'Conjuntos', slug: 'conjuntos', parent: catFeminino._id, order: 2 },
    { name: 'Camisas Masculinas', slug: 'camisas-masculinas', parent: catMasculino._id, order: 1 },
    { name: 'Bolsas', slug: 'bolsas', parent: catAcessorios._id, order: 1 },
  ]);
  console.log('✅ Categorias principais e subcategorias criadas.');

  // 5. Produtos Iniciais
  await Product.deleteMany({});
  const sampleProducts = [
    {
      name: 'Vestido Midi Canelado Elegance Roxo Nobre',
      slug: 'vestido-midi-canelado-elegance-roxo-nobre',
      shortDescription: 'Caimento fluido com decote suave e fenda lateral sutil.',
      description: 'Confeccionado em malha canelada de alta densidade que não marca e não desbota. Ideal para composições de trabalho e eventos sociais à noite.',
      category: catFeminino._id,
      price: 289.9,
      salePrice: 249.9,
      images: ['/images/placeholder.svg'],
      composition: '95% Viscose, 5% Elastano',
      care: 'Lavagem delicada à mão. Não secar em tambor.',
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
      shortDescription: 'Corte acinturado contemporâneo com botões forrados.',
      description: 'O clássico reinventado em tom suave e iluminado. Forro acetinado acetinado e acabamento de alta costura.',
      category: catFeminino._id,
      price: 389.0,
      salePrice: 0,
      images: ['/images/placeholder.svg'],
      composition: '70% Poliéster, 28% Viscose, 2% Elastano',
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
      name: 'Camisa Linho Pura Fibra Confort Masculina',
      slug: 'camisa-linho-pura-fibra-confort-masculina',
      shortDescription: 'Tecido nobre respirável com toque macio e caimento natural.',
      description: 'Modelagem moderna que une sofisticação e conforto térmico. Perfeita para ocasiões casuais e elegantes.',
      category: catMasculino._id,
      price: 259.9,
      salePrice: 219.9,
      images: ['/images/placeholder.svg'],
      composition: '100% Linho puro',
      care: 'Lavar à mão ou em ciclo delicado.',
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
      name: 'Conjunto Algodão Prime Infantil Menina',
      slug: 'conjunto-algodao-prime-infantil-menina',
      shortDescription: 'Blusinha charmosa e short com elástico confortável.',
      description: 'Confeccionado em algodão egípcio antialérgico, garantindo liberdade total para brincar com muito estilo.',
      category: catInfantil._id,
      price: 149.9,
      salePrice: 129.9,
      images: ['/images/placeholder.svg'],
      composition: '100% Algodão sustentável',
      care: 'Lavar em água fria com sabão neutro.',
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
      name: 'Bolsa Baguette Couro Legítimo com Alça Dourada',
      slug: 'bolsa-baguette-couro-legitimo-com-alca-dourada',
      shortDescription: 'Design atemporal com fecho de engate e ferragens em banho champanhe.',
      description: 'Bolsa compacta com espaço ideal para smartphone, carteira e itens essenciais. Acompanha duas opções de alça.',
      category: catAcessorios._id,
      price: 320.0,
      salePrice: 289.0,
      images: ['/images/placeholder.svg'],
      composition: '100% Couro com ferragens banhadas',
      care: 'Limpar apenas com flanela seca.',
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
