const express=require('express')
const urlModel=require("../models/urlModel")
const shortid=require("shortid")
const redis = require("redis");
const { promisify } = require("util");
const  util =require("util")

const redisClient = redis.createClient(
    10123,
    "redis-10123.c244.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
  );
  redisClient.auth("qPW04s20Rjc9GRpAuBm1MgCiKrcbvVnX", function (err) {
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

        let cachedUrl = await GET_ASYNC(`${longUrl}`)
        if (cachedUrl) {
            let url = JSON.parse(cachedUrl)
            return res.status(200).send({ status: true, message: "data from redis", redisData: url })
        }

        let dbCallUrl = await urlModel.findOne({ longUrl })
        if (dbCallUrl) {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(dbCallUrl))
            return res.status(200).send({ status: false, message: "data from db", data: dbCallUrl })
        }



        const urlbody={longUrl,shortUrl,urlCode}

        let save= await urlModel.create(urlbody)

        const urlData={
            longUrl:save.longUrl,
            shortUrl:save.shortUrl,
            urlCode:save.urlCode
        }
        await SET_ASYNC(`${longUrl}`, JSON.stringify(urlData))
        return res.status(201).send({ status: true, data: urlData })
 }
     

    catch(error){
        return res.status(500).send({status:false,message:error.message})
    }

}


const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode

        if (!isValid(urlCode)) {
            return res.status(400).send({ status: false, message: "Urlcode is not present" })
        }

        //checking url in cache server memory
        const isUrlCached = await GET_ASYNC(`${urlCode}`)
        if (isUrlCached) return res.status(302).redirect(JSON.parse(isUrlCached).longUrl)

        //saving Url in cache server memory
        const isAlreadyUrlInDb = await urlModel.findOne({ urlCode: urlCode })
        if (!isAlreadyUrlInDb) return res.status(404).send({ status: false, message: "Unable to find URL to redirect to....." })

        await SET_ASYNC(`${urlCode}`, JSON.stringify(isAlreadyUrlInDb))
        return res.status(302).redirect(isAlreadyUrlInDb.longUrl);
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}





module.exports.createUrl=createUrl;
module.exports.getUrl=getUrl;