const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// User model
const User = require('../models/User')

// Login Page
router.get('/login', (req, res) => res.render('login'))

// Register Page
router.get('/register', (req, res) => res.render('register'))

// Register Handle
router.post('/register', (req, res) => {
    const { name, email, password, password2, edu } = req.body;
    let errors = [];
    // Check required fields
    if (!name || !email || !password || !password2 || !edu) {
        errors.push({ msg: "Please fill in all fields" })
    }
    // Check passwords match
    if (password !== password2) {
        errors.push({ msg: "Passwords should match"})
    }
    // Check if password has lowercase and uppercase letters, numbers, and password length
    if (/[a-z]/.test(password) === false || 
    /[A-Z]/.test(password) === false 
    || /\d/.test(password) === false
    || password.length < 8) {
        errors.push({ msg: "Password must have at least one lowercase letter, uppercase letter, and number. Password must be at least eight characters long"})
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            password,
            password2,
            edu,
        });
    }
    else {
        // Validation passed
        
        User.findOne({ "user.email": email })
            .then(user => {
                if(user) {
                    // User exits
                    errors.push({ msg: "Email is already registered" })
                    res.render('register', {
                        errors,
                        name,
                        email,
                        password,
                        password2,
                        edu,
                    });
                } else {
                    const newUser = new User({
                        user: {
                            name, 
                            email,
                            password,
                            edu,
                            reg_grade: "",
                            wcls_grade: "",
                            max_students: "",
                        },
                        schedule: [] // list of objects
                    });
                    
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(newUser.user.password, salt, (err, hash) => {
                          if (err) throw err;
                          newUser.user.password = hash;
                          newUser
                            .save()
                            .then(() => {
                              req.flash('success_msg', 'You are now registered and can login')
                              res.redirect('/users/login');
                            })
                            .catch(err => console.log(err));
                        });
                      });
                }
            })
    }
})

// Login Handle
router.post('/login', (req, res, next) => {
    User.findOne({ "user.email": req.body.email })
        .then(user => {
            if(user != null) {
                if(user.user.edu === 'teacher' || user.user.edu === 'ta') {
                    passport.authenticate('local', {
                        successRedirect: '/dashboard',
                        failureRedirect: '/users/login',
                        failureFlash: true
                    }) (req, res, next)
                }
                else {
                    passport.authenticate('local', {
                        successRedirect: '/student_dashboard',
                        failureRedirect: '/users/login',
                        failureFlash: true
                    }) (req, res, next)
                } 
            }
            else {
                passport.authenticate('local', {
                    successRedirect: '/student_dashboard',
                    failureRedirect: '/users/login',
                    failureFlash: true
                }) (req, res, next)
            }
        })
        .catch(err => console.error(err))
})

// Logout Handle
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/users/login')
})
module.exports = router;