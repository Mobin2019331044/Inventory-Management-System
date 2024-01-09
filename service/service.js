const moment = require("moment");
const qr = require("../database/queries");
const find_total_price = async (body, cp, arr) => {
    let i = 0;
    let total = 0;
    cp.forEach((row) => {
        total = total + arr[i] * row.p_price;
        i = i + 1;
    });
    return (total - (total * body.discount) / 100.0).toFixed(2);
};

const insertIntoOrders = async (cp, arr, o_code) => {
    let i = 0;
    cp.forEach(async (row) => {
        row.p_quantity = arr[i];
        i = i + 1;
        row.o_code = o_code;
        await qr.addIntoOrder(row);
    });
};

const dateTime = async () => {
    const now = new Date();
    const localDatetime = moment(now).format("YYYY-MM-DD HH:mm:ss");
    return localDatetime;
};

const codeGenerator = async () => {
    const randomNumber = parseInt(Math.floor(Math.random() * 10));
    const dateStr = String(Date.now());
    const pref = dateStr.substring(7);
    const o_code = `${pref}${randomNumber}`;
    return o_code;
};

const minusQuan = async (p_code, p_quan) => {
    const result = await qr.productAddedByCode(p_code);

    result.forEach(async (row) => {
        if (p_quan == 0) return 0;
        let mn = Math.min(p_quan, row.amount);
        p_quan = p_quan - mn;
        await qr.quanMinusByEntrDate(row.entry_date, mn);
    });
};

const configDate = async (date) => {
    const year = date.split("/")[2];
    const day = date.split("/")[1];
    const month = date.split("/")[0];
    let dt = year + "/" + month + "/" + day;
    return dt;
} 

const checkExpired = async () => {
    let date1 = await dateTime();
    let date = date1.split(" ")[0];
    // console.log(date);
    const result = await qr.checkExp(date);
    console.log(result);
    console.log(date1);
    if (!result) return 0;
    result.forEach(async (row) => {
        let p = row.amount;
        if (p != 0) {
            let body = {
                product_name: row.p_name,
                product_price: row.price,
                dam_amount: row.amount,
                dam_description: "Date Expired",
            };
            let dam_minus =
                parseFloat(body.product_price) * parseFloat(row.amount);
            await qr.minusFromExDam(dam_minus.toFixed(2));
            await qr.addDamage(body, date1);
            await qr.updateProducts(row.p_code, row.amount);
            await qr.quanMinusByEntrDate(row.entry_date, p);
        }
    });
};
 

const ser = {
    checkExpired,
    configDate,
    minusQuan,
    insertIntoOrders,
    find_total_price,
    dateTime,
    codeGenerator,
};



module.exports = ser;
