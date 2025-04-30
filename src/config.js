const mongoose = require('mongoose');
const connection = mongoose.connect("mongodb://localhost:27017/HotelReservation");

// check if database is connec or not
connection.then(() => {
    console.log("db is connected");
})
.catch(() => {
    console.log("not connected");
});

// Create a schema for users
const Loginschema = new mongoose.Schema({
    name: {
        type: String,
        requried: true
    },
    password: {
        type: String,
        required: true
    }
});

// collection part
const collection = new mongoose.model("users", Loginschema);

module.exports = collection