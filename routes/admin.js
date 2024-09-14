import express from "express";
import { DashboardStats, adminData, adminLogin, adminLogout, allChats, allMessages, allUsers } from "../controller/admin.js";
import { adminValidator, validateHandler } from "../lib/validators.js";
import cookieParser from "cookie-parser";
import { isAdmin } from "../middlewares/auth.js";


const app = express.Router();

app.use(cookieParser());



app.post("/verify", adminValidator(),validateHandler,adminLogin);
app.get("/logout",adminLogout);


app.use(isAdmin);
//Only admin can access these files 
app.get("/",adminData);
app.get("/users", allUsers);
app.get("/chats", allChats);
app.get("/messages", allMessages);
app.get("/stats", DashboardStats);


export default app;   