# Segunda vida — sorteo entre empleados

MVP para un único sorteo de muestras de proveedores. Aplicación real Express + PostgreSQL, preparada para Vercel. Sin datos simulados en producción; el inventario comienza vacío. La plantilla contiene 40 filas orientativas (20 radiadores y 20 tendederos): ajustar antes de cargar.

## Puesta en marcha

1. Instalar Node.js 24 y ejecutar `npm ci` en esta carpeta.
2. Crear una base PostgreSQL (por ejemplo Neon desde Vercel Marketplace). Usar su URL de conexión con pool y TLS verificado.
3. Copiar `.env.example` a `.env` y configurar `DATABASE_URL`, `APP_ORIGIN`, `ADMIN_PASSWORD` (mínimo 16 caracteres) y `SESSION_SECRET` (mínimo 32 caracteres aleatorios). No guardar secretos en Git ni compartirlos en el chat.
4. Ejecutar `npm run db:init` para crear las dos tablas. Es idempotente y conserva las inscripciones existentes.
5. Ejecutar `npm test` y `npm start`. Abrir http://localhost:3000 y `/admin.html`.

## Despliegue en Vercel

1. Subir esta carpeta a un repositorio privado e importarlo en Vercel, o ejecutar `vercel` desde esta carpeta con una sesión autenticada.
2. Seleccionar el reconocimiento automático de Express. El punto de entrada `server.js` exporta la aplicación. Los archivos de `public/` se sirven como recursos estáticos. No necesita compilación de frontend.
3. Configurar las cuatro variables anteriores en el entorno de producción. `APP_ORIGIN` debe ser el origen HTTPS exacto de la web, sin barra final. Las mutaciones desde otros dominios se rechazan. Usar una base distinta para pruebas/preview; no conectar previews al sorteo real.
4. Ejecutar la migración contra la base elegida antes de abrir la web. No ejecutarla desde cada petición ni durante cada compilación.
5. Desplegar con `vercel --prod`. Confirmar `/api/state`, acceso a administración, un ensayo en la base de pruebas y descarga CSV. Mantener Node 24 y la región de ejecución cercana a PostgreSQL.

Documentación oficial: https://vercel.com/docs/frameworks/backend/express y https://node-postgres.com/features/transactions

## Operación

- Abrir `/admin.html`, introducir la contraseña y cargar líneas `número;descripción` (o pegar la plantilla). El guardado sustituye el inventario completo, nunca las inscripciones.
- Revisar artículos, inscritos y regla de repetición. La página pública muestra las reglas actuales.
- Cerrar las inscripciones. Es definitivo en este MVP: bloquea altas y edición del inventario.
- Iniciar manualmente. El servidor calcula y guarda el reparto con aleatoriedad criptográfica. Cada artículo tiene una hora de revelación, separada por cinco segundos.
- Compartir la URL pública. Las pantallas consultan el servidor cada segundo, recuperan el estado al reconectar y nunca reciben resultados futuros. No hace falta mantener abierta la administración ni ejecutar un temporizador en una función de Vercel.
- Exportar CSV en cualquier momento; solo incluye resultados ya revelados. Al terminar, incluye todos los artículos y los no adjudicados.

## Reglas y límites

- Sin repetición: se barajan artículos y personas uniformemente y se emparejan. Si hay 40 artículos y 25 personas, habrá 25 premios y 15 sin adjudicar. Si hay 60 personas, 20 quedarán sin premio. Barajar también los artículos evita favorecer los primeros números cuando sobran muestras.
- Con repetición: cada artículo elige de forma independiente entre todos los inscritos. Una persona puede ganar varias veces y otra ninguna, aunque haya más artículos que personas.
- Sin artículos o sin inscritos no se puede empezar.
- La normalización de nombres ignora mayúsculas, acentos, espacios, guiones y apóstrofos. Bloquea duplicados escritos de esas formas, pero no demuestra identidad ni pertenencia a la empresa. Tampoco detiene a alguien que use un nombre distinto. Para control estricto, la siguiente mejora es identificación corporativa o un código personal de empleado.
- Los homónimos deben coordinar con la organización una forma diferenciada de inscripción antes del cierre. Este MVP no incluye un editor de participantes; correcciones y bajas requieren una intervención controlada en la base antes del sorteo.
- Un sorteo por base. No hay botón de reinicio para evitar perder resultados o repetir un reparto accidentalmente. Para otro evento, usar otra base o implementar archivo de eventos.
- Límite: 200 artículos y 2.000 inscritos. Diseñado para el evento interno de 40 muestras, no para tráfico masivo. Cada pantalla genera aproximadamente una lectura por segundo.
- La sincronización es por consulta periódica: retraso nominal de 0–1 segundos, más latencia de red. La autoridad es el reloj del servidor; no se promete simultaneidad al milisegundo.

## Persistencia y seguridad

La tabla `raffle` tiene una única fila JSONB. Cada mutación bloquea esa fila con `SELECT … FOR UPDATE`, valida el estado y actualiza dentro de la misma transacción. Esto serializa inscripciones, cierre e inicio entre instancias y evita duplicados por concurrencia. Una repetición de inicio devuelve el reparto existente. La respuesta pública omite el listado de inscritos y todos los ganadores aún no revelados.

La cookie de administración está firmada, es HttpOnly y SameSite=Strict, expira a las ocho horas y usa Secure sobre HTTPS. Cambiar `SESSION_SECRET` revoca todas las sesiones. Se exige origen exacto en las peticiones de escritura y se limita el tamaño del cuerpo. La tabla `attempts` limita login a 10 intentos por 15 minutos/IP y altas a 60 (para permitir empleados bajo una misma red); solo almacena un HMAC de IP. En Vercel se usa la cabecera de IP del proveedor. Fuera de Vercel se usa la dirección de la conexión. No desplegar tras otro proxy sin adaptar esta identificación.

Aplicar una contraseña robusta y compartirla solo con organizadores. La lista completa de inscritos solo está disponible en administración. Los ganadores son públicos por requisito del producto; el formulario lo explica. La organización debe comunicar su contacto y gestionar solicitudes de corrección o retirada. Definir una fecha de borrado tras la entrega de premios y una política de copias de seguridad con el proveedor. No se ha implementado borrado automático.

## Pruebas

`npm test` ejecuta pruebas unitarias de reglas, normalización, aleatoriedad, revelación, estados y CSV, además de integración HTTP con PostgreSQL embebido PGlite (no una base simulada). Verifica autenticación, origen, persistencia, bloqueo de altas tras cierre, límites e inicio idempotente.

Antes de producción se recomienda un ensayo con PostgreSQL externo y dos navegadores: inscribir, cerrar, iniciar, recargar, desconectar/reconectar y comparar resultados. PGlite no demuestra la concurrencia real entre conexiones PostgreSQL independientes. El bloqueo de fila debe probarse también contra el proveedor elegido. Nunca ensayar con participantes reales en la base definitiva.
