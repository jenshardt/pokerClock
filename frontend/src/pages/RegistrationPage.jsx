import { useRef } from 'react';
import { REBUY_MODES } from '../constants';
import styles from './RegistrationPage.module.css';

export default function RegistrationPage({
  form,
  updateForm,
  updateBlindLevel,
  addBlindLevel,
  addBreakLevel,
  insertBlindLevelAt,
  insertBreakAt,
  moveBlindLevel,
  removeBlindLevel,
  resetBlindDefaults,
  participants,
  importInputRef,
  saveTemplate,
  createTournament,
  exportTemplate,
  triggerImport,
  importTemplate,
}) {
  const draggedIndexRef = useRef(null);

  const handleDragStart = (index) => {
    draggedIndexRef.current = index;
  };

  const handleDrop = (dropIndex) => {
    const fromIndex = draggedIndexRef.current;
    draggedIndexRef.current = null;
    if (fromIndex === null || fromIndex === undefined || fromIndex === dropIndex) {
      return;
    }
    moveBlindLevel(fromIndex, dropIndex);
  };

  const levelCounterForIndex = (rowIndex) => (
    form.blindLevels.slice(0, rowIndex + 1).filter((entry) => entry.itemType !== 'BREAK').length
  );

  return (
    <section className="screen card">
      <div className="section-head">
        <h2>Angaben zum Turnier</h2>
        <p className="section-hint">Alle Angaben können als Vorlage gespeichert und importiert/exportiert werden.</p>
      </div>

      <div className={styles.groupGrid}>
        <article className={styles.groupCard}>
          <h3>Turnierdaten</h3>
          <label>
            Turniername
            <input value={form.tournamentName} onChange={(e) => updateForm('tournamentName', e.target.value)} />
          </label>
          <label>
            Spielort
            <input value={form.location} onChange={(e) => updateForm('location', e.target.value)} />
          </label>
          <div className={styles.inlineGrid}>
            <label>
              Starting Stack
              <input type="number" min="100" step="100" value={form.startingStack} onChange={(e) => updateForm('startingStack', e.target.value)} />
            </label>
            <label>
              Buy In (EUR, optional)
              <input type="number" min="0" step="0.5" value={form.buyInEuro} onChange={(e) => updateForm('buyInEuro', e.target.value)} />
            </label>
          </div>
          <div className="quick-picks">
            {[5000, 10000, 20000].map((stack) => (
              <button key={stack} type="button" className="ghost-button" onClick={() => updateForm('startingStack', stack)}>
                {stack.toLocaleString('de-DE')} Chips
              </button>
            ))}
          </div>
        </article>

        <article className={styles.groupCard}>
          <h3>Teilnehmer und Tische</h3>
          <label>
            Teilnehmer (eine Zeile pro Name oder komma-getrennt)
            <textarea value={form.participantsText} onChange={(e) => updateForm('participantsText', e.target.value)} rows={7} />
          </label>
          <div className={styles.inlineGrid}>
            <label>
              Anzahl Tische
              <input type="number" min="1" max="20" value={form.tableCount} onChange={(e) => updateForm('tableCount', e.target.value)} />
            </label>
            <label>
              Plätze pro Tisch
              <input type="number" min="2" max="10" value={form.seatsPerTable} onChange={(e) => updateForm('seatsPerTable', e.target.value)} />
            </label>
          </div>
          <label className={styles.toggleLine}>
            <input type="checkbox" checked={form.hasNeutralDealer} onChange={(e) => updateForm('hasNeutralDealer', e.target.checked)} />
            Neutraler Dealer (Spieler geben nicht selbst)
          </label>
          <p className={styles.hint}>Aktuell erfasst: {participants.length} Spieler. Für Texas Holdem sind 2-10 Spieler je Tisch sinnvoll.</p>
        </article>
      </div>

      <article className={styles.groupCard}>
        <h3>Rebuy-Regeln</h3>
        <label className={styles.toggleLine}>
          <input type="checkbox" checked={form.rebuyEnabled} onChange={(e) => updateForm('rebuyEnabled', e.target.checked)} />
          Rebuys erlauben
        </label>

        {form.rebuyEnabled && (
          <div className={styles.rebuyPanel}>
            {Object.entries(REBUY_MODES).map(([key, label]) => (
              <label key={key} className={styles.radioLine}>
                <input
                  type="radio"
                  checked={form.rebuyMode === key}
                  onChange={() => updateForm('rebuyMode', key)}
                />
                {label}
              </label>
            ))}

            {form.rebuyMode === 'N_WHILE_ALL_ELIGIBLE' && (
              <label>
                Maximale Rebuys pro Spieler (n)
                <input type="number" min="1" value={form.rebuyMaxCount} onChange={(e) => updateForm('rebuyMaxCount', e.target.value)} />
              </label>
            )}

            <div className={styles.inlineGrid}>
              <label>
                Reentry Price (EUR)
                <input type="number" min="0" step="0.5" value={form.reentryPriceEuro} onChange={(e) => updateForm('reentryPriceEuro', e.target.value)} />
              </label>
              <label>
                Reentry Stack
                <input type="number" min="100" step="100" value={form.reentryStack} onChange={(e) => updateForm('reentryStack', e.target.value)} />
              </label>
            </div>
            <button type="button" className="ghost-button" onClick={() => updateForm('reentryStack', form.startingStack)}>
              Reentry Stack auf Starting Stack setzen
            </button>
          </div>
        )}
      </article>

      <article className={styles.groupCard}>
        <div className={styles.splitHead}>
          <h3>Blindstruktur</h3>
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={resetBlindDefaults}>Standard 25/50 bis 200/400</button>
            <button type="button" className="ghost-button" onClick={addBlindLevel}>Level hinzufügen</button>
            <button type="button" className="ghost-button" onClick={addBreakLevel}>Pause hinzufügen</button>
          </div>
        </div>
        <div className={styles.blindTableWrap}>
          <table className={styles.blindTable}>
            <thead>
              <tr>
                <th>Move</th>
                <th>Pos</th>
                <th>Typ</th>
                <th>Level</th>
                <th>Small Blind</th>
                <th>Big Blind</th>
                <th>Dauer (Min)</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {form.blindLevels.map((level, idx) => (
                <tr
                  key={`blind-${idx}`}
                  className={level.itemType === 'BREAK' ? styles.breakRow : ''}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(idx)}
                >
                  <td>
                    <span className={styles.dragHandle} title="Per Drag & Drop verschieben">::</span>
                  </td>
                  <td>{idx + 1}</td>
                  <td>{level.itemType === 'BREAK' ? 'Pause' : 'Blind'}</td>
                  <td>{level.itemType === 'BREAK' ? '—' : levelCounterForIndex(idx)}</td>
                  <td>
                    {level.itemType === 'BREAK'
                      ? <span className={styles.disabledCell}>—</span>
                      : <input type="number" min="1" value={level.smallBlind} onChange={(e) => updateBlindLevel(idx, 'smallBlind', e.target.value)} />}
                  </td>
                  <td>
                    {level.itemType === 'BREAK'
                      ? <span className={styles.disabledCell}>—</span>
                      : <input type="number" min="2" value={level.bigBlind} onChange={(e) => updateBlindLevel(idx, 'bigBlind', e.target.value)} />}
                  </td>
                  <td><input type="number" min="1" value={level.durationMinutes} onChange={(e) => updateBlindLevel(idx, 'durationMinutes', e.target.value)} /></td>
                  <td className={styles.actionCell}>
                    <button type="button" className="ghost-button" onClick={() => insertBlindLevelAt(idx + 1)}>+Level</button>
                    <button type="button" className="ghost-button" onClick={() => insertBreakAt(idx + 1)}>+Pause</button>
                    <button type="button" className="danger-button" onClick={() => removeBlindLevel(idx)}>Entfernen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="toolbar">
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={saveTemplate}>Turnierstruktur speichern</button>
          <button type="button" className="ghost-button" onClick={exportTemplate}>Turnierstruktur exportieren</button>
          <button type="button" className="ghost-button" onClick={triggerImport}>Turnierstruktur importieren</button>
          <input ref={importInputRef} type="file" accept="application/json" onChange={importTemplate} hidden />
        </div>
        <button type="button" className="primary-button" onClick={createTournament}>Turnier anlegen</button>
      </div>
    </section>
  );
}
