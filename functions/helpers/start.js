const { Markup } = require("telegraf");
const prisma = require("./prisma");
const sendLanguage = require("./sendLang");

const start = async (ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: JSON.stringify(ctx.from.id) }
  });

  if (!user || !ctx.session.language || ctx.session.language == "reset") {
    return sendLanguage(ctx);
  }
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

module.exports = start;