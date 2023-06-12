const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
dotenv.config()
const app = express()

//importing models
const User = require('./models/user')
const Job = require('./models/job')

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('./public'))
app.use(express.json())
app.use(cookieParser())

const isAuthenticated = (req,res,next)=>{
    try{
        const decoded = jwt.verify(req.headers.token,process.env.JWT_SECRET_KEY)
    }
    catch(error){
        res.send({status:'fail',message:'please login first'})
    }
    next()
}
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
                process.env.JWT_SECRET_KEY,//process.env.jwtsecret
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
                process.env.JWT_SECRET_KEY,//process.env.jwtsecret
                {expiresIn: "2h"}
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

//Route: Protected route /post-job
app.post('/post-job',isAuthenticated,async(req,res)=>{
    try {
        const {
          companyName,logoUrl,
          jobPosition,monthlySalary,
          jobType,remoteOff,
          location,jobDescription,
          aboutCompany,skillsRequired,
        } = req.body;
    
        // Validate the fields
        if (
          !companyName || !logoUrl || !jobPosition ||
          !monthlySalary || !jobType || !remoteOff ||
          !location || !jobDescription || !aboutCompany || !skillsRequired) {
          return res.status(400).json({ message: `Missing required fields${skillsRequired }` });
        }
    
        // Create a new job post
        const job = await Job.create({
            companyName,logoUrl,
            jobPosition,monthlySalary,
            jobType,remoteOff,
            location,jobDescription,
            aboutCompany,skillsRequired,
        })
    
        return res.status(201).json({ message: 'Job post created successfully',job:job });
      } catch (error) {
        console.error('Error creating job post:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
})

//Route:/get-job-by-id
app.get('/:id',async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findOne({ _id: id })
        if (job) {
            return res.status(200).json({
                message: "Job fetched successfully!",
                data: job,
            })
        } else {
            return res.status(401).json({
                message: 'Not found!',
            })
        }
    } catch (error) {
        return res.status(401).json({
            message: 'Something went wrong!',
            error: error,
        })
    }
})

//Route:/get-job-by-skills -filtering skills
app.get('/',async (req, res) => {
    try {
        let skills = req.query.skillsRequired;
        let search = req.query.search || "";
        // console.log(skills, search,typeof(skills))
        const jobs = await Job.find({ jobPosition: { $regex: search, $options: "i" } })
            .where('skillsRequired')
            .in(skills)
            .sort({ createdAt: -1 })
        console.log(jobs)
        if (jobs) {
            return res.status(200).json({
                message: 'Jobs fetched successfully!',
                data: jobs,
            })
        } else if (jobs.length === 0) {
            return res.status(404).json({
                message: 'Not found!'
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            message: 'Something went wrong!',
            error: error
        })
    }
})

//Route:/Edit-job route to edit a job
app.put('/update-job',isAuthenticated,async (req, res) => {
    try {
        const { id, companyName, logoUrl, jobPosition, monthlySalary, jobType, remoteOff, location, jobDescription, aboutCompany, skillsRequired } = req.body;

        const job = await Job.findOne({ _id: id });
        if (job) {
            job.companyName = companyName || job.companyName;
            job.logoUrl = logoUrl || job.logoUrl;
            job.jobPosition = jobPosition || job.jobPosition;
            job.monthlySalary = monthlySalary || job.monthlySalary;
            job.jobType = jobType || job.jobType;
            job.remoteOff = remoteOff || job.remoteOff;
            job.location = location || job.location;
            job.jobDescription = jobDescription || job.jobDescription;
            job.aboutCompany = aboutCompany || job.aboutCompany;
            job.skillsRequired = skillsRequired || job.skillsRequired;
            const updatedJob = await job.save();
            return res.status(200).json({
            message: 'Job updated successfully',
            data: updatedJob,
            error: null
        })
        } else {
            return res.status(401).json({
                message: 'Not found!',
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Internal server error',
            error: error
        })
    }
})

app.listen(process.env.PORT, () => {
    mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log(`Server running on port ${process.env.PORT}`)).catch((err) => console.log("Error occured", err))
})

//Error handling middlewares
app.all('*',(req,res,next)=>{  
    const err = new Error('Something went wrong! Please try after some time.');
    err.status = 'fail';
    err.statusCode = 404;
    next(err);
})
app.use((error,req,res,next)=>{
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 500;
    res.status(error.statusCode).json({
        status:error.statusCode,
        message:error.message
    })
})

