const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const Calendar = require("telegraf-calendar-telegram");
const bot = require("../bot");
const start = require("../helpers/start");
const prisma = require('../helpers/prisma');
const getAdmins = require('../helpers/getAdmins');
const isSlotBooked = require("../helpers/isSlotBooked");
const i18n = require("../locales");
const getAvailableHours = require("../helpers/getAvailableHours");
const representIntervals = require("../helpers/representIntervals");
const getUser = require("../helpers/getUser");

bot.use(i18n.middleware())

const minDate = new Date();

function isWorkday(date) {
  const dayOfWeek = date.getDay();

  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

const calendar = new Calendar(bot, {
  startWeekDay: 1,
  weekDayNames: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ],
  minDate: minDate,
  maxDate: null,
  ignoreWeekDays: [],
  shortcutButtons: [],
  hideIgnoredWeeks: false,
});

let reservationData = {
  user_id: null,
  start_datetime: null,
  end_datetime: null,
  price: null
};

let state = {
  start_date: null,
  start_hour: null,
  end_date: null,
  end_hour: null
}

calendar.setDateListener(async (ctx, date) => {
  try {
    ctx.deleteMessage();
    const isBooked = await isSlotBooked(date);

    if (!isBooked) {
      state.start_date = date;
      const hoursArr = await getAvailableHours(date);
      const availableHours = representIntervals(hoursArr);

      ctx.replyWithHTML(`${ctx.i18n.t("messages.selectedDate")} ${date}

${ctx.i18n.t("messages.selectFreeTime")}
<b>${availableHours}</b>

${ctx.i18n.t("messages.selectHour")}`)
    }
    else {
      ctx.replyWithHTML(`${ctx.i18n.t("messages.dayisbooked")}`, calendar.getCalendar());
    }
  } catch (error) {
    console.error('Error answering callback query:', error);
  }

});

const reserveScene = new WizardScene(
  'reserve',
  async (ctx) => {
    ctx.replyWithHTML(ctx.i18n.t("messages.selectDate"), calendar.getCalendar());

    return ctx.wizard.next();
  },
  async (ctx) => {
    const hour = ctx.message.text;
    const regex = /\b(?:[01]\d|2[0-3]):00\b/
    const status = await isSlotBooked(`${state.start_date}T${hour}:01`)
    if (regex.test(hour) && !status) {
      state.start_hour = hour
      ctx.replyWithHTML(`${ctx.i18n.t("messages.selectedDate")} <b>${state.start_date}</b>
${ctx.i18n.t("messages.starT")} <b>${state.start_hour}</b>

${ctx.i18n.t("messages.enterPlayHours")}`)

      return ctx.wizard.next();
    } else {
      const hoursArr = await getAvailableHours(state.start_date);
      const availableHours = representIntervals(hoursArr);
      ctx.replyWithHTML(`${ctx.i18n.t("messages.invalidHour")}

<b>${availableHours}</b>

${ctx.i18n.t("messages.selectHour")}`);
    }
  },
  async (ctx) => {
    const hours = ctx.message.text;
    const regex = /^\+?(0|[1-9]\d*)$/;

    const status = await isSlotBooked(`${state.start_date}T${state.start_hour}`, Number(hours));
    if (regex.test(hours) && !status) {
      const startDate = new Date(`${state.start_date}T${state.start_hour}`);
      let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

      const workday = isWorkday(startDate);
      const day = await prisma.price.findFirst({
        where: {
          day_type: workday ? 'A' : 'B'
        }
      })
      const card = await prisma.card.findMany();
      const user = await getUser(ctx.from.id);

      let buttons = [];
      const price = Number(hours) * day.amount;
      reservationData = {
        user_id: JSON.stringify(ctx.from.id),
        start_datetime: startDate,
        end_datetime: new Date(startDate.getTime() + (hours * 60 * 60 * 1000)),
        price: price
      }
      ctx.wizard.state.price = price;

      buttons.push([Markup.callbackButton(ctx.i18n.t("messages.paid"), "reservation:paid")]);
      buttons.push([Markup.callbackButton(ctx.i18n.t("messages.cancel"), "reservation:cancel")]);

      ctx.wizard.state.reservationMsg = ctx.replyWithHTML(`${ctx.i18n.t("messages.selectedDate")} <b>${state.start_date}</b>
${ctx.i18n.t("messages.starT")} <b>${reservationData.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${reservationData.end_datetime.toLocaleString('ru', options)}</b>

<i>${ctx.i18n.t("messages.reservationInfo")}</i>

${ctx.i18n.t("messages.overall")} <b>${price.toLocaleString('en-US', { useGrouping: true })} ${ctx.i18n.t("messages.currency")}</b>

${ctx.i18n.t("messages.toPay")} <code>${(price / 2).toLocaleString('en-US', { useGrouping: true })}</code> <b>${ctx.i18n.t("messages.currency")}</b>
${ctx.i18n.t("messages.cardNumber")} <code>${card[0].card_number}</code>
${ctx.i18n.t("messages.cardHolder")} <b>${card[0].card_holder}</b>
${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${reservationData.start_datetime.toLocaleString('ru', options)} - ${reservationData.end_datetime.toLocaleString('ru', options)}</code>`, Markup
        .inlineKeyboard(buttons)
        .resize()
        .extra());

      return ctx.wizard.next();
    } else {
      ctx.replyWithHTML(`${ctx.i18n.t("messages.invalidInterval")}

${ctx.i18n.t("messages.enterPlayHours")}`);
    }
  }
)

reserveScene.on('callback_query', async (ctx) => {
  const [type, action, clientId] = ctx.callbackQuery.data.split(":");

  if (type === 'reservation') {
    await ctx.deleteMessage(ctx.wizard.state.reservationMsg.message_id);

    if (action === 'paid') {
      try {
        const admins = await getAdmins();
        const user = await getUser(ctx.from.id);
        let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

        const reservation = await prisma.reservation.create({
          data: reservationData
        })

        admins.map(admin => bot.telegram.sendMessage(admin.id, `<b>Новый запрос на бронирование!</b>
${ctx.i18n.t("messages.starT")} <b>${reservationData.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${reservationData.end_datetime.toLocaleString('ru', options)}</b>

${ctx.i18n.t("messages.overall")} <b>${ctx.wizard.state.price.toLocaleString('en-US', { useGrouping: true })} ${ctx.i18n.t("messages.currency")}</b>
        
${ctx.i18n.t("messages.toPay")} <code>${(ctx.wizard.state.price / 2).toLocaleString('en-US', { useGrouping: true })}</code> <b>${ctx.i18n.t("messages.currency")}</b>

${ctx.i18n.t("messages.comment")} <code>${user.phone_number} ${reservationData.start_datetime.toLocaleString('ru', options)} - ${reservationData.end_datetime.toLocaleString('ru', options)}</code>`, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Подтвердить ✅', callback_data: `admin:confirm:${user.id}:${reservation.id}` },
                { text: 'Отказать ❌', callback_data: `admin:cancel:${user.id}:${reservation.id}` }
              ]
            ]
          }
        }))
        ctx.replyWithHTML(ctx.i18n.t("messages.pending"))
        ctx.scene.leave()
      } catch (e) {
        ctx.reply(ctx.i18n.t("messages.error"))
        ctx.scene.leave()
        console.log("ERROR RESERVATION CREATION", e.message)
      }
    }
    else {
      ctx.scene.leave()
      start(ctx);
    }
  }
})

reserveScene.command('start', (ctx) => {
  ctx.scene.leave()
  start(ctx);
})

module.exports = reserveScene;