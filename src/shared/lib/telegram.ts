export const getTelegramWebApp = (): TelegramWebApp | undefined =>
  typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export const initTelegramWebApp = (): void => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#0b1220");
  tg.setBackgroundColor("#0b1220");
};

export const triggerHaptic = (type: "impact" | "success" | "warning" = "impact"): void => {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;
  if (type === "success") tg.HapticFeedback.notificationOccurred("success");
  else if (type === "warning") tg.HapticFeedback.notificationOccurred("warning");
  else tg.HapticFeedback.impactOccurred("light");
};
