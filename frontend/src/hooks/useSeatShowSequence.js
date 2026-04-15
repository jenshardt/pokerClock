import { useEffect, useMemo, useRef, useState } from 'react';
import { getSeatLayouts } from '../components/TableDistributionBoard';

const SPEED_PROFILES = {
  slow: { focusMs: 1300, flyMs: 1800, gapMs: 900, prePauseMs: 350 },
  normal: { focusMs: 900, flyMs: 1400, gapMs: 650, prePauseMs: 300 },
  fast: { focusMs: 600, flyMs: 1000, gapMs: 450, prePauseMs: 220 },
};

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildQueue(distribution) {
  const seatLayouts = getSeatLayouts(distribution || []);
  const queue = [];

  distribution.forEach((table, tableIndex) => {
    seatLayouts[tableIndex].forEach((seat, seatIndex) => {
      if (seat.isNeutralDealer) {
        return;
      }

      const roles = [];
      if (!table.neutralDealer && seat.player === table.dealer) {
        roles.push('dealer');
      }
      if (seat.player === table.smallBlind) {
        roles.push('small-blind');
      }
      if (seat.player === table.bigBlind) {
        roles.push('big-blind');
      }

      queue.push({
        seatId: `${tableIndex}-${seatIndex}-${seat.player}`,
        playerName: seat.player,
        tableIndex,
        tableNumber: tableIndex + 1,
        tableName: table.tableName,
        seatIndex,
        seatNumber: seatIndex + 1,
        roles,
      });
    });
  });

  return queue;
}

export default function useSeatShowSequence({
  distribution,
  enabled,
  speed = 'normal',
  onBeforeSeat,
  onAfterSeat,
  onComplete,
}) {
  const queue = useMemo(() => buildQueue(distribution), [distribution]);
  const [placedSeatIds, setPlacedSeatIds] = useState(() => new Set());
  const [activeSeat, setActiveSeat] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    if (!enabled || queue.length === 0) {
      setIsRunning(false);
      setPhase('idle');
      setActiveSeat(null);
      setPlacedSeatIds(new Set(queue.map((entry) => entry.seatId)));
      return () => {};
    }

    const profile = SPEED_PROFILES[speed] || SPEED_PROFILES.normal;
    let cancelled = false;

    const run = async () => {
      setIsRunning(true);
      setPhase('intro');
      setPlacedSeatIds(new Set());

      for (let index = 0; index < queue.length; index += 1) {
        const entry = queue[index];
        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        setActiveSeat(entry);
        setPhase('pre-call');
        if (typeof onBeforeSeat === 'function') {
          await onBeforeSeat({ ...entry, index, total: queue.length });
        }

        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        await wait(profile.prePauseMs);
        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        setPhase('focus');
        await wait(profile.focusMs);
        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        setPhase('fly');
        await wait(profile.flyMs);
        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        setPlacedSeatIds((prev) => {
          const next = new Set(prev);
          next.add(entry.seatId);
          return next;
        });

        setPhase('seated-call');
        if (typeof onAfterSeat === 'function') {
          await onAfterSeat({ ...entry, index, total: queue.length });
        }

        if (cancelled || runIdRef.current !== runId) {
          return;
        }

        await wait(profile.gapMs);
      }

      setPhase('done');
      setActiveSeat(null);
      setIsRunning(false);

      if (typeof onComplete === 'function') {
        await onComplete({ total: queue.length });
      }
    };

    run();

    return () => {
      cancelled = true;
      runIdRef.current += 1;
      setIsRunning(false);
      setPhase('idle');
      setActiveSeat(null);
    };
  }, [enabled, speed, queue, onBeforeSeat, onAfterSeat, onComplete]);

  const progress = queue.length > 0
    ? {
      placed: placedSeatIds.size,
      total: queue.length,
    }
    : { placed: 0, total: 0 };

  return {
    queue,
    activeSeat,
    phase,
    isRunning,
    progress,
    placedSeatIds,
    speedProfile: SPEED_PROFILES[speed] || SPEED_PROFILES.normal,
  };
}
