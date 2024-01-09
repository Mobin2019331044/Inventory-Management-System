const { parse } = require("dotenv");
const qr = require("../database/queries");
const ser = require("../service/service");

const addNewProduct = async (req, res) => {
    const randomNumber = parseInt(Math.floor(Math.random() * 10));
    const dateStr = String(Date.now());
    const pref = dateStr.substring(7);
    const pCode = `${pref}${randomNumber}`;
    const body = req.body;

    body.entry_date = await ser.dateTime();
    body.product_code = pCode;

    let t_price = parseFloat(body.price * body.amount).toFixed(2);

    await qr.addedProduct(body);
    await qr.addIntoProducts(body);
    await qr.manageSupplyExpenses(t_price);

    console.log(body);
    res.redirect("/product");
};

const addExistingProduct = async (req, res) => {
    let body = req.body;

    body.entry_date = await ser.dateTime();

    let t_price = parseFloat(body.price * body.amount).toFixed(2);
    console.log("body.p_code " , body.product_code);
    const tem = await qr.find_supplier(body.product_code);
    const sup = tem[0].supplier;
    body.supplier=sup;
    // return res.send(tem);

    await qr.addedProduct(body);
    await qr.updateProductAmount(body);
    await qr.manageSupplyExpenses(t_price);
    console.log(body);
    res.redirect("/product");
};

const showP = async (req, res) => {
    await ser.checkExpired();
    let items;
    const cats = await qr.showCategory();
    // return res.send(cats);
    items = await qr.showProducts();
    const suppliers = await qr.showSuppliers();
    const sup= await qr.showSuppliersOriginal();
    return res.render("product.ejs", { items, suppliers, sup,cats });
};

const changeState = async (req, res) => {
    const receivedSerializedData = req.query.data;
    const body = JSON.parse(receivedSerializedData);
    console.log(body);
    let cp;
    if (parseInt(body.p_state) == 1) cp = await qr.changeState(body.p_name, 0);
    else cp = await qr.changeState(body.p_name, 1);
    return res.redirect("/product");
};

const pSearch = async (req, res) => {
    let query = req.query.q;
    const results = await qr.searchQuery(query);
    res.send(results);
};

const showCart = async (req, res) => {
    const rows = await qr.cartProduct();
    const customers = await qr.showCustomers();
    res.render("cart.ejs", { rows, customers });
};

const changeStateFromCart = async (req, res) => {
    const receivedSerializedData = req.query.data;
    const body = JSON.parse(receivedSerializedData);
    if (parseInt(body.p_state) == 1) cp = await qr.changeState(body.p_name, 0);
    else cp = await qr.changeState(body.p_name, 1);
    res.redirect("/cart");
};

const placeOrder = async (req, res) => {
    const o_code = await ser.codeGenerator();

    const receivedSerializedData = req.body.details;
    let cp = (req.body.details = JSON.parse(receivedSerializedData));
    let arr = req.body.cart_quantity;
    await ser.insertIntoOrders(cp, arr, o_code);
    let total_price = await ser.find_total_price(req.body, cp, arr);

    let curDate = await ser.dateTime();

    await qr.addIntoOrderPlaced(o_code, req.body, curDate, total_price);
    await qr.addIntoOrderPayment(o_code, curDate, req.body.paid);

    let id = -1;
    let arr1 = arr;
    cp.forEach(async (row) => {
        id = id + 1;
        let p = arr[id];
        let q = arr[id];
        await ser.minusQuan(row.p_code, p);
        await qr.updateProducts(row.p_code, q);
    });

    console.log(arr);

    let grandTotal = 0;
    for (let i = 0; i < cp.length; i++) {
        cp[i].subtotal = parseFloat(arr[i] * cp[i].p_price).toFixed(2);
        grandTotal =
            grandTotal + parseFloat((arr[i] * cp[i].p_price).toFixed(2));
    }

    const data = {
        o_code,
        customer: req.body.customer,
        payment_address: req.body.product_description,
        time_date: curDate,
        grand_total: grandTotal.toFixed(2),
        discount: req.body.discount,
        total_price,
        paid: req.body.paid,
        due: (total_price - req.body.paid).toFixed(2),
    };

    const a1 = data.paid;
    const b1 = data.due;

    await qr.manageSalesExpenses(a1, b1);

    console.log(data.time_date);
    await qr.clearState();
    return res.redirect(
        `/invoice?cp=${JSON.stringify(cp)}&data=${JSON.stringify(data)}`
    );
};

const invoiceFun = async (req, res) => {
    const receivedSerializedData = req.query.cp;
    const receivedSerializedData1 = req.query.data;
    let cp = JSON.parse(receivedSerializedData);
    let data = JSON.parse(receivedSerializedData1);
    res.render("invoice.ejs", { cp, data });
};

const showOrders = async (req, res) => {
    const rows = await qr.showOrderPlaced();
    res.render("orders.ejs", { rows });
};

const viewInvoince = async (req, res) => {
    const receivedSerializedData = req.query.data;
    let cpp = JSON.parse(receivedSerializedData);

    const rstl1 = await qr.aInfo(cpp.o_code);
    const rstl2 = await qr.pInfo(cpp.o_code);
    const rstl3 = await qr.cInfo(cpp.o_code);

    console.log(rstl1);

    console.log(rstl2);

    console.log(rstl3);
    const data = {
        o_code: cpp.o_code,
        customer: rstl3[0].shop_name,
        payment_address: rstl3[0].shop_address,
        time_date: rstl1[0].date_time,
        grand_total: (
            rstl1[0].total_amount /
            (1 - rstl1[0].discount / 100)
        ).toFixed(2),
        discount: rstl1[0].discount,
        total_price: rstl1[0].total_amount,
        paid: rstl1[0].total_paid,
        due: (rstl1[0].total_amount - rstl1[0].total_paid).toFixed(2),
    };
    const cp = rstl2;

    // return res.send({ cp, data });

    res.render("view_invoice.ejs", { data, cp });
};

const duePayment = async (req, res) => {
    const receivedSerializedData = req.query.data;
    let cpp = JSON.parse(receivedSerializedData);

    const rstl1 = await qr.aInfo(cpp.o_code);
    const rstl2 = await qr.pInfo(cpp.o_code);
    const rstl3 = await qr.cInfo(cpp.o_code);

    // SUM(b.paid) as total_paid, a.total_amount, a.discount, a.date_time
    // p_name, p_quantity, p_price, (p_quantity * p_price) AS subtotal
    // shop_name, shop_address from customers where shop_name = (select customer from order_placed where o_code = ?)

    const rstl = await qr.paymentInfo(cpp.o_code);
    let t_paid = 0,
        due2 = 0;

    for (let i = 0; i < rstl.length; i++) {
        t_paid = t_paid + parseFloat(rstl[i].paid);
        let due1 = parseFloat(rstl1[0].total_amount - t_paid).toFixed(2);
        rstl[i].due = parseFloat(due1).toFixed(2);
        console.log(t_paid);
        console.log(rstl[i].due);
        due2 = rstl[i].due;
    }

    console.log(rstl);

    let rows = rstl;
    let data = {
        due: due2,
        o_code: cpp.o_code,
        customer: rstl3[0].shop_name,
        cus_address: rstl3[0].shop_address,
        time_date: rstl1[0].date_time,
        total_amount: rstl1[0].total_amount,
    };

    res.render("due_payment.ejs", { rows, data });
};

const newPaid = async (req, res) => {
    const body = req.body;
    let curDate = await ser.dateTime();

    let a1 = body.paid;

    await qr.manageDueExpenses(a1);

    await qr.addIntoOrderPayment(parseInt(body.values), curDate, body.paid);
    res.redirect("/orders");
};

const damage = async (req, res) => {
    await ser.checkExpired();
    const rows = await qr.damageProduct();
    let total_loss = 0.0;
    rows.forEach(async (row) => {
        total_loss = total_loss + parseFloat(row.total_cost);
    });
    total_loss = total_loss.toFixed(2);
    // return res.send(rows);
    return res.render("damage_products.ejs", { rows, total_loss });
};

const expenses = async (req, res) => {
    await ser.checkExpired();
    const data1 = await qr.expenses();
    const mostC = await qr.mostCustomer();
    const mostCat = await qr.mostCategory();
    const mostP = await qr.mostProduct();
    const trans = await qr.transactions();

    const data = data1[0];
    return res.render("dashboard.ejs", { data, mostC, mostCat,mostP, trans });
    return res.send(result);
    res.send(result, mostC, mostP);
};

const addIntoDamage = async (req, res) => {
    const body = req.body;
    let dam_minus =
        parseFloat(body.product_price) * parseFloat(body.dam_amount);

    const curTime = await ser.dateTime();
    console.log(body.dam_description);
    await qr.addDamage(body, curTime);
    let p = body.dam_amount;
    let q = body.dam_amount;
    await qr.minusFromExDam(dam_minus.toFixed(2));
    await ser.minusQuan(body.p_code, p);
    await qr.updateProducts(body.p_code, q);

    // res.send(body);
    res.redirect("/product")
};

const proHis = async (req, res) => {
    // return res.render("supply_history.ejs");
    const result = await qr.productHistory();
    let total_purchase = 0;
    result.forEach(async (row) => {
        total_purchase = total_purchase + parseFloat(row.total);
    });
    total_purchase = total_purchase.toFixed(2);
    // return res.send(result);
    return res.render("supply_history.ejs", { result, total_purchase });
};

const customers = async(req,res) => {
    const rows = await qr.showCustomers();
    // return res.send({rows})
    res.render("customers.ejs",{rows})
}

const addCustomer = async(req,res) => {
    const body = req.body;
    await qr.addCustomers(body);
    // res.send(req.body);
    res.redirect('/customers')
}

const removeCustomer = async(req,res) =>{
    const receivedSerializedData = req.query.data;
    const body = JSON.parse(receivedSerializedData);

    await qr.deleteCustomers(body);
    // res.send(body)
    res.redirect("/customers");
}

const suppliers = async(req,res) => {
    const rows = await qr.showSuppliers();
    // return res.send({rows})
    res.render("suppliers.ejs",{rows})
}

const addsupplier = async(req,res) => {
    const body = req.body;
    await qr.addSuppliers(body);
    // res.send(req.body);
    res.redirect('/suppliers')
}

const removeSuppliers = async(req,res) =>{
    const receivedSerializedData = req.query.data;
    const body = JSON.parse(receivedSerializedData);

    await qr.deleteSuppliers(body);
    // res.send(body)
    res.redirect("/suppliers");
}

// body.product_name,
// body.product_price,
// body.dam_amount,
// body.dam_description,
// date_time,


const filterSupply = async (req, res) => {
    const body = req.body;
 
    let to;
    let from;
    if (!body.from) {
        from = "000:00:00 00:00:00";
    } else {
        from = body.from + " 00:00:00";
    }
 
    if (!body.to) {
        to = "9999-99-99 99:99:99";
    } else {
        to = body.to + " 24:00:00";
    }
 
    const result = await qr.productHistoryByTime(from, to);
    let total_purchase = 0;
    result.forEach(async (row) => {
        total_purchase = total_purchase + parseFloat(row.total);
    });
    total_purchase = total_purchase.toFixed(2);
 
    // res.json({
    //     total_purchase: total_purchase,
    //     result: result,
    // });
 
    // // return res.send(result);
    return res.render("supply_history.ejs", { result, total_purchase });
};


const filterOrder = async (req, res) => {
    const body = req.body;
    let to;
    let from;
    if (!body.from) {
        from = "0000:00:00 00:00:00";
    } else {
        from = body.from + " 00:00:00";
    }
 
    if (!body.to) {
        to = "9999-99-99 99:99:99";
    } else {
        to = body.to + " 24:00:00";
    }
 
    const rows = await qr.showOrderPlacedByTime(from, to);
    // return res.json({
    //     success: 1,
    //     result: rows,
    // });
    res.render("orders.ejs", { rows });
};

const deleteProduct = async (req, res) => {
    const receivedSerializedData = req.query.data;
    const body = JSON.parse(receivedSerializedData);
    // return res.send(body);
    await qr.removeFromProduct_added(body.p_code);
    await qr.removeFromProducts(body.p_code);

    res.redirect("/product")
};

const addIntoCategory = async (req,res) => {
    let body = req.body;
    let cat_name = body.cat_name;
    let cat_state = body.cat_state;
    // res.send(body);
    await qr.addIntoCategorys(cat_name, cat_state);
    res.redirect("/product");
}


const cntrl = {
    addIntoCategory,
    deleteProduct,
    filterOrder,
    filterSupply,
    removeSuppliers,
    addsupplier,
    suppliers,
    addCustomer,
    removeCustomer,
    customers,
    proHis,
    addExistingProduct,
    addIntoDamage,
    expenses,
    duePayment,
    viewInvoince,
    addNewProduct,
    showP,
    pSearch,
    changeState,
    showCart,
    changeStateFromCart,
    placeOrder,
    invoiceFun,
    showOrders,
    newPaid,
    damage,
};

module.exports = cntrl;
