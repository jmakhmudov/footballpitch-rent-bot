const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafI18n = require('telegraf-i18n');
const start = require("../helpers/start");
const prisma = require("../helpers/prisma");
const getUser = require("../helpers/getUser");

const reservationsScene = new WizardScene(
  'reservationsScene',
  (ctx) => {
    ctx.reply(ctx.i18n.t("messages.resType"), Markup
      .keyboard([
        [Markup.button(ctx.i18n.t('buttons.approvedRes'))],
        [Markup.button(ctx.i18n.t('buttons.pendingRes'))],
        [Markup.button(ctx.i18n.t('buttons.back'))],
      ])
      .oneTime(false)
      .resize()
      .extra());
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message.text === ctx.i18n.t('buttons.pendingRes')) {
      const reservations = await prisma.reservation.findMany({
        where: {
          isApproved: false,
          start_datetime: {
            gt: new Date()
          }
        }
      });

      reservations.length ?
        reservations.forEach(async (res) => {
          const user = await getUser(Number(res.user_id))
          let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

          ctx.replyWithHTML(`<b>Новый запрос на бронирование!</b>
${ctx.i18n.t("messages.starT")} <b>${res.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${res.end_datetime.toLocaleString('ru', options)}</b>
    
${ctx.i18n.t("messages.overall")} <b>${res.price.toLocaleString('en-US', { useGrouping: true })} ${ctx.i18n.t("messages.currency")}</b>
            
${ctx.i18n.t("messages.toPay")} <code>${(res.price / 2).toLocaleString('en-US', { useGrouping: true })}</code> <b>${ctx.i18n.t("messages.currency")}</b>
    
${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${res.start_datetime.toLocaleString('ru', options)} - ${res.end_datetime.toLocaleString('ru', options)}</code>`, {
            parse_mode: 'HTML',

            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Подтвердить ✅', callback_data: `admin:confirm:${user.id}:${res.id}` },
                  { text: 'Отказать ❌', callback_data: `admin:cancel:${user.id}:${res.id}` }
                ]
              ]
            }
          })
        })
        : ctx.reply(ctx.i18n.t("messages.noRes"));
    }
    else {
      const reservations = await prisma.reservation.findMany({
        where: {
          isApproved: true
        }
      });

      reservations.length ?
        reservations.forEach(async (res) => {
          const user = await getUser(Number(res.user_id))
          let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

          ctx.replyWithHTML(`${ctx.i18n.t("messages.starT")} <b>${res.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${res.end_datetime.toLocaleString('ru', options)}</b>
    
${ctx.i18n.t("messages.overall")} <b>${res.price.toLocaleString('en-US', { useGrouping: true })} ${ctx.i18n.t("messages.currency")}</b>
            
${ctx.i18n.t("messages.toPay")} <code>${(res.price / 2).toLocaleString('en-US', { useGrouping: true })}</code> <b>${ctx.i18n.t("messages.currency")}</b>
    
${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${res.start_datetime.toLocaleString('ru', options)} - ${res.end_datetime.toLocaleString('ru', options)}</code>`)
        })
        : ctx.reply(ctx.i18n.t("messages.noRes"))
    }
  },
);

reservationsScene.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

module.exports = reservationsScene