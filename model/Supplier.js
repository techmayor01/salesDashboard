const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplier: { type: String },
  contact_person: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
