import "grammy-debug-edge";
import {Bot, session} from "grammy";
import {MongoClient} from "mongo-realm-web-wrapper";
import {MongoDBAdapter} from "@grammyjs/storage-mongodb";
import {conversations, createConversation} from "@grammyjs/conversations";

/**
 * @typedef {import("grammy").Context} Context
 * @typedef {import("@grammyjs/types").Chat} Chat
 * @typedef {import("grammy").SessionFlavor} SessionFlavor
 * @typedef {import("@grammyjs/storage-mongodb").ISession} ISession
 * @typedef {import("mongo-realm-web-wrapper").Collection} Collection
 * @typedef {import("@grammyjs/conversations").Conversation} Conversation
 * @typedef {import("@grammyjs/conversations").ConversationFlavor} ConversationFlavor
 *
 * @typedef {{registered: Date} & Chat} SessionData
 * @typedef {Context & ConversationFlavor & SessionFlavor<SessionData>} BotContext
 */

export const {

    DATA_API_URL: url,
    DATA_API_KEY: key,
    DATA_SOURCE_NAME: serviceName,

    // Telegram bot token from t.me/BotFather
    TELEGRAM_BOT_TOKEN: token,

    // Secret token to validate incoming updates
    TELEGRAM_SECRET_TOKEN: secretToken = String(token).split(":").pop()

} = process.env;

// Default grammY bot instance
export const bot = /** @type {Bot<BotContext>} */ new Bot(token);

const mongo = new MongoClient({url, key, serviceName});
const collection = mongo.db("Amundsen").collection("users");

bot.use(
    session({
        initial: () => ({
            registered: new Date(),
        }),
        storage: new MongoDBAdapter({
            /** @type {Collection<ISession>} */ collection
        })
    })
);

bot.use(conversations());

async function registration(/** @type {Conversation<BotContext>} */ conversation, ctx) {

    await ctx.reply("registration");

}

bot.use(createConversation(registration, "registration"));

bot.command("start", ctx => ctx.conversation.enter("registration"));

// Sample handler for a simple echo bot
bot.on("message:text", ctx => ctx.reply(ctx.msg.text));
