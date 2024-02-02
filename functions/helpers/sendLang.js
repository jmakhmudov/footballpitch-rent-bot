const { Markup } = require('telegraf')

function sendLanguage(ctx) {
  let buttons = [];
  buttons.push([Markup.callbackButton("🇺🇿 O`zbek tili", "setlanguage:uz")]);
  buttons.push([Markup.callbackButton("🇷🇺 Русский язык", "setlanguage:ru")]);
  return ctx.reply(ctx.i18n.t('messages.chooseLanguage'), Markup
    .inlineKeyboard(buttons)
    .resize()
    .extra()
  )
}

module.exports = sendLanguage;