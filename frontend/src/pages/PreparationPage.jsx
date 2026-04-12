import { useMemo } from 'react';
import styles from './PreparationPage.module.css';

function getSeatLayout(table) {
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
}

function getTablePopupText(table) {
  const dealerText = table.neutralDealer ? 'Neutraler Dealer' : (table.dealer || 'Nicht gesetzt');
  const smallBlindText = table.smallBlind || 'Nicht gesetzt';
  const bigBlindText = table.bigBlind || 'Nicht gesetzt';
  return `Dealer: ${dealerText}\nSmall Blind: ${smallBlindText}\nBig Blind: ${bigBlindText}`;
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

export default function PreparationPage({
  distribution,
  activeTablePopup,
  setActiveTablePopup,
  setStep,
  startTournament,
}) {
  const seatLayouts = useMemo(
    () => distribution.map((table) => getSeatLayout(table)),
    [distribution]
  );

  const seatStartOffsets = useMemo(() => {
    let runningCount = 0;
    return seatLayouts.map((layout) => {
      const start = runningCount;
      runningCount += layout.length;
      return start;
    });
  }, [seatLayouts]);

  return (
    <section className="screen card">
      <div className="section-head">
        <h2>Tischverteilung</h2>
        <p>Bitte die Plätze laut Tischgrafik einnehmen. Dealer, Small Blind und Big Blind sind markiert.</p>
      </div>

      <div className={styles.distributionGrid}>
        {distribution.map((table, tableIndex) => (
          <article key={table.tableName} className={styles.distributionCard}>
            <h3>{table.tableName}</h3>
            <div
              className={styles.pokerTableWrap}
              onClick={() => setActiveTablePopup((prev) => prev === table.tableName ? null : table.tableName)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveTablePopup((prev) => prev === table.tableName ? null : table.tableName);
                }
              }}
            >
              <div className={`${styles.pokerTableHorizontal} ${styles.tableEnter}`} />
              <div className={`${styles.cardStack} ${styles.tableEnter}`} aria-hidden="true">
                <span className={`${styles.playCard} ${styles.cardA}`} />
                <span className={`${styles.playCard} ${styles.cardB}`} />
                <span className={`${styles.playCard} ${styles.cardC}`} />
              </div>
              {seatLayouts[tableIndex].map((seat, index) => {
                const x = seat.x;
                const y = seat.y;
                const isDealerSeat = seat.isNeutralDealer || (!table.neutralDealer && seat.player === table.dealer);
                const isSmallBlindSeat = !seat.isNeutralDealer && seat.player === table.smallBlind;
                const isBigBlindSeat = !seat.isNeutralDealer && seat.player === table.bigBlind;
                const hasRoleMarker = isDealerSeat || isSmallBlindSeat || isBigBlindSeat;
                const markerPosition = getMarkerPosition(seat.angle);
                const globalSeatIndex = seatStartOffsets[tableIndex] + index;
                const seatDelayMs = 240 + (globalSeatIndex * 3000);
                const markerDelayMs = seatDelayMs + 1700;

                return (
                  <div key={`${table.tableName}-${seat.player}-${index}`}>
                    {isDealerSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerDealer} ${styles.markerPop}`}
                        style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                      >
                        Dealer
                      </span>
                    )}
                    {isSmallBlindSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerSb} ${styles.markerPop}`}
                        style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                      >
                        Small Blind
                      </span>
                    )}
                    {isBigBlindSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerBb} ${styles.markerPop}`}
                        style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%`, animationDelay: `${markerDelayMs}ms` }}
                      >
                        Big Blind
                      </span>
                    )}
                    <div
                      className={[
                        styles.seatPill,
                        hasRoleMarker && styles.markedSeat,
                        isDealerSeat && styles.dealerSeat,
                        isSmallBlindSeat && styles.sbSeat,
                        isBigBlindSeat && styles.bbSeat,
                        seat.isNeutralDealer && styles.neutralSeat,
                        styles.seatEnter,
                      ].filter(Boolean).join(' ')}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        animationDelay: `${seatDelayMs}ms`,
                        '--from-x': `${50 - x}`,
                        '--from-y': `${50 - y}`,
                      }}
                    >
                      <span className={styles.seatName}>{seat.player}</span>
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

      <div className="toolbar">
        <button type="button" className="ghost-button" onClick={() => setStep('registration')}>Zurück zur Tuniervorbereitung</button>
        <button type="button" className="primary-button" onClick={startTournament}>Turnier starten</button>
      </div>
    </section>
  );
}
