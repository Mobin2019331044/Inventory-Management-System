const express = require("express");
const cntrl = require("../controller/controller");
const router = express.Router();
const qr = require("../database/queries");

router.post("/by", (req, res) => {});

router.get("/dummy", async (req, res) => {
    res.render("damage_products.ejs");
});

router.get("/", (req, res) => {
    res.redirect("/login");
});

router.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

router.get("/dashboard", cntrl.expenses);

router.get("/product", cntrl.showP);

router.post("/addNewProduct", cntrl.addNewProduct);

router.post("/addEP", cntrl.addExistingProduct);

router.get("/changeProductsState", cntrl.changeState);

router.get("/cart", cntrl.showCart);

router.get("/invoice", cntrl.invoiceFun);

router.get("/users", (req, res) => {
    res.render("users.ejs");
});

router.get("/tem_dash", (req, res) => {
    res.render("tem_dash.ejs");
});

router.get("/orders", cntrl.showOrders);

router.post("/placeOrder", cntrl.placeOrder);

router.get("/search", cntrl.pSearch);

router.get("/changeStateFromCart", cntrl.changeStateFromCart);

router.get("/viewInvoice", cntrl.viewInvoince);

router.get("/duePayment", cntrl.duePayment);

router.post("/addNewPayment", cntrl.newPaid);

router.get("/damage", cntrl.damage);

router.post("/addP", async (req, res) => {});

router.post("/addIntoDamage", cntrl.addIntoDamage);

router.get("/supply-history", cntrl.proHis);

router.get("/customers",cntrl.customers)

router.get("/suppliers",cntrl.suppliers)

router.post("/addNewCustomer",cntrl.addCustomer)

router.get("/removeCustomer",cntrl.removeCustomer)

router.post("/addNewSupplier",cntrl.addsupplier)

router.get("/removeSupplier",cntrl.removeSuppliers)

router.post("/filterSupply", cntrl.filterSupply);

router.post("/filterOrder", cntrl.filterOrder);

router.post("/addCategory", cntrl.addIntoCategory)

router.get("/permanetDelete",cntrl.deleteProduct);

module.exports = router;
