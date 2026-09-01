export const CROP_WORK_HOURS_LABEL = 'Available 8:00 AM–11:50 AM and 1:00 PM–4:00 PM';

export function canWorkCropTaskNow(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes >= 8 * 60 && minutes < 11 * 60 + 50)
    || (minutes >= 13 * 60 && minutes < 16 * 60);
}
