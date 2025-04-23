const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true
  },
  product_image: {
    type: String // Store image file path or filename
  },
  product_detail: {
    type: String,
    maxlength: 300
  },
  mfgDate: {
    type: Date,
    required: true
  },
  expDate: {
    type: Date,
    required: true
  },

  // Inventory & Supplier Info
  quantity: {
    type: Number
  },
  unitCode: {
    type: String,
    enum: ["cs", "dz"]
  },
  lowStockAlert: {
    type: Number
  },
  supplierPrice: {
    type: Number
  },
  sellPrice: {
    type: Number
  },
  model: {
    type: String
  },
  sku: {
    type: String
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);