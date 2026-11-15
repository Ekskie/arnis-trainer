import { useCallback, useEffect, useState } from 'react';

/**
 * Shared countdown hook for OTP resend cooldowns (default 60 seconds).
 */
export function useResendCooldown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const startCooldown = useCallback((seconds = 60) => {
    setSecondsLeft(seconds);
  }, []);

  return {
    secondsLeft,
    isCoolingDown: secondsLeft > 0,
    startCooldown,
  };
}
