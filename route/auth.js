
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
        res.render("Suppliers/manageSuppliers", { suppliers }); // Replace with your actual view file
      })
      .catch(err => {
        console.error("Error fetching suppliers:", err);
        res.status(500).send("Failed to retrieve suppliers");
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
    .then(branch => {
      res.render("Warehouse/manageBranch", { branch }); 
    })
    .catch(err => {
      console.error("Error fetching suppliers:", err);
      res.status(500).send("Failed to retrieve suppliers");
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

  // Generate timestamps
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); // e.g. 20250421123045

  const receipt_ref = `RCT-${timestamp}`;
  const invoice_number = `INV-${timestamp}`;

  // Convert items into array of item objects
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

  // Create invoice instance
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
    .then(() => {
      res.redirect('/SuppliersInvoice'); // Redirect or render success
    })
    .catch((err) => {
      console.error('Error saving supplier invoice:', err);
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
    branchRackNo,
    product_detail,
    mfgDate,
    expDate,
    quantity,
    unitCode,
    lowStockAlert,
    supplierPrice,
    sellPrice,
    model,
    sku,
    supplier
  } = req.body;

  const newProduct = new Product({
    product,
    category,
    branch,
    branchRackNo,
    product_detail,
    mfgDate,
    expDate,
    quantity,
    unitCode,
    lowStockAlert,
    supplierPrice,
    sellPrice,
    model,
    sku,
    supplier,
    product_image: req.file ? req.file.filename : null
  });

  newProduct.save()
    .then(() => {
      res.redirect("/addProduct"); // Or wherever you want to go
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Something went wrong.");
    });
});


router.get("/addProductCsv", (req, res) => {
    res.render("Product/addProductCsv", {});
});
  
router.get("/manageProduct", (req, res) => {
    Product.find()
      .populate('category')
      .populate('branch')   
      .populate('supplier') 
      .then(products => {
        console.log(products);
        
        res.render("Product/manageProduct", { products });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Error fetching products.");
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
  res.render("Customers/creditCustomers", {});
});
router.get("/paidCustomers", (req, res) => {
  res.render("Customers/paidCustomers", {});
});


// TRANSACTION LOGIC 


router.get("/cashReceivable", (req, res) => {
  Customer.find()
    .then((customers) => {
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
  const query = req.query.q;

  if (!query) return res.json([]);

  const regex = new RegExp(query, 'i'); // case-insensitive match

  Customer.find({
    $or: [
      { customer_name: regex },
      { mobile: regex },
      { email: regex }
    ]
  })
    .then(customers => res.json(customers))
    .catch(err => {
      console.error('Error searching customers:', err);
      res.status(500).json({ error: 'Internal server error' });
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

router.get("/api/searchProducts", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const regex = new RegExp(query, "i");
    const products = await Product.find({
      $or: [
        { product_name: regex },
        { product_code: regex },
        { category: regex }
      ]
    }).limit(10);

    res.json(products);
  } catch (err) {
    console.error("Product search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/addInvoice", (req, res) => {
  console.log(req.body);
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
