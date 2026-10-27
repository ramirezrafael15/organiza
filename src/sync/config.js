// CONFIGURACIÓN DE LA NUBE (fase 2). Estos datos NO son secretos: van en la app web.
// Cómo conseguirlos: Firebase -> Configuración del proyecto -> Tus apps -> Web (</>) -> "Configuración del SDK".
// La clave VAPID pública se genera con:  npx web-push generate-vapid-keys   (la privada va en GitHub, ver README).
//
// Mientras estén vacíos, la app funciona igual pero solo en este dispositivo (sin cuenta ni avisos al móvil).
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const VAPID_PUBLIC_KEY = '';

export const isConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
