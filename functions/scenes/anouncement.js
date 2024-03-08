const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafI18n = require('telegraf-i18n');
const start = require("../helpers/start");
const bot = require("../bot");
const prisma = require("../helpers/prisma");

const anouncement = new WizardScene(
  'anouncement',
  (ctx) => {
    ctx.reply(ctx.i18n.t("messages.anouncementInfo"), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.back'))],
      ])
      .oneTime(false)
      .resize()
      .extra());
    return ctx.wizard.next();
  },
  async (ctx) => {
    const message = ctx.message.text || ctx.message.caption;

    let mediaAttachment = null;
    if (ctx.message.photo && ctx.message.photo.length > 0) {
      mediaAttachment = { type: 'photo', fileId: ctx.message.photo[ctx.message.photo.length - 1].file_id };
    } else if (ctx.message.video) {
      mediaAttachment = { type: 'video', fileId: ctx.message.video.file_id };
    }

    try {
      const users = await prisma.user.findMany();
      await ctx.reply(ctx.i18n.t("messages.succAnouncement"));
      for (const user of users) {
        const userId = user.id;
        try {
          if (mediaAttachment) {
            if (message.trim() !== '') {
              if (mediaAttachment.type === 'photo') {
                await bot.telegram.sendPhoto(userId, mediaAttachment.fileId, { caption: message });
              } else if (mediaAttachment.type === 'video') {
                await bot.telegram.sendVideo(userId, mediaAttachment.fileId, { caption: message });
              }
            } else {
              if (mediaAttachment.type === 'photo') {
                await bot.telegram.sendPhoto(userId, mediaAttachment.fileId);
              } else if (mediaAttachment.type === 'video') {
                await bot.telegram.sendVideo(userId, mediaAttachment.fileId);
              }
            }
          }
          else {
            await bot.telegram.sendMessage(userId, message);
          }
        }
        catch (e) {
          console.log(e)
        }
      }
    } catch (error) {
      console.error('Error sending message to all users:', error);
    }
    ctx.scene.leave();
    start(ctx)
  },
);

anouncement.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

module.exports = anouncement