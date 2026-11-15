# Plan técnico — Spec 001

**Estado:** Aprobado  
**Fecha:** 2026-11-14

## 1. Arquitectura

Aplicación SPA estática con arquitectura por capas:

- **UI:** React, TypeScript estricto y Material UI.
- **Aplicación:** casos de uso y coordinación de etapas.
- **Dominio:** entidades, reglas, cálculos y máquina de estados puros.
- **Puertos:** contratos para sincronización, persistencia y Excel.
- **Adaptadores:** Firebase, almacenamiento del navegador y archivos `.xlsx`.

La lógica de dominio no importará React, Firebase, Material UI ni APIs del
navegador. Esto permite probar medianas, ICE, desempates y transiciones sin red.

## 2. Estructura prevista

```text
src/
  app/                 composición, rutas, tema y proveedores
  domain/              tipos, invariantes, cálculos y transiciones
  features/
    session/            creación, acceso, recuperación y ciclo de vida
    brainstorming/      captura y revisión
    refinement/         fusión y aclaraciones
    voting/             depuración y desempates
    ice/                configuración, evaluación y ranking
    excel/              respaldo, reporte, importación y reactivación
  infrastructure/
    firebase/           Auth, Firestore, listeners y reglas compartidas
    browser-storage/    snapshots locales y borradores
    workbook/           lectura y escritura de Excel
  shared/               componentes y utilidades transversales
tests/
  unit/                 dominio y casos de uso
  integration/          adaptadores, reglas y Excel
  e2e/                  flujos de facilitador y participantes
firebase/
  firestore.rules
  firestore.indexes.json
```

## 3. Decisiones técnicas

### D-01 — Cloud Firestore + Authentication anónima

Se utilizará Cloud Firestore para documentos y listeners en tiempo real, junto
con Firebase Authentication anónima para que las reglas dispongan de un `uid`.

- Cubre RF-01, RF-02, RF-08 y los envíos colaborativos.
- Alternativa descartada: Realtime Database. Su cliente web no conserva datos
  fuera de la sesión cuando se pierde conexión; Firestore ofrece persistencia
  web opcional y un modelo documental más apropiado.
- La autenticación anónima no resuelve por sí sola el cambio de dispositivo. Los
  códigos personales y del facilitador actuarán como credenciales de capacidad
  de alta entropía y permitirán vincular un nuevo `uid`.

### D-02 — Credenciales de capacidad

- El código público de sesión solo permite localizar la sala de espera.
- Cada participante recibe un token personal aleatorio de al menos 128 bits,
  representado como código y QR.
- El facilitador recibe un token privado independiente de igual entropía.
- Los tokens completos no se almacenan en documentos consultables ni se registran
  en consola; solo se transportan en el fragmento del enlace o se introducen.
- Al recuperar desde otro dispositivo, el token reasigna la identidad activa y
  revoca el vínculo anterior.

Esta solución es adecuada para un prototipo académico sin backend propio. No se
presentará como autenticación de alta seguridad para información sensible.

### D-03 — React Router con rutas hash

Se usará `HashRouter` para que enlaces y QR funcionen en GitHub Pages sin reglas
de reescritura. Vite tendrá `base: '/okr-iniciativas/'` para el repositorio.

### D-04 — Estado de interfaz

- Estado remoto: adaptador Firestore con suscripciones por sesión y etapa.
- Estado local de aplicación: Context + `useReducer` por flujo.
- No se añade una biblioteca global de estado en el MVP.
- Las acciones de dominio devuelven resultados tipados y no mutan entradas.

Alternativa descartada: duplicar todo Firestore en un store global, porque crea
dos fuentes de verdad y aumenta los conflictos de sincronización.

### D-05 — Persistencia del navegador

- **Facilitador:** IndexedDB para snapshots versionados de hasta 20 sesiones;
  `localStorage` solo para preferencias y punteros pequeños.
- **Participante:** IndexedDB o almacenamiento local para identidad, sesión y
  borradores; se limpia al terminar o abandonar.
- Motivo: 20 sesiones máximas con hasta 400 iniciativas y miles de evaluaciones
  pueden superar el tamaño práctico y el coste síncrono de `localStorage`.
- Se usará un adaptador propio para que el dominio no dependa de IndexedDB.

### D-06 — Excel en el navegador

Se usará ExcelJS mediante importación dinámica y, si el rendimiento lo requiere,
un Web Worker. Permite leer y escribir `.xlsx` sin servidor y tiene licencia MIT.

- Respaldo: hojas `Metadata`, `Session`, `Participants`, `Initiatives`,
  `Refinements`, `Votes`, `IceRatings`, `Results` y `Audit`.
- Reporte: hojas legibles `Resumen`, `Participantes`, `Iniciativas`, `Depuración`,
  `ICE` y `Ranking`; excluye votos/calificaciones individuales.
- `Metadata` contiene `formatVersion`, identificador, fecha y suma de control del
  manifiesto lógico.
- El importador acepta solo la versión exacta, valida todas las hojas antes de
  crear un snapshot y nunca modifica el estado actual parcialmente.

Alternativa descartada: CSV, porque no preserva un libro multitabla ni permite
restaurar toda la sesión en un único archivo.

### D-07 — Expiración sin facturación

- `finalizedAt` y `expiresAt` se guardan con tiempo del servidor.
- Reglas y consultas niegan acceso cuando `expiresAt` ya venció.
- Reabrir antes del vencimiento elimina `expiresAt` y devuelve la sesión a activa.
- La limpieza física se intenta al abrir el panel del facilitador y mediante una
  acción manual explícita.
- No se usa TTL de Firestore porque sus eliminaciones requieren facturación.

### D-08 — QR local para enlaces de acceso

Se usará `qrcode` (MIT) para generar los QR de los enlaces público y privado
directamente en el navegador, sin enviar tokens a servicios externos.

- El QR público codifica solo el enlace con `#/participar/:publicCode`.
- El QR privado codifica la clave de recuperación y se muestra separado.
- Si la generación falla, se conserva el enlace textual como alternativa.

### D-09 — Credenciales no enumerables y acceso atómico (T36A)

La proyección pública de la sesión no contiene identificadores de acceso. Solo
existen en documentos `access/{opaqueTokenId}` no enumerables y en mapas privados
usados por las reglas.

- La sesión guarda `creatorUid`, no `facilitatorAccessId`.
- Los documentos de participante guardan alias, progreso y `activeUid`, pero no
  `accessTokenId`.
- `sessions/{id}/facilitatorAccess/current` y `sessions/{id}/accessMap/{participantId}`
  relacionan la sesión con sus credenciales y no son legibles por clientes.
- Reclamar o recuperar un token actualiza en una transacción el `activeUid` del
  acceso y el del participante; la identidad anterior pierde permisos.
- Las reglas usan `getAfter()` para validar que la publicación escribe `results`
  y cambia la sesión a `RESULTADO_FINAL` en la misma operación atómica.
- El facilitador puede listar `iceRatings` durante `EVALUACION_ICE` solo para
  calcular agregados; la interfaz nunca muestra calificaciones individuales.
- Al expirar, se deniega la lectura de `results`, `private`, `authorship`,
  `originals`, `ballots` e `iceRatings`; el facilitador conserva solo el listado
  necesario para la limpieza diferida.

### D-10 — Validación E2E y accesibilidad

Se usarán `@playwright/test` y `@axe-core/playwright` como dependencias de
desarrollo. Playwright ejecutará los recorridos reales contra Vite y Firebase
Emulator; axe-core revisará automáticamente problemas críticos de accesibilidad
en los viewports móvil, tableta y escritorio.

## 4. Rutas y experiencias

```text
/#/                         inicio
/#/facilitador/nueva        creación
/#/facilitador/:sessionId   panel y recuperación privada
/#/participar               ingreso por códigos
/#/participar/:sessionId    experiencia del participante
/#/consulta/:localId        respaldo importado en modo lectura
```

Los secretos no se guardarán en parámetros de consulta ni se enviarán a servicios
de analítica. Cuando un QR incluya credencial, usará el fragmento de URL y la app
lo retirará del historial visible después de consumirlo.

## 5. Máquina de estados

```text
CONFIGURACION -> SALA_DE_ESPERA -> BRAINSTORMING -> REVISION
REVISION -> DEPURACION | CONFIGURACION_ICE
DEPURACION -> DESEMPATE_DEPURACION | CONFIGURACION_ICE
DESEMPATE_DEPURACION -> CONFIGURACION_ICE
CONFIGURACION_ICE -> EVALUACION_ICE -> RESULTADO_FINAL -> FINALIZADA
FINALIZADA -> RESULTADO_FINAL (reapertura dentro de 24 h)
```

- Solo transiciones explícitas del dominio son válidas.
- `REVISION -> CONFIGURACION_ICE` ocurre cuando N equivale al total disponible.
- Cerrar temprano requiere confirmación y al menos dos envíos completos.
- Cada transición genera un evento de auditoría.

## 6. Modelo de dominio

### Entidades principales

- `Session`: X0, Xf, estado, configuración, método ICE, fechas y versión.
- `Participant`: alias, nombre real privado, estado y vínculo de identidad.
- `Initiative`: texto vigente, autores privados, originales y estado de fusión.
- `ClarificationRequest`: solicitud, iniciativa, estado y respuesta del autor.
- `RefinementBallot`: selecciones exactas N y clave idempotente.
- `TieBreakBallot`: selecciones iguales a puestos pendientes.
- `IceEvaluation`: matriz completa de calificaciones 1..10.
- `RankingEntry`: medianas completas, puntuación y posición.
- `AuditEvent`: actor, acción, etapa y tiempo del servidor.

### Invariantes

- Participantes: 2..40 para votaciones; configuración máxima 40.
- Iniciativas por participante: 1..10; total máximo 400.
- Texto de iniciativa: 1..300; X0/Xf: 1..1000.
- N: 1..cantidad disponible y máximo 40.
- Voto de depuración: exactamente N identificadores únicos.
- ICE: tres enteros 1..10 por cada finalista.
- Pesos: enteros o decimales no negativos cuya suma decimal exacta es 1.
- Método ICE inmutable después de abrir la evaluación.

## 7. Modelo Firestore

```text
sessions/{sessionId}                     proyección pública y estado
sessions/{sessionId}/participants/{id}   alias, progreso y uid activo
sessions/{sessionId}/facilitatorAccess/current  vínculo privado al token
sessions/{sessionId}/accessMap/{id}      vínculo privado participante -> token
sessions/{sessionId}/private/{id}        nombres y vínculos privados
sessions/{sessionId}/initiatives/{id}    texto vigente y metadatos públicos
sessions/{sessionId}/originals/{id}      propuestas originales privadas
sessions/{sessionId}/ballots/{id}        votos individuales protegidos
sessions/{sessionId}/iceRatings/{id}     evaluaciones protegidas
sessions/{sessionId}/results/{id}        agregados publicados
sessions/{sessionId}/audit/{id}          eventos de auditoría
access/{opaqueTokenId}                    capacidad de acceso no enumerable
sessionCodes/{publicCode}                 resolución mínima código -> sesión
```

Los votos se almacenan en un documento por participante y ronda. La ruta y una
clave idempotente estable impiden duplicados. Las iniciativas y evaluaciones se
dividen en documentos para evitar contención y límites de tamaño.

## 8. Seguridad y privacidad

- Denegar todo por defecto en reglas.
- No permitir `list` sobre credenciales ni datos privados.
- Participante: lee la proyección de su sesión, escribe solo sus iniciativas,
  aclaraciones y un ballot/evaluación propios en la etapa habilitada.
- Facilitador: cambia configuración y etapa; no puede leer ballots individuales.
  Durante `EVALUACION_ICE` puede listar `iceRatings` solo para calcular el ranking;
  la interfaz no muestra calificaciones individuales.
- Resultados agregados se publican en la misma operación atómica que el cambio a
  `RESULTADO_FINAL`.
- Nombres y autoría se revelan únicamente en resultado final y exportaciones.
- Validación de tipos, longitudes, rangos, campos permitidos y estado actual tanto
  en dominio como en reglas de Firestore.
- App Check queda como endurecimiento opcional posterior, no requisito del MVP.

## 9. Sincronización e idempotencia

- Cada envío usa `submissionId` estable generado antes del primer intento.
- Reintentos escriben el mismo documento, nunca crean uno nuevo.
- La UI distingue `borrador`, `enviando`, `confirmado` y `error`.
- Solo se muestra “recibido” tras confirmación del servidor, no por evento local.
- Firestore offline se habilitará únicamente en dispositivos declarados confiables;
  de lo contrario, el adaptador usará borradores propios sin cache persistente.
- Conflictos de edición se resuelven por versión: una escritura incluye
  `expectedRevision`; si cambió, se solicita recargar en vez de sobrescribir.

## 10. Cálculos

- `median(values)` ordena una copia; impar devuelve el central y par promedia los
  dos centrales.
- Multiplicativo: `impactMedian * confidenceMedian * easeMedian`.
- Ponderado: suma de cada mediana por su peso decimal.
- Se conserva precisión completa; formateo máximo de dos decimales solo en UI.
- Orden: puntuación, Impacto, Confianza y Facilidad descendentes; igualdad total
  comparte posición mediante ranking de competición (`1, 2, 2, 4`).
- Los cálculos se repiten desde los ballots al importar o validar, sin confiar en
  puntuaciones previamente serializadas.

## 11. Interfaz responsive y accesibilidad

- Breakpoints MUI: `xs` desde 0, `sm` 600, `md` 900 y superiores.
- Participante: una tarea principal por pantalla, tarjetas, objetivos táctiles de
  al menos 44 px y progreso visible.
- ICE móvil: una iniciativa por paso con los tres criterios; navegación anterior,
  siguiente y resumen antes de enviar.
- Facilitador móvil: tarjetas y acciones principales; escritorio: panel de varias
  columnas. Ninguna tabla fuerza desplazamiento horizontal en 360 px.
- Etiquetas explícitas, foco visible, navegación por teclado, mensajes con texto y
  color, regiones `aria-live` para confirmaciones y errores.

## 12. Estrategia de pruebas

### Unitarias — Vitest

- Mediana par/impar, ICE, pesos, precisión y ranking (RF-05..RF-07).
- Validación de N, votos exactos, desempates y mínimos (RF-04).
- Máquina de estados y cierre/reapertura/expiración (RF-08).
- Fusiones, trazabilidad, alias y límites.

### Componentes — React Testing Library

- Formularios, validaciones, bloqueo por etapa y estados de envío.
- Flujos mobile-first y navegación accesible.

### Integración

- Firebase Emulator Suite y `@firebase/rules-unit-testing` para permisos, campos,
  roles, expiración, idempotencia y lecturas prohibidas.
- Round-trip de Excel: exportar -> importar -> comparar estado normalizado.
- Archivos corruptos, versión distinta y hojas/celdas faltantes.

### E2E — Playwright

- Facilitador + seis contextos de participante.
- Brainstorming de 30 iniciativas, fusión, depuración a 15, desempate, ICE y Excel.
- Recuperación de participante/facilitador, reconexión y cierre incompleto.
- Viewports 360x800, tableta y escritorio.

## 13. Despliegue y configuración

- GitHub Actions ejecuta `npm ci`, tests, lint y build antes de publicar `dist`.
- GitHub Pages se configura desde Actions y Vite usa la base del repositorio.
- Variables `VITE_FIREBASE_*` contienen configuración pública, no secretos.
- Reglas e índices Firebase se versionan; el despliegue de reglas es manual o en
  un workflow separado con credenciales protegidas.
- Ninguna clave privada de facilitador o participante entra al repositorio.

## 14. Trazabilidad RF

| Área del plan | RF cubiertos |
|---|---|
| Acceso, alias y recuperación | RF-01, RF-08 |
| Brainstorming y revisión | RF-02, RF-03 |
| Depuración y desempate | RF-04 |
| ICE y cálculos | RF-05, RF-06, RF-07 |
| Persistencia y expiración | RF-08 |
| Excel | RF-09 |
| Responsive y accesibilidad | RF-10 y RNF |

## 15. Riesgos y mitigaciones

- **Cuotas gratuitas:** listeners acotados por etapa y consultas por subcolección;
  no escuchar ballots individuales innecesariamente.
- **Credenciales compartidas:** tokens largos, no enumerables, revocación al
  recuperar y advertencia de no compartir QR privados.
- **Volumen Excel:** importación dinámica, indicador de progreso y Web Worker si
  la prueba máxima bloquea la UI.
- **Pérdida local:** snapshots versionados, exportación recordada al finalizar y
  sesión compartida recuperable durante 24 horas.
- **Eliminación diferida:** acceso denegado al expirar y limpieza oportunista
  visible para el facilitador.

## 16. Fuentes técnicas verificadas

- Firebase Authentication anónima y persistencia web.
- Firestore offline, reglas basadas en `uid`, límites y precios.
- Firestore TTL: no se usa porque requiere facturación.
- Despliegue oficial de Vite en GitHub Pages.
- Breakpoints y enfoque mobile-first de Material UI.
- ExcelJS para lectura/escritura `.xlsx` en navegador.
- `qrcode` para generar QR de acceso en el navegador.

## 17. Condición para pasar a tareas

Plan aprobado el 2026-11-14. Las tareas de `tasks.md` deben durar menos de 30
minutos, declarar sus RF, comenzar por pruebas y terminar con una condición
“Hecho cuando:” verificable.
