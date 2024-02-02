const functions = require("firebase-functions");
const TelegrafI18n = require('telegraf-i18n')
const path = require('path');
const { Telegraf, session, Stage } = require("telegraf");
const axios = require("axios");
const prisma = require("./helpers/prisma")
const regScene = require("./scenes/reg");
const start = require("./helpers/start");
const reserveScene = require("./scenes/reserve");
const sendLanguage = require("./helpers/sendLang");

require("dotenv").config();

const i18n = new TelegrafI18n({
  defaultLanguage: 'ru',
  useSession: true,
  directory: path.resolve(__dirname, 'locales')
})

const bot = new Telegraf(process.env.BOT_TOKEN)

const stage = new Stage([regScene, reserveScene]);

bot.use(session())
bot.use(i18n.middleware())
bot.use(stage.middleware())

bot.command('start', async (ctx) => {
  start(ctx)
});

bot.hears([TelegrafI18n.match('buttons.reserve')], async (ctx) => {
  ctx.scene.enter('reserve')
})

bot.hears([TelegrafI18n.match('buttons.mainmenu')], async (ctx) => {
  ctx.reply('назад')
})

bot.on('callback_query', async (ctx, next) => {
  let [type] = ctx.callbackQuery.data.split(":");

  if (type == "setlanguage") {
    let [type, language] = ctx.callbackQuery.data.split(":");
    switch (language) {
      case "ru":
        ctx.session.language = "ru"
        ctx.session.__language_code = "ru"
        break;
      case "uz":
        ctx.session.language = "uz"
        ctx.session.__language_code = "uz"
        break;
      case "reset":
        ctx.reply(ctx.i18n.t('messages.changelang'), Markup.removeKeyboard(true).extra()).then(e => ctx.deleteMessage(e.message_id))
        ctx.session.language = "reset"
        break;
    }

    ctx.i18n.locale(ctx.session.language)
    ctx.answerCbQuery();
    ctx.deleteMessage()

    const user = await prisma.user.findUnique({
      where: { id: JSON.stringify(ctx.from.id) }
    });
    if (!user) ctx.scene.enter('register')
    else start(ctx)
  } else {
    return next()
  }
})

exports.telegramBot = functions.https.onRequest(async (request, response) => {
  return await bot.handleUpdate(request.body, response).then((rv) => {
    return !rv && response.sendStatus(200);
  });
});

