import { compare } from 'bcrypt';
import { NEW_REQUEST, REFETCH_CHATS } from '../constants/event.js';
import { getOtherMember } from '../lib/helper.js';
import { TryCatch } from '../middlewares/error.js';
import { Chat } from '../models/chat.js';
import { Request } from "../models/request.js";
import { User } from '../models/user.js';
import { cookieOptions, emitEvent, sendToken, uploadToCloudinary } from '../utils/features.js';
import { ErrorHandler } from '../utils/utility.js';


const newUser = TryCatch(async (req, res, next) => {
    const { name, username, password, bio } = req.body;
    const file = req.file;
  
    if (!file) {
      return next(new ErrorHandler("Please upload an avatar", 400));
    }
    try {
      const result = await uploadToCloudinary([file]);

      const avatar = {
        public_id: result[0].public_id,
        url: result[0].url,
      };
      ////console.log(avatar);
  
      const user = await User.create({
        name,
        bio,
        username,
        password,
        avatar,
      });
  
      sendToken(res, user, 201, "User created");
    } catch (error) {
        ////console.log(error);
      return next(new ErrorHandler("Error uploading avatar", 500));
    }
  });

const login = TryCatch(async(req,res,next) => {
    const {username,password} = req.body;

    const user = await User.findOne({username}).select(" +password");
    if(!user) return next(new ErrorHandler("Invalid username",400));
 
    const isMatch = await compare(password, user.password);
 
    if(!isMatch) return next(new ErrorHandler("Invalid Credentials",400));
   
   sendToken(res,user,200,`Welcome Back, ${user.name}`);
});

const getMyProfile = TryCatch(async(req,res) => {
    const user = await User.findById(req.user);
    res.json({
        successs: "true",
        user,
    });
});

const logout = TryCatch(async(req,res) => {
    return res.status(200).cookie("user-token","",{...cookieOptions, maxAge: 0})
               .json({
                    success: true,
                    message: "Logged out successfully",
               });
});

const searchUser = TryCatch(async (req, res) => {
    const { name = "" } = req.query;
    //console.log("Authenticated User: ", req.user);
    const mychats = await Chat.find({groupchat: false, members: req.user });

    //console.log("My Chats: ", mychats);

    const allfriends = mychats.map((chat) => chat.members).flat();

    //console.log("All Friends IDs: ", allfriends);

    const allOtherUsers = await User.find({
        _id: { $nin: allfriends },
        name: { $regex: name, $options: "i" },
    });

    const users = allOtherUsers.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
    }));

    //console.log("Users : ", users);

    return res.status(200).json({
        success: true,
        users,
    });
});


const SendfriendRequest = TryCatch(async (req, res, next) => {
    const { userId } = req.body;

    // console.log("Received friend request for userId:", userId);
    // console.log("Authenticated user:", req.user);

    if (!userId) {
        console.log("Invalid userId received:", userId);
        return next(new ErrorHandler("Invalid userId", 400));
    }

    try {
        const request = await Request.findOne({
            $or: [
                { sender: req.user, receiver: userId },
                { sender: userId, receiver: req.user },
            ],
        });

        if (request) {
           // console.log("Request already exists:", request);
            return next(new ErrorHandler("Request already sent", 400));
        }

        const newRequest = await Request.create({
            sender: req.user,
            receiver: userId,
        });

       // console.log("Friend request sent successfully:", newRequest);

        emitEvent(req, NEW_REQUEST, [userId]);

        return res.status(200).json({
            success: true,
            message: "Friend Request Sent",
        });
    } catch (error) {
        console.error("Error while sending friend request:", error);
        return next(new ErrorHandler("Failed to send friend request", 500));
    }
});


const acceptfriendRequest = TryCatch(async (req, res, next) => {
    const { requestId, accept } = req.body;

    //console.log("Request received with requestId:", requestId, "and accept:", accept);

    if (!requestId) {
        console.log("Invalid requestId received:", requestId);
        return next(new ErrorHandler("Invalid requestId", 400));
    }

    const request = await Request.findById(requestId).populate("sender", "name").populate("receiver", "name");
    if (!request) {
        console.log("Request not found with requestId:", requestId);
        return next(new ErrorHandler("Request not found", 400));
    }

   // console.log("Request found:", request);

    if (!request.receiver) {
        console.log("Request has no receiver");
        return next(new ErrorHandler("Request has no receiver", 400));
    }

    if (request.receiver._id.toString() !== req.user.toString()) {
        console.log("User not authorized to accept this request");
        return next(new ErrorHandler("You are not authorized to accept this request", 401));
    }

    if (!accept) {
        await request.deleteOne();
       // console.log("Friend request rejected and removed:", requestId);
        return res.status(200).json({
            success: true,
            message: "Friend Request Rejected",
        });
    }

    const members = [request.sender._id, request.receiver._id];
   // console.log("Members to be added to chat:", members);

    await Promise.all([
        Chat.create({
            members,
            name: `${request.sender.name}-${request.receiver.name}`,
        }),
        request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

   // console.log("Friend request accepted and chat created for members:", members);

    return res.status(200).json({
        success: true,
        message: "Friend Request Accepted",
        senderId: request.sender._id,
    });
});


const myNotifications = TryCatch(async(req,res) => {
    const requests = await Request.find({receiver: req.user}).populate("sender", "name avatar");

    const allRequests = requests.map(({_id,sender}) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
        },
    }));
    return res.status(200)
               .json({
                    success: true,
                     allRequests,
               });
});

const myFriends = TryCatch(async (req, res) => {

    const { chatId } = req.query;

    //console.log("Extracted chatId: ", chatId);
    //console.log("Authenticated user: ", req.user);

    // Find chats where the authenticated user is a member
    const chats = await Chat.find({
        members: req.user,
        groupchat: false,
    }).populate("members", "name avatar");

    //console.log("Retrieved chats and members:", chats); 

    // Extract friends from the chats
    const friends = chats.map(({ members }) => {
        const otherUser = getOtherMember(members, req.user);
        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url,
        };
    });

    //console.log("Friends list: ", friends);

    if (chatId) {
        const chat = await Chat.findById(chatId);

        const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id));
        //console.log("available friends list : ",availableFriends);
        return res.status(200).json({
            success: true,
            friends,
        });
    } else {
        //console.log("friends list : ", friends);
        return res.status(200).json({
            success: true,
            friends,
        });
    }
});

  
  
  
  
  
  


export {
    SendfriendRequest,
    acceptfriendRequest, getMyProfile, login, logout, myFriends, myNotifications, newUser, searchUser
};
