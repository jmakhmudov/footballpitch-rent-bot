const WizardScene = require('telegraf/scenes/wizard');
const isValidPhoneNumber = require('../helpers/checkPhoneNumber');
const axios = require('axios');
const { Markup } = require('telegraf');
const prisma = require('../helpers/prisma');
const start = require('../helpers/start');

const regScene = new WizardScene(
  'register',
  (ctx) => {
    ctx.reply(ctx.i18n.t('messages.startReg'));
    ctx.replyWithHTML(ctx.i18n.t('messages.phone'), Markup
      .keyboard([
        [Markup.contactRequestButton(ctx.i18n.t('buttons.phone'))],
      ])
      .oneTime(true)
      .resize()
      .extra());
    ctx.wizard.state.contactData = {
      id: JSON.stringify(ctx.from.id)
    };
    return ctx.wizard.next();
  },
  (ctx) => {
    if (!(isValidPhoneNumber(ctx.message.text) || (ctx.message.contact && isValidPhoneNumber(ctx.message.contact.phone_number)))) {
      ctx.replyWithHTML(ctx.i18n.t('messages.invalidphone'));
      return;
    }
    ctx.wizard.state.contactData.phone_number = ctx.message.contact ? ctx.message.contact.phone_number : ctx.message.text;
    ctx.replyWithHTML(ctx.i18n.t('messages.fullname'), {
      reply_markup: { remove_keyboard: true },
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.contactData.full_name = ctx.message.text;
    await prisma.user.create({
      data: ctx.wizard.state.contactData
    })
    await ctx.replyWithHTML(ctx.i18n.t('messages.regcompleted'));
    console.log(ctx.wizard.state.contactData)
    start(ctx)
    return ctx.scene.leave();
  },
);

module.exports = regScene