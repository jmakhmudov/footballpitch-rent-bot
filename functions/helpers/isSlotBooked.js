const prisma = require("./prisma")

async function isSlotBooked(startDatetimeString, durationHours=0) {
  try {
    const startDatetime = new Date(startDatetimeString);

    const endDatetime = new Date(startDatetime);
    endDatetime.setHours(endDatetime.getHours() + durationHours);

    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        AND: [
          { start_datetime: { lt: endDatetime } },
          { end_datetime: { gt: startDatetime  } }
        ]
      }
    });

    return overlappingReservations.length > 0;
  } catch (error) {
    console.error('Error checking reservation:', error);
    return false;
  }
}

module.exports = isSlotBooked;
