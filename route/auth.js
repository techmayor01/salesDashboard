const express = require("express");

const router = express.Router();


const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const fs = require('fs');
const path = require('path')
const multer = require('multer');


const bcrypt = require("bcrypt");
const saltRounds = 10;

router.use(session({
    secret: "TOP_SECRET",
    resave: false,
    saveUninitialized: true
}));

router.use(passport.initialize());
router.use(passport.session());


// MULTER CONFIGURATION
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/media/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png files are allowed'));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter

 })   // dest: 'uploads/';


// CONNECTING MODELS 
const User = require("../model/User");
const Supplier = require("../model/Supplier");
const Category = require("../model/Category");
const Branch = require("../model/Branch");
const Product = require("../model/Product");
const SupplierInvoice = require('../model/supplierInvoice');
const Customer = require('../model/Customer'); 
const StockTransfer = require('../model/transferStock');
const Loan = require('../model/Loan');

router.get("/login", (req,res)=>{
    res.render("Auth/login")
})
router.get("/register", (req,res)=>{
    res.render("Auth/register")
})



// ADD SUPPLIERS LOGIC 
router.get("/manageSuppliers", (req, res) => {
    Supplier.find()
      .then(suppliers => {
        res.render("Suppliers/manageSuppliers", { suppliers });
      })
      .catch(err => {
        console.error("Error fetching suppliers:", err);
        res.status(500).send("Failed to retrieve suppliers");
      });
});

router.get("/editSuppliers/:id", (req, res) => {
      Supplier.findById(req.params.id)
      .then(supplier =>{
          res.render("Suppliers/editSupplier", { supplier });
      })
      .catch(err => console.log(err))
});

router.get("/viewSupplier/:id", (req, res) => {
  Supplier.findById(req.params.id)
    .populate({
      path: 'supplierInvoice',
      populate: {
        path: 'branch' // populate branch inside supplierInvoice
      }
    })
    .then(supplier => {
      console.log(supplier);
      res.render("Suppliers/viewSupplier", { supplier });
    })
    .catch(err => console.log(err));
});


router.post("/updateSupplier", (req, res) => {
  const updateData = {
    supplier: req.body.supplier,
    contact_person: req.body.contact_person,
    email: req.body.email,
    phone: req.body.phone
  };

  Supplier.findByIdAndUpdate(req.body.id, { $set: updateData }, { new: true })
    .then(updatedDocument => {
      console.log("Updated Document:", updatedDocument);
      res.redirect("/manageSuppliers");
    })
    .catch(err => {
      console.error("Error updating document:", err);
    });
});

  
router.post("/addSupplier", (req, res) => {
    const { supplier, contact_person, email, phone, address } = req.body;
    const newSupplier = new Supplier({
      supplier,
      contact_person,
      email,
      phone,
      address
    });
  
    newSupplier.save()
      .then(savedSupplier => {
        console.log("Supplier added:", savedSupplier);
        res.redirect("/manageSuppliers")
      })
      .catch(err => {
        console.error("Error adding supplier:", err);
        res.status(500).json({ message: "Failed to add supplier", error: err.message });
      });
  });
router.get("/delete/:id", (req,res)=>{
  Supplier.findByIdAndDelete(req.params.id)
  .then(user =>{
      res.redirect("/manageSuppliers")
      console.log('user successfully deleted');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})


// ADD CATEGORIES LOGIC 
router.get("/addCategories", (req, res) => {
    res.render("Categories/addCategories");
  });

router.post("/addCategories", (req, res) => {
    const { category_name } = req.body;

    const newCategory = new Category({
      category_name
    });
  
    newCategory.save()
      .then(savedCategory => {
        console.log("Supplier added:", savedCategory);
        res.redirect("/manageCategories")
      })
      .catch(err => {
        console.error("Error adding supplier:", err);
        res.status(500).json({ message: "Failed to add supplier", error: err.message });
      });
});

router.get("/manageCategories", (req, res) => {
    Category.find()
    .then(Category => {
      res.render("Categories/manageCategories", { Category }); 
    })
    .catch(err => {
      console.error("Error fetching suppliers:", err);
      res.status(500).send("Failed to retrieve suppliers");
    });
});

router.get("/deleteCategory/:id", (req,res)=>{
    Category.findByIdAndDelete(req.params.id)
    .then(user =>{
        res.redirect("/manageCategories")
        console.log('user successfully deleted');
        
    })
    .catch(err => console.log(err))
    console.log(req.params);
    
})


// ADD BRANCH LOGIC 
router.get("/addBranch", (req, res) => {
    res.render("Warehouse/addBranch", {});
});

router.post("/addBranch", (req, res) => {
    const { branch_name, branch_number } = req.body;

    const newBranch = new Branch({
        branch_name,
        branch_number
    });
  
    newBranch.save()
      .then(savedBranch => {
        console.log("Branch added:", savedBranch);
        res.redirect("/manageBranch")
      })
      .catch(err => {
        console.error("Error adding supplier:", err);
        res.status(500).json({ message: "Failed to add supplier", error: err.message });
      });
});

router.get("/manageBranch", (req, res) => {
  Branch.find()
    .populate({
      path: 'stock',
      populate: {
        path: 'category'
      }
    })
    .then(branches => {
      // Loop through each branch
      branches.forEach(branch => {
        console.log(`\nBranch: ${branch.branch_name}`);

        if (Array.isArray(branch.stock) && branch.stock.length > 0) {
          branch.stock.forEach((product, index) => {
            console.log(`  Product ${index + 1}:`);
            console.log(`    Name: ${product.product}`);
            console.log(`    Detail: ${product.product_detail}`);
            console.log(`    MFG Date: ${product.mfgDate}`);
            console.log(`    EXP Date: ${product.expDate}`);
            console.log(`    Image: ${product.product_image}`);
            console.log(`    Category: ${product.category?.category_name || 'N/A'}`);

            if (Array.isArray(product.variants)) {
              product.variants.forEach((variant, i) => {
                console.log(`      Variant ${i + 1}: Qty=${variant.quantity}, Price=${variant.sellPrice}, Unit=${variant.unitCode}`);
              });
            } else {
              console.log(`      No variants`);
            }
          });
        } else {
          console.log("  No stock in this branch.");
        }
      });

      res.render("Warehouse/manageBranch", { branch: branches });
    })
    .catch(err => {
      console.error("Error fetching branches:", err);
      res.status(500).send("Failed to retrieve branches");
    });
});


router.get("/deleteBranch/:id", (req,res)=>{
    Branch.findByIdAndDelete(req.params.id)
    .then(user =>{
        res.redirect("/manageBranch")
        console.log('user successfully deleted');
        
    })
    .catch(err => console.log(err))
    console.log(req.params);
    
})

router.get("/viewBranch/:id", (req,res)=>{

  Branch.findById(req.params.id)
  .populate({
    path: 'stock',
    populate: {
      path: 'category' // populate branch inside supplierInvoice
    }
  })
  .then(stock => {
    console.log(stock);
    res.render("Warehouse/viewBranch", { stock });
  })
  .catch(err => console.log(err));
  console.log(req.params);
})





// ADD INVOICE LOGIC 
router.get("/addSupplierInvoice", (req, res) => {
  Supplier.find({})
    .then(suppliers => {
      Branch.find({})
        .then(branches => {
          res.render("SuppliersInvoice/addInvoice", {
            suppliers: suppliers,  // make sure this is passed
            branches: branches     // and this too
          });
        })
        .catch(err => {
          console.error("Error fetching branches:", err);
          res.status(500).send("Error fetching branches");
        });
    })
    .catch(err => {
      console.error("Error fetching suppliers:", err);
      res.status(500).send("Error fetching suppliers");
    });
});


router.post('/addinvoiceSuppliers', (req, res) => {
  const {
    supplier,
    branch,
    payment_date,
    item_name,
    item_qty,
    item_rate,
    paid_amount
  } = req.body;

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  const receipt_ref = `RCT-${timestamp}`;
  const invoice_number = `INV-${timestamp}`;

  const items = item_name.map((name, index) => {
    const qty = parseFloat(item_qty[index]);
    const rate = parseFloat(item_rate[index]);
    return {
      item_name: name,
      item_qty: qty,
      item_rate: rate,
      item_total: qty * rate
    };
  });

  const grand_total = items.reduce((sum, item) => sum + item.item_total, 0);
  const paid = parseFloat(paid_amount);
  const due_amount = grand_total - paid;
  const payment_status = due_amount === 0 ? 'paid_full' : 'paid_half';

  const newInvoice = new SupplierInvoice({
    supplier,
    branch,
    payment_date,
    items,
    grand_total,
    paid_amount: paid,
    due_amount,
    payment_status,
    receipt_ref,
    invoice_number
  });

  newInvoice.save()
    .then((savedInvoice) => {
      // Now update the Supplier with this invoice ID
      return Supplier.findByIdAndUpdate(
        supplier,
        { supplierInvoice: savedInvoice._id },
        { new: true }
      );
    })
    .then((updatedSupplier) => {
      console.log('Supplier updated with invoice ID:', updatedSupplier);
      res.redirect('/SuppliersInvoice');
    })
    .catch((err) => {
      console.error('Error saving supplier invoice or updating supplier:', err);
      res.status(500).send('Internal Server Error');
    });
});


// GET all supplier invoices
router.get('/SuppliersInvoice', (req, res) => {
  SupplierInvoice.find()
  .populate('supplier branch')
  .then((invoices) => {
    // invoices.forEach(invoice => {
      console.log(invoices);
      
      res.render("SuppliersInvoice/invoiceList", {invoices});
  
    // });
  })
  .catch((err) => {
    console.error('Error fetching supplier invoices:', err);
    // res.status(500).send('Internal Server Error');
  });

});

router.get("/delete/supplierInvoice/:id", (req,res)=>{
  SupplierInvoice.findByIdAndDelete(req.params.id)
  .then(user =>{
      res.redirect("/SuppliersInvoice")
      console.log('user successfully deleted');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})


// ADD PRODUCT LOGIC 

router.get("/addProduct", (req, res) => {
    Category.find()
      .then(categories => {
        Branch.find()
          .then(branches => {
            Supplier.find()
              .then(suppliers => {
                res.render("Product/addProduct", {
                  categories,
                  branches,
                  suppliers
                });
              })
              .catch(err => {
                console.error("Error loading suppliers:", err);
                res.redirect("/dashboard?msg=Error loading suppliers");
              });
          })
          .catch(err => {
            console.error("Error loading branches:", err);
            res.redirect("/dashboard?msg=Error loading branches");
          });
      })
      .catch(err => {
        console.error("Error loading categories:", err);
        res.redirect("/dashboard?msg=Error loading categories");
      });
});
  

router.post("/addProduct", upload.single("product_image"), (req, res) => {
  const {
    product,
    category,
    branch,
    product_detail,
    mfgDate,
    expDate,
    quantity,
    unitCode,
    lowStockAlert,
    supplierPrice,
    sellPrice,
    supplier
  } = req.body;

  // Normalize variant-related fields
  const quantities = Array.isArray(quantity) ? quantity : [quantity];
  const unitCodes = Array.isArray(unitCode) ? unitCode : [unitCode];
  const lowStockAlerts = Array.isArray(lowStockAlert) ? lowStockAlert : [lowStockAlert];
  const supplierPrices = Array.isArray(supplierPrice) ? supplierPrice : [supplierPrice];
  const sellPrices = Array.isArray(sellPrice) ? sellPrice : [sellPrice];
  const suppliers = Array.isArray(supplier) ? supplier : [supplier];

  // Create variant objects
  const variants = quantities.map((_, index) => ({
    quantity: quantities[index],
    unitCode: unitCodes[index],
    lowStockAlert: lowStockAlerts[index],
    supplierPrice: supplierPrices[index],
    sellPrice: sellPrices[index],
    supplier: suppliers[index]
  }));

  // Create the new product document
  const newProduct = new Product({
    product,
    category,
    branch,
    product_detail,
    mfgDate,
    expDate,
    product_image: req.file ? req.file.filename : null,
    variants
  });

  newProduct.save()
    .then((savedProduct) => {
      // Push product to branch stock array
      return Branch.findByIdAndUpdate(
        branch,
        { $push: { stock: savedProduct._id } }, // 👈 push instead of replace
        { new: true }
      );
    })
    .then((updatedBranch) => {
      console.log('Branch updated with new product:', updatedBranch);
      res.redirect('/addProduct');
    })
    .catch((err) => {
      console.error('Error saving product or updating branch:', err);
      res.status(500).send('Internal Server Error');
    });
});



router.get("/addProductCsv", (req, res) => {
    res.render("Product/addProductCsv", {});
});

router.get("/manageProduct", (req, res) => {
  Product.find()
    .populate('category')
    .populate('branch')
    .populate('variants.supplier') 
    .then(products => {
      products.forEach(product => {
        product.variants.forEach(variant => {
          console.log(variant);
        });
      });
      res.render("Product/manageProduct", { products });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error fetching products.");
    });
});

router.get("/stockTransfer", (req, res) => {
  Product.find()
    .populate('variants.supplier') // If needed
    .then(products => {
      Branch.find()
        .then(branches => {
          res.render("Product/stockTransfer", { products, branches });
        })
        .catch(branchErr => {
          console.error(branchErr);
          res.status(500).send("Error fetching branches.");
        });
    })
    .catch(productErr => {
      console.error(productErr);
      res.status(500).send("Error fetching products.");
    });
});



router.get("/adjustStock/:id", (req,res)=>{
  console.log(req.params);
  Product.findById(req.params.id)
  .populate('category')
  .populate('branch')
  .populate('variants.supplier') 
  .then(product => {
    res.render("Product/stockAdjust", { product });
  })
  .catch(err => {
    console.error(err);
    res.status(500).send("Error fetching products.");
  });
})


router.post('/adjustStock', (req, res) => {
  const { productId, supplierPrice, sellPrice } = req.body;

  if (!productId) {
    return res.status(400).send('Missing required fields');
  }

  Product.findById(productId)
    .then(product => {
      if (!product) {
        return res.status(404).send('Product not found');
      }

      // Make sure supplierPrice and sellPrice are arrays
      const supplierPrices = Array.isArray(supplierPrice) ? supplierPrice : [supplierPrice];
      const sellPrices = Array.isArray(sellPrice) ? sellPrice : [sellPrice];

      if (product.variants.length !== supplierPrices.length || product.variants.length !== sellPrices.length) {
        return res.status(400).send('Mismatch in variants and prices count');
      }

      // Loop through each variant and update
      product.variants.forEach((variant, index) => {
        variant.supplierPrice = supplierPrices[index];
        variant.sellPrice = sellPrices[index];
      });

      return product.save();
    })
    .then(updatedProduct => {
      console.log('Product updated successfully:', updatedProduct._id);
      res.redirect('/manageProduct');
    })
    .catch(error => {
      console.error('Error updating product:', error);
      res.status(500).send('Internal Server Error');
    });
});



router.get("/deleteProduct/:id", (req,res)=>{
    Product.findByIdAndDelete(req.params.id)
    .then(user =>{
        res.redirect("/manageProduct")
        console.log('user successfully deleted');
        
    })
    .catch(err => console.log(err))
    console.log(req.params);
    
})



router.get('/searchProduct', async (req, res) => {
  const { query, branchId } = req.query;

  if (!query || !branchId) {
      return res.status(400).json({ error: 'Missing query or branchId' });
  }

  try {
      // Find the branch and populate its stock (assuming stock is an array or ref)
      const branch = await Branch.findById(branchId).populate({
          path: 'stock',
          match: { product: new RegExp(query, 'i') }
      });

      if (!branch || !branch.stock) {
          return res.json({ product: null });
      }

      // If stock is an array, find the first matching product
      const matchedProduct = Array.isArray(branch.stock)
          ? branch.stock.find(p => p.product.toLowerCase().includes(query.toLowerCase()))
          : branch.stock;

      res.json({ product: matchedProduct });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});





// router.post('/stockTransfer', (req, res) => {
//     console.log(req.body);
    
    
// });


// POST request to handle stock transfer
router.post('/stockTransfer', (req, res) => {
  console.log(req.body);
  
});












// EXPIRED PRODUCT LOGIC 
router.get("/expiredProducts", (req, res) => {
    // Get the current date
    const currentDate = new Date();

    // Query the database for products where the expDate is less than today's date
    Product.find({ expDate: { $lt: currentDate } })
        .then(expiredProducts => {
            res.render("ExpiredProducts/expiredProducts", { expiredProducts });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Server Error");
        });
});


// ADD CUSTOMER LOGIC 
router.get("/addCustomers", (req, res) => {
  res.render("Customers/addCustomers", {});
});


router.get("/manageCustomers", (req, res) => {
  Customer.find()
    .then((customers) => {
      customers.forEach(customer => {
        console.log(`Customer: ${customer.customer_name}`);
        
        customer.transactions.forEach(transaction => {
          console.log(`  - Product: ${transaction.product}`);
          console.log(`  - Quantity: ${transaction.qty}`);
          console.log(`  - Rate: ${transaction.rate}`);
          console.log(`  - Total: ${transaction.total}`);
          console.log(`  - Paid Amount: ${transaction.paid_amount}`);
          console.log(`  - Remaining Amount: ${transaction.remaining_amount}`);
          console.log('----------------------------');
        });
      });

      res.render("Customers/manageCustomers", { customers });
    })
    .catch((err) => {
      console.error("Error fetching customers:", err);
      res.status(500).send("Internal Server Error");
    });
});


router.get("/delete/customer/:id", (req,res)=>{
  Customer.findByIdAndDelete(req.params.id)
  .then(user =>{
      res.redirect("/manageCustomers")
      console.log('user successfully deleted');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})





router.post("/addCustomers", (req, res) => {
  const {
    customer_name,
    mobile,
    email,
    address
  } = req.body;


  const newCustomer = new Customer({
    customer_name,
    mobile,
    email,
    address
  });

  newCustomer.save()
    .then((customer) => {
      console.log(customer);
      
      res.redirect('/manageCustomers');
    })
    .catch((err) => {
      console.error("Error saving customer:", err);
      res.status(500).send("Internal Server Error");
    });
});


router.get("/creditCustomers", (req, res) => {
  Customer.find()
    .then(customers => {
      // Filter customers who have at least one transaction with remaining_amount > 0
      const creditCustomers = customers.filter(customer => 
        customer.transactions.some(transaction => transaction.remaining_amount > 0)
      );

      res.render("Customers/creditCustomers", { customers: creditCustomers });
    })
    .catch(err => {
      console.error("Error fetching customers:", err);
      res.status(500).send("Internal Server Error");
    });
});


router.get("/paidCustomers", (req, res) => {
  Customer.find()
    .then(customers => {
      // Filter customers who have NO transaction with remaining_amount > 0
      const paidCustomers = customers.filter(customer => 
        customer.transactions.length > 0 &&
        customer.transactions.every(transaction => transaction.remaining_amount <= 0)
      );

      res.render("Customers/paidCustomers", { customers: paidCustomers });
    })
    .catch(err => {
      console.error("Error fetching customers:", err);
      res.status(500).send("Internal Server Error");
    });
});



// TRANSACTION LOGIC 


router.get("/cashReceivable", (req, res) => {
  Customer.find()
    .then((customers) => {
      console.log(customers);
      
      res.render("Transaction/cashReceivable", { customers });
    })
    .catch((err) => {
      console.error("Error fetching customers:", err);
      res.status(500).send("Internal Server Error");
    });
});
   
router.get("/transactionHistory", (req, res) => {
  Customer.find()
  .then((customers) => {
    res.render("Transaction/transactionHistory", { customers });
  })
  .catch((err) => {
    console.error("Error fetching customers:", err);
    res.status(500).send("Internal Server Error");
  });
  });

router.get('/api/searchCustomers', (req, res) => {
  const searchQuery = req.query.q;

  Customer.find({
    customer_name: { $regex: searchQuery, $options: 'i' }
  })
    .then(customers => {
      const updatedCustomers = customers.map(customer => {
        let total_amount = 0;
        let paid_amount = 0;
        let remaining_amount = 0;

        customer.transactions.forEach(txn => {
          total_amount += txn.total || 0;
          paid_amount += txn.paid_amount || 0;
          remaining_amount += txn.remaining_amount || 0;
        });

        return {
          _id: customer._id,
          customer_name: customer.customer_name,
          mobile: customer.mobile,
          email: customer.email,
          address: customer.address,
          total_amount,
          paid_amount,
          remaining_amount
        };
      });

      res.json(updatedCustomers);
    })
    .catch(err => {
      console.error('Error searching customers:', err);
      res.status(500).send('Internal Server Error');
    });
});
  



// ADD CUSTOMER INVOICE LOGIC 
router.get("/addInvoice", (req, res) => {
  Customer.find().sort({ createdAt: -1 })
    .then((customers) => {
      Product.find().sort({ createdAt: -1 })
        .then((products) => {
          res.render("Invoice/addInvoice", {
            customers,
            products
          });
        })
        .catch((err) => {
          console.error("Error fetching products:", err);
          res.status(500).send("Failed to load products");
        });
    })
    .catch((err) => {
      console.error("Error fetching customers:", err);
      res.status(500).send("Failed to load customers");
    });
});


router.get("/search-customers", (req, res) => {
  const search = req.query.q;

  if (!search) return res.json([]);

  const regex = new RegExp(search, "i");

  Customer.find({ customer_name: { $regex: regex } })
    .limit(10) // Limit for performance
    .then(results => res.json(results))
    .catch(error => {
      console.error("Search error:", error);
      res.status(500).json({ error: "Server Error" });
    });
});



// router.post("/addInvoice", (req, res) => {
//   console.log(req.body);
// });



// POST route to add a transaction
router.post('/addInvoice', (req, res) => {
  const { customer_id, product, qty, unitcode, rate, total, paid_amount } = req.body;

  if (!customer_id) {
    return res.status(400).json({ message: 'Customer ID is required' });
  }

  Customer.findById(customer_id)
    .then(customer => {
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Find product by NAME, not ID
      return Product.findOne({ product: product })
        .then(productDoc => {
          if (!productDoc) {
            return res.status(404).json({ message: 'Product not found' });
          }

          // Find the variant inside the product
          const variant = productDoc.variants.find(v => v.unitCode === unitcode);
          if (!variant) {
            return res.status(404).json({ message: 'Product variant not found' });
          }

          if (variant.quantity < qty) {
            return res.status(400).json({ message: 'Not enough stock available' });
          }

          // Subtract purchased quantity
          variant.quantity -= qty;

          // Save updated product
          return productDoc.save()
            .then(() => {
              // After product saved, add transaction to customer

              const remaining_amount = parseFloat(total) - parseFloat(paid_amount || 0);

              const newTransaction = {
                product: product,
                qty: Number(qty),
                unit_code: unitcode,
                rate: Number(rate),
                total: Number(total),
                paid_amount: Number(paid_amount || 0),
                remaining_amount: remaining_amount
              };

              customer.transactions.push(newTransaction);

              return customer.save();
            });
        });
    })
    .then(updatedCustomer => {
      if (!updatedCustomer) return;
      res.status(200).json({ message: 'Transaction added successfully', customer: updatedCustomer });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    });
});







router.get('/search-products', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const products = await Product.find({
      product: { $regex: query, $options: "i" }
    }).limit(10); // Limit results

    // Add available_qty field to the response by summing quantities of variants
    const productsWithAvailableQty = products.map(product => {
      const available_qty = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
      return { ...product.toObject(), available_qty };
    });

    res.json(productsWithAvailableQty);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// RECIEVED SUPPLY LOGIC
router.get("/suppliedStock", (req, res)=>{
  SupplierInvoice.find()
  .populate('supplier branch')
  .then((invoices) => {
      console.log(invoices);
      res.render("ReceivedStock/suppliedStock", {invoices});
  })
  .catch((err) => {
    console.error('Error fetching supplier invoices:', err);
    // res.status(500).send('Internal Server Error');
  });
})























// LOAN LOGIC 
router.get("/addLoaner", (req, res) => {
  res.render("loan/addLoaner");
});

router.get("/manageLoaner", (req, res) => {
  Loan.find()
  .then(loaners => {
    res.render("loan/manageLoaner", { loaners });
  })
  .catch(err => {
    console.error("Error fetching loaners:", err);
    res.status(500).send("Server error");
  });
});
// VIEW AND DELETE LOANER 
router.get("/viewLoaner/:id", (req,res)=>{
  Loan.findById(req.params.id)
  .then(loaner =>{
      res.redirect("/manageLoaner")
      console.log('Loaner successfully found');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})
router.get("/deleteLoaner/:id", (req,res)=>{
  Loan.findByIdAndDelete(req.params.id)
  .then(loaner =>{
      res.redirect("/manageLoaner")
      console.log('Loaner successfully deleted');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})




// ADD LOAN 
router.get("/addLoan", (req, res) => {
  Loan.find({}, 'loaner _id')
    .then(loaners => {
      res.render("loan/addLoan", { loaners });
    })
    .catch(err => {
      console.error("Error loading loaners:", err);
      res.status(500).send("Server error");
    });
});


router.get("/manageLoan", (req, res) => {
  Loan.find()
    .then(loaners => {
      const loans = [];

      loaners.forEach(loaner => {
        loaner.loans.forEach(loan => {
          loans.push({
            loanerName: loaner.loaner,
            mobile: loaner.mobile,
            loanAmount: loan.loanAmount,
            amount_to_repay: loan.amount_to_repay || 0, // if you track this
            contractStart: loan.loanContractDate,
            _id: loan._id,
            status: loan.loanContractEndDate < new Date() ? "Expired" : "Active"
          });
        });
      });

      res.render("loan/manageLoan", { loans });
    })
    .catch(err => {
      console.error("Error loading loans:", err);
      res.status(500).send("Server error");
    });
});

router.post("/deleteLoan/:id", (req, res) => {
  const loanId = req.params.id;

  Loan.findOneAndUpdate(
    { "loans._id": loanId },
    { $pull: { loans: { _id: loanId } } }
  )
    .then(() => {
      console.log("Loan successfully deleted");
      res.redirect("/manageLoan");
    })
    .catch(err => {
      console.error("Error deleting loan:", err);
      res.status(500).send("Error deleting loan");
    });
});


// LOAN POST 
router.post("/addLoaner", (req, res) => {
  const { loaner, mobile, address } = req.body;

  const newLoaner = new Loan({
    loaner,
    mobile,
    address,
    loans: []
  });

  newLoaner.save()
    .then(savedLoaner => {
      console.log(savedLoaner);
      
      res.redirect("/manageLoaner")
    })
    .catch(err => {
      console.error("Error adding loaner:", err);
      res.status(500).json({ message: "Server error" });
    });
});

router.post("/addLoan", (req, res) => {
  const { loanerId, loanAmount, loanContractDate, loanContractEndDate, details } = req.body;

  Loan.findById(loanerId)
    .then(loaner => {
      if (!loaner) return res.status(404).send("Loaner not found");

      loaner.loans.push({
        loanAmount,
        amount_to_repay: loanAmount,
        loanContractDate,
        loanContractEndDate,
        details
      });

      return loaner.save();
    })
    .then(() => {
      res.redirect("/manageLoan");
    })
    .catch(err => {
      console.error("Error adding loan:", err);
      res.status(500).send("Server error");
    });
});












// STAFF LOGIC 
router.get("/addStaffs", (req, res) => {
  res.render("staffs/addStaffs", {});
});


// USER SIGN-UP LOGIC 
router.post("/register", (req, res) => {
    const { username, password } = req.body;
  
    // First, check if the username already exists
    User.findOne({ username: username }).then(existingUser => {
        if (existingUser) {
            // Username already exists — send feedback
            return res.render("auth/auth-login", { error: "Username already exists. Please Login.", existingUser });
        }
  
        // Proceed to hash and save the new user
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err) {
                console.error(err);
                return res.redirect("/error-404");
            }
  
            const newUser = new User({
                username: username,
                password: hash
            });
  
            newUser.save()
                .then(() => res.redirect("/login"))
                .catch(err => {
                    console.error(err);
                    res.redirect("/error-404");
                });
        });
    });
});

router.post("/sign-in", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login"
}));


passport.use(new LocalStrategy(function verify(username, password, done) {
    User.findOne({username: username}).then(function (foundUser) {
        if(foundUser){
            bcrypt.compare(password, foundUser.password, function(err, result) {
                if(result){
                    return done(null, foundUser);
                }else{
                    return done(null, false, {message: "Incorrect password"});
                    alert("Incorrect password");
                }
            });
            
        }
    });
}))

passport.serializeUser((user, done) =>{
    done(null, user);
})

passport.deserializeUser((user, done) =>{
    done(null, user);
})


module.exports = router;
