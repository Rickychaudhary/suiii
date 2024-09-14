import express from "express";
import { SendfriendRequest, acceptfriendRequest, getMyProfile, login,logout,myFriends,myNotifications,newUser,searchUser} from "../controller/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import {isAuthenticated} from "../middlewares/auth.js";
import { SendRequestValidator, acceptRequestValidator, loginValidator, registerValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();

app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler,  login);


app.use(isAuthenticated);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/search", searchUser);

app.put("/sendrequest",SendRequestValidator(),validateHandler, SendfriendRequest);
app.put("/acceptrequest",acceptRequestValidator(),validateHandler, acceptfriendRequest);

app.get("/notifications", myNotifications);

app.get("/friends", myFriends);

export default app;   