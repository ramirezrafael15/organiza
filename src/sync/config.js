// CONFIGURACIÓN DE LA NUBE (fase 2). Estos datos NO son secretos: van en la app web.
// Cómo conseguirlos: Firebase -> Configuración del proyecto -> Tus apps -> Web (</>) -> "Configuración del SDK".
// La clave VAPID pública se genera con:  npx web-push generate-vapid-keys   (la privada va en GitHub, ver README).
//
// Mientras estén vacíos, la app funciona igual pero solo en este dispositivo (sin cuenta ni avisos al móvil).
export const firebaseConfig = {
  apiKey: 'AIzaSyAjpOZjwnd8Fpb3y_w6IX-rhIbExi-NBiY',
  authDomain: 'organiza-27532.firebaseapp.com',
  projectId: 'organiza-27532',
  storageBucket: 'organiza-27532.firebasestorage.app',
  messagingSenderId: '239293780327',
  appId: '1:239293780327:web:f7754de341e558f1511fc2',
};

export const VAPID_PUBLIC_KEY = 'BIOdsQKHBKq3X1mxJKk0_OV91rdte1cPUsPjw9dYf0yKpdPx3p0fjFFywf3_DgX8KNQiXIaavX8KzHFD_zkvX-Q';

export const isConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
