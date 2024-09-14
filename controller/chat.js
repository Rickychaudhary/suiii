import { ALERT, NEW_ATTACHMENT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";  
import { deleteFilesFromCloudinary, emitEvent, uploadToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

const newGroupChat = TryCatch(async(req,res,next) => {
      const {name, members} = req.body;

      if(members.length < 2) 
        return next( new ErrorHandler("Group chat must have at least 3 members",400));
     
    const allMembers = [...members, req.user];
     
    await Chat.create({
        name,
        groupchat: true,
        creator: req.user,
        members: allMembers,
    });
    emitEvent(req,ALERT, allMembers,`Welcome to ${name} group`);
    emitEvent(req,REFETCH_CHATS,members);

    return res.status(201).json({
        success: true,
        message: "Group  created",
    });
});
 
const myChats = TryCatch(async(req,res,next) => {
   const chats = await Chat.find({members: req.user}).populate(
    "members",
     "name avatar",
    );
    //console.log(req.user);
    //console.log("chats: ", chats);
   const transformedChats = chats.map(({_id,name,members,groupchat}) => {
       
        const otherMember = getOtherMember(members,req.user);

          return {
            _id,
            groupchat,
            avatar:groupchat?members.slice(0,3).map(({avatar})=> avatar.url):[otherMember.avatar.url],
            name:groupchat?name : otherMember.name,
            members: members.reduce((prev,curr)=> {
                if(curr._id.toString() !== req.user.toString()){
                    prev.push(curr._id);
                }
                return prev;
            },[]),
          };
   });
   //console.log("Transformed Chats : ", transformedChats);
  return res.status(200).json({
      success: true,
      chats: transformedChats,
  });
});

const getMyGroups = TryCatch(async(req,res,next) => {
    //console.log("Requested User ID: ", req.user);

    const chats = await Chat.find({
        members: { $in: [req.user] },
        groupchat: true,
        creator: req.user,
    }).populate("members", "name avatar");
    
    //console.log("Chats: ", chats);

    const groups = chats.map(({members,_id,groupchat,name}) =>({
         _id,
         groupchat,
         name,
         avatar: members.slice(0,3).map(({avatar}) => avatar.url),
    }));
    //console.log("My Groups : ",groups);
    return res.status(200).json({
        success: true,
        groups,
    });
});

const addMembers = TryCatch(async(req,res,next) => {

    const {chatId,members} = req.body;

    // console.log("chatId : ",chatId);
    // console.log("Members : ",members);

    if(!members || members.length < 1)  return next(new ErrorHandler("Please provide members",400));

    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat",400));
    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to add members", 403));

    const allNewMembersPromise = members.map((i) => User.findById(i,"name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);
    const uniqueMembers = allNewMembers.filter((i)=> !chat.members.includes(i._id.toString())).map((i)=> i._id);

    chat.members.push(...uniqueMembers);

    if(chat.members.length > 100) 
         return next(new ErrorHandler("Group Limit reached",400));

    await chat.save();

    const allUserName = allNewMembers.map((i)=> i.name).join(",");
    emitEvent(
        req,
        ALERT,
        chat.members,
        `${allUserName} added to the group`
    );
    emitEvent(req,REFETCH_CHATS,chat.members);
    return res.status(200).json({
        success: true,
        message:"Added members successfully",
    });
});

const removeMembers = TryCatch(async(req,res,next) => {

    const {chatId,userId} = req.body;

    // console.log("chatId : ",chatId);
    // console.log("Removed  user : ",userId);

    const [chat,RemovedUser] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId, "name"),
    ]);

    // console.log("chat : ", chat);
    // console.log("User to Remove : ",RemovedUser);
    
    if(!chat.members || chat.members.length < 1)  return next(new ErrorHandler("Please provide members",400));

    if(!chat) return next(new ErrorHandler("Chat not found",404));
    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat",400));
    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to Remove members", 403));
    if(chat.members.length <=3)  return next(new ErrorHandler("Group Must have at least 3 members", 400));

 
    const allChatmembers = chat.members.map((i) => i.toString());
  
   // console.log("All chat members : ",allChatmembers);
    chat.members = chat.members.filter((member)=> member.toString() !== userId.toString());

    await chat.save();
     
    emitEvent(
        req,
        ALERT,
        chat.members,
        {message: `${RemovedUser} removed from  the group`, chatId}
    );
    emitEvent(req,REFETCH_CHATS,allChatmembers);
    return res.status(200).json({
        success: true,
        message:"Member Removed successfully",
    });
});

const leaveGroup = TryCatch(async(req,res,next) => {

    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    
    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat",400));
     const remainingMembers = chat.member.filter((member) => member.toString() !== req.user.toString());
    if(chat.creator.toString() === req.user.toString()) {
         const random = Math.floor(Math.random()*remainingMembers.length);
         const newCreator = remainingMembers[random];
         chat.creator = newCreator;
    }

    chat.members = remainingMembers;
    const [userLeft] = await Promise.all([User.findById(req.user, "name"),chat.save()]);
    emitEvent(req,ALERT,chat.members, {
        chatId,
        message: `User ${userLeft} left the group`,
    });

    return res.status(200).json({
        success: true,
        message:"somebody left the Group",
    });
});

const sendAttachment = TryCatch(async(req,res,next) => {
     const {chatId} = req.body;
     const files = req.files || [];

     if(files.length <1) return next(new ErrorHandler("Please Provide attachments", 400)); 
     if(files.length >7) return next(new ErrorHandler("Files Can't be more than 5 (Thala for a reason)", 400));

     const [chat,me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user, "name avatar"),
        ]);

     if(!chat) return next(new ErrorHandler("Chat not found",404));


     const attachments = await uploadToCloudinary(files);

     const messageforDB = {
        content: "",
        attachments,
        sender: me._id,
        chat: chatId,
     };

     const messageforRealtime = {
        ...messageforDB,
        sender: {
            id: me._id,
            name: me.name,
            },
    };
     const message = await Message.create(messageforDB);

     emitEvent(req, NEW_MESSAGE, chat.members, {
        message: messageforRealtime,
        chatId,
     });
     emitEvent(req, NEW_MESSAGE_ALERT,chat.members, {chatId});

     return res.status(200).json({
        success: true,
        message,
     });
});

const getChatDetails = TryCatch(async(req,res,next) => {
    
    if(req.query.populate === "true") {
        const chat = await Chat.findById(req.params.id).populate("members", "name avatar").lean();
        //console.log("chat : ", chat);

       if(!chat) return next(new ErrorHandler("chat not found", 404));

        chat.members =  chat.members.map(({_id,name,avatar}) => ({
            _id,
            name,
            avatar: avatar.url,
        }));
       
        return res.status(200).json({
            success: true,
            chat,
         });
    } else {
        const chat = await Chat.findById(req.params.id);
        if(!chat) return next(new ErrorHandler("chat not found", 404));
        //console.log("chat : ", chat);
        return res.status(200).json({
            success: true,
            chat,
         });
    }
});

const renameGroup = TryCatch(async(req,res,next) => {
    const chatId = req.params.id;
    const {name} = req.body;
    const chat = await Chat.findById(chatId);

    // console.log("chat : ", chat);
    // console.log("new name : ", name);

    if(!chat) return next(new ErrorHandler("Chat not found",404));

    if(!chat.groupchat) return next(new ErrorHandler("This is not a group chat",400));

    if(chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to rename group", 403));

    chat.name = name;
    
    await chat.save();
    emitEvent(req, REFETCH_CHATS,chat.members);

    return res.status(200).json({
       success: true,
       message: "Group Name Changed",
    });
});

const deleteChat= TryCatch(async(req,res,next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);

    if(!chat) return next(new ErrorHandler("Chat not found",404));
    
    const members = chat.members;

    if(chat.groupchat && chat.creator.toString() !== req.user.toString()) return next(new ErrorHandler("You are not allowed to add members", 403));
    
    if(!chat.groupchat && !chat.members.includes(req.user.toString())) return next(new ErrorHandler("You are not allowed to add members", 403));

    const messagesWithAttachments = await Message.find({
        chat: chatId,
        attachments: { $exists: true, $ne: []},
    });

    const public_ids = [];

    messagesWithAttachments.forEach(({attachments}) => 
        attachments.forEach(({public_id}) => public_ids.push
         (public_id))
    );

    await Promise.all([
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({chat: chatId}),
    ]);
    emitEvent(req, REFETCH_CHATS,members);
    return res.status(200).json({
       success: true,
       message: "Chat Deleted Successfully",
    });
});

const getMessages = TryCatch(async(req,res,next) => {
    const chatId = req.params.id;
    const {page =1} = req.query;
    const limit = 21;
    const skip = (page-1)*limit;

    const chat = await Chat.findById(chatId);
    if(!chat) return next(new ErrorHandler("Chat not found",404));
    if(!chat.members.includes(req.user.toString())) {
        return next(new ErrorHandler("You are not allowed to access this chat ", 403));
    };

    const [messages,totalcnt] = await Promise.all([
        Message.find({chat: chatId})
        .sort({ createdAt: 1 })
          .skip(skip)
          .limit(limit)
          .populate("sender", "name avatar.url")
          .lean(),
        Message.countDocuments({chat: chatId}),
    ]);
    // console.log("Total count : ",totalcnt);
    //  console.log("Old Messages : ",messages);
    const totalpages = Math.ceil(totalcnt / limit) || 0;

    return res.status(200).json({
       success: true,
       messages,
       totalpages,
    });
});



export { addMembers, deleteChat, getChatDetails, getMessages, getMyGroups, leaveGroup, myChats, newGroupChat, removeMembers, renameGroup, sendAttachment };
