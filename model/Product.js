const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  quantity: Number,
  unitCode: String,
  lowStockAlert: Number,
  supplierPrice: Number,
  sellPrice: Number,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }
}, { _id: false });


const productSchema = new mongoose.Schema({
  product: String,
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
  product_detail: String,
  mfgDate: Date,
  expDate: Date,
  product_image: String,
  variants: [variantSchema],
  transferredStock: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "TransferStock"
    }],
});

module.exports = mongoose.model("Product", productSchema);
