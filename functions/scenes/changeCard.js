const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafI18n = require('telegraf-i18n');
const start = require("../helpers/start");
const prisma = require("../helpers/prisma");

const changeCard = new WizardScene(
  'changeCard',
  (ctx) => {
    ctx.reply(ctx.i18n.t("messages.enterCardNum"), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.back'))],
      ])
      .oneTime(false)
      .resize()
      .extra());
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.wizard.state.cardNum = ctx.message.text;
    ctx.reply(ctx.i18n.t("messages.enterCardHolder"))
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.cardHolder = ctx.message.text;

    try {
      await prisma.card.deleteMany();
      await prisma.card.create({
        data: {
          card_number: ctx.wizard.state.cardNum,
          card_holder:ctx.wizard.state.cardHolder
        }
      })
      await ctx.replyWithHTML(`<b>${ctx.i18n.t("messages.newCard")}</b>\n\n💳 ${ctx.wizard.state.cardNum}\n👤 ${ctx.wizard.state.cardHolder}`);
      ctx.scene.leave();
      start(ctx);
    } catch (error) {
      await ctx.reply(ctx.i18n.t("messages.error"));
      ctx.scene.leave();
      start(ctx);
    }
  },
);

changeCard.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

module.exports = changeCard