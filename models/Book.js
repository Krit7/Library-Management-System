var mongoose = require("mongoose");

var BookSchema = new mongoose.Schema({
    name: String,
    available: String,
    authorname: String,
});

var Book = mongoose.model("Book", BookSchema);

//ADMIN BOOK FUNCTIONS
var getBookByName = (BookName) => {
    var query = { name: BookName };
    Book.findOne(query, (err, FoundBook) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Book Found By ID", FoundBook);
            return FoundBook;
        }
    });
};

var getBookByID = (id, callback) => {
    Book.findById(id, callback);
};

var addBook = (BookName, authorname, callback) => {
    var newBook = {
        name: BookName,
        authorname: authorname,
        available: true
    };
    Book.create(newBook, callback);
};

var deleteBook = (id, callback) => {
    Book.findByIdAndRemove(id, callback);
};

//USER BOOK FUNCTIONS


//MODULE EXPORT
module.exports = {
    Book: Book,
    getBookByName: getBookByName,
    getBookByID: getBookByID,
    addBook: addBook,
    deleteBook: deleteBook
};

//console.log(module.exports);