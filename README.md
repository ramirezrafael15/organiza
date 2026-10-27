# Organiza

App de organización personal para estudiantes: calendario, horario semanal, exámenes, entregas, calificaciones, bloc de notas y niveles de urgencia. Es una **PWA** (se instala en iPhone y Windows y funciona sin conexión).

**Estado:** fase 1 completa. Fase 2 (cuenta, sincronización y notificaciones al móvil) construida: falta conectarla con tu Firebase (guía abajo). Faltan los extras (fase 3).

## Arrancar

```bash
npm install
npm run dev      # http://localhost:5173 (y la IP de tu red para probar en el móvil)
npm test         # tests de la lógica + prueba de humo de toda la app
npm run build    # genera la carpeta dist/
```

La primera vez, ve a **Ajustes → Cargar datos de ejemplo** para verla con contenido.

## Publicarla (hace falta HTTPS para instalarla en el móvil)

GitHub Pages (repo `organiza`):

```bash
VITE_BASE=/organiza/ npm run build     # en Windows PowerShell: $env:VITE_BASE="/organiza/"; npm run build
# sube el contenido de dist/ a la rama gh-pages (o usa una GitHub Action)
```

Con un dominio propio o Firebase Hosting no hace falta `VITE_BASE` (por defecto es `/`).

Instalación: iPhone → Safari → Compartir → "Añadir a pantalla de inicio". Windows → Edge/Chrome → icono de instalar.

## Estructura

Además: `scripts/send-reminders.mjs` (el envío de avisos), `.github/workflows/` (publicar y enviar avisos) y `firestore.rules`.

```
src/
  lib/          lógica pura, sin React (se prueba con vitest)
    urgency.js    niveles de urgencia (auto + mínimo manual)
    reminders.js  avisos previos: qué avisos están activos y su mensaje
    notify.js     qué notificaciones enviar ahora (la usa el servidor)
    agenda.js     une clases semanales, exámenes, entregas y eventos en "entradas"
    grades.js     medias ponderadas y media general
    search.js     búsqueda de texto en notas (sin tildes ni mayúsculas)
    filter.js     filtro por estudios (DAW, Marketing...)
    color.js      color de cada entrada (por tipo o por estudios)
    dates.js      fechas 'YYYY-MM-DD' y horas 'HH:mm'
  data/         capa de datos
    repository.js guardado local (misma interfaz que tendrá Firebase en la fase 2)
    repo.js       la instancia única que usa la app
    actions.js    reglas de negocio al guardar/borrar
    demo.js       datos de ejemplo
  components/   piezas de interfaz (formularios en components/forms)
  sync/         cuenta, sincronización (engine.js) y push; config.js con tus claves
  pages/        una pantalla por archivo
  styles/       index.css (colores, modo claro/oscuro, responsive)
```

## Estudios y colores

Los **estudios** (por ejemplo DAW y Marketing) agrupan asignaturas. Se crean en Ajustes o desde el formulario de una asignatura. Con al menos uno creado aparece arriba un filtro (Todo / DAW / Marketing / Otros) que filtra calendario, panel, tareas, horario, notas y medias; "Otros" es lo que no tiene estudios (trabajo, personal). En Ajustes → Colores puedes elegir el color de cada tipo y colorear la agenda por tipo o por estudios.

## Avisos previos

Cada examen, entrega y evento tiene su lista de avisos ("Avisarme antes": 30, 21, 14, 7, 5, 3, 2, 1 días o el mismo día; se pueden marcar varios). El valor por defecto de lo nuevo se cambia en Ajustes → Avisos (con botón para aplicarlo a todo lo existente). Cuando falta menos tiempo que tu aviso más lejano, el Panel muestra un aviso del tipo "Te quedan 3 días para el examen de Bases de Datos, llevas el 40 % preparado" y el ritmo diario necesario. Las notificaciones en el móvil llegan en la fase 2 usando estas mismas listas (`src/lib/reminders.js`).

## Calendario común

El Calendario junta clases, trabajo, exámenes, entregas y eventos de todos tus estudios, y no usa el filtro de arriba: tiene sus propios botones (Todo junto / DAW / Marketing / Otros). Vistas: mes, semana, día y lista (próximos 14 días). En el mes, la franja de color a la derecha de cada título marca el estudio.

## Cómo funciona la urgencia

Se calcula sola según los días que quedan: 0-1 días crítica, 2-3 alta, 4-7 media, más baja. Si faltan 7 días o menos y llevas menos del 50 %, sube un nivel; si llevas el 80 % o más y quedan 2+ días, baja uno. Lo vencido es crítico. Si marcas un nivel a mano, funciona como **mínimo**: la app sigue subiéndolo sola al acercarse la fecha.

## Hoja de ruta

- **Fase 2 (hecha, pendiente de conectar con tu Firebase):** cuenta, sincronización (Firebase Auth + Firestore con modo offline) y notificaciones push con Web Push + GitHub Actions. Los avisos usan los días de antelación de cada examen, entrega y evento. Pendiente: plan de preparación al crear un examen.
- **Fase 3:** extras (vista de horas en la semana, importar horarios, estadísticas, etc.).

## Fase 2: cuenta, sincronización y notificaciones (todo gratis, sin tarjeta)

Cómo funciona: tus datos se guardan en el dispositivo (funciona sin conexión) y se copian a **Firebase** (plan Spark, gratis). Cada 15 minutos, **GitHub Actions** (gratis en repos públicos) mira qué avisos tocan y los manda a tu móvil con Web Push, aunque la app esté cerrada.

### 1. Firebase (unos 10 minutos)
1. Entra en https://console.firebase.google.com con tu cuenta de Google → **Crear un proyecto** (desactiva Analytics). Se queda en el plan **Spark**: no pide tarjeta.
2. **Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Activar → Guardar.**
3. **Compilación → Firestore Database → Crear base de datos** → ubicación `eur3 (europe-west)` → **modo de producción**. Luego pestaña **Reglas**: borra lo que haya, pega el contenido de `firestore.rules` y pulsa **Publicar**.
4. Engranaje ⚙ → **Configuración del proyecto → Tus apps → icono Web `</>`** → ponle un nombre (sin Hosting) → copia el bloque `firebaseConfig` y pégalo en `src/sync/config.js`.
5. En Configuración del proyecto → **Cuentas de servicio → Generar nueva clave privada**: se descarga un `.json`. Es secreto: no lo subas al repo.

### 2. Claves para las notificaciones
En PowerShell, dentro de la carpeta del proyecto: `npx.cmd web-push generate-vapid-keys`. Te da una clave **pública** (pégala en `VAPID_PUBLIC_KEY` de `src/sync/config.js`) y una **privada** (solo para GitHub).

### 3. GitHub
En el repo: **Settings → Secrets and variables → Actions → New repository secret**, tres secretos:
- `FIREBASE_SERVICE_ACCOUNT` → el contenido completo del `.json` del paso 1.5
- `VAPID_PUBLIC_KEY` → la clave pública
- `VAPID_PRIVATE_KEY` → la clave privada

Sube los cambios (`src/sync/config.js` con tus datos). La app se republica sola.

### 4. En cada dispositivo
1. Abre la app publicada. **iPhone:** Safari → Compartir → "Añadir a pantalla de inicio" y ábrela **desde el icono** (iOS 16.4 o superior). **Windows:** Edge/Chrome → instalar.
2. Ajustes → **Cuenta**: crea la cuenta (la primera vez) o entra (en el resto de dispositivos, con el mismo correo). Tus datos de este dispositivo se suben.
3. Ajustes → **Notificaciones → Activar** y acepta el permiso.

### 5. Probar de verdad
Con la app **cerrada** en el móvil: en GitHub → pestaña **Actions → Enviar avisos → Run workflow**, marca **test** y ejecútalo. En un minuto debería llegar "Prueba: si ves esto, los avisos funcionan ✅".

### 6. Avisos en el minuto exacto (tu servidor casero)
GitHub solo mira cada 15 minutos y a veces se retrasa. Para que el aviso de las 6:00 llegue a las 6:00, deja un programa pequeño siempre encendido en tu servidor Linux. GitHub queda como **respaldo**: si el servidor está apagado, manda el aviso con 10-25 minutos de retraso en vez de perderlo.

En el servidor (por RDP o SSH):
1. Instala Node 22 (Debian/Ubuntu): `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs git`
2. Descarga el proyecto: `sudo git clone https://github.com/TU_USUARIO/organiza.git /opt/organiza` y entra: `cd /opt/organiza && sudo npm ci --omit=dev`
3. Crea el usuario y el archivo de claves:
   - `sudo useradd -r -s /usr/sbin/nologin organiza && sudo chown -R organiza /opt/organiza`
   - Guarda el `.json` de Firebase (paso 1.5) en `/etc/organiza-firebase.json`
   - `sudo nano /etc/organiza-avisos.env` con estas líneas (con tus claves): `FIREBASE_SERVICE_ACCOUNT_FILE=/etc/organiza-firebase.json`, `VAPID_PUBLIC_KEY=...`, `VAPID_PRIVATE_KEY=...`
   - `sudo chown organiza /etc/organiza-firebase.json /etc/organiza-avisos.env && sudo chmod 600 /etc/organiza-firebase.json /etc/organiza-avisos.env`
4. Instala el servicio: `sudo cp scripts/organiza-avisos.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now organiza-avisos`
5. Comprueba: `journalctl -u organiza-avisos -f` debe decir "Servidor de avisos en marcha". Pon la hora del servidor en automático (`timedatectl` → "System clock synchronized: yes").
6. **Que te avise si se apaga (opcional, gratis):** crea un check en healthchecks.io (periodo 2 minutos), copia su URL y añade `HEALTHCHECK_URL=...` al `.env` (luego `sudo systemctl restart organiza-avisos`). Si el servidor deja de dar señales, te escriben al correo.

Para actualizar: `cd /opt/organiza && sudo -u organiza git pull && sudo systemctl restart organiza-avisos`.

### Límites que conviene saber
- Con el servidor del paso 6 encendido, cada aviso sale a su minuto. Sin él, solo funciona el respaldo de GitHub: llega entre 10 y 30 minutos tarde. Cada aviso sale una sola vez.
- En repos públicos, GitHub **desactiva las tareas programadas tras 60 días sin actividad** en el repo. Si un día dejan de llegar avisos, ve a Actions y pulsa "Enable workflow" (o sube cualquier cambio).
- En iPhone el permiso hay que darlo con un toque en el botón, y solo funciona con la app instalada en la pantalla de inicio.

## Límites de las notificaciones en iPhone

El push en una PWA solo funciona en iOS 16.4 o superior, con la app **añadida a la pantalla de inicio**, y el permiso se pide con un toque del usuario. Por eso los avisos los enviará un servidor (función programada) y no el propio móvil.
