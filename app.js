import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { errorMiddleware } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";

import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import { corsOptions } from "./constants/config.js";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT, STOP_TYPING, START_TYPING, CHAT_JOINED, CHAT_LEAVED, ONLINE_USERS } from "./constants/event.js";
import { getSockets } from "./lib/helper.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { Message } from "./models/message.js";

import AdminRoute from "./routes/admin.js";
import chatRoute from "./routes/chat.js";
import userRoute from "./routes/user.js";

dotenv.config ({
    path: "./.env",
})
const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "chinki";
const userSocketIDs = new Map();
const onlineUsers = new Set();


connectDB(mongoURI);
 //createUser(11);
//createSingleChats(11);
//GroupChats(11);
//createMessages();
//createMessagesinChat();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors: corsOptions,
});
app.set("io",io);

//Middlewares 
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", AdminRoute);

//Home Route
app.get("/", (req,res) => {
    res.send("Hello Chinki");
});

io.use((socket,next)=> {
    cookieParser()(socket.request,socket.request.res, async (err) => {
        await socketAuthenticator(err,socket,next)
    }); 
});

io.on("connection", (socket) => {
       const user = socket.user;
       //console.log("socket user : ",user);
       userSocketIDs.set(user._id.toString(),socket.id);

    socket.on(NEW_MESSAGE, async({ chatId, members, message,avatar})=> {

        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name,
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        };

        const messageforDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        };

       const membersSocket = getSockets(members);
       io.to(membersSocket).emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
       });
       io.to(membersSocket).emit(NEW_MESSAGE_ALERT,{chatId});

       try {
        await Message.create(messageforDB);
       } catch (error) {
         console.log("error while adding message to Db: ",error);
       }
    });

    socket.on(START_TYPING, ({members,chatId}) => {
        const membersSockets =  getSockets(members);
        socket.to(membersSockets).emit(START_TYPING, {chatId});
    });
    socket.on(STOP_TYPING, ({members,chatId}) => {
        const membersSockets =  getSockets(members);
        socket.to(membersSockets).emit(STOP_TYPING, {chatId});
    });

    // socket.on(CHAT_JOINED, ({userId,members}) => {
    //     onlineUsers.add(userId.toString());
    //     const membersSocket = getSockets(members);
    //     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    // });
    // socket.on(CHAT_LEAVED, ({userId,members}) => {
    //     onlineUsers.delete(userId.toString());
    //     const membersSocket = getSockets(members);
    //     io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    // });

    // socket.on("disconnect", ()=> {
    //     console.log("Disconnected");
    //     userSocketIDs.delete(user._id.toString());
    //       onlineUsers.delete(userId.toString());
    //        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    // });
});

//Error Midlleware
app.use(errorMiddleware);


server.listen(3000,()=> {
    console.log(`server is running on port ${port} in ${envMode} mode`);
})

export { adminSecretKey, envMode, userSocketIDs };

