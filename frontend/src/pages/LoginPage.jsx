import logo from '../assets/images/Logo.png';
import styles from './LoginPage.module.css';

export default function LoginPage({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  isBusy,
}) {
  return (
    <section className={styles.loginShell}>
      <div className={`${styles.loginCard} card`}>
        <img src={logo} alt="PokerClock Logo" className={styles.logo} />
        <div className={styles.headline}>
          <p className={styles.kicker}>All Inners - PokerClock</p>
          <h1>Anmeldung</h1>
          <p className={styles.copy}>Bitte mit einem berechtigten Benutzer anmelden.</p>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            Benutzername
            <input value={username} onChange={(event) => onUsernameChange(event.target.value)} disabled={isBusy} autoComplete="username" />
          </label>
          <label>
            Passwort
            <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} disabled={isBusy} autoComplete="current-password" />
          </label>
          <button type="submit" className="primary-button" disabled={isBusy}>Anmelden</button>
        </form>
      </div>
    </section>
  );
}
