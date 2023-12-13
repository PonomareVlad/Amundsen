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
 * @typedef {{registered: Date, profile: Record<string, any>, chat: Chat}} SessionData
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

const buttons = {
    skip: "Пропустить"
}

const categories = {
    "СМИ": "media",
    "Блогер": "blogger",
    "Партнер": "partner",
};

const transports = {
    "Личный автомобиль": "car",
    "Трансфер": "transfer",
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

bot.use((ctx, next) => next(ctx.session.chat = ctx.chat));

bot.command("start", (ctx, next) => next(ctx.conversation.exit()));

async function registration(/** @type {Conversation<BotContext>} */ conversation, ctx) {
    const inputErrorHandler = async ctx => {
        await ctx.reply("* ошибка в формате *");
        await conversation.skip({drop: true});
    };
    const {first_name, last_name} = ctx.chat;
    conversation.session.profile = {};
    await ctx.reply(`Дорогой гость!

Я твой друг и проводник по открытию Атриума ЖК Amundsen!

Главного авантюриста ты знаешь. Давай знакомиться с тобой!`, {
        reply_markup: new Keyboard().requestContact("Давай").resized().oneTime()
    });
    const {
        contact: {message: {phone_number} = {}} = {}
    } = await conversation.waitFor(":contact", inputErrorHandler);
    await ctx.reply("Отправь мне ФИО", {
        reply_markup: {
            force_reply: true,
            input_field_placeholder: [first_name, last_name].filter(Boolean).join(" ")
        }
    });
    const name = await conversation.form.text(inputErrorHandler);
    await ctx.reply(`Привет, ${name} !

О приключениях Амундсена знал весь мир. Мы тоже хотим рассказать об открытии громко, поэтому пригласили журналистов, блогеров и партнеров.

Выбери свою категорию участия.`, {
        reply_markup: Keyboard.from([Object.keys(categories)]).toFlowed(1).resized().oneTime()
    });
    const category_name = await conversation.form.select(Object.keys(categories), inputErrorHandler);
    const category = categories[category_name];
    await ctx.reply(`Мы подготовили программу, от которой захватит дух! 

Как ты планируешь добираться до площадки: на личном автомобиле или на трансфере?`, {
        reply_markup: Keyboard.from([Object.keys(transports)]).toFlowed(1).resized().oneTime()
    });
    const transport_name = await conversation.form.select(Object.keys(transports), inputErrorHandler);
    const transport = transports[transport_name];
    Object.assign(conversation.session.profile, {name, phone_number, category, transport});
    switch (transport) {
        case "car":
            await ctx.reply(`Мы ждем тебя!

ЖК Amundsen находится на улице Академика Ландау, 3.

Мероприятие пройдет с 15:00 до 17:00.`);
            break;
        default:
            switch (category) {
                case "partner":
                    await ctx.reply(`Компания Progress предоставляет партнерам трансфер.

Он будет ждать тебя возле офиса продаж ЖК Amundsen в 14:30 на улице Вильгельма-де Геннина, 47.

Дресс-код: smart casual.`);
                    break;
                default:
                    await ctx.reply(`Мы подготовили автомобиль бизнес-класса!   

Напиши свой адрес и время, чтобы водитель смог тебя привезти на мероприятие. Оно пройдет с 15:00 до 17:00 на улице Академика Ландау, 3.`, {
                        reply_markup: {force_reply: true, input_field_placeholder: "Адрес и время"}
                    });
                    const transfer = await conversation.form.text(inputErrorHandler);
                    Object.assign(conversation.session, {transfer});
                    await ctx.reply(`Я получил от тебя данные. Водитель приедет ${transfer}, а потом привезет обратно.

За сутки до начала мероприятия я отправлю информацию о машине.`)
                    break;
            }
    }
}

bot.use(createConversation(registration, "registration"));

bot.command("start", ctx => ctx.conversation.reenter("registration"));

bot.command("tomorrow", async ctx => {
    switch (ctx.session.transport) {
        case "car":
            await ctx.reply(`Открываем завтра вместе Атриум ЖК Amundsen! 

ЖК Amundsen находится на улице Академика Ландау, 3. Мероприятие пройдет с 15:00 до 17:00.

Дресс-код: smart casual.`);
            break;
        default:
            switch (ctx.session.category) {
                case "partner":
                    await ctx.reply(`Увидимся уже завтра на открытии Атриум ЖК Amundsen! Готовишься к началу экспедиции?

Напоминаю, что трансфер будет ждать возле офиса продаж ЖК Amundsen в 14:30 на улице Вильгельма-де Геннина, 47.

После мероприятия трансфер доставит тебя обратно.`);
                    break;
                default:
                    await ctx.reply(`Увидимся уже завтра на открытии Атриум ЖК Amundsen! Готовишься к началу экспедиции? 

Личный трансфер будет ждать тебя по адресу ${ctx.session.transfer || ""}.

Тебя встретит водитель (имя, номер телефона) на машине (марка, цвет машины, номер).

На этом же автомобиле водитель доставит тебя обратно.`);
            }
    }
});

bot.command("soon", ctx => ctx.reply(`Привет! Наша экспедиция состоится через три дня.

Progress ждет исследователей и авантюристов на открытии Атриума ЖК Amundsen.

Встреча пройдет с 15:00 до 17:00 на улице Академика Ландау, 3.

Дресс-код: smart casual.`));

bot.command("today", ctx => ctx.reply(`Какой прекрасный день! Ветер попутный, компас ведет нас на север, а новый Атриум ЖК Amundsen готов к открытию!

Встреча пройдет с 15:00 до 17:00 на улице Академика Ландау, 3.

Дресс-код: smart casual.`));

bot.on("msg", ctx => ctx.reply("* Ожидание рассылки *"));
