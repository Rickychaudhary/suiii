import { body,  param,  validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req,res,next) => {
    const errors = validationResult(req);
    const errorMessages = errors.array().map((error)=> error.msg).join(", ");

    if(errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMessages,400));
}

const registerValidator = () => [
    body("name", "Please Enter  Name").notEmpty(),
    body("username", "Please Enter username").notEmpty(),
    body("password", "Please Enter  password").notEmpty(),
    body("bio", "Please Enter  Bio").notEmpty(),
];

const loginValidator = () => [
    body("username", "Please Enter valid username").notEmpty(),
    body("password", "Please Enter valid password").notEmpty(),
];

const newGroupValidator = () => [
    body("name", "Please Enter valid name").notEmpty(),
    body(["members"]).notEmpty().withMessage( "Please Enter members").isArray({min: 2, max:99}).withMessage( "Group Limit Reached"),
];

const AddMemberValidator = () => [
    body("chatId", "Please Enter valid chatId").notEmpty(),
    body("members").notEmpty().withMessage( "Please Enter members").isArray({min: 1, max:95}).withMessage( "Group Limit Reached"),
];

const RemoveMemberValidator = () => [
    body("chatId", "Please Enter valid chatId").notEmpty(),
    body("userId").notEmpty().withMessage( "Please Enter userId"),
];

const attachmentValidator = () => [
    body("chatId", "Please Enter valid chatId").notEmpty(),
];

const ChatIdValidator = () => [
    param("id", "Please Enter Chat Id").notEmpty(),
];

const renameValidator = () => [
    param(["id", "Please Enter Chat Id"]).notEmpty(),
    body(["name", "Please Enter new group name"]).notEmpty(),
];

const SendRequestValidator = () => [
    body("userId", "Please Enter User ID").notEmpty(),
];

const acceptRequestValidator = () => [
    body("requestId", "Please Enter Request ID").notEmpty(),
    body("accept").notEmpty().withMessage("Please Add Accept").isBoolean().withMessage("It must be boolean"),
];

const adminValidator = () => [
    body("secretKey", "Please Enter Secret Key").notEmpty(),
];


export
 {
    renameValidator,
    ChatIdValidator,
    registerValidator,
    RemoveMemberValidator,
    AddMemberValidator,
    validateHandler,
    loginValidator,
    newGroupValidator,
    attachmentValidator,
    SendRequestValidator,
    acceptRequestValidator,
    adminValidator,
};