// Pantalla de entrada: lo primero que se ve si no hay sesión iniciada.
import AuthForm from './AuthForm.jsx';

export default function Welcome() {
  return (
    <main className="welcome">
      <div className="welcome-in">
        <img className="welcome-logo" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="" width="84" height="84" />
        <h1>Seiri</h1>
        <p className="muted">Pon en orden tu estudio. Entra para ver tus datos en todos tus dispositivos.</p>
        <AuthForm />
      </div>
    </main>
  );
}
