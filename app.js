const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const mongoose = require('mongoose')
const flash = require('connect-flash')
const session = require('express-session')
const passport = require('passport')

const app = express()

// Passport config
require('./config/passport')(passport);

// Mongodb config
const db = require('./config/keys').MongoURI

// Connect to Mongo
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err))

// EJS
app.use(expressLayouts)
app.set('view engine', 'ejs')

// Use public folder
app.use( express.static( "public" ) );

// Bodyparser
app.use(express.urlencoded({ extended: false }))

// Express Session Middleware
app.use(session({
  secret: 'keyboard cat', // doesn't matter
  resave: true,
  saveUninitialized: true,
}))

// Passport MiddleWare
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global Vars
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
})

// Routes
app.use('/', require('./routes/index'))
app.use('/users', require('./routes/users'))
app.use('/users', require('./routes/users'))

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', console.log(`Server is running at http://localhost:${PORT}/`))