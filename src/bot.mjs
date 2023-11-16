import "grammy-debug-edge";
import {Bot, Keyboard, session} from "grammy";
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
 * @typedef {{registered: Date, profile: Record<string, string>} & Chat} SessionData
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

const categories = {
    "СМИ": "media",
    "Риелтор": "realtor",
    "Блогер/Инфлюенсер": "blogger",
};

const transports = {
    "На трансфере": "transfer",
    "На личном авто": "car",
}

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

bot.command("start", (ctx, next) => next(ctx.conversation.exit("registration")));

async function registration(/** @type {Conversation<BotContext>} */ conversation, ctx) {
    conversation.session.profile = {};
    await ctx.reply("* Приветствие *");
    await ctx.reply("* Запрос имени *", {
        reply_markup: Keyboard.from([[ctx.chat.first_name]]).resized().oneTime()
    });
    const first_name = await conversation.form.text();
    await ctx.reply("* Запрос фамилии *", {
        reply_markup: Keyboard.from([[ctx.chat.last_name]]).resized().oneTime()
    });
    const last_name = await conversation.form.text();
    await ctx.reply("* Запрос контактов *", {
        reply_markup: new Keyboard().requestContact("Нажмите сюда").resized().oneTime()
    });
    const {
        contact: {message: {phone_number} = {}} = {}
    } = await conversation.waitFor(":contact");
    await ctx.reply("* Выбор категории *", {
        reply_markup: Keyboard.from([Object.keys(categories)]).toFlowed(1).resized().oneTime()
    });
    const category_name = await conversation.form.select(Object.keys(categories));
    const category = categories[category_name];
    switch (category) {
        case "media":
        case "blogger":
            await ctx.reply("* Информация о трансфере для СМИ/блогеров/инфлюенсеров *");
            break;
        case "realtor":
            await ctx.reply("* Информация о трансфере для риелторов *");
            break;
    }
    await ctx.reply("* Выбор трансфера *", {
        reply_markup: Keyboard.from([Object.keys(transports)]).toFlowed(1).resized().oneTime()
    });
    const transport_name = await conversation.form.select(Object.keys(transports));
    const transport = transports[transport_name];
    Object.assign(conversation.session.profile, {first_name, last_name, phone_number, category, transport});
    switch (transport) {
        case "transfer":
            await ctx.reply("* Запрос адреса *");
            const address = await conversation.form.text();
            await ctx.reply("* Запрос времени *");
            const time = await conversation.form.text();
            Object.assign(conversation.session, {address, time});
    }
    await ctx.reply("* Запрос дополнительных вопросов *");
    const requests = await conversation.form.text();
    Object.assign(conversation.session, {requests});
    await ctx.reply("* Благодарность *");
}

bot.use(createConversation(registration, "registration"));

bot.command("start", ctx => ctx.conversation.reenter("registration"));

// Sample handler for a simple echo bot
bot.on("message:text", ctx => ctx.reply(ctx.msg.text));
