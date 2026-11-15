# Criterios de auditoría

Lee esta referencia durante las fases `audit` y `final-audit`.

## Severidad

- **P0:** pérdida/corrupción de datos, exposición de secretos, acceso no autorizado
  o aplicación inutilizable.
- **P1:** incumplimiento de un RF, cálculo incorrecto, bypass de etapa/rol o flujo
  principal bloqueado.
- **P2:** caso límite relevante, error de recuperación, prueba insuficiente,
  regresión secundaria o problema responsive/accesible que dificulta la tarea.
- **P3:** mejora menor que no altera corrección ni aceptación.

P0, P1 y P2 bloquean la aprobación final. P3 no bloquea salvo que contradiga
explícitamente la spec o la constitución.

## Puertas generales

1. La implementación corresponde solo a TNN y sus dependencias ya aprobadas.
2. Cada comportamiento nuevo está exigido por un RF o por “Hecho cuando”.
3. Los tests fallaban antes del cambio y comprueban resultados, no detalles
   accidentales de implementación.
4. Tests, lint y build disponibles terminan con código de salida cero.
5. No hay secretos, credenciales, datos personales de prueba ni archivos de build
   versionados accidentalmente.
6. Los errores son explícitos; no se silencian excepciones relevantes.
7. El código de dominio permanece separado de React, Firebase, Excel y navegador.

## Puertas por área

### Dominio

- Entradas no se mutan.
- Límites y estados inválidos se rechazan.
- Cálculos conservan precisión y pruebas cubren bordes.
- Reloj y aleatoriedad son inyectables cuando afectan resultados.

### Firebase

- Reglas deniegan por defecto y validan rol, etapa, propietario, campos y rangos.
- Un reintento no duplica datos.
- Datos privados no aparecen en proyecciones públicas, logs ni URLs persistentes.
- La confirmación visual corresponde a confirmación del servidor.

### Persistencia y Excel

- Escrituras son atómicas o recuperables.
- Un fallo de lectura/importación no modifica el estado vigente.
- El round-trip conserva el estado normalizado.
- El reporte compartible excluye votos y calificaciones individuales.

### Interfaz

- El flujo principal funciona a 360 px sin desplazamiento horizontal.
- Todos los controles tienen nombre accesible, foco visible y uso por teclado.
- El estado no se comunica solo por color.
- Acciones destructivas y cierres incompletos requieren confirmación.
- La evidencia Playwright incluye 360x800, escritorio y consola sin errores
  relacionados con el cambio.

## MCP esperados

- Context7: documentación actual de las librerías aprobadas cuando sea relevante.
- Playwright: validación visual, responsive, interacción y consola.
- MongoDB: prohibido en este proyecto; cualquier uso es un cambio fuera de alcance.

## Formato de hallazgo

```text
[P1] Título breve
Ubicación: ruta:línea
Evidencia: comportamiento observado o prueba que falla
Impacto: RF o condición incumplida
Corrección esperada: resultado observable, sin prescribir un refactor innecesario
```
