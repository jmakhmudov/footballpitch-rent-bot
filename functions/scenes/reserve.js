const { Markup } = require("telegraf");
const WizardScene = require("telegraf/scenes/wizard");
const Calendar = require("telegraf-calendar-telegram");
const bot = require("../bot");
const start = require("../helpers/start");
const prisma = require('../helpers/prisma');
const isSlotBooked = require("../helpers/isSlotBooked");
const getBookedHoursForDay = require("../helpers/getBookedHoursForDay");
const i18n = require("../locales");
const getAvailableHours = require("../helpers/getAvailableHours");
const representIntervals = require("../helpers/representIntervals");

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
    const status = await isSlotBooked(`${state.start_date}T${hour}`)
    if (regex.test(hour) && !status) {
      state.start_hour = hour
      ctx.replyWithHTML(`${ctx.i18n.t("messages.selectedDate")} <b>${state.start_date}</b>
${ctx.i18n.t("messages.selectedStartHour")} <b>${state.start_hour}</b>

${ctx.i18n.t("messages.enterPlayHours")}`)

      return ctx.wizard.next();
    } else {
      ctx.replyWithHTML("no")
    }
  },
  async (ctx) => {
    const hours = ctx.message.text;
    const regex = /^\+?(0|[1-9]\d*)$/;

    const status = await isSlotBooked(`${state.start_date}T${state.start_hour}`, Number(hours));
    if (regex.test(hours) && !status) {
      const startDate = new Date(`${state.start_date}T${state.start_hour}`);
      reservationData = {
        user_id: ctx.from.id,
        start_datetime: startDate,
        end_datetime: new Date(startDate.getTime() + (hours * 60 * 60 * 1000)),
        price: 1
      }
      let options = { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };

      ctx.replyWithHTML(`${ctx.i18n.t("messages.selectedDate")} <b>${state.start_date}</b>
${ctx.i18n.t("messages.starT")} <b>${reservationData.start_datetime.toLocaleString('ru', options)}</b>
${ctx.i18n.t("messages.finish")} <b>${reservationData.end_datetime.toLocaleString('ru', options)}</b>`);

      return ctx.wizard.next();
    } else {
      ctx.replyWithHTML(`${ctx.i18n.t("messages.invalidInterval")}

${ctx.i18n.t("messages.enterPlayHours")}`);
    }
  },
  async (ctx) => {
    ctx.replyWithHTML(isWorkday(reservationData.start_datetime));
  }
)

reserveScene.command('start', (ctx) => {
  ctx.scene.leave()
  start(ctx);
})

module.exports = reserveScene;