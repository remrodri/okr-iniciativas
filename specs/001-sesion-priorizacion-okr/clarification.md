# Clarificación QA — Spec 001

**Estado:** Completada; C-01 a C-16 resueltos  
**Alcance:** Revisión de ambigüedades, contradicciones y casos límite realizada
antes de la aprobación de la spec.

## Hallazgos

### C-01 — Validez de N — RESUELTO

N debe estar entre 1 y la cantidad disponible. Si coincide con el total, se omite
la depuración y todas las iniciativas pasan a ICE.

### C-02 — Voto exacto cuando faltan iniciativas — RESUELTO

N se valida después de la revisión y nunca puede superar la cantidad disponible.

### C-03 — Mecánica del desempate — RESUELTO

La ronda incluye solo las iniciativas empatadas y cada participante selecciona
exactamente tantas como puestos falten para completar N.

### C-04 — Participantes ausentes o incompletos — RESUELTO

El facilitador puede cerrar con advertencia cuando existan al menos dos envíos
completos. Solo estos se cuentan; los parciales se descartan y el reporte deja
constancia de la participación incompleta.

### C-05 — Identidad y reingreso — RESUELTO

Cada participante recibe un alias neutral y un código personal o QR. El código
permite recuperar su identidad desde el mismo navegador u otro dispositivo sin
duplicar envíos. El navegador también conserva acceso y borradores pendientes.

### C-06 — Alias duplicados — RESUELTO

El sistema asigna alias neutrales únicos desde una lista predefinida. El nombre
real se registra de forma privada y su relación con el alias permanece oculta
hasta finalizar; después puede incluirse en el reporte académico.

### C-07 — Correcciones del facilitador — RESUELTO

El facilitador solo corrige ortografía y puntuación. Para claridad o contenido,
envía una solicitud anónima y únicamente el autor modifica su iniciativa. Las
fusiones muestran el texto consolidado y conservan los originales.

### C-08 — Fusión y conteo esperado — RESUELTO

La iniciativa consolidada cuenta como una opción, conserva propuestas y autores,
no altera el cumplimiento del brainstorming y reconoce a todos en el reporte.

### C-09 — Evaluaciones ICE incompletas — RESUELTO

Se aplica la misma regla de cierre anticipado: mínimo dos evaluaciones completas,
descarte de parciales y registro en el reporte.

### C-10 — Redondeo visible y desempate ICE — RESUELTO

La interfaz muestra hasta dos decimales; cálculos, orden y desempates usan los
valores completos sin redondear.

### C-11 — Recuperación del facilitador — RESUELTO

La sesión entrega una clave y un QR privados, separados de los accesos públicos,
para demostrar el rol y recuperar el panel desde otro dispositivo mientras los
datos compartidos estén disponibles.

### C-12 — Retención de 24 horas — RESUELTO

El plazo empieza al confirmar “Finalizar sesión”. Reabrir con la clave privada
dentro del plazo cancela la expiración. Al vencer, la sesión queda inaccesible;
la eliminación física se difiere hasta la siguiente apertura del facilitador o
una limpieza manual para mantener el nivel gratuito.

### C-13 — Importación y sesión compartida — RESUELTO

La importación permite consulta o reactivación. Reactivar conserva datos, etapa y
progreso, genera credenciales nuevas y permite continuar solo lo pendiente.

### C-14 — Datos incluidos en el reporte — RESUELTO

El respaldo restaurable incluye datos individuales. El reporte compartible
incluye nombres, autoría y resultados agregados, pero no votos ni calificaciones
individuales.

### C-15 — Límites operativos — RESUELTO

El MVP admite 40 participantes, 10 iniciativas por participante, 400 iniciales,
40 finalistas, 300 caracteres por iniciativa, 1.000 para X0/Xf y 20 sesiones
locales por navegador del facilitador.

### C-16 — Compatibilidad de Excel — RESUELTO

Cada respaldo incluye versión interna. El MVP importa solo la misma versión
exacta; una versión distinta se rechaza con un mensaje claro y sin modificar la
sesión activa.

## Conflictos con la constitución

- C-11 puede entrar en tensión con “datos recuperables” si el facilitador pierde
  el navegador antes de exportar.
- C-12 debe verificarse contra “costo operativo cero”, porque la eliminación
  automática dependerá de capacidades del servicio gratuito elegido.
- C-07 necesita una regla verificable para proteger la integridad de la dinámica.

## Resultado de la revisión

Los hallazgos C-01 a C-16 están resueltos. La spec está lista para aprobación;
solo después se podrá crear `plan.md`.
