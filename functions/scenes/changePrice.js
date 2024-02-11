const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafI18n = require('telegraf-i18n');
const start = require("../helpers/start");
const prisma = require("../helpers/prisma");

const changePrice = new WizardScene(
  'changePrice',
  (ctx) => {
    ctx.reply(ctx.i18n.t("messages.chooseDayType"), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.workdays'))],
        [Markup.button(ctx.i18n.t('buttons.weekends'))],
        [Markup.button(ctx.i18n.t('buttons.back'))],
      ])
      .oneTime(false)
      .resize()
      .extra());
    return ctx.wizard.next();
  },
  (ctx) => {
    if ([ctx.i18n.t('buttons.workdays'), ctx.i18n.t('buttons.weekends')].includes(ctx.message.text)) {
      ctx.wizard.state.day = ctx.message.text === ctx.i18n.t("buttons.workdays") ? 'A' : 'B';
      ctx.reply(ctx.i18n.t("messages.enterPrice"), Markup
        .keyboard([
          [Markup.button(ctx.i18n.t('buttons.back'))],
        ])
        .oneTime(false)
        .resize()
        .extra())
      return ctx.wizard.next();
    }
    else {
      ctx.reply(`❌❌❌\n${ctx.i18n.t("messages.chooseDayType")}`, Markup
        .keyboard([
          [Markup.button(ctx.i18n.t('buttons.workdays'))],
          [Markup.button(ctx.i18n.t('buttons.weekends'))],
          [Markup.button(ctx.i18n.t('buttons.back'))],
        ])
        .oneTime(false)
        .resize()
        .extra());
    }
  },
  async (ctx) => {
    if (Number(ctx.message.text)) {
      ctx.wizard.state.price = Number(ctx.message.text);
      try {
        const existingPrice = await prisma.price.findFirst({
          where: {
            day_type: ctx.wizard.state.day
          }
        });

        await prisma.price.update({
          where: {
            id:existingPrice.id
          }, data: {
            amount: ctx.wizard.state.price
          }
        })
        await ctx.reply(ctx.i18n.t("messages.priceChanged"));
        ctx.scene.leave();
        start(ctx);
      } catch (error) {
        console.log(error)
        await ctx.reply(ctx.i18n.t("messages.error"));
        ctx.scene.leave();
        start(ctx);
      }
    }
    else {
      ctx.reply(`❌❌❌\n${ctx.i18n.t("messages.enterPrice")}`)
    }
  },
);

changePrice.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

module.exports = changePrice