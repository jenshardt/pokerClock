import styles from './PreparationPage.module.css';

function getSeatLayout(table) {
  if (table.neutralDealer) {
    const playerSeats = table.players.map((player, index) => {
      const angle = (((index + 1) / (table.players.length + 1)) * Math.PI * 2) - Math.PI / 2;
      return {
        player,
        isNeutralDealer: false,
        x: 50 + 45 * Math.cos(angle),
        y: 50 + 30 * Math.sin(angle),
      };
    });
    return [{ player: 'Neutraler Dealer', isNeutralDealer: true, x: 50, y: 20 }, ...playerSeats];
  }

  return table.players.map((player, index) => {
    const angle = ((index / table.players.length) * Math.PI * 2) - Math.PI / 2;
    return {
      player,
      isNeutralDealer: false,
      x: 50 + 45 * Math.cos(angle),
      y: 50 + 30 * Math.sin(angle),
    };
  });
}

function getTablePopupText(table) {
  const dealerText = table.neutralDealer ? 'Neutraler Dealer' : (table.dealer || 'Nicht gesetzt');
  const smallBlindText = table.smallBlind || 'Nicht gesetzt';
  const bigBlindText = table.bigBlind || 'Nicht gesetzt';
  return `Dealer: ${dealerText}\nSmall Blind: ${smallBlindText}\nBig Blind: ${bigBlindText}`;
}

export default function PreparationPage({
  distribution,
  activeTablePopup,
  setActiveTablePopup,
  setStep,
  startTournament,
}) {
  return (
    <section className="screen card">
      <div className="section-head">
        <h2>Tischverteilung</h2>
        <p>Bitte die Plätze laut Tischgrafik einnehmen. Dealer, Small Blind und Big Blind sind markiert.</p>
      </div>

      <div className={styles.distributionGrid}>
        {distribution.map((table) => (
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
              <div className={styles.pokerTableHorizontal} />
              <div className={styles.cardStack} aria-hidden="true">
                <span className={`${styles.playCard} ${styles.cardA}`} />
                <span className={`${styles.playCard} ${styles.cardB}`} />
                <span className={`${styles.playCard} ${styles.cardC}`} />
              </div>
              {getSeatLayout(table).map((seat, index) => {
                const x = seat.x;
                const y = seat.y;
                const isDealerSeat = seat.isNeutralDealer || (!table.neutralDealer && seat.player === table.dealer);
                const isSmallBlindSeat = !seat.isNeutralDealer && seat.player === table.smallBlind;
                const isBigBlindSeat = !seat.isNeutralDealer && seat.player === table.bigBlind;
                const markerX = 50 + (x - 50) * 0.62;
                const markerY = 50 + (y - 50) * 0.62;

                return (
                  <div key={`${table.tableName}-${seat.player}-${index}`}>
                    {isDealerSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerDealer}`}
                        style={{ left: `${markerX}%`, top: `${markerY}%` }}
                      >
                        Dealer
                      </span>
                    )}
                    {isSmallBlindSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerSb}`}
                        style={{ left: `${markerX}%`, top: `${markerY}%` }}
                      >
                        Small Blind
                      </span>
                    )}
                    {isBigBlindSeat && (
                      <span
                        className={`${styles.tableMarker} ${styles.markerBb}`}
                        style={{ left: `${markerX}%`, top: `${markerY}%` }}
                      >
                        Big Blind
                      </span>
                    )}
                    <div
                      className={[
                        styles.seatPill,
                        isDealerSeat && styles.dealerSeat,
                        seat.isNeutralDealer && styles.neutralSeat,
                      ].filter(Boolean).join(' ')}
                      style={{ left: `${x}%`, top: `${y}%` }}
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
