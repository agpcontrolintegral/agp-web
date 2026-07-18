# AGP Platform v2.0.5.1 Firebase

Versión conectada al proyecto Firebase `agp-platform`.

## Qué funciona

- Inicio de sesión real con Firebase Authentication.
- Sesión persistente entre recargas.
- Estado completo del ERP sincronizado con Cloud Firestore.
- Actualización en tiempo real entre computadoras y celulares.
- Diagnóstico público guardado en la colección `publicLeads`.
- Importación automática de nuevos leads al ERP.
- Eliminación del lead temporal después de consolidarlo en la base interna.
- Respaldo local de emergencia en `localStorage`.
- Herramienta manual de migración desde la versión local.
- Reglas de Firestore incluidas.
- Configuración para Firebase Hosting incluida.

## Archivos Firebase

- `firebase-config.js`
- `firebase-service.js`
- `admin-bootstrap.js`
- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`
- `.firebaserc`
- `migration.html`
- `migration.js`

## Paso obligatorio: publicar las reglas

En Firebase Console:

1. Firestore Database.
2. Reglas.
3. Reemplaza el contenido con `firestore.rules`.
4. Pulsa **Publicar**.

Sin estas reglas, la web pública podría no guardar leads o el ERP podría recibir errores de permisos.

## Probar

1. Publica todos los archivos en el mismo dominio.
2. Abre `login.html`.
3. Inicia sesión con el usuario creado en Firebase Authentication.
4. Crea o modifica un registro.
5. Abre `admin.html` en otro dispositivo e inicia sesión con el mismo usuario.
6. Los cambios deben aparecer automáticamente.

## Migración

La primera vez que el ERP encuentra Firestore vacío, sube automáticamente la base disponible en el navegador.

También puedes abrir:

`migration.html`

para forzar la migración de los datos locales. Esta acción reemplaza el estado de Firebase y crea una copia de seguridad local del estado anterior.

## Firebase Hosting

Con Firebase CLI instalado:

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

## Arquitectura actual

Para conservar compatibilidad con todos los módulos existentes, v2.0 almacena el estado del ERP en:

`workspaces/default`

Los diagnósticos públicos se reciben temporalmente en:

`publicLeads`

Esta arquitectura es adecuada para la etapa inicial. Cuando el volumen de información crezca, la siguiente evolución será separar clientes, cotizaciones, proyectos y movimientos en colecciones individuales para evitar el límite de tamaño de un documento de Firestore.


## Corrección v2.0.5
Se corrigió el error de sintaxis de `firestore.rules` provocado por el acceso mediante `.service`, ya que `service` es una palabra reservada del lenguaje de reglas. La nueva versión valida la presencia de ese campo usando `keys().hasAll()` y mantiene comprobaciones de tipo y longitud para los datos públicos.


## Mobile Experience v2.0.5
- Menú móvil convertido en panel sólido a pantalla completa.
- Corrección definitiva del solapamiento entre navegación y hero.
- Header compacto con botón animado abrir/cerrar.
- Cierre por enlace, toque exterior, tecla Escape y cambio a escritorio.
- Hero, botones, indicadores, formularios y tarjetas optimizados para iPhone y Android.
- Compatibilidad con áreas seguras de iOS.
- Versionado CSS/JS para evitar caché antigua en GitHub Pages.


## Corrección crítica del menú v2.0.5

El menú móvil fue separado de `app.js` y de las importaciones de Firebase.

Antes, si el SDK de Firebase no cargaba, tardaba o era bloqueado, el archivo modular no se ejecutaba y el botón hamburguesa quedaba sin funcionalidad.

Ahora:

- `mobile-menu.js` es un script clásico e independiente.
- El menú funciona aun sin conexión a Firebase.
- Incluye cierre por enlace, toque exterior, tecla Escape, cambio de tamaño y restauración de página en iOS.
- Se añadieron `aria-controls`, `aria-hidden` y foco accesible.
- Los scripts usan una versión nueva para evitar caché de GitHub Pages y Safari.


## Menú móvil Hard Fix v2.0.5

Se reemplazó la navegación móvil por un componente completamente separado del menú de escritorio.

- El menú móvil ya no reutiliza `.nav`.
- CSS y JavaScript críticos están incrustados directamente en `index.html`.
- No depende de Firebase, `app.js`, archivos externos ni service workers.
- Se desregistran service workers anteriores y se eliminan cachés antiguas de AGP.
- Usa un drawer lateral con backdrop, botón cerrar y bloqueo del scroll.
- El menú de escritorio se oculta forzosamente en móvil mediante `!important`.

Esta versión soluciona tanto la falta de respuesta del botón como los enlaces superpuestos sobre el hero.


## Menú móvil estable v2.0.5

Se eliminó el drawer lateral que generaba desplazamientos y superposiciones.

La nueva navegación:
- es un overlay de pantalla completa;
- no comparte clases con el menú de escritorio;
- utiliza selectores únicos y estilos críticos con prioridad alta;
- no depende de Firebase ni de archivos externos;
- conserva y restaura la posición de scroll;
- se cierra por botón, enlace, Escape o cambio a escritorio;
- no duplica el logo dentro del contenido de la página.


# Sprint 1 — Rebranding AGP Platform 3.0

- Nuevo logo oficial extraído y optimizado desde el material proporcionado.
- Logo horizontal, isotipo, favicon, iconos PWA y Apple Touch Icon.
- Paleta oficial: #0D1B2A, #153A5C, #FF8A00, #64748B y #E6E7EB.
- Rebranding completo de la landing, menú móvil, formularios y CTA.
- Rediseño visual del login.
- Rebranding integral del ERP: sidebar, botones, tarjetas, formularios, estados y cotizador.
- Actualización de colores en las propuestas PDF.
- Datos oficiales de contacto:
  - agpcontrolintegral@gmail.com
  - +51 992 898 514
- Firebase y las funcionalidades existentes se mantienen.


## Corrección de interfaz v3.0.1
- Modo oscuro con contraste completo para títulos, KPIs, tablas, formularios, modales y tarjetas.
- Variables oscuras compatibles con el nuevo design system azul–naranja.
- Eliminación de textos negros sobre fondos oscuros.
- Sidebar móvil elevado por encima del overlay.
- El panel lateral ya responde desde el primer toque.
- Cierre determinista de sidebar, modal y drawer.
- Sustitución de acentos verdes residuales por naranja corporativo.


## AGP Platform v3.0.2 — Scroll y animaciones
- La web fuerza carga inicial en la parte superior cuando no existe un ancla.
- Se desactiva la restauración automática de scroll del navegador.
- Animaciones de entrada en hero, títulos, tarjetas, pasos y formularios.
- Revelado progresivo por scroll con IntersectionObserver.
- Botón flotante de WhatsApp con entrada, pulso y reacción al hover.
- Microinteracciones en botones, tarjetas e iconos.
- Respeto automático de `prefers-reduced-motion`.
- Animaciones suaves adicionales en el ERP.
