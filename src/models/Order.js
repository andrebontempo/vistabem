const mongoose = require('mongoose');

const ORDER_STATUS = [
  'Aguardando Pagamento',
  'Pago',
  'Em Separação',
  'Enviado',
  'Entregue',
  'Cancelado',
  'Reembolsado',
];
const PAYMENT_STATUS = ['Pendente', 'Aprovado', 'Recusado', 'Expirado', 'Reembolsado'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: '' },
      cpf: { type: String, default: '' },
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: mongoose.Schema.Types.ObjectId },
        sku: String,
        name: { type: String, required: true },
        size: String,
        color: String,
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        image: { type: String, default: '' },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    shippingFee: { type: Number, default: 0 },
    shippingMethod: { type: String, default: '' },
    shippingDays: { type: String, default: '' },
    total: { type: Number, required: true },
    shippingAddress: {
      zipCode: { type: String, required: true },
      street: { type: String, required: true },
      number: { type: String, required: true },
      complement: { type: String, default: '' },
      neighborhood: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
    },
    trackingCode: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['pix', 'mercadopago'], default: 'pix' },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'Pendente' },
    orderStatus: { type: String, enum: ORDER_STATUS, default: 'Aguardando Pagamento' },
    statusHistory: [
      {
        status: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
    stockReleased: { type: Boolean, default: false },
    mercadopago: {
      preferenceId: { type: String, default: '' },
      initPoint: { type: String, default: '' },
      paymentId: { type: String, default: '' },
      pixCode: { type: String, default: '' },
      pixQrBase64: { type: String, default: '' },
      pixExpiresAt: { type: Date },
    },
    notes: { type: String, default: '' },
    accessKey: { type: String, required: true }, // permite visitante consultar o pedido
  },
  { timestamps: true }
);

orderSchema.statics.ORDER_STATUS = ORDER_STATUS;
orderSchema.statics.PAYMENT_STATUS = PAYMENT_STATUS;

module.exports = mongoose.model('Order', orderSchema);
