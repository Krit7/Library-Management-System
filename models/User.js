var mongoose = require("mongoose");
var books = require("./Book.js").Book;

var USerSchema = new mongoose.Schema({
    facebook: {
        id: String,
        token: String,
        name: String,
        email: String
    },
    google: {
        id: String,
        token: String,
        email: String,
        name: String
    },
    booksIssued: Number,
    bookFine: Number,
    books: []
});

module.exports = mongoose.model("User", USerSchema);