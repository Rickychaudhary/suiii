import multer from "multer";

 const multerUpload = multer({
    limits: {
          fileSize: 1024*1024*20,
         },
});

const singleAvatar = multerUpload.single("avatar");
const attachmentMulter = multerUpload.array("files", 7);

export { singleAvatar, attachmentMulter};