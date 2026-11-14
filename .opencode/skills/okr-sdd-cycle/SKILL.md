---
name: okr-sdd-cycle
description: Construye OKR Iniciativas desde las tareas SDD aprobadas, de forma continua o por tarea, con plan, tests primero, auditoría independiente, corrección acotada y auditoría final. Úsala para ejecutar `full` o una TNN de specs/001-sesion-priorizacion-okr/tasks.md; no sirve para cambiar requisitos sin aprobación.
---

# Ciclo SDD de OKR Iniciativas

Implementa el proyecto completo o una tarea aprobada y deja evidencia verificable.
La spec manda; una implementación no puede reinterpretarla ni ampliar el alcance.

## Entrada

Modos de invocación:

- `@okr-sdd-cycle full`: ejecuta desde la primera tarea elegible hasta T53.
- `@okr-sdd-cycle T01`: ejecuta únicamente T01 y se detiene.
- `@okr-sdd-cycle resume`: continúa desde la primera tarea aprobada sin marcar.

Si no se indica modo ni tarea, utiliza `resume`:

1. lee `specs/001-sesion-priorizacion-okr/tasks.md`;
2. elige la primera tarea sin marcar cuyas dependencias estén completas;
3. anuncia el punto de reanudación antes de modificar archivos;
4. continúa hasta completar el proyecto o encontrar una condición de parada.

También puede invocarse con una fase concreta:

- `@okr-sdd-cycle plan TNN`
- `@okr-sdd-cycle build TNN`
- `@okr-sdd-cycle audit TNN`
- `@okr-sdd-cycle correct TNN`
- `@okr-sdd-cycle final-audit TNN`

Las fases concretas operan sobre una sola TNN. Los modos `full` y `resume`
ejecutan el ciclo completo de cada tarea y pasan automáticamente a la siguiente.

## Contexto obligatorio

Antes de actuar, lee completos y en este orden:

1. `AGENTS.md`
2. `docs/constitution.md`
3. `specs/001-sesion-priorizacion-okr/spec.md`
4. `specs/001-sesion-priorizacion-okr/plan.md`
5. `specs/001-sesion-priorizacion-okr/tasks.md`

Después inspecciona solo los archivos relacionados con la tarea y su dependencia
inmediata. Si falta un artefacto aprobado, una dependencia no está completa o la
tarea contradice la spec, detente y explica el bloqueo; no improvises.

## Invariantes del ciclo

- En modo por tarea, ejecuta una sola TNN. En `full` o `resume`, ejecuta una TNN
  por ciclo interno y solo avanza cuando su auditoría final sea aprobada.
- No modifiques la spec, el plan ni otra tarea salvo petición explícita.
- No marques TNN hasta superar la auditoría final.
- Escribe o ajusta primero las pruebas que expresan “Hecho cuando”.
- No debilites, elimines ni saltes pruebas para conseguir verde.
- No añadas dependencias fuera del plan sin aprobación.
- Conserva cambios ajenos y no reformatees archivos no relacionados.
- Toda corrección se limita a hallazgos demostrados de la tarea actual.
- Si el repositorio contiene cambios previos, distingue el diff de TNN antes de
  auditar y no atribuyas cambios ajenos a la tarea.

## Continuidad del proyecto

En `full` o `resume`:

1. selecciona la primera tarea sin marcar con dependencias completas;
2. ejecuta Plan → Build → Auditoría → Corrección → Auditoría final;
3. si aprueba, marca solo esa tarea, guarda un resumen breve y continúa;
4. al completar T53, ejecuta además la auditoría global RF por RF;
5. entrega un único informe final del proyecto.

No pidas confirmación entre tareas aprobadas ni te detengas solo porque una tarea
terminó. Las actualizaciones de progreso no requieren respuesta del usuario.

### Condiciones de parada

Detente únicamente si ocurre al menos una:

- la spec, el plan y la tarea se contradicen de forma que cambia el producto;
- falta una decisión funcional no cubierta por los artefactos aprobados;
- se necesita una credencial, cuenta, permiso o acción externa del usuario;
- una operación destructiva o publicación externa requiere autorización;
- persiste un P0/P1/P2 después de dos rondas de corrección;
- tests, lint o build siguen fallando y no existe una corrección segura dentro de
  la tarea actual;
- una dependencia técnica necesaria no puede instalarse o verificarse.

Cuando te detengas, conserva todas las tareas aprobadas ya completadas, deja la
tarea actual sin marcar y explica una sola acción concreta necesaria para seguir.

## Ciclo completo

### 1. Plan

Sin modificar código:

1. cita la tarea, sus RF, dependencias y condición “Hecho cuando”;
2. localiza los módulos y pruebas que probablemente cambien;
3. enumera en orden las pruebas que escribirás primero;
4. identifica riesgos concretos de regresión, seguridad o responsive;
5. confirma que el alcance cabe en TNN.

Si requiere más de una unidad coherente o excede aproximadamente 30 minutos,
detente y propone dividir la tarea en `tasks.md`; no la dividas sin aprobación.

### 2. Build

1. Ejecuta la suite inicial relevante y registra su resultado.
2. Añade una prueba roja que corresponda a la condición de finalización.
3. Confirma que falla por la razón esperada.
4. Implementa el cambio mínimo para hacerla pasar.
5. Refactoriza solo dentro del alcance manteniendo verde.
6. Ejecuta tests relevantes, lint y build disponibles.

No marques la tarea. Entrega el diff a auditoría.

### 3. Auditoría

Realiza una revisión de solo lectura. Cuando OpenCode permita subagentes, usa un
contexto nuevo y de solo lectura para evitar que las conclusiones del build
condicionen la revisión.

Lee la sección [Criterios de auditoría](references/quality-gates.md) y revisa:

- cumplimiento exacto de RF y “Hecho cuando”;
- defectos funcionales y casos límite;
- regresiones y contratos rotos;
- seguridad, privacidad e idempotencia cuando apliquen;
- calidad y capacidad real de las pruebas;
- accesibilidad/responsive cuando TNN toque interfaz;
- cambios fuera de alcance.

Reporta hallazgos con severidad `P0`, `P1`, `P2` o `P3`, archivo/línea,
evidencia y corrección esperada. No modifiques archivos en esta fase. Si no hay
hallazgos, declara explícitamente `AUDITORÍA: APROBADA`.

### 4. Corrección

Solo si la auditoría tiene hallazgos:

1. reproduce cada hallazgo antes de cambiar código;
2. añade o ajusta una prueba que falle por el defecto;
3. aplica la corrección mínima;
4. ejecuta pruebas relevantes, lint y build;
5. registra para cada hallazgo si quedó corregido o no reproducible con evidencia.

No corrijas preferencias ni refactors opcionales P3 si ampliarían el alcance.
Realiza como máximo dos rondas auditoría-corrección. Si persiste un P0/P1/P2,
detente con la tarea sin marcar y explica el bloqueo.

### 5. Auditoría final

Debe ser de solo lectura y partir del diff final, no del informe del build:

1. verifica que cada hallazgo previo esté cerrado;
2. vuelve a comprobar RF y “Hecho cuando”;
3. ejecuta la suite completa disponible, lint y build;
4. revisa que no haya archivos generados, secretos ni cambios fuera de alcance;
5. emite uno de estos veredictos exactos:
   - `AUDITORÍA FINAL: APROBADA`
   - `AUDITORÍA FINAL: RECHAZADA`

Solo con veredicto aprobado:

- cambia `[ ]` por `[x]` únicamente en TNN;
- resume archivos modificados, pruebas ejecutadas y RF cubiertos;
- en modo por tarea, detente;
- en `full` o `resume`, comienza la siguiente tarea elegible.

## Evidencia mínima de salida

La respuesta final debe incluir:

- tarea ejecutada y RF;
- veredicto de auditoría final;
- tests, lint y build con resultado real;
- archivos modificados;
- hallazgos corregidos o riesgos pendientes;
- siguiente tarea elegible, solo como referencia, sin iniciarla.

En `full` o `resume`, sustituye el último punto por un resumen de tareas completas,
omitidas y bloqueadas. No informes éxito global hasta completar T53 y aprobar la
validación RF por RF.

Nunca declares una comprobación que no ejecutaste. Si una herramienta aún no
existe por tratarse de una tarea temprana, indica `no disponible todavía` y usa
la verificación definida en “Hecho cuando”.

