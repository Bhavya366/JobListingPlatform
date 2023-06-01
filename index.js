const express=require('express')
const bodyParser=require('body-parser')
const mongoose=require('mongoose')
const dotenv=require('dotenv')
dotenv.config()
const app=express()

// Middlewares
app.use(bodyParser.urlencoded({extended:false}))
app.use(express.static('./public'))

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

const Job = mongoose.model('Job',{
    companyName:String,
    logoUrl:String,
    jobPosition:String,
    monthlySalary:Number,
    jobType:Object,
    remoteOff:Object,
    location:String,
    jobDescription:String,
    aboutCompany:String,
    skills:Object,
})

app.listen(process.env.PORT,()=>{
    mongoose.connect(process.env.MONGODB_URL,{
        useNewUrlParser:true,
        useUnifiedTopology:true,
    }).then(()=>console.log(`Server running on port ${process.env.PORT}`)).catch((err)=>console.log("Error occured",err))
})