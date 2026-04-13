import { useMemo } from 'react';
import styles from './TableDistributionBoard.module.css';

export function getSeatLayouts(distribution) {
  return distribution.map((table) => {
    if (table.neutralDealer) {
      const playerSeats = table.players.map((player, index) => {
        const angle = (((index + 1) / (table.players.length + 1)) * Math.PI * 2) - Math.PI / 2;
        return {
          player,
          isNeutralDealer: false,
          angle,
          x: 50 + 45 * Math.cos(angle),
          y: 50 + 38 * Math.sin(angle),
        };
      });
      return [{ player: 'Neutraler Dealer', isNeutralDealer: true, angle: -Math.PI / 2, x: 50, y: 8 }, ...playerSeats];
    }

    return table.players.map((player, index) => {
      const angle = ((index / table.players.length) * Math.PI * 2) - Math.PI / 2;
      return {
        player,
        isNeutralDealer: false,
        angle,
        x: 50 + 45 * Math.cos(angle),
        y: 50 + 38 * Math.sin(angle),
      };
    });
  });
}

export function getTablePopupText(table) {
  const dealerText = table.neutralDealer ? 'Neutraler Dealer' : (table.dealer || 'Nicht gesetzt');
  const smallBlindText = table.smallBlind || 'Nicht gesetzt';
  const bigBlindText = table.bigBlind || 'Nicht gesetzt';
  return `Dealer: ${dealerText}\nSmall Blind: ${smallBlindText}\nBig Blind: ${bigBlindText}`;
}

export function getSeatRoles(table, seat) {
  return {
    isDealerSeat: seat.isNeutralDealer || (!table.neutralDealer && seat.player === table.dealer),
    isSmallBlindSeat: !seat.isNeutralDealer && seat.player === table.smallBlind,
    isBigBlindSeat: !seat.isNeutralDealer && seat.player === table.bigBlind,
  };
}

function getMarkerPosition(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  let markerX = 50 + 30 * cos;
  let markerY = 50 + 24 * sin;

  markerX -= Math.sign(cos) * 6 * Math.abs(cos);

  if (sin >= 0.72) {
    markerY -= 6;
  } else if (sin <= -0.72) {
    markerY += 4;
  } else {
    markerY += 4 * Math.abs(cos);
  }

  return { x: markerX, y: markerY };
}

export default function TableDistributionBoard({
  distribution,
  activeTablePopup,
  setActiveTablePopup,
  seatStatuses = {},
  onSeatSelect,
  selectedPlayerName,
  animate = false,
  sequenceIntervalMs = 5000,
  compact = false,
}) {
  const seatLayouts = useMemo(() => getSeatLayouts(distribution), [distribution]);

  const seatStartOffsets = useMemo(() => {
    let runningCount = 0;
    return seatLayouts.map((layout) => {
      const start = runningCount;
      runningCount += layout.length;
      return start;
    });
  }, [seatLayouts]);

  return (
    <div className={`${styles.distributionGrid} ${compact ? styles.compactGrid : ''}`}>
      {distribution.map((table, tableIndex) => (
        <article key={table.tableName} className={`${styles.distributionCard} ${compact ? styles.compactCard : ''}`}>
          <h3 className={styles.tableTitle}>{table.tableName}</h3>
          <div
            className={`${styles.pokerTableWrap} ${compact ? styles.compactWrap : ''}`}
            onClick={() => setActiveTablePopup?.((prev) => prev === table.tableName ? null : table.tableName)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && setActiveTablePopup) {
                event.preventDefault();
                setActiveTablePopup((prev) => prev === table.tableName ? null : table.tableName);
              }
            }}
          >
            <div className={`${styles.pokerTableHorizontal} ${animate ? styles.tableEnter : ''}`} />
            <div className={`${styles.cardStack} ${animate ? styles.tableEnter : ''}`} aria-hidden="true">
              <span className={`${styles.playCard} ${styles.cardA}`} />
              <span className={`${styles.playCard} ${styles.cardB}`} />
              <span className={`${styles.playCard} ${styles.cardC}`} />
            </div>

            {seatLayouts[tableIndex].map((seat, index) => {
              const { isDealerSeat, isSmallBlindSeat, isBigBlindSeat } = getSeatRoles(table, seat);
              const hasRoleMarker = isDealerSeat || isSmallBlindSeat || isBigBlindSeat;
              const markerPosition = getMarkerPosition(seat.angle);
              const globalSeatIndex = seatStartOffsets[tableIndex] + index;
              const seatDelayMs = 240 + (globalSeatIndex * sequenceIntervalMs);
              const markerDelayMs = seatDelayMs + 1700;
              const seatStatus = seatStatuses[seat.player] || (seat.isNeutralDealer ? 'neutral' : 'active');
              const isSelected = selectedPlayerName && selectedPlayerName === seat.player;

              return (
                <div key={`${table.tableName}-${seat.player}-${index}`}>
                  {isDealerSeat && (
                    <span
                      className={`${styles.tableMarker} ${styles.markerDealer} ${animate ? styles.markerPop : ''}`}
                      style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                    >
                      Dealer
                    </span>
                  )}
                  {isSmallBlindSeat && (
                    <span
                      className={`${styles.tableMarker} ${styles.markerSb} ${animate ? styles.markerPop : ''}`}
                      style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                    >
                      Small Blind
                    </span>
                  )}
                  {isBigBlindSeat && (
                    <span
                      className={`${styles.tableMarker} ${styles.markerBb} ${animate ? styles.markerPop : ''}`}
                      style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                    >
                      Big Blind
                    </span>
                  )}

                  <div
                    className={[
                      styles.seatPill,
                      compact && styles.compactSeat,
                      hasRoleMarker && styles.markedSeat,
                      isDealerSeat && styles.dealerSeat,
                      isSmallBlindSeat && styles.sbSeat,
                      isBigBlindSeat && styles.bbSeat,
                      seat.isNeutralDealer && styles.neutralSeat,
                      seatStatus === 'eliminated' && styles.eliminatedSeat,
                      onSeatSelect && !seat.isNeutralDealer && styles.clickableSeat,
                      isSelected && styles.selectedSeat,
                      animate && styles.seatEnter,
                    ].filter(Boolean).join(' ')}
                    style={{
                      left: `${seat.x}%`,
                      top: `${seat.y}%`,
                      animationDelay: `${seatDelayMs}ms`,
                      '--from-x': `${50 - seat.x}`,
                      '--from-y': `${50 - seat.y}`,
                    }}
                    onClick={(event) => {
                      if (!onSeatSelect || seat.isNeutralDealer) {
                        return;
                      }
                      event.stopPropagation();
                      onSeatSelect({
                        table,
                        tableIndex,
                        seat,
                        seatIndex: index,
                        seatStatus,
                        roles: {
                          isDealerSeat,
                          isSmallBlindSeat,
                          isBigBlindSeat,
                        },
                      });
                    }}
                  >
                    <span className={`${styles.seatName} ${seatStatus === 'eliminated' ? styles.eliminatedName : ''}`}>{seat.player}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeTablePopup === table.tableName && (
            <div className={styles.tablePopup} onClick={(event) => event.stopPropagation()}>
              <strong>Rollen Runde 1</strong>
              <pre>{getTablePopupText(table)}</pre>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}