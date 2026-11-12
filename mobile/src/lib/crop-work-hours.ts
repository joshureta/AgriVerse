export const CROP_WORK_HOURS_LABEL = 'Available 8:00 AM–11:50 AM and 1:00 PM–4:00 PM';

export function canWorkCropTaskNow() {
  // The backend restricts future dates, but allows work at any hour today.
  return true;
}
