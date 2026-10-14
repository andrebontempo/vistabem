const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    size: { type: String, default: 'Único' },
    color: { type: String, default: '' },
    colorHex: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'O nome do produto é obrigatório'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: [true, 'O preço é obrigatório'], min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    variants: [variantSchema],
    composition: { type: String, default: '' },
    care: { type: String, default: '' },
    sizeGuide: { type: String, default: '' },
    weight: { type: Number, default: 0.4 }, // kg (para frete futuro)
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

productSchema.virtual('finalPrice').get(function () {
  return this.salePrice > 0 && this.salePrice < this.price ? this.salePrice : this.price;
});

productSchema.virtual('onSale').get(function () {
  return this.salePrice > 0 && this.salePrice < this.price;
});

productSchema.virtual('discountPercent').get(function () {
  if (!(this.salePrice > 0 && this.salePrice < this.price)) return 0;
  return Math.round((1 - this.salePrice / this.price) * 100);
});

productSchema.virtual('totalStock').get(function () {
  return (this.variants || []).reduce((t, v) => t + Math.max(0, v.stock), 0);
});

productSchema.virtual('sizes').get(function () {
  return [...new Set((this.variants || []).map((v) => v.size).filter(Boolean))];
});

productSchema.virtual('colors').get(function () {
  const map = new Map();
  (this.variants || []).forEach((v) => {
    if (v.color && !map.has(v.color)) map.set(v.color, v.colorHex);
  });
  return [...map].map(([name, hex]) => ({ name, hex }));
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
