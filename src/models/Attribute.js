const mongoose = require('mongoose');

// Atributos reutilizáveis: tamanhos e cores cadastrados pelo admin
const attributeSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['size', 'color'], required: true },
    name: { type: String, required: true, trim: true },
    value: { type: String, default: '' }, // hex da cor (ex.: #4C1D95)
    order: { type: Number, default: 99 },
  },
  { timestamps: true }
);

attributeSchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Attribute', attributeSchema);
