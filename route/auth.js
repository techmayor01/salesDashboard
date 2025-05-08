const express = require("express");

const router = express.Router();

const Chart = require('chart.js/auto');

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
const TransferStock = require('../model/transferStock');
const Loan = require('../model/Loan');
const ReceivedStock = require('../model/ReceivedStock');
const Invoice = require('../model/Invoice');
const Expense = require('../model/Expense');




router.get("/dashboard", (req, res) => {
  // Check if the user is authenticated
  if (!req.user) {
    return res.redirect("/sign-in"); // Redirect to login if no user is logged in
  }

  User.findById(req.user._id)
  .populate("branch") // <-- This is necessary for both owner and staff
  .then(user => {
    if (!user) return res.redirect('/sign-in');

    if (user.role === 'owner') {
      Branch.findById(user.branch)
        .then(ownerBranch => {
          console.log(ownerBranch);
          
          Branch.find()
            .then(allBranches => {
              Supplier.find()
                .then(suppliers => {
                  Customer.find()
                    .then(customers => {
                      res.render("index", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        suppliers: suppliers,
                        customers: customers
                      });
                    })
                    .catch(err => {
                      console.error(err);
                      res.redirect('/error-404');
                    });
                })
            })
        })
        .catch(err => {
          console.error(err);
          res.redirect('/error-404');
        });
    } else {
      // For staff, send their branch details in ownerBranch
      res.render("index", {
        user: user,
        ownerBranch: { branch: user.branch }, // already populated
        branches: [] // or omit if not needed
      });
    }
  })
  .catch(err => {
    console.error(err);
    res.redirect('/error-404');
  });

});

// ADD SUPPLIERS LOGIC 
router.get("/addSupplier", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Suppliers/addSupplier", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Suppliers/addSupplier", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/manageSuppliers", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/sign-in");
  }

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      // OWNER ROLE
      if (user.role === "owner") {
        Branch.findById(user.branch)
          .then(ownerBranch => {
            Branch.find()
              .then(allBranches => {
                Supplier.find({})
                  .then(suppliers => {
                    res.render("Suppliers/manageSuppliers", {
                      user: user,
                      ownerBranch: { branch: ownerBranch },
                      branches: allBranches,
                      suppliers: suppliers
                    });
                  })
                  .catch(err => {
                    console.error("Error fetching suppliers:", err);
                    res.redirect("/error-404");
                  });
              })
              .catch(err => {
                console.error(err);
                res.redirect("/error-404");
              });
          })
          .catch(err => {
            console.error(err);
            res.redirect("/error-404");
          });

      // STAFF OR OTHER ROLES
      } else {
        Supplier.find({})
          .then(suppliers => {
            res.render("Suppliers/manageSuppliers", {
              user: user,
              ownerBranch: { branch: user.branch },
              suppliers: suppliers,
              branches: [] // optional, or omit
            });
          })
          .catch(err => {
            console.error("Error fetching suppliers:", err);
            res.redirect("/error-404");
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.redirect("/error-404");
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
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Categories/addCategories", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Categories/addCategories", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }

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
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Category.find()
                    .then(Category => {
                      res.render("Categories/manageCategories", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        Category
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Category.find()
         .then(Category => {
          res.render("Categories/manageCategories", {
            user: user,
            ownerBranch: { branch: user.branch },
            Category
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }

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
  if (!req.isAuthenticated()) {
    return res.redirect("/sign-in");
  }

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      // Restrict access to only 'owner' role
      if (user.role !== 'owner') {
        return res.redirect("/unauthorized"); // or use res.status(403).send("Unauthorized");
      }

      Branch.findById(user.branch)
        .then(ownerBranch => {
          Branch.find()
            .then(allBranches => {
              res.render("Warehouse/addBranch", {
                user: user,
                ownerBranch: { branch: ownerBranch },
                branches: allBranches
              });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        })
        .catch(err => {
          console.error(err);
          res.redirect('/error-404');
        });
    })
    .catch(err => {
      console.error(err);
      res.redirect("/error-404");
    });
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
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        Category.find()
          .then(categories => {
            // Owner or admin: show all branches
            if (user.role === 'owner' || user.role === 'admin') {
              Branch.findById(user.branch)
                .then(ownerBranch => {
                  Branch.find()
                    .populate({
                      path: 'stock',
                      populate: { path: 'category' }
                    })
                    .then(allBranches => {
                      res.render("Warehouse/manageBranch", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        Category: categories
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching all branches:", err);
                      res.redirect("/error-404");
                    });
                })
                .catch(err => {
                  console.error("Error fetching owner branch:", err);
                  res.redirect("/error-404");
                });
            } else {
              // Staff: show all branches too, but restrict edit/delete in view
              Branch.find()
                .populate({
                  path: 'stock',
                  populate: { path: 'category' }
                })
                .then(allBranches => {
                  res.render("Warehouse/manageBranch", {
                    user: user,
                    ownerBranch: { branch: user.branch },
                    branches: allBranches,
                    Category: categories
                  });
                })
                .catch(err => {
                  console.error("Error fetching branches for staff:", err);
                  res.redirect("/error-404");
                });
            }
          })
          .catch(err => {
            console.error("Error fetching categories:", err);
            res.redirect("/error-404");
          });
      })
      .catch(err => {
        console.error("Error fetching user:", err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
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

  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Branch.findById(req.params.id)
                       .populate({
                          path: 'stock',
                          populate: {
                            path: 'category' // populate branch inside supplierInvoice
                          }
                        })
                    .then(stock => {
                      res.render("Warehouse/viewBranch", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        stock
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
            Branch.findById(req.params.id)
             .populate({
                path: 'stock',
                populate: {
                  path: 'category' // populate branch inside supplierInvoice
                }
              })
         .then(stock => {
          res.render("Warehouse/viewBranch", {
            user: user,
            ownerBranch: { branch: user.branch },
            stock
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
  console.log(req.params);
})





// ADD INVOICE LOGIC 
router.get("/addSupplierInvoice", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Supplier.find()
                    .then(suppliers => {
                      res.render("SuppliersInvoice/addInvoice", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        suppliers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Supplier.find()
         .then(suppliers => {
          res.render("SuppliersInvoice/addInvoice", {
            user: user,
            ownerBranch: { branch: user.branch },
            suppliers
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.post('/addinvoiceSuppliers', (req, res) => {
  console.log(req.body);

  const {
    supplier,
    branch,
    invoice_type,
    amount,
    payment_date,
    reason
  } = req.body;

  const newInvoice = new SupplierInvoice({
    supplier,
    branch,
    invoice_type,
    amount,
    payment_date,
    reason
  });

  newInvoice.save()
    .then((savedInvoice) => {
      // Update supplier with invoice reference
      return Supplier.findByIdAndUpdate(
        supplier,
        { $push: { supplierInvoice: savedInvoice._id } }, // assuming array field
        { new: true }
      ).then(() => savedInvoice); // pass invoice to next step
    })
    .then((savedInvoice) => {
      // Update branch with invoice reference
      return Branch.findByIdAndUpdate(
        branch,
        { $push: { suppler_invoice: savedInvoice._id } },
        { new: true }
      );
    })
    .then((updatedBranch) => {
      console.log('Branch updated with supplier invoice ID:', updatedBranch);
      res.redirect('/SuppliersInvoice');
    })
    .catch((err) => {
      console.error('Error processing invoice:', err);
      res.status(500).send('Internal Server Error');
    });
});


// GET all supplier invoices
router.get('/SuppliersInvoice', (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  SupplierInvoice.find()
                    .populate('supplier branch')
                    .then(invoices => {
                      console.log(invoices);
                      
                      res.render("SuppliersInvoice/invoiceList", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        invoices
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          SupplierInvoice.find()
          .populate('supplier branch')
         .then(invoices => {
          res.render("SuppliersInvoice/invoiceList", {
            user: user,
            ownerBranch: { branch: user.branch },
            invoices
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }

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
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Supplier.find()
                    .then(suppliers => {
                      Category.find()
                      .then(categories =>{
                        res.render("Product/addProduct", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        suppliers,
                        categories
                      })
                     
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
           Supplier.find()
          .then(suppliers => {
            Category.find()
            .then(categories =>{
              res.render("Product/addProduct", {
              user: user,
              ownerBranch: { branch: user.branch },
              suppliers,
              categories
            })
           
            });
          })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});
  

router.post("/addProduct", upload.single("product_image"), (req, res) => {
  console.log(req.body);
  
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
    sellPrice
  } = req.body;

  const quantities = Array.isArray(quantity) ? quantity.map(Number) : [Number(quantity)];
  const unitCodes = Array.isArray(unitCode) ? unitCode : [unitCode];
  const lowStockAlerts = Array.isArray(lowStockAlert) ? lowStockAlert.map(Number) : [Number(lowStockAlert)];
  const sellPrices = Array.isArray(sellPrice) ? sellPrice.map(Number) : [Number(sellPrice)];

  const totalWorth = quantities[0] * Number(supplierPrice);

  // Build variant objects with corrected logic
  const variants = [];
  
  // The first variant (Cartons in this case) does not need totalInBaseUnit
  const firstVariant = {
    quantity: quantities[0],
    unitCode: unitCodes[0],
    lowStockAlert: lowStockAlerts[0],
    supplierPrice: Number(supplierPrice),
    sellPrice: sellPrices[0],
    totalWorth,
    totalPotentialRevenue: quantities[0] * sellPrices[0], // revenue based on the first variant
    actualRevenue: 0
  };
  
  variants.push(firstVariant);

  // Loop through the other selected units (e.g., rolls)
  for (let i = 1; i < quantities.length; i++) {
    const qty = quantities[i];
    const unitCode = unitCodes[i];
    const sellPriceValue = sellPrices[i];
    const baseUnitQuantity = quantities[0] * qty; // Calculate totalInBaseUnit as per the logic you mentioned

    const revenue = baseUnitQuantity * sellPriceValue;

    variants.push({
      quantity: baseUnitQuantity, // Total quantity in base unit
      unitCode,
      lowStockAlert: lowStockAlerts[i],
      sellPrice: sellPriceValue,
      totalInBaseUnit: qty,
      totalWorth: baseUnitQuantity * Number(supplierPrice),
      totalPotentialRevenue: revenue,
      actualRevenue: 0
    });
  }

  Product.findOneAndUpdate(
    { product, branch },
    {
      $set: {
        category,
        product_detail,
        mfgDate,
        expDate,
        product_image: req.file ? req.file.filename : null,
        variants
      }
    },
    { upsert: true, new: true }
  )
    .then((savedProduct) => {
      return Branch.findByIdAndUpdate(
        branch,
        { $addToSet: { stock: savedProduct._id } },
        { new: true }
      );
    })
    .then((updatedBranch) => {
      console.log("Branch updated with product:", updatedBranch);
      res.redirect("/addProduct");
    })
    .catch((err) => {
      console.error("Error saving or updating product:", err);
      res.status(500).send("Internal Server Error");
    });
});







router.get("/manageProduct", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/sign-in");

  const selectedBranchId = req.query.branchId;

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      // OWNER can select any branch
      if (user.role === 'owner') {
        Branch.find()
          .then(allBranches => {
            const branchToFilter = selectedBranchId || user.branch._id;

            Product.find({ branch: branchToFilter })
              .populate('category')
              .populate('branch')
              .populate('variants.supplier')
              .then(products => {
                res.render("Product/manageProduct", {
                  user,
                  ownerBranch: { branch: user.branch },
                  branches: allBranches,
                  selectedBranchId: branchToFilter,
                  products
                });
              });
          });
      } else {
        // ADMIN or STAFF: only their own branch
        Product.find({ branch: user.branch._id })
          .populate('category')
          .populate('branch')
          .populate('variants.supplier')
          .then(products => {
            res.render("Product/manageProduct", {
              user,
              ownerBranch: { branch: user.branch },
              branches: [user.branch],
              selectedBranchId: user.branch._id,
              products
            });
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.redirect("/error-404");
    });
});


router.get("/stockTransfer", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/sign-in");

  const selectedBranchId = req.query.branchId;

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      // OWNER: Can choose any branch
      if (user.role === 'owner') {
        Branch.findById(user.branch)
          .then(ownerBranch => {
            Branch.find()
              .then(allBranches => {
                const branchToFilter = selectedBranchId || ownerBranch._id;

                Product.find({ branch: branchToFilter })
                  .populate('variants.supplier')
                  .populate('branch')
                  .then(products => {
                    res.render("Product/stockTransfer", {
                      user,
                      ownerBranch: { branch: ownerBranch },
                      branches: allBranches,
                      selectedBranchId: branchToFilter,
                      products
                    });
                  })
                  .catch(productErr => {
                    console.error(productErr);
                    res.status(500).send("Error fetching products.");
                  });
              })
              .catch(branchErr => {
                console.error(branchErr);
                res.status(500).send("Error fetching branches.");
              });
          })
          .catch(err => {
            console.error(err);
            res.status(500).send("Error fetching owner branch.");
          });
      } else {
        // ADMIN or STAFF: only their own branch
        Product.find({ branch: user.branch._id })
          .populate('variants.supplier')
          .populate('branch')
          .then(products => {
            Branch.find()
              .then(allBranches => {
                res.render("Product/stockTransfer", {
                  user,
                  ownerBranch: { branch: user.branch },
                  branches: allBranches,
                  selectedBranchId: user.branch._id,
                  products
                });
              })
              .catch(branchErr => {
                console.error(branchErr);
                res.status(500).send("Error fetching branches.");
              });
         
          })
         
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error finding user.");
    });
});




router.get("/adjustStock", (req,res)=>{
  
  if (!req.isAuthenticated()) return res.redirect("/sign-in");

  const selectedBranchId = req.query.branchId;

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      // OWNER can select any branch
      if (user.role === 'owner') {
        Branch.find()
          .then(allBranches => {
            const branchToFilter = selectedBranchId || user.branch._id;

            Product.find({ branch: branchToFilter })
              .populate('category')
              .populate('branch')
              .populate('variants.supplier')
              .then(products => {
                res.render("Product/stockAdjust", {
                  user,
                  ownerBranch: { branch: user.branch },
                  branches: allBranches,
                  selectedBranchId: branchToFilter,
                  products
                });
              });
          });
      } else {
        // ADMIN or STAFF: only their own branch
        Product.find({ branch: user.branch._id })
          .populate('category')
          .populate('branch')
          .populate('variants.supplier')
          .then(products => {
            res.render("Product/stockAdjust", {
              user,
              ownerBranch: { branch: user.branch },
              branches: [user.branch],
              selectedBranchId: user.branch._id,
              products
            });
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.redirect("/error-404");
    });
})

router.post("/editStock", (req, res) => {
  console.log(req.body);
  
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


// POST request to handle stock transfer
// router.post('/stockTransfer', (req, res) => {
//   console.log(req.body);
  
// });


router.post('/stockTransfer', (req, res) => {
  const { from_branch, to_branch, productId, unitCode, quantity, note } = req.body;

  // Normalize to arrays
  const unitCodes = Array.isArray(unitCode) ? unitCode : [unitCode];
  const quantities = Array.isArray(quantity) ? quantity : [quantity];

  Product.findById(productId)
    .then(sourceProduct => {
      if (!sourceProduct) {
        return res.status(404).send("Source product not found.");
      }

      Product.findOne({ product: sourceProduct.product, branch: to_branch })
        .then(destProduct => {
          if (destProduct) {
            // Product exists in destination branch — update variants
            unitCodes.forEach((code, i) => {
              const qty = parseInt(quantities[i]);
              const existingVariant = destProduct.variants.find(v => v.unitCode === code);
              if (existingVariant) {
                existingVariant.quantity += qty;
              } else {
                const sourceVariant = sourceProduct.variants.find(v => v.unitCode === code);
                if (sourceVariant) {
                  destProduct.variants.push({
                    unitCode: code,
                    quantity: qty,
                    lowStockAlert: sourceVariant.lowStockAlert,
                    supplierPrice: sourceVariant.supplierPrice,
                    sellPrice: sourceVariant.sellPrice,
                    supplier: sourceVariant.supplier
                  });
                }
              }
            });

            destProduct.save()
              .then(updated => {
                updateSourceProduct();
              })
              .catch(err => {
                console.error("Error updating destination product:", err);
                res.status(500).send("Failed to update destination product.");
              });

          } else {
            // Product does not exist in destination — create it
            const selectedVariants = [];

            unitCodes.forEach((code, i) => {
              const qty = parseInt(quantities[i]);
              const sourceVariant = sourceProduct.variants.find(v => v.unitCode === code);
              if (sourceVariant) {
                selectedVariants.push({
                  unitCode: code,
                  quantity: qty,
                  lowStockAlert: sourceVariant.lowStockAlert,
                  supplierPrice: sourceVariant.supplierPrice,
                  sellPrice: sourceVariant.sellPrice,
                  supplier: sourceVariant.supplier
                });
              }
            });

            const newProduct = new Product({
              product: sourceProduct.product,
              category: sourceProduct.category,
              branch: to_branch,
              product_detail: sourceProduct.product_detail,
              mfgDate: sourceProduct.mfgDate,
              expDate: sourceProduct.expDate,
              product_image: sourceProduct.product_image,
              variants: selectedVariants
            });

            newProduct.save()
              .then(savedProduct => {
                Branch.findByIdAndUpdate(to_branch, { $push: { stock: savedProduct._id } })
                  .then(() => {
                    updateSourceProduct();
                  })
                  .catch(err => {
                    console.error("Failed to update destination branch stock:", err);
                    res.status(500).send("Destination branch update failed.");
                  });
              })
              .catch(err => {
                console.error("Failed to create new product in destination:", err);
                res.status(500).send("Destination product creation failed.");
              });
          }

          // Function to deduct from source product and log the transfer
          function updateSourceProduct() {
            unitCodes.forEach((code, i) => {
              const qty = parseInt(quantities[i]);
              const sourceVariant = sourceProduct.variants.find(v => v.unitCode === code);
              if (sourceVariant) {
                sourceVariant.quantity -= qty;
              }
            });

            sourceProduct.save()
              .then(() => {
                // ✅ Build transfer stock array
                const transferStockItems = [];

                for (let i = 0; i < unitCodes.length; i++) {
                  const code = unitCodes[i];
                  const qty = parseInt(quantities[i]);
                  const variant = sourceProduct.variants.find(v => v.unitCode === code);

                  transferStockItems.push({
                    productId: productId,
                    product: sourceProduct.product,
                    unitCode: code,
                    quantity: qty,
                    supplierPrice: variant?.supplierPrice || 0,
                    sellPrice: variant?.sellPrice || 0,
                    worth: qty * (variant?.supplierPrice || 0),
                    mfgDate: sourceProduct.mfgDate,
                    expDate: sourceProduct.expDate
                  });
                }

                // ✅ Save transfer record
                const transferRecord = new TransferStock({
                  transaction_number: `TX-${Date.now()}`,
                  from_branch,
                  to_branch,
                  transfer_date: new Date(),
                  note: note || '',
                  stock: transferStockItems
                });

                transferRecord.save()
                  .then(() => {
                    res.redirect('/stockTransfer');
                  })
                  .catch(err => {
                    console.error("Error saving transfer record:", err);
                    res.status(500).send("Transfer log save failed.");
                  });

              })
              .catch(err => {
                console.error("Failed to update source product quantities:", err);
                res.status(500).send("Source product update failed.");
              });
          }

        })
        .catch(err => {
          console.error("Error checking destination product:", err);
          res.status(500).send("Internal error checking destination.");
        });
    })
    .catch(err => {
      console.error("Error finding source product:", err);
      res.status(500).send("Failed to retrieve source product.");
    });
});













// EXPIRED PRODUCT LOGIC 
router.get("/expiredProducts", (req, res) => {
    const currentDate = new Date();

    if (req.isAuthenticated()) {
      User.findById(req.user._id)
        .populate("branch")
        .then(user => {
          if (!user) return res.redirect("/sign-in");
  
          if (user.role === 'owner') {
            Branch.findById(user.branch)
              .then(ownerBranch => {
                Branch.find()
                  .then(allBranches => {
                    Product.find({ expDate: { $lt: currentDate } })
                      .then(expiredProducts => {
                        res.render("ExpiredProducts/expiredProducts", {
                          user: user,
                          ownerBranch: { branch: ownerBranch },
                          branches: allBranches,
                          expiredProducts
                        });
                      })
                      .catch(err => {
                        console.error("Error fetching categories:", err);
                        res.redirect("/error-404");
                      });
                  })
              })
              .catch(err => {
                console.error(err);
                res.redirect('/error-404');
              });
          } else {
           Product.find({ expDate: { $lt: currentDate } })
           .then(expiredProducts => {
            res.render("ExpiredProducts/expiredProducts", {
              user: user,
              ownerBranch: { branch: user.branch },
              expiredProducts
            });
          })
          }
        })
        .catch(err => {
          console.error(err);
          res.redirect("/error-404");
        });
    } else {
      res.redirect("/sign-in");
    }
});

// DEAD PRODUCT LOGIC 
router.get("/DeadStockProducts", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        const currentDate = new Date();
        const cutoffDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
        
        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                     Product.find({created_at: { $lt: cutoffDate },"variants.quantity": { $gt: 0 }})
                    .then(deadStockProducts  => {
                      res.render("DeadStockProducts/deadStockProducts", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        deadStockProducts 
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          Product.find({created_at: { $lt: cutoffDate },"variants.quantity": { $gt: 0 }})
         .then(deadStockProducts => {
          res.render("DeadStockProducts/deadStockProducts", {
            user: user,
            ownerBranch: { branch: user.branch },
            deadStockProducts
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


// ADD CUSTOMER LOGIC 
router.get("/addCustomers", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Customers/addCustomers", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Customers/addCustomers", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/manageCustomers", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Customer.find()
                    .then(customers => {
                      res.render("Customers/manageCustomers", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        customers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Customer.find()
         .then(customers => {
          res.render("Customers/manageCustomers", {
            user: user,
            ownerBranch: { branch: user.branch },
            customers
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/delete/customer/:id", (req,res)=>{
  Customer.findByIdAndDelete(req.params.id)
  .then(user =>{
      res.redirect("/manageCustomers")
      console.log('customer successfully deleted');
      
  })
  .catch(err => console.log(err))
  
})



router.post("/addCustomers", (req, res) => {
  const { customer_name, mobile, email, address, credit_limit } = req.body;

  if (!req.isAuthenticated()) {
    return res.redirect('/sign-in');
  }

  User.findById(req.user._id)
    .then(user => {
      if (!user) return res.redirect('/sign-in');

      const newCustomer = new Customer({
        customer_name,
        mobile,
        email,
        address,
        credit_limit,
        branch: user.branch  // save branch to customer
      });

      return newCustomer.save()
        .then(savedCustomer => {
          return Branch.findByIdAndUpdate(
            user.branch,
            { $push: { customers: savedCustomer._id } },
            { new: true }
          ).then(() => savedCustomer);
        });
    })
    .then(savedCustomer => {
      console.log("Customer saved and added to branch:", savedCustomer);
      res.redirect('/manageCustomers');
    })
    .catch(err => {
      console.error("Error adding customer:", err);
      res.status(500).send("Internal Server Error");
    });
});


router.get("/creditCustomers", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Customer.find()
                    .then(customers => {
                      const creditCustomers = customers.filter(customer => 
                      customer.transactions.some(transaction => transaction.remaining_amount > 0));
                      res.render("Customers/creditCustomers", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        customers: creditCustomers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Customer.find()
         .then(customers => {
           const creditCustomers = customers.filter(customer => 
           customer.transactions.some(transaction => transaction.remaining_amount > 0));
          res.render("Customers/creditCustomers", {
            user: user,
            ownerBranch: { branch: user.branch },
            customers: creditCustomers
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/paidCustomers", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Customer.find()
                    .then(customers => {
                            const paidCustomers = customers.filter(customer => 
                              customer.transactions.length > 0 &&
                              customer.transactions.every(transaction => transaction.remaining_amount <= 0)
                            );
                      res.render("Customers/paidCustomers", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        customers: paidCustomers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Customer.find()
         .then(customers => {
            const paidCustomers = customers.filter(customer => 
              customer.transactions.length > 0 &&
              customer.transactions.every(transaction => transaction.remaining_amount <= 0)
            );
          res.render("Customers/paidCustomers", {
            user: user,
            ownerBranch: { branch: user.branch },
            customers: paidCustomers
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});



// TRANSACTION LOGIC 


router.get("/cashReceivable", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        const branchId = user.branch._id || user.branch;

        if (user.role === 'owner') {
          Branch.findById(branchId)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Customer.find({ branch: branchId })  // 🔥 Filter by branch here
                    .then(customers => {
                      console.log("Customers:", customers);
                      
                      res.render("Transaction/cashReceivable", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        customers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching customers:", err);
                      res.redirect("/error-404");
                    });
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          Customer.find({ branch: branchId })  // 🔥 Filter for normal users too
            .then(customers => {
              res.render("Transaction/cashReceivable", {
                user: user,
                ownerBranch: { branch: user.branch },
                customers
              });
            });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

   
router.get("/transactionHistory", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        const branchId = user.branch._id || user.branch;

        if (user.role === 'owner') {
          Branch.findById(branchId)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Customer.find({ branch: branchId })  // 🔥 Filter by branch here
                    .then(customers => {
                      console.log("Customers:", customers);
                      
                      res.render("Transaction/transactionHistory", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        customers
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching customers:", err);
                      res.redirect("/error-404");
                    });
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          Customer.find({ branch: branchId })  // 🔥 Filter for normal users too
            .then(customers => {
              res.render("Transaction/transactionHistory", {
                user: user,
                ownerBranch: { branch: user.branch },
                customers
              });
            });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
 
});



// ADD CUSTOMER INVOICE LOGIC 
router.get("/addInvoice", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        const branchId = user.branch._id || user.branch;

        if (user.role === 'owner') {
          Branch.findById(branchId)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  // Fetch customers for the branch
                  Customer.find({ branch: branchId }).sort({ createdAt: -1 })
                    .then(customers => {
                      // Fetch products for the branch
                      Product.find({ branch: branchId }).sort({ createdAt: -1 })
                        .then(products => {
                          res.render("Invoice/addInvoice", {
                            user: user,
                            ownerBranch: { branch: ownerBranch },
                            branches: allBranches,
                            customers: customers,
                            products: products
                          });
                        })
                        .catch(err => {
                          console.error("Error fetching products:", err);
                          res.redirect("/error-404");
                        });
                    })
                    .catch(err => {
                      console.error("Error fetching customers:", err);
                      res.redirect("/error-404");
                    });
                })
                .catch(err => {
                  console.error("Error fetching branches:", err);
                  res.redirect("/error-404");
                });
            })
            .catch(err => {
              console.error("Error fetching owner branch:", err);
              res.redirect("/error-404");
            });
        } else {
          // For non-owner users, fetch customers and products for their branch
          Customer.find({ branch: branchId }).sort({ createdAt: -1 })
            .then(customers => {
              Product.find({ branch: branchId }).sort({ createdAt: -1 })
                .then(products => {
                  res.render("Invoice/addInvoice", {
                    user: user,
                    ownerBranch: { branch: user.branch },
                    customers: customers,
                    products: products
                  });
                })
                .catch(err => {
                  console.error("Error fetching products:", err);
                  res.redirect("/error-404");
                });
            })
            .catch(err => {
              console.error("Error fetching customers:", err);
              res.redirect("/error-404");
            });
        }
      })
      .catch(err => {
        console.error("Error fetching user:", err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.post("/addInvoice", (req, res) => {
  const {
    customer_id,
    customer_name,
    createdAt,
    product,
    qty,
    unitcode,
    rate,
    total,
    paid_amount,
    payment_type
  } = req.body;

  const soldQty = Number(qty);
  const paid = Number(paid_amount);
  const saleTotal = Number(total);
  const remaining = saleTotal - paid;

  const invoice_no = `INV-${Date.now()}`;
  const branchId = req.user.branch;

  Product.findOne({ product })
    .then(productDoc => {
      if (!productDoc) {
        res.status(404).json({ message: 'Product not found' });
        return Promise.reject();
      }

      const newInvoice = new Invoice({
        invoice_no, 
        customer_id,
        customer_name,
        createdAt,
        product: productDoc._id,
        qty: soldQty,
        unitcode,
        rate,
        total: saleTotal,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_type,
        branch: branchId // save user's branch
      });

      return newInvoice.save().then(() => productDoc);
    })
    .then(productDoc => {
      const variants = productDoc.variants;
      const sellingVariant = variants.find(v => v.unitCode === unitcode);
      const baseVariant = variants[0];

      if (!sellingVariant || !baseVariant) {
        res.status(404).json({ message: 'Unit variant not found' });
        return Promise.reject();
      }

      let conversionFactor = 1;
      let qtyToDeductFromBase;

      if (unitcode === baseVariant.unitCode) {
        qtyToDeductFromBase = soldQty;
      } else {
        const subQty = sellingVariant.quantity;
        const baseQty = baseVariant.quantity;

        if (baseQty === 0) {
          res.status(400).json({ message: 'Cannot calculate conversion — base stock is 0' });
          return Promise.reject();
        }

        conversionFactor = subQty / baseQty;
        qtyToDeductFromBase = soldQty / conversionFactor;
      }

      if (unitcode !== baseVariant.unitCode && baseVariant.quantity < qtyToDeductFromBase) {
        res.status(400).json({ message: 'Insufficient stock in base unit' });
        return Promise.reject();
      }

      if (sellingVariant.quantity < soldQty) {
        res.status(400).json({ message: 'Insufficient stock in selected unit' });
        return Promise.reject();
      }

      // Deduct stock
      sellingVariant.quantity -= soldQty;
      if (unitcode !== baseVariant.unitCode) {
        baseVariant.quantity -= qtyToDeductFromBase;
      }

      // Update revenue
      baseVariant.actualRevenue += paid;

      return productDoc.save();
    })
    .then(() => Customer.findById(customer_id))
    .then(customer => {
      if (!customer) {
        res.status(404).json({ message: 'Customer not found' });
        return Promise.reject();
      }

      customer.transactions.push({
        product,
        qty: soldQty,
        unit_code: unitcode,
        rate: Number(rate),
        total: saleTotal,
        paid_amount: paid,
        remaining_amount: remaining
      });

      return customer.save();
    })
    .then(() => {
      res.status(200).json({ message: 'Sale recorded successfully' });
    })
    .catch(err => {
      console.error('Sales error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
});



router.get("/Invoice/manageInvoice", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Invoice.find()
                    .populate('customer_id product')
                    .then(invoices => {
                      console.log(invoices);
                      res.render("Invoice/manageInvoice", {
                        
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        invoices
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Invoice.find()
         .then(invoices => {
          res.render("Invoice/manageInvoice", {
            user: user,
            ownerBranch: { branch: user.branch },
            invoices
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
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




// RECEIVED PRODUCT ROUTE LOGIC 
router.get("/addReceiveStock", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/sign-in");

  User.findById(req.user._id)
    .populate("branch")
    .then(user => {
      if (!user) return res.redirect("/sign-in");

      if (user.role === 'owner') {
        Branch.findById(user.branch)
          .then(ownerBranch => {
            Branch.find()
              .then(allBranches => {
                Supplier.find()
                  .populate('supplierInvoice') // If this field exists
                  .then(suppliers => {
                    res.render("ReceivedStock/receiveStock", {
                      user,
                      ownerBranch: { branch: ownerBranch },
                      branches: allBranches,
                      suppliers
                    });
                  })
                  .catch(err => {
                    console.error("Error fetching suppliers:", err);
                    res.redirect("/error-404");
                  });
              });
          })
          .catch(err => {
            console.error(err);
            res.redirect('/error-404');
          });

      } else {
        Supplier.find({ branch: user.branch._id })
          .populate('supplierInvoice') // If needed
          .then(suppliers => {
            res.render("ReceivedStock/receiveStock", {
              user,
              ownerBranch: { branch: user.branch },
              branches: [user.branch],
              suppliers
            });
          })
          .catch(err => {
            console.error("Error fetching suppliers:", err);
            res.redirect("/error-404");
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.redirect("/error-404");
    });
});


router.get("/received-stock", (req, res)=>{
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  ReceivedStock.find()
                  .populate('supplier branch')
                    .then(stock => {
                      res.render("ReceivedStock/received-stock", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        stock
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         ReceivedStock.find()
         .populate('supplier branch')
         .then(stock => {
          res.render("ReceivedStock/received-stock", {
            user: user,
            ownerBranch: { branch: user.branch },
            stock
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
})

router.post('/addReceiveStock', (req, res) => {
  const {
    supplier,
    branch,
    payment_date,
    item_name,      // Product name (for reference / display)
    product_id,     // Product ID (for database update)
    unitCode,
    item_qty,
    item_rate,      // Item rate as a string
    paid_amount,
    payment_status,
  } = req.body;

  // Parse item_rate to ensure it's a valid number
  const itemRate = parseFloat(item_rate);  // Convert item_rate to number
  if (isNaN(itemRate)) {
    console.log('Invalid item rate:', item_rate);
    return res.status(400).send('Invalid item rate');
  }

  const total_amount = item_qty * itemRate;
  const due_amount = total_amount - paid_amount;

  const newReceivedStock = new ReceivedStock({
    supplier,
    branch,
    payment_date,
    item_name,     // Saved as-is for human reference
    unitCode,
    item_qty,
    item_rate: itemRate,  // Ensure the rate is stored as a number
    paid_amount,
    total_amount,
    due_amount,
    payment_status,
  });

  newReceivedStock.save()
    .then((savedStock) => {
      return Product.findById(product_id);
    })
    .then((product) => {
      if (!product) {
        throw new Error('Product not found.');
      }

      // Check for existing unitCode in variants
      const existingVariant = product.variants.find(v => v.unitCode === unitCode);

      // Log before modifying the variant
      console.log('Product before update:', product);

      if (existingVariant) {
        existingVariant.quantity += Number(item_qty);
        existingVariant.supplierPrice = itemRate;
      } else {
        // Check for placeholder variant to replace
        if (
          product.variants.length === 1 &&
          product.variants[0].unitCode === "" &&
          product.variants[0].quantity === 0
        ) {
          product.variants[0] = {
            quantity: Number(item_qty),
            unitCode,
            lowStockAlert: 0,
            supplierPrice: itemRate,
            sellPrice: 0,
            supplier,
          };
        } else {
          product.variants.push({
            quantity: Number(item_qty),
            unitCode,
            lowStockAlert: 0,
            supplierPrice: itemRate,
            sellPrice: 0,
            supplier,
          });
        }
      }

      console.log('Updated product variants:', product.variants);

      return product.save();
    })
    .then(() => {
      res.redirect('/success');
    })
    .catch((err) => {
      console.error('Error processing received stock:', err);
      res.status(500).send('Internal Server Error while updating stock.');
    });
});


router.get("/deleteReceivedStock/:id", (req,res)=>{
  ReceivedStock.findByIdAndDelete(req.params.id)
  .then(user =>{
      res.redirect("/received-stock")
      console.log('stock successfully deleted');
      
  })
  .catch(err => console.log(err))
  console.log(req.params);
  
})

router.use(require("../route/query"))

// ENDS HERE 



// EXPENSES LOGIC 
router.get("/Expenses/addExpenses", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Expenses/addExpenses", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Expenses/addExpenses", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.post("/addExpenses", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { title, amount, category, date, note } = req.body;

  User.findById(req.user._id)
    .then(user => {
      if (!user) throw new Error("User not found");

      const expense = new Expense({
        title,
        amount,
        category,
        date: date || new Date(),
        note,
        branch: user.branch, 
        created_by: user._id
      });

      return expense.save();
    })
    .then(savedExpense => {
      res.redirect("/Expenses/manageExpenses");
    })
    .catch(err => {
      console.error("Error saving expense:", err);
      res.status(500).json({ message: "Internal server error" });
    });
});


router.get("/Expenses/addExpensesInvoice", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Expenses/addExpensesInvoice", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Expenses/addExpensesInvoice", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/Expenses/manageExpenses", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Expense.find()
                    .then(expenses => {
                      res.render("Expenses/manageExpenses", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        expenses
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Expense.find()
         .then(expenses => {
          res.render("Expenses/manageExpenses", {
            user: user,
            ownerBranch: { branch: user.branch },
            expenses
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/Expenses/manageExpensesInvoice", (req, res) => {
  res.render("Expenses/manageExpensesInvoice", {});
});
router.get("/Expenses/paidExpenses", (req, res) => {
  res.render("Expenses/paidExpenses", {});
});
router.get("/Expenses/unpaidExpenses", (req, res) => {
  res.render("Expenses/unpaidExpenses", {});
});





















// LOAN LOGIC 
router.get("/addLoaner", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("loan/addLoaner", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("loan/addLoaner", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/manageLoaner", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Loan.find()
                    .then(loaners => {
                      res.render("loan/manageLoaner", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        loaners
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Loan.find()
         .then(loaners => {
          res.render("loan/manageLoaner", {
            user: user,
            ownerBranch: { branch: user.branch },
            loaners
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
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
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Loan.find({}, 'loaner _id')
                    .then(loaners => {
                      res.render("loan/addLoan", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        loaners
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Loan.find({}, 'loaner _id')
         .then(loaners => {
          res.render("loan/addLoan", {
            user: user,
            ownerBranch: { branch: user.branch },
            loaners
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/manageLoan", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  Loan.find()
                    .then(loans => {
                      res.render("loan/manageLoan", {
                        user: user,
                        ownerBranch: { branch: ownerBranch },
                        branches: allBranches,
                        loans
                      });
                    })
                    .catch(err => {
                      console.error("Error fetching categories:", err);
                      res.redirect("/error-404");
                    });
                })
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
         Loan.find()
         .then(loans => {
          res.render("loan/manageLoan", {
            user: user,
            ownerBranch: { branch: user.branch },
            loans
          });
        })
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
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





// REPORT PAGE 
router.get("/Report/profit_loss", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/profit_loss", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/profit_loss", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/Report/salesLedger", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/salesLedger", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/salesLedger", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/purchase-report", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/purchaseReport", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/purchaseReport", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/stock-report", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/stockreport", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/stockreport", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/creditors-report", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/creditorsReport", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/creditorsReport", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/debitor-report", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/debitorReport", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/debitorReport", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.get("/stocktransfer-report", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Report/stocktransfer", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Report/stocktransfer", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});









// STAFF LOGIC 
router.get("/addStaffs", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("staffs/addStaffs", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("staffs/addStaffs", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});

router.post("/addStaffs", (req, res) => {
  console.log(req.body);
});

router.get("/staffs/manageStaffs", (req, res) => {
  res.render("staffs/manageStaffs", {});
});



// SETTING LOGIC 
router.get("/Settings/companyInfo", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user._id)
      .populate("branch")
      .then(user => {
        if (!user) return res.redirect("/sign-in");

        if (user.role === 'owner') {
          Branch.findById(user.branch)
            .then(ownerBranch => {
              Branch.find()
                .then(allBranches => {
                  res.render("Settings/companyInfo", {
                    user: user,
                    ownerBranch: { branch: ownerBranch },
                    branches: allBranches
                  });
                })
                .catch(err => {
                  console.error(err);
                  res.redirect('/error-404');
                });
            })
            .catch(err => {
              console.error(err);
              res.redirect('/error-404');
            });
        } else {
          res.render("Settings/companyInfo", {
            user: user,
            ownerBranch: { branch: user.branch }
          });
        }
      })
      .catch(err => {
        console.error(err);
        res.redirect("/error-404");
      });
  } else {
    res.redirect("/sign-in");
  }
});


router.get("/Settings/signOut", (req, res) => {
  res.render("Settings/SignOut", {});
});



router.get("/error-404", (req, res) => {
  res.render("error-404", { user: req.user });
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.redirect('/error');
    }
    res.redirect('/sign-in');
  });
});


// USER SIGN-UP LOGIC 
router.get("/", (req, res) => {
  res.render("Auth/login");
});


router.get("/sign-in", (req,res)=>{
  res.render("Auth/login")
})
router.get("/register", (req,res)=>{
  res.render("Auth/register")
})




router.post("/register", (req, res) => {
  const { username, password, role, branch_name } = req.body;

  User.findOne({ username: username })
    .then(existingUser => {
      if (existingUser) {
        return res.render("auth/auth-login", {
          error: "Username already exists. Please login.",
          existingUser
        });
      }

      // Hash the password
      bcrypt.hash(password, saltRounds)
        .then(hashedPassword => {
          // Create user (without branch ref yet)
          const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'staff'
          });

          newUser.save()
            .then(savedUser => {
              // Create branch and reference the user
              const newBranch = new Branch({
                branch_name,
                createdBy: savedUser._id
              });

              newBranch.save()
                .then(savedBranch => {
                  // Link branch back to user
                  savedUser.branch = savedBranch._id;
                  savedUser.save()
                    .then(() => res.redirect("/sign-in"))
                    .catch(err => {
                      console.error("Error saving user with branch ref:", err);
                      res.redirect("/error-404");
                    });
                })
                .catch(err => {
                  console.error("Error creating branch:", err);
                  res.redirect("/error-404");
                });
            })
            .catch(err => {
              console.error("Error saving user:", err);
              res.redirect("/error-404");
            });
        })
        .catch(err => {
          console.error("Error hashing password:", err);
          res.redirect("/error-404");
        });
    })
    .catch(err => {
      console.error("Error checking existing user:", err);
      res.redirect("/error-404");
    });
});

router.post("/sign-in", passport.authenticate('local', {
    successRedirect: "/dashboard",
    failureRedirect: "/sign-in"
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
