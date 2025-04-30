require('dotenv').config()

const express = require('express');
const { request } = require('http');
const path = require('path');
const bcrypt = require('bcrypt');
const collection = require('./config');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const Reservation = require('./reservation_data'); // Make sure the path is correct

const app = express();
// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'client'));  // Set the correct view path

// Static file serving
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(path.join(__dirname, '..', 'assets')));
app.use(express.static(path.join(__dirname, '..', 'assets/images')));
app.use(express.static(path.join(__dirname, '..', 'assets/fonts')));

// Routes
app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signUp", (req, res) => {
    res.render("signup");
});

app.get("/home", (req, res) => {
    res.render("home");
});

app.get("/rooms", (req, res) => {
    res.render("rooms");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get("/checkout", (req, res) => {
    res.render("checkout");
});

// Register User
app.post('/signup', async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password
    };

    // Check if user already exists
    const existedUser = await collection.findOne({ name: data.name });
    if (existedUser) {
        res.send("User already exists. Please choose another name!");
    } else {
        // Hash the password
        const hashPassword = await bcrypt.hash(data.password, 10);
        data.password = hashPassword;

        // Insert new user
        const userdata = await collection.insertMany([data]);
        console.log(userdata);
    }
});

// Login User
app.post('/login', async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("Username not found");
            return;
        }

        // Compare hashed password from DB
        const passwordMatch = await bcrypt.compare(req.body.password, check.password);
        if (passwordMatch) {
            res.render('home');
        } else {
            res.send("Incorrect password");
        }
    } catch (err) {
        res.send("Error logging in: " + err.message);
    }
});

// Payment method
const storeItems = new Map([
    [1, { priceInCents: 100000, name: 'Mithila Suite' }],
    [2, { priceInCents: 150000, name: 'Residency Suite' }],
    [3, { priceInCents: 140000, name: 'Svasara Suite' }],
    [4, { priceInCents: 120000, name: 'Oriental Suite' }],
]);

app.post('/create-checkout-session', async (req, res) => {
    try {
        const booking = req.body;

        if (!booking.room || !booking.room.price || !booking.room.name) {
            return res.status(400).json({ error: "Invalid room data" });
        }

        const nights = booking.nights;
        const totalPrice = booking.room.price * nights;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${booking.room.name} (${nights} night${nights > 1 ? 's' : ''})`,
                    },
                    unit_amount: totalPrice,
                },
                quantity: 1
            }],
            success_url: 'http://localhost:3000/invoice?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: `http://localhost:3000/rooms`,
            metadata: {
                prefix: booking.customer.prefix || '',
                fullName: booking.customer.fullName,
                phone: booking.customer.phone,
                email: booking.customer.email,
                roomName: booking.room.name,
                nights: nights.toString(),
                totalAmount: totalPrice.toString(),
                checkIn: new Date(booking.checkIn).toISOString(),
                checkOut: new Date(booking.checkOut).toISOString()
            }
        });

        res.json({ url: session.url });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Invoice Schema
app.get("/invoice", async (req, res) => {
  try {
      const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
      const data = session.metadata;

      const invoiceData = {
          prefix: data.prefix || 'Mr.',
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          roomName: data.roomName,
          nights: parseInt(data.nights),
          totalAmount: parseInt(data.totalAmount),
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
      };

      // Save the invoice data into the database
      const savedInvoice = new Reservation(invoiceData);
      await savedInvoice.save();

      // Render the invoice page and pass the invoice data to EJS
      res.render('invoice', { invoice: invoiceData }); // Make sure invoice is passed here
  } catch (err) {
      console.error("Invoice error:", err);
      res.status(500).send("Failed to generate invoice");
  }
});

// Server port
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});