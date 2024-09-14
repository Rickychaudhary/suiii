import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import {faker, simpleFaker} from "@faker-js/faker";

const createUser = async (numUsers) => {
    try {
        const usersPromise = [];
        for(let i=0;i<numUsers;i++) {
            const tempUser = User.create({
                name: faker.person.fullName(),
                username: faker.internet.userName(),
                bio: faker.lorem.sentence(11),
                password: "1234567",
                avatar: {
                    url: faker.image.avatar(),
                    public_id: faker.system.fileName(),
                },
            });
            usersPromise.push(tempUser);
        }
        await Promise.all(usersPromise);
        console.log("Users Created");
        process.exit();

    } catch (e) {
        console.error("tmkc",e);
        process.exit(1);
    }
};

const createSingleChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise =[];

        for(let i=0;i<users.length;i++) {
            for(let j = i+1;j<users.length;j++) {
                chatsPromise.push(
                    Chat.create({
                        name: faker.lorem.word(2),
                        members: [users[i],users[j]],
                    })
                );
            }
        }
        await Promise.all(chatsPromise);
        console.log("Chats created");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit();
    }
};

const GroupChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");
        const chatsPromise =[];

        for(let i=0;i<numChats;i++) {
            const numMembers = simpleFaker.number.int({ min: 3,max:users.length});
            const members =[];
            for(let j = i+1;j<numMembers;j++) {
                const randomIndex = Math.floor(Math.random()*users.length);
                const randomUser = users[randomIndex];
                if(!members.includes(randomUser)) {
                    members.push(randomUser);
                }
            }
            const chat = Chat.create({
                groupChat: true,
                name: faker.lorem.words(1),
                members,
                creator: members[0],
            });
            chatsPromise.push(chat);
        }
        await Promise.all(chatsPromise);
        console.log("Group Chats created");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit();
    }
}

const createMessages = async (numMessages) => {
    try {
        const users = await User.find().select("_id");
        const chats = await Chat.find().select("_id");

        const messagesPromise = [];

        for(let i=0;i<numMessages;i++) {
            const randomIndex = Math.floor(Math.random()*users.length);
            const randomUser = users[randomIndex];
            const randomChat = chats[Math.floor(Math.random()*chats.length)];

            messagesPromise.push(
                Message.create({
                    chat: randomChat,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            );
        }
        await Promise.all(messagesPromise);
        console.log("Messages created");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit();
    }
}

const createMessagesinChat = async (chatId,numMessages) => {
    try {
        const users = await User.find().select("_id");

        const messagesPromise = [];

        for(let i=0;i<numMessages;i++) {
            const randomIndex = Math.floor(Math.random()*users.length);
            const randomUser = users[randomIndex];

            messagesPromise.push(
                Message.create({
                    chat: chatId,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            );
        }
        await Promise.all(messagesPromise);
        console.log("Messages in chat are created");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit();
    }
}

export {createUser,createSingleChats,GroupChats,createMessages,createMessagesinChat};