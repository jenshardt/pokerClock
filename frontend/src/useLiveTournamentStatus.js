import { useEffect, useState } from 'react';

export default function useLiveTournamentStatus(status) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!status?.running) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [status?.running]);

  if (!status?.running || !status.receivedAt) {
    return status;
  }

  const receivedAt = Number(status.receivedAt);
  if (!Number.isFinite(receivedAt)) {
    return status;
  }

  const elapsedSinceStatus = Math.max(0, Math.floor((now - receivedAt) / 1000));
  return {
    ...status,
    remainingSeconds: Math.max(0, Number(status.remainingSeconds || 0) - elapsedSinceStatus),
    elapsedSeconds: Math.max(0, Number(status.elapsedSeconds || 0) + elapsedSinceStatus),
    timeToNextBreakSeconds: Number(status.timeToNextBreakSeconds) < 0
      ? status.timeToNextBreakSeconds
      : Math.max(0, Number(status.timeToNextBreakSeconds || 0) - elapsedSinceStatus),
  };
}