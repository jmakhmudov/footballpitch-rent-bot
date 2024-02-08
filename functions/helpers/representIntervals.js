function representIntervals(availableHours) {
  const intervals = [];
  let startHour = availableHours[0];
  let endHour = availableHours[0];

  for (let i = 1; i < availableHours.length; i++) {
      if (availableHours[i] === endHour + 1) {
          endHour = availableHours[i];
      } else {
          intervals.push({ start: startHour, end: endHour });
          startHour = availableHours[i];
          endHour = availableHours[i];
      }
  }

  intervals.push({ start: startHour, end: endHour });

  const intervalStrings = intervals.map(interval => {
    const startTime = interval.start.toString().padStart(2, '0') + ':00';
    const endTime = (interval.end + 1).toString().padStart(2, '0') + ':00';
    return `${startTime} - ${endTime}`;
  });

  return intervalStrings.join('\n');
}

module.exports = representIntervals;