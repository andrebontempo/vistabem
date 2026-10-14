const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    value: { type: Number, required: true, min: 0 },
    minAmount: { type: Number, default: 0 },
    maxUses: { type: Number, default: 0 }, // 0 = ilimitado
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Valida o cupom para um subtotal e retorna { ok, discount, message }
 */
couponSchema.methods.evaluate = function (subtotal) {
  if (!this.active) return { ok: false, message: 'Cupom inativo.' };
  if (this.expiresAt && this.expiresAt < new Date()) return { ok: false, message: 'Cupom expirado.' };
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) return { ok: false, message: 'Cupom esgotado.' };
  if (subtotal < this.minAmount) {
    return { ok: false, message: `Valor mínimo para este cupom: R$ ${this.minAmount.toFixed(2).replace('.', ',')}` };
  }
  let discount = this.type === 'percent' ? (subtotal * this.value) / 100 : this.value;
  discount = Math.min(discount, subtotal);
  return { ok: true, discount: Math.round(discount * 100) / 100 };
};

module.exports = mongoose.model('Coupon', couponSchema);
