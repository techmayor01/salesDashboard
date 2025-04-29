require("dotenv").config();

const express = require("express");
const app = express();

// SETTING UP STATIC FOLDER AND VIEW ENGINE 
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

const mongoose = require("mongoose");
const mongodb = require("mongodb");


mongoose
  .connect(process.env.DB)
  .then((done) => {
    let port = process.env.PORT || 3001;
    if(port == null || port == ""){
      port = 3001
    }
    app.listen(port, () => console.log(`Server running on Port ${port}`));
    console.log("Db connected");
  })
.catch((err) => console.log(err));





















app.get("/", (req, res) => {
  res.render("index");
});

app.get("/Suppliers/addSupplier", (req, res) => {
  res.render("Suppliers/addSupplier", {});
});

// app.get("/Suppliers/manageSuppliers", (req, res) => {
//   res.render("Suppliers/manageSuppliers", {});
// });









    
     app.get("/DeadStockProducts/deadStockProducts", (req, res) => {
       res.render("DeadStockProducts/deadStockProducts", {});
     });


         

        
             app.get("/Invoice/manageInvoice", (req, res) => {
               res.render("Invoice/manageInvoice", {});
             });
             app.get("/Invoice/paidInvoice", (req, res) => {
               res.render("Invoice/paidInvoice", {});
             });
              app.get("/Invoice/unpaidInvoice", (req, res) => {
                res.render("Invoice/unpaidInvoice", {});
              });

            // Expenses  
            app.get("/Expenses/addExpenses", (req, res) => {
              res.render("Expenses/addExpenses", {});
            });
            app.get("/Expenses/manageExpenses", (req, res) => {
              res.render("Expenses/manageExpenses", {});
            });
            app.get("/Expenses/addExpensesInvoice", (req, res) => {
              res.render("Expenses/addExpensesInvoice", {});
            });
            app.get("/Expenses/manageExpensesInvoice", (req, res) => {
              res.render("Expenses/manageExpensesInvoice", {});
            });
            app.get("/Expenses/paidExpenses", (req, res) => {
              res.render("Expenses/paidExpenses", {});
            });
            app.get("/Expenses/unpaidExpenses", (req, res) => {
              res.render("Expenses/unpaidExpenses", {});
            });
            app.get("/loan/addLoaner", (req, res) => {
              res.render("loan/addLoaner", {});
            });
            app.get("/loan/manageLoaner", (req, res) => {
              res.render("loan/manageLoaner", {});
            });
            app.get("/loan/addLoan", (req, res) => {
              res.render("loan/addLoan", {});
            });
            app.get("/loan/manageLoan", (req, res) => {
              res.render("loan/manageLoan", {});
            });

             app.get("/staffs/addStaffs", (req, res) => {
               res.render("staffs/addStaffs", {});
             });

                app.get("/staffs/manageStaffs", (req, res) => {
                    res.render("staffs/manageStaffs", {});
                    }
                    );
                     app.get("/Report/profit_loss", (req, res) => {
                       res.render("Report/profit_loss", {});
                     });
                        app.get("/Report/salesLedger", (req, res) => {
                          res.render("Report/salesLedger", {});
                        });
                        app.get("/Report/expenseLedger", (req, res) => {
                          res.render("Report/expenseLedger", {});
                        });

                         app.get("/Settings/companyInfo", (req, res) => {
                           res.render("Settings/companyInfo", {});
                         });

                         
                         app.get("/Settings/signOut", (req, res) => {
                           res.render("Settings/SignOut", {});
                         });

// app.post("/addSupplier", (req, res) => {
//   console.log(req.body);
// });
// app.post("/addCategories", (req, res) => {
//   console.log(req.body);
// });

// app.post("/addWarehouse", (req, res) => {
//   console.log(req.body);
// });


// app.post("/addProduct", (req, res) => {
//   console.log(req.body);
// });
app.post("/addProductCsv", (req, res) => {
  console.log(req.body);
});
app.post("/addExpenses", (req, res) => {
  console.log(req.body);
});

app.post("/addExpensesInvoice", (req, res) => {
  console.log(req.body);
});
app.post("/addLoaner", (req, res) => {
  console.log(req.body);
});
app.post("/addLoan", (req, res) => {
  console.log(req.body);
});
app.post("/addStaffs", (req, res) => {
  console.log(req.body);
});




app.use(require("./route/auth"));
