const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'Vista Bem' },
    storeNotice: { type: String, default: 'Frete grátis nas compras acima de R$ 299 · Parcele em até 6x sem juros' },
    // Frete por região (tabela fixa no MVP)
    shipping: {
      N: { fee: { type: Number, default: 39.9 }, days: { type: String, default: '8 a 12 dias úteis' } },
      NE: { fee: { type: Number, default: 34.9 }, days: { type: String, default: '7 a 10 dias úteis' } },
      CO: { fee: { type: Number, default: 29.9 }, days: { type: String, default: '5 a 8 dias úteis' } },
      SE: { fee: { type: Number, default: 22.9 }, days: { type: String, default: '3 a 6 dias úteis' } },
      S: { fee: { type: Number, default: 26.9 }, days: { type: String, default: '4 a 7 dias úteis' } },
    },
    freeShippingThreshold: { type: Number, default: 299 },
    maxInstallments: { type: Number, default: 6 },
    pixDiscountPercent: { type: Number, default: 5 },
    whatsapp: { type: String, default: '' },
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    contactEmail: { type: String, default: 'atendimento@vistabem.com.br' },
    companyName: { type: String, default: 'Vista Bem Moda' },
    cnpj: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
