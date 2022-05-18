const express=require('express')
const urlModel=require("../models/urlModel")
const shortid=require("shortid")
const redis = require("redis");
const { promisify } = require("util");
const  util =require("util")

const redisClient = redis.createClient(
    13190,
    "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
  );
  redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
    if (err) throw err;
  });
  
  redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
  });
  
 
  
  //Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const isValid=function(value){
    if(typeof value==="undefined"||typeof value===null)return false
    if(typeof value==="String"&& value.trim().length==0)return false
    return true
}
const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

const createUrl=async function(req,res){
    try{
       let requestBody = req.body
       let longUrl =requestBody.longUrl

       const baseUrl = "https://localhost:3000"
       if(!isValidRequestBody(requestBody)){
           return res.status(400).send({status:false,message:"Invalid request parameter  please provide data insite body"})
       }
      if(!isValid(longUrl)){
          return res.status(400).send({status:false,message:"Please provide longUrl"})
        }

       let validLongUrl = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%\+.#?&//=]*)/.test(longUrl.trim()))
        if (!validLongUrl) {
            return res.status(400).send({ status: false, msg: "Please provide a valid longUrl" })
        }
        const checkUrl = await urlModel.findOne({longUrl})
        if(checkUrl){
            return res.status(400).send({status:false,message:"This Url is Already exist", data :checkUrl})
        }

        const urlCode= shortid.generate().toLowerCase()

        const shortUrl= baseUrl + '/' + urlCode



        const urlbody={longUrl,shortUrl,urlCode}

        let save= await urlModel.create(urlbody)

        const urlData={
            longUrl:save.longUrl,
            shortUrl:save.shortUrl,
            urlCode:save.urlCode
        }
        return res.status(302).send({status:true,data:urlData})
    }
     

    catch(error){
        return res.status(500).send({status:false,message:error.message})
    }

}
const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode

        let findUrl = await urlModel.find({ urlCode: urlCode }).select({longUrl:1})
        if (!findUrl)
            return res.status(404).send({ status: false, message: 'URL not found.' })

        res.status(200).send({ status: true, message: 'Redirecting to Original URL.', data: findUrl})

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}



module.exports.createUrl=createUrl;
module.exports.getUrl=getUrl;