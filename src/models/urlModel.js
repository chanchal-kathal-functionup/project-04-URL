const mongoose=require("mongoose")
const urlSchema = new mongoose.Schema({
     ulrCode:{ type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true


     },
     longUrl:{type:String,
        required:true,
        trim:true

     },
     shortUrl:{type:String,
         required:true,
        unique:true,
        trim:true

     }
},{timestamps:true})
module.exports=mongoose.model("URL",urlSchema)