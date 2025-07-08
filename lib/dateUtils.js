export function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const hour = currentDate.getHours();
  const min = currentDate.getMinutes();
  const sec = currentDate.getSeconds();
  const msec = currentDate.getMilliseconds();
  return (
    year +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0') +
    '-' +
    String(hour).padStart(2, '0') +
    '-' +
    String(min).padStart(2, '0') +
    '-' +
    String(sec).padStart(2, '0') +
    '-' +
    String(msec).padStart(3, '0')
  );
}
