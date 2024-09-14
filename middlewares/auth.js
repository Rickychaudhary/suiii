import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import {TryCatch} from "./error.js";
import { usertoken } from "../constants/config.js";
import { User } from "../models/user.js";



const isAuthenticated =  TryCatch((req,res,next) => {
    const token = req.cookies[usertoken];
    if(!token) return next(new ErrorHandler("Please Login to access this route", 401));
    
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    //console.log(decodedData);
    req.user = decodedData._id;
     next();
});

const isAdmin = (req,res,next) => {
    const token = req.cookies["admin-token"];
    if(!token) 
        return next( new ErrorHandler("Only Admin access this route", 401));

    const secretKey = jwt.verify(token, process.env.JWT_SECRET);
    
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "chinki"
    const isMatch = secretKey === adminSecretKey;
    if(!isMatch) return next(new ErrorHandler("Invalid Admin Key", 401));

    next();
};

const socketAuthenticator = TryCatch(async (err,socket,next) => {
      //console.log("Socket : ", socket.request.cookies);
       try {
          if(err) return next(err);
          const authToken = socket.request.cookies[usertoken];
          if(!authToken) return next(new ErrorHandler("Please Login to access this route", 401));
          const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
         // console.log("Data: ",decodedData);
          const user = await User.findById(decodedData._id);
          if(!user) return next(new ErrorHandler("Please Login to access this route", 401));
          socket.user = user;
          return next();
       } catch (error) {
           //console.log(error);
           return next(new ErrorHandler("Please Login to access this route", 401));
       }
})

export {isAuthenticated,isAdmin,socketAuthenticator};