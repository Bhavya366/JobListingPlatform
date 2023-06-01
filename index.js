const express=require('express')
const bodyParser=require('body-parser')
const mongoose=require('mongoose')
const dotenv=require('dotenv')
dotenv.config()
const app=express()

// Middlewares
app.use(bodyParser.urlencoded({extended:false}))
app.use(express.static('./public'))


app.listen(process.env.PORT,()=>{
    mongoose.connect(process.env.MONGODB_URL,{
        useNewUrlParser:true,
        useUnifiedTopology:true,
    }).then(()=>console.log(`Server running on port ${process.env.PORT}`)).catch((err)=>console.log("Error occured",err))
})