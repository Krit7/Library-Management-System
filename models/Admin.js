var mongoose = require("mongoose");
var bcrypt = require('bcryptjs');

var AdminSchema = new mongoose.Schema({
    username: String,
    password: String
});
var Admin = mongoose.model("Admin", AdminSchema);

//ADMIN FUNCTIONS
var getAdminByUserName = (username, callback) => {
    var query = { username: username };
    Admin.findOne(query, callback);
};

var comparePassword = (candidatePassword, hash, callback) => {
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
        if (err) throw err;
        callback(null, isMatch);
    });
};

var getAdminById = (id, callback) => {
    Admin.findById(id, callback);
};

var createAdmin = (newAdmin, callback) => {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newAdmin.password, salt, (err, hash) => {
            newAdmin.password = hash;
            newAdmin.save(callback);
        });
    });
}

module.exports = {
    Admin: Admin,
    getAdminByUserName: getAdminByUserName,
    comparePassword: comparePassword,
    getAdminById: getAdminById,
    createAdmin: createAdmin
};

//console.log(module.exports);