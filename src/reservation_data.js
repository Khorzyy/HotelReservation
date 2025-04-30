const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/HotelReservation", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

const ReservSchema = new mongoose.Schema({
  prefix: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  roomName: { type: String, required: true },
  nights: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reservation", ReservSchema);