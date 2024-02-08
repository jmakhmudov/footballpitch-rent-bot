const prisma = require("./prisma");

async function getAvailableHours(date) {
  try {
    const availableHours = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await prisma.reservation.findMany({
      where: {
        AND: [
          { start_datetime: { lt: endOfDay } },
          { end_datetime: { gt: startOfDay } }
        ]
      }
    });

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(startOfDay);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(startOfDay);
      hourEnd.setHours(hour, 59, 59, 999);

      const isBooked = reservations.some(reservation => {
        return reservation.start_datetime < hourEnd && reservation.end_datetime > hourStart;
      });

      if (!isBooked) {
        availableHours.push(hour);
      }
    }
    return availableHours;
  } catch (error) {
    console.error('Error fetching available hours:', error);
    return [];
  }
}

module.exports = getAvailableHours;