# Demo final documentada

## Escenario principal

1. Crear una sesión con X0, Xf, 6 participantes y 5 iniciativas por persona.
2. Compartir el código público y una clave privada distinta por alias.
3. Abrir brainstorming y registrar 30 iniciativas desde seis navegadores.
4. Cerrar recepción, revisar sin autoría visible y definir 15 finalistas.
5. Votar 15 opciones por participante y provocar un empate en el puesto límite.
6. Resolver el desempate y seleccionar el método ICE multiplicativo.
7. Calificar las 15 finalistas con Impacto 8, Confianza 7 y Facilidad 6.
8. Publicar el ranking; la puntuación esperada es `8 × 7 × 6 = 336`.
9. Descargar el reporte compartible y confirmar que contiene seis hojas y no
   incluye votos ni calificaciones individuales.

Este recorrido está automatizado en `tests/e2e/main-flow.spec.ts`.

## Recuperación y errores

1. Redactar una iniciativa, desconectar la red y confirmar el intento.
2. Verificar el aviso offline, recuperar la conexión y recargar.
3. Comprobar que el borrador permanece, enviarlo y confirmar recepción.
4. Ingresar desde un segundo contexto con la misma clave personal y verificar
   que el envío continúa completo sin crear otro participante.
5. Exportar e importar un respaldo y comparar el estado normalizado.
6. Verificar acceso hasta las 24 horas y bloqueo desde el vencimiento.

Estos escenarios están automatizados en `tests/e2e/recovery.spec.ts`.

## Publicación

El workflow `deploy.yml` ejecuta pruebas, lint, emuladores, E2E y build antes de
subir `dist` a GitHub Pages. Las rutas usan fragmentos `#`, por lo que funcionan
al recargar sin configuración adicional del servidor.
