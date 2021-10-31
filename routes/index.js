const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const User = require('../models/User');
const nodemailer = require('nodemailer');
require('datejs');

const getAllUsers = async () => {
    const all_users = await User.find({ "user.edu": { $in: [ "teacher", "ta"]}});
    return all_users
}

router.get('/', (req, res) => res.render('welcome'))

router.get('/signup', ensureAuthenticated, (req, res) => 
    getAllUsers().then(users => {
        res.render('signup', {
            all_teacher_users: users, // need to get every teacher/ta in database, not just user
        })
}));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'wcls.connections@gmail.com',
      pass: 'REPLACE'
    }
  });

// Sign up for timeslot
router.post('/signup', ensureAuthenticated, (req, res) => {
    const { status, day, startTime, subject } = req.body
    const { name, email, reg_grade, wcls_grade } = req.user.user
    let errors = [];
    if (!status) {
        errors.push({ msg: "Please fill in all fields" })
    }
    if (errors.length > 0) {
        getAllUsers().then(users => {
            res.render('signup', {
                errors,
                all_teacher_users: users, // need to get every teacher/ta in database, not just user
            })
        })
    } else {
        const id = req.body._id.toString()
        User.findOne({ "_id": id })
            .then(user => {
                const updatedSched = user.schedule
                const studentSched = req.user.schedule
                for (i in updatedSched) {
                    if ((updatedSched[i].day === day) && (updatedSched[i].startTime === startTime)) {
                        updatedSched[i].status = status;
                        updatedSched[i].students.push({ name, email, reg_grade, wcls_grade})
                        if (status === "private") {
                            updatedSched[i].max_students = "1"
                        } else {
                            updatedSched[i].max_students = user.user.max_students
                        }
                        studentSched.push({ name: user.user.name, 
                                        startTime, 
                                        endTime: updatedSched[i].endTime,
                                        day,
                                        status,
                                        subject,
                                        students: updatedSched[i].students})
                    break;
                    }
                } // update teacher's timeslots
        User.findByIdAndUpdate({ _id: id }, {schedule: updatedSched}, {useFindAndModify: false})
        .then(() => { // update student's timeslots
            User.findByIdAndUpdate({ _id: req.user._id }, {schedule: studentSched}, {useFindAndModify: false})
            .then(() => {
                res.redirect('/student_dashboard');
                // send email
                const mailOptions = {
                    from: 'wcls.connections@gmail.com',
                    to: `${user.user.email}`,
                    subject: `WCLS-Connections: ${name} Signed Up for a ${status} lesson on ${day} at ${startTime}`,
                    text: `Hi ${user.user.name}, \n\n${name} signed up for a ${status} lesson on ${day} at ${startTime} on the WCLS-Connections Website. Please send the Zoom link to their email address: ${email}. They are in grade ${reg_grade} at regular school and grade ${wcls_grade} at WCLS. Visit https://wcls-connections.herokuapp.com/dashboard for more details.\n\nBest,\nWellesley Chinese Language School` 
                    };
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                    });
                mailOptions.to = `wcls.connections@gmail.com`
                mailOptions.subject = `WCLS-Connections: ${name} signed up for a ${status} lesson with ${user.user.name} on ${day} at ${startTime}`
                mailOptions.text = `${name} signed up for a ${status} lesson with ${user.user.name} on ${day} at ${startTime}. Visit https://wcls-connections.herokuapp.com/full_schedule to see the full schedule.` 
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            })
            .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    })}
})

router.get('/dashboard', ensureAuthenticated, (req, res) => 
res.render('dashboard', {
    user: req.user.user,
    schedule: req.user.schedule,
}));
    
// delete a post
router.post('/dashboard/delete', ensureAuthenticated, (req, res) => {
    const { day, startTime } = req.body
    const id = req.user._id.toString()
    const filter = {
        day,
        startTime
        };
    const updatedSched = req.user.schedule
    .filter(timeslot => {
    for (const key in filter) {
        if (timeslot[key] === undefined || timeslot[key] != filter[key])
            return true;
        }
        return false;});
        User.findByIdAndUpdate({ _id: id }, {schedule: updatedSched}, {useFindAndModify: false})
        .then(() => {
            res.redirect('/dashboard');
        })
        .catch(err => console.log(err));
});

toRegularTime = (militaryTime) => {
    const [hours, minutes, seconds] = militaryTime.split(':');
    return `${(hours > 12) ? hours - 12 : hours}:${minutes}${seconds ? `:${seconds}` : ''} ${(hours >= 12) ? 'PM' : 'AM'}`;
}
// Add new timeslot
router.post('/dashboard', ensureAuthenticated, (req, res) => {
    const { day, startTime, endTime, status, subject } = req.body
    let errors = [];
    if (!day || !startTime || !endTime || !status || !subject) {
        errors.push({ msg: "Please fill in all fields" })
    }
    if (!req.user.user.max_students) {
        errors.push({ msg: "Please save the max number of students" })
    }
    if (errors.length > 0) {
        res.render('dashboard', {
            errors,
            user: req.user.user,
            schedule: req.user.schedule
        });
    } else {
        const id = req.user._id.toString()
        const reg_startTime = toRegularTime(startTime)
        const reg_endTime = toRegularTime(endTime)
        let max_students = req.user.user.max_students
        if (status === "private") {
             max_students = "1"
        }
        req.user.schedule
        .push({ day, startTime: reg_startTime, endTime: reg_endTime, status, subject, students: [], max_students}) // append new time slot
        User.findByIdAndUpdate({ _id: id }, {schedule: req.user.schedule}, {useFindAndModify: false})
        .then(() => {
            res.redirect('/dashboard');
        })
        .catch(err => console.log(err));
    };
})

router.get('/student_dashboard', ensureAuthenticated, (req, res) => {
    res.render('student_dashboard', {
        name: req.user.user.name,
        schedule: req.user.schedule,
    })
});

router.get('/student_profile', ensureAuthenticated, (req, res) => {
    res.render('student_profile', {
        user: req.user.user,
    })
});

router.post('/student_profile', ensureAuthenticated, (req, res) => {
    const { wcls_grade, reg_grade } = req.body
    const id = req.user._id.toString()
    User.findByIdAndUpdate({ _id: id }, 
        {"user.wcls_grade": wcls_grade, "user.reg_grade": reg_grade}, {useFindAndModify: false})
        .then(() => {
            res.redirect('/student_profile');
        })
        .catch(err => console.log(err));
});


router.get('/full_schedule', ensureAuthenticated, (req, res) => {
    getAllUsers().then(users => {
        res.render('full_schedule', {
            all_teacher_users: users, // need to get every teacher/ta in database, not just user
        })})
});

router.post('/max_students', ensureAuthenticated, (req, res) => {
    const { max_students } = req.body
    let errors = []
    if (!max_students) {
        errors.push({ msg: "Please fill in the field" })
    }
    if (errors.length > 0) {
        res.render('dashboard', {
            errors,
            user: req.user.user,
            schedule: req.user.schedule
        });
    }
    const id = req.user._id.toString()
    User.findByIdAndUpdate({ _id: id }, 
        {"user.max_students": max_students}, {useFindAndModify: false})
        .then(() => {
            res.redirect('/dashboard');
        })
        .catch(err => console.log(err));
});

module.exports = router