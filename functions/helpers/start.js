const { Markup } = require("telegraf");
const sendLanguage = require("./sendLang");
const getUser = require("./getUser");

const start = async (ctx) => {
  const user = await getUser(ctx.from.id);

  if (!user || !ctx.session.language || ctx.session.language == "reset") {
    return sendLanguage(ctx);
  }
  if (user.isLogged && (user.isAdmin || user.isDev)) {
    return ctx.reply(ctx.i18n.t('messages.startAdmin'), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.reservations'))],
        [Markup.button(ctx.i18n.t('buttons.settings'))],
        [Markup.button(ctx.i18n.t('buttons.changelang'))],
      ])
      .oneTime(false)
      .resize()
      .extra()
    )
  } else {
    return ctx.reply(ctx.i18n.t('messages.start'), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.reserve'))],
        [Markup.button(ctx.i18n.t('buttons.changelang'))],
      ])
      .oneTime(false)
      .resize()
      .extra()
    )
  }
}

module.exports = start;