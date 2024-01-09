const express = require("express");
const dotenv = require("dotenv").config();
const qr = require("./database/queries");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const router = require("./routes/route");
const bcrypt = require("bcrypt");
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view-engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("assets"));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        name: process.env.SESS_NAME,
        resave: false,
        saveUninitialized: false,
        secret: process.env.SESS_SECRET,
        cookie: {
            maxAge: 7200000,
            sameSite: true,
            secure: false,
        },
    })
);

const redirectLogin = (req, res, next) => {
    if (!req.session.userId && req.path != "/login") {
        res.redirect("/login");
    } else next();
};

const redirectLogout = (req, res, next) => {
    if (req.session.userId && req.path == "/login") {
        res.redirect("/dashboard");
    } else next();
};

app.get("/login", redirectLogout, (req, res) => {
    res.render("login.ejs");
});

app.post("/login", redirectLogout, async (req, res) => {
    const body = req.body;
    let pass = body.password;
    let result = await qr.selectAdmin(body.email);
    if (!result) {
        res.redirect("/login");
    } else {
        if (await bcrypt.compare(pass, result[0].password)) {
            req.session.userId = result[0].user_id;
            return res.redirect("/dashboard");
        } else {
            res.redirect("/login");
        }
    }
});

app.get("/logout", redirectLogin, async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect("/dashboard");
        }
        res.clearCookie(process.env.SESS_NAME);
        res.redirect("/login");
    });
});

app.use("/",redirectLogin, router);

app.listen(port, () => {
    console.log(`running at port ${port}`);
});
