const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
dotenv.config()
const app = express()

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('./public'))
app.use(express.json())
app.use(cookieParser())
//Error handling middleware
app.use((req,res,next)=>{
    const err=new Error("Something went wrong! Please try after some time.")
    err.status = 404
    next(err)
});
//Error handler
app.use((err,req,res,next)=>{
    res.status(err.status || 500)
    res.send({
        error:{
            status:err.status|| 500,
            message:err.message
        }
    })
})

const Job = mongoose.model('Job', {
    companyName: String,
    logoUrl: String,
    jobPosition: String,
    monthlySalary: Number,
    jobType: Object,
    remoteOff: Object,
    location: String,
    jobDescription: String,
    aboutCompany: String,
    skills: Object
})
const User = mongoose.model('User', {
    name: String,
    email: String,
    mobile: Number,
    password: String
})

// Route: /health-api
app.get('/health-api', (req, res) => {
    const currentTime = new Date().toLocaleTimeString();
    const response = {
        time: currentTime,
        app: "express-server",
        status: "active"
    };
    res.json(response);
});

// Route: /register
app.post('/register', async (req, res) => {
    try {
        //get all the data from body
        const { name, email, mobile, password } = req.body;
        // all data should exists
        if (!(name && email && mobile && password)) {
            res.status(400).send("Less data")
        }
        //check if user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            res.status(401).send("User already exists")
        }
        else {
            //encrpting the password
            const myEncPassword = await bcrypt.hash(password, 10)
            //save the user in DB
            const user = await User.create({
                name,
                email,
                mobile,
                password: myEncPassword,
            })
            //generate a token for user and send it
            const token = jwt.sign(
                { id: user._id, email: email },
                'shhhh',//process.env.jwtsecret
                {
                    expiresIn: "2h"
                }
            );
            user.token = token
            user.password = undefined
            res.status(400).json({ message: "stored successfully" })
        }
    }
    catch (error) {
        console.log("Error Occured", error)
    }
})

// Route: /login
app.post('/login', async (req, res) => {
    try {
        //get all data from frontend
        const { email, password } = req.body;
        //validation
        if (!(email && password)) {
            res.status(400).send("Something is missing")
        }
        //find user in DB
        const user = await User.findOne({ email })
        //If user is not their
        if (!user) {
            res.status(401).send("User not exists")
        }
        //match the password
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { id: user._id },
                'shhhh',//process.env.jwtsecret
                {
                    expiresIn: "2h"
                }
            );
            user.token = token
            user.password = undefined
            //send token in cookie parser
            //return a token
            const options = {
                expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                httpOnly: true
            };
            res.status(200).cookie("token", token, options).json({
                success: true,
                token,
                user
            })
        }


    }
    catch (error) {
        console.log("Error Occured", error)
    }
})
app.listen(process.env.PORT, () => {
    mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log(`Server running on port ${process.env.PORT}`)).catch((err) => console.log("Error occured", err))
})