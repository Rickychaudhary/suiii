import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { cookieOptions } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

const adminLogin = TryCatch(async (req,res,next) => {
    const {secretKey} = req.body;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "chinki"
    const isMatch = secretKey === adminSecretKey;

    if(!isMatch) return next(new ErrorHandler("Invalid Admin Key", 401));

    const token = jwt.sign(secretKey,process.env.JWT_SECRET);

    return res
      .status(200)
      .cookie("admin-token",token, {...cookieOptions, maxAge: 1000*60*15})
      .json({
        success: true,
        message: "Authenticated Successfully",
       })
});

const adminData = TryCatch(async(req,res,next) => {
    return res.status(200).json({
        admin: true,
    });
});

const allUsers = TryCatch(async(req,res) => {
    const users = await User.find({});

    const tranfromedUsers = await Promise.all(users.map(async ({name,username,avatar,_id}) => {
        const [groups,friends] = await Promise.all([
            Chat.countDocuments({groupchat: true, members: _id }),
            Chat.countDocuments({groupchat: false, members: _id}),
        ]);

        return {
            name,
            username,
            avatar: avatar.url,
            _id,
            groups,
            friends,
        };
    }));

    return res.status(200).json({
        success: true,
        users: tranfromedUsers,
    });
});

const allChats = TryCatch(async (req,res) => {
    const chats = await Chat.find({}).populate("members", "name avatar").populate("creator", "name avatar");
    
    const transformedChat = await Promise.all(chats.map(async({members,_id,groupchat,name,creator}) => {
        const totalMessages = await Messsage.countDocuments({chat: _id});
        return {
            _id,
            groupchat,
            name,
            avatar: members.slice(0,3).map((member) =>member.avatar.url),
            members: members.map(({_id,name,avatar}) => (
                 {
                    _id,
                    name,
                    avatar: avatar.url,
                }
            )),
            creator: {
                name: creator?.name || "None",
                avatar: creator.avatar.url || "",
            },
            totalMessages,
        };
    }));

    res.status(200).json({
        success: true,
        chats: transformedChat,
    });
});

const allMessages = TryCatch(async(req,res) => {
    const messages = await Message.find({}).populate("sender", "name avatar").populate("chat", "groupchat");
    
    const transformedMessages = messages.map(({content,attachments, _id,sender,createdAt,chat}) => ({
            _id,
            attachments,
            content,
            createdAt,
            chat: chat._id,
            groupchat: chat.groupchat,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url,
            },
    }));

    res.status(200).json({
        success: true,
        messages: transformedMessages,
    });

})

const DashboardStats = TryCatch(async(req,res) => {
     const [groupsCnt,usersCnt,messageCnt,totalCnt] = await Promise.all([
        Chat.countDocuments({groupchat: true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
     ]);
     const today = new Date();
     const last7Days = new Date();
     last7Days.setDate(last7Days.getDate()-7);
     const last7Daysmsg = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lte: today,
        },
     }).select("createdAt");

    const messages = new Array(7).fill(0);
    const dayinms = 1000*60*60*24;
    
    last7Daysmsg.forEach(message => {
        const index = Math.floor((today.getTime() - message.createdAt.getTime()) / dayinms);
        messages[6-index]++;
    });

    const stats = {
        groupsCnt,
        usersCnt,
        messageCnt,
        totalCnt,
    }
    res.status(200).json({
        success: true,
        Stats: stats,
    });

});

const adminLogout = TryCatch(async (req,res,next) => {
    return res
      .status(200)
      .cookie("admin-token","", {...cookieOptions, maxAge: 0})
      .json({
        success: true,
        message: "Logged Out Successfully",
       })
});

export 
  {
    allUsers,
    allChats,
    allMessages,
    DashboardStats,
    adminLogin,
    adminLogout,
    adminData,
  }