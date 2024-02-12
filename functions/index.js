const functions = require("firebase-functions");
const { Telegraf, session, Stage, Markup } = require("telegraf");
const axios = require("axios");
const prisma = require("./helpers/prisma")
const regScene = require("./scenes/reg");
const changeCard = require("./scenes/changeCard");
const changePrice = require("./scenes/changePrice");
const reservationsScene = require("./scenes/reservationsScene");
const start = require("./helpers/start");
const reserveScene = require("./scenes/reserve");
const sendLanguage = require("./helpers/sendLang");
const bot = require("./bot");
const TelegrafI18n = require('telegraf-i18n');
const i18n = require("./locales");
const getUser = require("./helpers/getUser");
const getAdmins = require("./helpers/getAdmins");
const anouncement = require("./scenes/anouncement");
const checkAdmin = require("./helpers/checkAdmin");

const stage = new Stage([regScene, reserveScene, changeCard, changePrice, reservationsScene, anouncement]);

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

bot.command('reqadmin', async (ctx) => {
  const admins = await getAdmins();
  const user = await getUser(ctx.from.id);

  if (!user.isAdmin) {
    admins.forEach((admin) => {
      bot.telegram.sendMessage(admin.id, `${ctx.i18n.t("messages.newAdmin")}\n\n👤 ${user.full_name}`,
        Markup
          .inlineKeyboard([Markup.callbackButton(ctx.i18n.t("buttons.confirm"), `newAdmin:${user.id}`)])
          .resize()
          .extra()
      )
    })
  }
  else {
    ctx.reply(ctx.i18n.t("messages.alreadyAdmin"))
  }
})

bot.hears([TelegrafI18n.match('buttons.reserve')], async (ctx) => {
  ctx.scene.enter('reserve');
})

bot.hears([TelegrafI18n.match('buttons.reservations')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    ctx.scene.enter('reservationsScene');
  }
})

bot.hears([TelegrafI18n.match('buttons.anouncement')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    ctx.scene.enter('anouncement');
  }
})

bot.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

bot.hears([TelegrafI18n.match('buttons.settings')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    ctx.reply(ctx.i18n.t("buttons.settings"), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.changeCard'))],
        [Markup.button(ctx.i18n.t('buttons.changePrice'))],
        [Markup.button(ctx.i18n.t('buttons.addManager'))],
        [Markup.button(ctx.i18n.t('buttons.back'))],
      ])
      .oneTime(false)
      .resize()
      .extra()
    )
  }
})

bot.hears([TelegrafI18n.match('buttons.changeCard')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    ctx.scene.enter('changeCard');
  }
})

bot.hears([TelegrafI18n.match('buttons.changePrice')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    ctx.scene.enter('changePrice');
  }
})

bot.hears([TelegrafI18n.match('buttons.addManager')], async (ctx) => {
  const check = checkAdmin(ctx.from.id);
  if (check) {
    const admins = await getAdmins();
    ctx.reply(ctx.i18n.t("messages.adminsList"))
    admins.map(admin =>
      ctx.replyWithHTML(`ID: <b>${admin.id}</b>\n\nИмя: ${admin.full_name}\nНомер телефона: ${admin.phone_number}`, Markup
        .inlineKeyboard([Markup.callbackButton(ctx.i18n.t("buttons.delete"), `adminsList:del:${admin.id}`)])
        .resize()
        .extra()
      )
    )
  }
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
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { isApproved: true }
      })
      await bot.telegram.sendMessage(Number(clientId), `${ctx.i18n.t("messages.reservationApproved")}`)
    } else {
      ctx.deleteMessage()
      await prisma.reservation.delete({
        where: { id: reservationId }
      })
      await bot.telegram.sendMessage(Number(clientId), `${ctx.i18n.t("messages.reservationCancelled")}`)
    }
  }
  else if (type === "adminsList") {
    await prisma.user.update({
      where: { id: clientId },
      data: { isAdmin: false }
    });
    ctx.reply(ctx.i18n.t("messages.adminDel"));
  }
  else if (type === "newAdmin") {
    await prisma.user.update({
      where: { id: action },
      data: { isAdmin: true }
    });
    ctx.reply(ctx.i18n.t("messages.succNewAdmin"));
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

