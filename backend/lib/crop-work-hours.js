const PHILIPPINES_TIME_ZONE = "Asia/Manila";
const MORNING_START = 8 * 60;
const LUNCH_START = 11 * 60 + 50;
const AFTERNOON_START = 13 * 60;
const WORKDAY_END = 16 * 60;

function philippinesMinutesSinceMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINES_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const valueFor = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return valueFor("hour") * 60 + valueFor("minute");
}

function isCropWorkTime(now = new Date()) {
  const minutes = philippinesMinutesSinceMidnight(now);
  return (minutes >= MORNING_START && minutes < LUNCH_START)
    || (minutes >= AFTERNOON_START && minutes < WORKDAY_END);
}

function cropWorkHoursMessage() {
  return "Crop-management tasks can only be worked from 8:00 AM to 11:50 AM and 1:00 PM to 4:00 PM (Philippine time). Lunch break is 11:50 AM to 1:00 PM.";
}

function cropScheduleHoursMessage() {
  return "Crop-management tasks must be scheduled entirely between 8:00 AM–11:50 AM or 1:00 PM–4:00 PM. Tasks cannot be scheduled during the 11:50 AM–1:00 PM lunch break.";
}

function timeToMinutes(time) {
  const [hour, minute] = String(time).slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function assertCropTaskSchedule(workerCategory, startTime, endTime) {
  if (workerCategory !== "crop_management_worker") return;
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const isMorningTask = start >= MORNING_START && end <= LUNCH_START;
  const isAfternoonTask = start >= AFTERNOON_START && end <= WORKDAY_END;
  if (!isMorningTask && !isAfternoonTask) {
    const error = new Error(cropScheduleHoursMessage());
    error.status = 400;
    error.code = "CROP_TASK_SCHEDULE_OUTSIDE_WORK_HOURS";
    throw error;
  }
}

function assertCropWorkerCanWork(profile, now = new Date()) {
  if (profile?.worker_category === "crop_management_worker" && !isCropWorkTime(now)) {
    const error = new Error(cropWorkHoursMessage());
    error.status = 403;
    error.code = "CROP_WORK_HOURS_CLOSED";
    throw error;
  }
}

module.exports = {
  assertCropWorkerCanWork,
  assertCropTaskSchedule,
  cropWorkHoursMessage,
  cropScheduleHoursMessage,
  isCropWorkTime,
  philippinesMinutesSinceMidnight,
};
