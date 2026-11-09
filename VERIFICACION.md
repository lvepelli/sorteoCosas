# Verificación de entrega

Fecha: 6 de noviembre de 2026.

## Completado

- Instalación de dependencias y archivo `package-lock.json` reproducible.
- Auditoría automática de npm al instalar: cero vulnerabilidades conocidas en ese momento.
- Comprobación de sintaxis de scripts del cliente y servidor.
- Pruebas de reglas de sorteo, validación de nombres, duplicados, ausencia de participantes, exportación segura, ocultación de ganadores futuros e inicio idempotente.
- Integración HTTP con PostgreSQL embebido PGlite: acceso protegido, cookies, control de origen, registro, cierre, inicio y exportación.
- Transacciones concurrentes bajo el motor embebido y rollback tras validación fallida. Esto no sustituye una prueba multiconexión con PostgreSQL externo.

## Pendiente antes de abrirlo a empleados

- Conectar PostgreSQL persistente del entorno definitivo y ejecutar `npm run db:init`.
- Configurar origen y secretos privados, cargar el inventario real (la plantilla es un ejemplo).
- Desplegar en Vercel y verificar dos dispositivos, incluido móvil. No se ha publicado una URL.
- Revisión visual en navegador: el navegador integrado no pudo conectar con el servidor local. La interfaz está implementada, pero no se afirma una validación visual completada.
- Ensayo del proveedor PostgreSQL elegido con solicitudes desde varias conexiones, para confirmar bloqueos y tiempos de respuesta en el entorno de destino.

El código no contiene secretos de producción ni participantes reales. El servidor de vista previa, separado de la entrega, utiliza únicamente datos de muestra.
