var express = require("express");
var app = express();
var passport = require("passport");
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser');
var LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var session = require("express-session");
var methodOverride = require('method-override');
var FacebookStrategy = require('passport-facebook').Strategy;
var reCAPTCHA = require('recaptcha2');
var request = require('request');
var Insta = require('instamojo-nodejs');

app.use(methodOverride("_method"));
app.set("view engine", "ejs");



//INSTAMOJO SETUP
Insta.setKeys("1b354964de11ced1e61907e60175126a", "6f8ad540de36cb01558253266d8dedd3");
Insta.isSandboxMode(true);


//RECAPTCHA SETUP
var recaptcha = new reCAPTCHA({
    siteKey: '6LdluoIUAAAAAKLqwhShiC2PBIgCiOnKMu_2AzEm',
    secretKey: '6LdluoIUAAAAANN0xBaiLFVkhtZ9L4VqWgQXaWc0',
    ssl: false
});

//MONGOOSE STUP
mongoose.connect("mongodb://localhost/Assignment", {
    useNewUrlParser: true
});

//BODY PARSER SETUP
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());


//MODELS
var Admin = require("./models/Admin.js");
var Book = require("./models/Book.js");
var User = require("./models/User.js");

// EXPRESS SESSION
app.use(session({
    key: "user",
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// PASSPORT INIT
app.use(passport.initialize());
app.use(passport.session());

//ADMIN STRATEGY
passport.use(new LocalStrategy(
    (username, password, done) => {
        Admin.getAdminByUserName(username, (err, user) => {
            if (err) throw err;
            if (!user) {
                return done(null, false, { message: 'Unknown Admin' });
            }
            Admin.comparePassword(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password' });
                }
            });
        });
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    //console.log(id);
    Admin.getAdminById(id, (err, user) => {
        if (err) {
            User.findById(id, (err, user) => {
                done(err, user);
            });
        } else
            done(err, user);
    });
});

//USER FACEBOOK STRATEGY
passport.use(new FacebookStrategy({
    clientID: "1233625933454315",
    clientSecret: "47676026863ca2366b97cad2ce7961fe",
    callbackURL: "http://localhost:3000/auth/facebook/callback"
}, function(accessToken, refreshToken, profile, done) {
    User.findOne({ 'facebook.id': profile.id }, function(err, user) {
        if (err) return done(err);
        if (user) return done(null, user);
        else {
            var newUser = new User();
            newUser.facebook.id = profile.id;
            newUser.facebook.token = accessToken;
            newUser.facebook.name = profile.displayName;
            newUser.booksIssued = 0;
            newUser.bookFine = 10;
            if (typeof profile.emails != 'undefined' && profile.emails.length > 0)
                newUser.facebook.email = profile.emails[0].value;
            newUser.save(function(err) {
                if (err) throw err;
                return done(null, newUser);
            });
        }
    });
}));

//AMDIN MIDDLEWARE
function isAdminLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        Admin.getAdminById(req.user.id, (err, Admin) => {
            if (err) {
                console.log(err);
            } else {
                return next();
            }
        });
    } else {
        res.redirect("/login");
    }
};

//USER MIDDLEWARE
function isUserLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect("/auth/facebook");
    }
};


//RECAPTHCA MIDDLEWARE
function VerifyReCaptcha(req, res, next) {
    if (req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        console.log("Please select captcha first");
        res.redirect("/login");
    } else {
        const secretKey = "6LdluoIUAAAAANN0xBaiLFVkhtZ9L4VqWgQXaWc0";
        const verificationURL = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
        request(verificationURL, function(error, response, body) {
            body = JSON.parse(body);
            if (body.success !== undefined && !body.success) {
                console.log("Failed captcha verification");
                res.redirect("/login");
            } else {
                return next();
            }
        });
    }

};

app.get("/", (req, res) => {
    res.redirect("/index");
});

app.get("/index", (req, res) => {
    res.render("index");
});

//ADMIN ROUTES
app.get("/Admin/index", (req, res) => {
    res.render("./Admin/index");
});

app.get("/register", (req, res) => {
    res.render("./Admin/register");
});

app.post('/register', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;

    if (password == password2) {
        var newAdmin = new Admin.Admin({
            username: username,
            password: password
        });

        Admin.createAdmin(newAdmin, (err, user) => {
            if (err) {
                throw err;
            }
            res.send(user).end()
        });
    } else {
        res.status(500).send("{errors: \"Passwords don't match\"}").end()
    }
});

app.get("/login", (req, res) => {
    res.render("./Admin/login");
});

app.post('/login', VerifyReCaptcha, passport.authenticate('local'),
    (req, res) => {
        res.redirect("/books");
    }
);

//BOOK ROUTES
//SHOW ALL BOOKS
app.get("/books", isAdminLoggedIn, (req, res) => {
    Book.Book.find({}, (err, DatabaseBooks) => {
        if (err) {
            console.log(err);
        } else {
            res.render("./Book/index", {
                Books: DatabaseBooks
            });
        }
    });
});

//ADD NEW BOOK
app.get("/books/new", isAdminLoggedIn, (req, res) => {
    res.render("./Book/new");
});

app.post("/books/new", isAdminLoggedIn, (req, res) => {
    var name = req.body.name;
    var authorname = req.body.authorname;
    Book.addBook(name, authorname, (err, newBook) => {
        if (err) {
            console.log(err);
        } else {
            //console.log(newBook);
            res.redirect("/books");
        }
    });
});


//SHOW SPECIFIC BOOK DETAILS
app.get("/books/:id", isAdminLoggedIn, (req, res) => {
    Book.getBookByID(req.params.id, (err, FoundBook) => {
        if (err) {
            console.log(err);
            res.redirect("/books");
        } else {
            res.render("./Book/show", {
                FoundBook: FoundBook
            });
        }
    });
});

//EDIT BOOK
app.get("/books/:id/edit", isAdminLoggedIn, (req, res) => {
    Book.getBookByID(req.params.id, (err, FoundBook) => {
        if (err) {
            console.log(err);
            res.redirect("/books");
        } else {
            res.render("./Book/edit", {
                FoundBook: FoundBook
            });
        }
    });
});

//UPDATE BOOK
app.put("/books/:id", isAdminLoggedIn, (req, res) => {
    Book.Book.findByIdAndUpdate(req.params.id, req.body.Book, (err, UpdatedBook) => {
        if (err) {
            res.redirect("/books");
        } else {
            //res.redirect("/books/UpdatedBook._id");
            res.redirect("/books/" + req.params.id);
        }
    })
});

//DELETE BOOK 
app.delete("/books/:id", isAdminLoggedIn, (req, res) => {
    Book.deleteBook(req.params.id, (err, DeletedBook) => {
        if (err) {
            console.log(err);
            res.redirect("/books/" + req.params.id);
        } else {
            res.redirect("/books");
        }
    });
});

//USER ROUTES
app.get("/User/index", isUserLoggedIn, (req, res) => {
    res.render("./User/index");
});

app.get("/issuebook/:id", isUserLoggedIn, (req, res) => {
    Book.getBookByID(req.params.id, (err, FoundBook) => {
        if (err) {
            console.log(err);
        } else {
            if (req.user.booksIssued < 4) {
                req.user.booksIssued = req.user.booksIssued + 1;
                var obj = {
                    book: FoundBook,
                    dateIssued: {
                        type: Date,
                        default: Date.now()
                    },
                    returnDate: {
                        type: Date,
                        default: Date.now() + 7
                    }
                };
                req.user.books.push(obj);
                req.user.save();
                //res.redirect("/issuedbooks");
                console.log(req.user);
            } else {
                console.log("Maximum books Issued");
                res.redirect("/User/books");
            }
        }
    });
});

app.get("/issuedbooks", (req, res) => {
    res.render("./User/issuedbooks", { Books: req.user.books });
});


app.get("/payfine", isUserLoggedIn, (req, res) => {
    var data = new Insta.PaymentData();
    data.purpose = "Books Fine";
    data.amount = req.user.bookFine;
    data.currency = 'INR';
    data.buyer_name = req.user.facebook.name;
    data.email = req.user.facebook.email;
    data.setRedirectUrl("http://localhost:3000/callback/instamojo");
    Insta.createPayment(data, function(error, response) {
        if (error) {
            console.log(error);
        } else {
            // Payment redirection link at response.payment_request.longurl
            res.redirect(JSON.parse(response).payment_request.longurl);
        }
    });
});

app.get("/callback/instamojo", (req, res) => {
    const req_id = req.query.payment_request_id;
    const payment_id = req.query.payment_id;
    Insta.getPaymentDetails(req_id, payment_id, function(error, response) {
        if (error) {
            console.log(err);
        } else {
            if (response.success === true) {
                console.log(req.user.bookFine);
                req.user.bookFine = req.user.bookFine - response.payment_request.amount;
                req.user.save();
                console.log(req.user.bookFine);
                res.redirect("/issuedbooks");
            }
        }
    });
});

app.get('/auth/facebook',
    passport.authenticate('facebook')
);

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login',
    }),
    (req, res) => {
        //console.log(req.user);
        Book.Book.find({}, (err, DatabaseBooks) => {
            if (err) {
                console.log(err);
            } else {
                res.render("./User/books", {
                    Books: DatabaseBooks
                });
            }
        });
    }
);


















//LOGOUT
app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/");
});

//PORT
app.listen(3000, function(req, res) {
    console.log("Server Has Started..!!!");
});