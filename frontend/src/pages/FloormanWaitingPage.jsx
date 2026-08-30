export default function FloormanWaitingPage({ status }) {
  const message = status?.completionReason === 'ABORTED'
    ? 'Das letzte Turnier wurde abgebrochen. Warte auf die nächste Turniervorbereitung.'
    : 'Das Turnier wird vorbereitet. Die Turniersteuerung wird nach der Tischverteilung freigeschaltet.';

  return (
    <section className="screen card">
      <div className="section-head">
        <h2>Floorman</h2>
        <p className="section-hint">{message}</p>
      </div>
    </section>
  );
}