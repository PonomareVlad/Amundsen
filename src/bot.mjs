import "grammy-debug-edge";
import {
    MongoRealmClient
} from "mongo-realm-web-wrapper";
import {
    MongoDBAdapter
} from "@grammyjs/storage-mongodb";
import {
    conversations,
    createConversation
} from "@grammyjs/conversations";
import {Bot, session} from "grammy";

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
export const bot = new Bot(token);

const mongo = new MongoRealmClient({url, key, serviceName});
const collection = mongo.db("Amundsen").collection("users");

bot.use(
    session({
        initial: () => ({
            registered: new Date(),
        }),
        storage: new MongoDBAdapter({
            collection
        }),
    })
);

bot.use(conversations());

async function registration(conversation, ctx) {

    await ctx.reply("registration");

}

bot.use(createConversation(registration, "registration"));

bot.command("start", ctx => ctx.conversation.enter("registration"));

// Sample handler for a simple echo bot
bot.on("message:text", ctx => ctx.reply(ctx.msg.text));
