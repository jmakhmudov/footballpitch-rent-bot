const { Markup, Composer } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const TelegrafI18n = require('telegraf-i18n');
const start = require("../helpers/start");
const prisma = require("../helpers/prisma");
const getUser = require("../helpers/getUser");
const Calendar = require("telegraf-calendar-telegram");
const bot = require("../bot");

const calendarRes = new Calendar(bot, {
  startWeekDay: 1,
  weekDayNames: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  monthNames: [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
  ],
});


const dateStep = new Composer();
dateStep.action(/calendar-telegram-date-[\d-]+/g, async (ctx) => {
  let date = ctx.match[0].replace("calendar-telegram-date-", "");
  try {
    ctx.deleteMessage();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await prisma.reservation.findMany({
      where: {
        AND: [
          { start_datetime: { lt: endOfDay } },
          { end_datetime: { gt: startOfDay } },
          { isApproved: true }
        ]
      }
    });

    if (!reservations.length) {
      return ctx.reply(ctx.i18n.t("messages.noRes"));
    }

    const reservationsInfo = await Promise.all(reservations.map(async (res) => {
      const user = await getUser(Number(res.user_id));
      let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

      return (`${ctx.i18n.t("messages.starT")} <b>${res.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${res.end_datetime.toLocaleString('ru', options)}</b>
  
${ctx.i18n.t("messages.overall")} <b>${res.price.toLocaleString('en-US', { useGrouping: true })} ${ctx.i18n.t("messages.currency")}</b>
  
${ctx.i18n.t("messages.toPay")} <code>${(res.price / 2).toLocaleString('en-US', { useGrouping: true })}</code> <b>${ctx.i18n.t("messages.currency")}</b>
  
${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${user.full_name} ${res.start_datetime.toLocaleString('ru', options)} - ${res.end_datetime.toLocaleString('ru', options)}</code>`);
    }));

    await ctx.replyWithHTML(reservationsInfo.join("\n-------------------\n"));
    ctx.scene.leave();
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
});

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
    
${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${user.full_name} ${res.start_datetime.toLocaleString('ru', options)} - ${res.end_datetime.toLocaleString('ru', options)}</code>`, {
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
      ctx.scene.leave();
    }
    else {
      ctx.reply(ctx.i18n.t("messages.selectDate"), calendarRes.getCalendar());
      return ctx.wizard.next()
    }
  },
  dateStep
);

reservationsScene.hears([TelegrafI18n.match('buttons.back')], async (ctx) => {
  ctx.scene.leave()
  start(ctx)
})

module.exports = reservationsScene