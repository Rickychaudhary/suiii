import express from "express";
import {isAuthenticated} from "../middlewares/auth.js";
import { newGroupChat,myChats, getMyGroups, addMembers, removeMembers, leaveGroup, sendAttachment, getChatDetails, renameGroup, deleteChat, getMessages } from "../controller/chat.js";
import { attachmentMulter } from "../middlewares/multer.js";
import { AddMemberValidator, ChatIdValidator, RemoveMemberValidator, attachmentValidator,  newGroupValidator, renameValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/new", newGroupValidator(),validateHandler, newGroupChat);

app.get("/my", myChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers",AddMemberValidator(),validateHandler, addMembers);

app.put("/removemember",RemoveMemberValidator(),validateHandler, removeMembers);

app.delete("/leave/:id", ChatIdValidator(),validateHandler, leaveGroup);

app.post("/message", attachmentMulter,attachmentValidator(),validateHandler, sendAttachment);

app.get("/message/:id",ChatIdValidator(),validateHandler, getMessages);

app.route("/:id").get( ChatIdValidator(),validateHandler ,getChatDetails).put( renameGroup).delete( ChatIdValidator(),validateHandler ,deleteChat);

export default app;