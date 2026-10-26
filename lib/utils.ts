export const formatPrice = (value: number): string => {
  if (value >= 10000000) {
    const cr = (value / 10000000).toFixed(1).replace(/\.0$/, "");
    return `₹${cr}Cr`;
  }

  if (value >= 100000) {
    const l = (value / 100000).toFixed(1).replace(/\.0$/, "");
    return `₹${l}L`;
  }

  return `₹${value.toLocaleString()}`;
};

/**
 * Returns a time-aware greeting based on device local time.
 * Only three greetings are allowed:
 * - Good Morning 👋: 5:00 AM to 11:59 AM
 * - Good Afternoon 👋: 12:00 PM to 4:59 PM
 * - Good Evening 👋: 5:00 PM to 4:59 AM (including nighttime)
 */
export const getTimeGreeting = (date: Date = new Date()): string => {
  const hours = date.getHours();

  if (hours >= 5 && hours < 12) {
    return "Good Morning 👋";
  }
  if (hours >= 12 && hours < 17) {
    return "Good Afternoon 👋";
  }
  return "Good Evening 👋";
};

