const { PrismaClient } = require('@prisma/client');
const i18n = require('../locales');

const prisma = new PrismaClient();

async function getReservationsForDay(date) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const reservations = await prisma.reservation.findMany({
            where: {
                AND: [
                    { start_datetime: { lte: endOfDay } },
                    { end_datetime: { gte: startOfDay } }
                ]
            }
        });

        return reservations;
    } catch (error) {
        console.error('Error fetching reservations for the day:', error);
        return [];
    }
}

function formatReservation(reservation, ctx) {
    const startDate = reservation.start_datetime.toLocaleDateString('en-US');
    const endDate = reservation.end_datetime.toLocaleDateString('en-US');

    const startHour = reservation.start_datetime.getHours();
    const startMinutes = reservation.start_datetime.getMinutes();
    const endHour = reservation.end_datetime.getHours();
    const endMinutes = reservation.end_datetime.getMinutes();

    let startTime = `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
    let endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    const duration = Math.abs(reservation.start_datetime - reservation.end_datetime) / (60 * 60 * 1000);

    if (startDate !== endDate) {
        return `<b>Начало: 🗓 ${startDate} ${startTime}\nКонец: 🗓 ${endDate} ${endTime}</b> <i>(${Math.floor(duration)} ${ctx.i18n.t("messages.hours")})</i>`;
    } else {
        return `<b>${startTime} - ${endTime}</b> <i>(${Math.floor(duration)} ${ctx.i18n.t("messages.hours")})</i>`;
    }

}

async function getBookedHoursForDay(date, ctx) {
    try {
        const reservations = await getReservationsForDay(date);
        const bookedHours = reservations.map((res) => formatReservation(res, ctx));
        return bookedHours;
    } catch (error) {
        console.error('Error fetching booked hours for the day:', error);
        return [];
    }
}

module.exports = getBookedHoursForDay;