const functions = require("firebase-functions");
const { Telegraf, session, Stage } = require("telegraf");
const axios = require("axios");
const prisma = require("./helpers/prisma")
const regScene = require("./scenes/reg");
const start = require("./helpers/start");
const reserveScene = require("./scenes/reserve");
const sendLanguage = require("./helpers/sendLang");
const bot = require("./bot");
const TelegrafI18n = require('telegraf-i18n');
const i18n = require("./locales");
const getUser = require("./helpers/getUser");

const stage = new Stage([regScene, reserveScene]);

bot.use(session())
bot.use(i18n.middleware())
bot.use(stage.middleware())

bot.command('start', async (ctx) => {
  try {
    start(ctx);
  } catch (err) {
    console.log(err)
  }
});

bot.command('admin', async (ctx) => {
  const user = await getUser(ctx.from.id);

  if (user.isAdmin || user.isDev) {
    await prisma.user.update({
      where: {
        id: JSON.stringify(ctx.from.id),
      }, data: {
        isLogged: true
      }
    })
    start(ctx);
  }
})

bot.command('client', async (ctx) => {
  const user = await getUser(ctx.from.id);

  if (user.isAdmin || user.isDev) {
    await prisma.user.update({
      where: {
        id: JSON.stringify(ctx.from.id),
      }, data: {
        isLogged: false
      }
    })
    await ctx.reply(ctx.i18n.t("messages.adminLogout"));
    start(ctx);
  }
})


bot.hears([TelegrafI18n.match('buttons.reserve')], async (ctx) => {
  ctx.scene.enter('reserve');
})

bot.hears([TelegrafI18n.match('buttons.reservations')], async (ctx) => {

})

bot.hears([TelegrafI18n.match('buttons.changelang')], async (ctx) => {
  sendLanguage(ctx);
})

bot.on('callback_query', async (ctx, next) => {
  let [type, action, clientId, reservationId] = ctx.callbackQuery.data.split(":");

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
  }
  else if (type === 'admin') {
    if (action === "confirm") {
      ctx.deleteMessage()
      await bot.telegram.sendMessage(Number(clientId), `${ctx.i18n.t("messages.reservationApproved")}`)
    } else {
      ctx.deleteMessage()
      await prisma.reservation.delete({
        where: { id: reservationId }
      })
      await bot.telegram.sendMessage(Number(clientId), `${ctx.i18n.t("messages.reservationCancelled")}`)
    }
  }
  else {
    return next()
  }
})
bot.launch()
exports.telegramBot = functions.https.onRequest(async (request, response) => {
  return await bot.handleUpdate(request.body, response).then((rv) => {
    return !rv && response.sendStatus(200);
  });
});

