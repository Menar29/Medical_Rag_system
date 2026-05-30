let lastCapturedError: Error | null = null;

if (typeof window === "undefined") {
  process.on("uncaughtException", (err) => {
    lastCapturedError = err;
  });
}

export function consumeLastCapturedError(): Error | null {
  const err = lastCapturedError;
  lastCapturedError = null;
  return err;
}
