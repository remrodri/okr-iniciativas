# Tareas — Spec 001

**Estado:** Aprobado  
**Regla de ejecución:** implementar una sola tarea por vez, con pruebas primero,
ejecutar la suite indicada, marcarla y detenerse.

## Fase A — Base del proyecto

- [ ] **T01. Crear el proyecto React + Vite + TypeScript estricto.** (RF: —)
  Configurar scripts `dev`, `test`, `lint`, `build` y `preview`.
  **Depende de:** —  
  **Hecho cuando:** la app mínima compila y los cuatro comandos de verificación terminan sin errores.

- [ ] **T02. Instalar MUI y definir tema mobile-first.** (RF-10)
  Añadir `CssBaseline`, viewport, tipografía, contraste y breakpoints documentados.
  **Depende de:** T01  
  **Hecho cuando:** una prueba de tema confirma breakpoints y la pantalla base funciona a 360 px.

- [ ] **T03. Configurar calidad y estructura de carpetas.** (RF: —)
  Añadir ESLint, Vitest, React Testing Library, alias de imports y carpetas del plan.
  **Depende de:** T01  
  **Hecho cuando:** un test de ejemplo, lint y build pasan en verde.

- [ ] **T04. Configurar rutas hash y shell de la aplicación.** (RF-01, RF-10)
  Crear rutas de inicio, facilitador, participante y consulta con páginas placeholder.
  **Depende de:** T02, T03  
  **Hecho cuando:** pruebas de navegación abren cada ruta y una recarga no pierde la vista.

## Fase B — Núcleo de dominio

- [ ] **T05. Definir tipos, límites y errores del dominio.** (RF-01..RF-10)
  Modelar sesión, participante, iniciativa, etapas, ballots, ICE y errores tipados.
  **Depende de:** T03  
  **Hecho cuando:** pruebas de constructores rechazan límites inválidos y TypeScript compila estricto.

- [ ] **T06. Implementar validación de configuración inicial.** (RF-01, RF-02)
  Validar X0/Xf, 1..40 participantes, 1..10 iniciativas y longitudes.
  **Depende de:** T05  
  **Hecho cuando:** tests cubren mínimos, máximos, vacíos y valores fuera de rango.

- [ ] **T07. Implementar máquina de estados de sesión.** (RF-01..RF-08)
  Definir transiciones válidas, bloqueo por etapa y eventos de auditoría.
  **Depende de:** T05  
  **Hecho cuando:** tests aceptan todas las transiciones previstas y rechazan las demás.

- [ ] **T08. Implementar alias neutrales únicos.** (RF-01)
  Crear catálogo, asignación aleatoria inyectable y prevención de repetidos.
  **Depende de:** T05  
  **Hecho cuando:** tests generan 40 alias únicos de forma determinista con aleatoriedad simulada.

- [ ] **T09. Implementar validación y fusión de iniciativas.** (RF-02, RF-03)
  Conservar originales, autores, cumplimiento y texto consolidado.
  **Depende de:** T05  
  **Hecho cuando:** tests prueban fusión múltiple, trazabilidad y límite de 300 caracteres.

- [ ] **T10. Implementar reglas de N y omisión de depuración.** (RF-04)
  Validar 1..disponibles, máximo 40 y salto a ICE cuando N equivale al total.
  **Depende de:** T05, T07  
  **Hecho cuando:** tests cubren N inválido, N menor y N igual al total.

- [ ] **T11. Implementar ballots de depuración idempotentes.** (RF-04)
  Exigir exactamente N identificadores únicos y `submissionId` estable.
  **Depende de:** T10  
  **Hecho cuando:** tests rechazan incompletos, excedentes, duplicados y reenvíos no idempotentes.

- [ ] **T12. Implementar selección de finalistas y desempate.** (RF-04)
  Ordenar votos, calcular puestos restantes y producir ronda entre empatadas.
  **Depende de:** T11  
  **Hecho cuando:** tests cubren corte sin empate, empate parcial, empate persistente y decisión facilitador.

- [ ] **T13. Implementar cierre anticipado de votaciones.** (RF-04, RF-06)
  Exigir dos envíos completos, descartar parciales y generar marca de auditoría.
  **Depende de:** T11  
  **Hecho cuando:** tests cubren 0, 1, 2 y más respuestas completas con parciales presentes.

- [ ] **T14. Implementar configuración de método ICE.** (RF-05)
  Validar elección única, pesos no negativos y suma decimal exacta de 100 %.
  **Depende de:** T05, T07  
  **Hecho cuando:** tests cubren ambos métodos, pesos válidos y combinaciones inválidas.

- [ ] **T15. Implementar evaluaciones ICE completas.** (RF-06)
  Exigir tres enteros 1..10 por cada finalista e idempotencia por participante.
  **Depende de:** T14  
  **Hecho cuando:** tests cubren matriz completa, faltantes, rangos y reenvíos.

- [ ] **T16. Implementar mediana e ICE multiplicativo.** (RF-06, RF-07)
  Mantener precisión completa y no mutar entradas.
  **Depende de:** T15  
  **Hecho cuando:** tests cubren medianas pares/impares y el ejemplo 3×10×10=300.

- [ ] **T17. Implementar ICE ponderado y ranking.** (RF-06, RF-07)
  Aplicar pesos, desempates y ranking de competición.
  **Depende de:** T14, T16  
  **Hecho cuando:** tests cubren 6,5 para 50/25/25, precisión y posiciones `1,2,2,4`.

- [ ] **T18. Implementar finalización, expiración y reapertura.** (RF-08)
  Calcular 24 horas con reloj inyectado y bloquear sesiones vencidas.
  **Depende de:** T07  
  **Hecho cuando:** tests cubren finalización, reapertura previa y denegación posterior al vencimiento.

## Fase C — Persistencia local

- [ ] **T19. Definir puertos de repositorio y snapshots versionados.** (RF-08, RF-09)
  Crear contratos sin dependencias de navegador ni Firebase.
  **Depende de:** T05  
  **Hecho cuando:** repositorios en memoria pasan tests de guardar, recuperar, listar y borrar.

- [ ] **T20. Implementar IndexedDB del facilitador.** (RF-08)
  Guardar snapshots atómicos y recuperar la última revisión válida.
  **Depende de:** T19  
  **Hecho cuando:** tests de integración recargan una sesión completa sin pérdida.

- [ ] **T21. Aplicar límite de 20 sesiones locales.** (RF-08)
  Bloquear creación/importación adicional y devolver error accionable.
  **Depende de:** T20  
  **Hecho cuando:** tests aceptan 20, rechazan 21 y permiten continuar tras eliminar una.

- [ ] **T22. Implementar identidad y borradores del participante.** (RF-01, RF-02, RF-08)
  Persistir acceso, borrador y estado pendiente; limpiar al abandonar/finalizar.
  **Depende de:** T19  
  **Hecho cuando:** una prueba simula recarga, recupera borrador y confirma limpieza final.

## Fase D — Firebase y seguridad

- [ ] **T23. Configurar Firebase y emuladores locales.** (RF-01, RF-08)
  Añadir adaptador configurable, Auth anónima, Firestore y entorno de pruebas.
  **Depende de:** T03, T19  
  **Hecho cuando:** un test se autentica y escribe/lee contra emuladores sin usar producción.

- [ ] **T24. Implementar creación de sesión y credenciales.** (RF-01)
  Generar código público, tokens de 128 bits, alias y documentos iniciales.
  **Depende de:** T08, T23  
  **Hecho cuando:** integración crea sesión con 40 accesos únicos y no expone tokens en proyección pública.

- [ ] **T25. Implementar ingreso y recuperación de participante.** (RF-01, RF-08)
  Vincular token personal a `uid`, revocar vínculo anterior y recuperar progreso.
  **Depende de:** T22, T24  
  **Hecho cuando:** pruebas recuperan en otro cliente y el cliente anterior pierde permiso de escritura.

- [ ] **T26. Implementar recuperación del facilitador.** (RF-01, RF-08)
  Vincular clave/QR privado a un nuevo `uid` sin usar el código público.
  **Depende de:** T24  
  **Hecho cuando:** pruebas recuperan el panel y demuestran que un participante no obtiene ese rol.

- [ ] **T27. Implementar reglas base y proyecciones privadas.** (RF-01, RF-03)
  Denegar por defecto, impedir listados de accesos y ocultar nombre/autoría.
  **Depende de:** T24  
  **Hecho cuando:** tests de reglas permiten solo lecturas previstas y niegan datos privados antes del final.

- [ ] **T28. Implementar reglas por etapa para iniciativas.** (RF-02, RF-03)
  Autorizar creación/edición propia, corrección permitida y solicitudes anónimas.
  **Depende de:** T27  
  **Hecho cuando:** tests niegan cambios ajenos, fuera de etapa y campos no permitidos.

- [ ] **T29. Implementar sincronización y reglas de ballots.** (RF-04)
  Escribir un ballot por participante/ronda y confirmar desde servidor.
  **Depende de:** T11, T27  
  **Hecho cuando:** integración prueba reintento idempotente, bloqueo por etapa y voto ajeno denegado.

- [ ] **T30. Implementar sincronización y reglas ICE.** (RF-05, RF-06)
  Proteger evaluaciones individuales y publicar solo agregados tras el cierre.
  **Depende de:** T15, T27  
  **Hecho cuando:** reglas ocultan calificaciones abiertas y permiten leer resultados cerrados.

- [ ] **T31. Implementar expiración y limpieza diferida.** (RF-08)
  Denegar sesión vencida, reabrir antes del plazo y borrar al volver el facilitador.
  **Depende de:** T18, T27  
  **Hecho cuando:** tests con reloj controlado cubren acceso, reapertura y limpieza física oportunista.

## Fase E — Interfaz del facilitador

- [ ] **T32. Crear formulario X0/Xf y configuración.** (RF-01, RF-02, RF-10)
  Implementar validaciones, contador de caracteres y resumen calculado.
  **Depende de:** T04, T06  
  **Hecho cuando:** pruebas de componente cubren errores y creación válida a 360 px.

- [ ] **T33. Crear sala y panel de participantes.** (RF-01, RF-10)
  Mostrar código, QR, alias, conexión, avance y recuperación privada separada.
  **Depende de:** T24, T32  
  **Hecho cuando:** el panel refleja cambios en tiempo real y no mezcla códigos públicos/privados.

- [ ] **T34. Crear panel de revisión ciega.** (RF-03, RF-10)
  Corrección ortográfica, aclaraciones, fusión y trazabilidad sin autoría visible.
  **Depende de:** T09, T28  
  **Hecho cuando:** pruebas cubren cada acción y confirman que nombres/autores están ocultos.

- [ ] **T35. Crear control de depuración y desempate.** (RF-04, RF-10)
  Abrir/cerrar, progreso, advertencia de incompletos y resultado de N.
  **Depende de:** T12, T13, T29  
  **Hecho cuando:** el facilitador completa un flujo con empate y decisión persistente.

- [ ] **T36. Crear configuración ICE.** (RF-05, RF-10)
  Elegir un método, editar pesos y bloquearlos al iniciar.
  **Depende de:** T14  
  **Hecho cuando:** UI impide pesos distintos de 100 % y muestra el método activo único.

- [ ] **T37. Crear ranking y cierre de sesión.** (RF-07, RF-08, RF-10)
  Mostrar medianas, puntuación, empates, autoría final y periodo de recuperación.
  **Depende de:** T17, T18, T30  
  **Hecho cuando:** pruebas muestran un ranking correcto y finalización con vencimiento visible.

## Fase F — Interfaz del participante

- [ ] **T38. Crear ingreso por código/QR y nombre privado.** (RF-01, RF-10)
  Consumir credencial, retirar secreto del historial y recuperar identidad.
  **Depende de:** T25  
  **Hecho cuando:** ingreso y recuperación funcionan a 360 px sin revelar el nombre real.

- [ ] **T39. Crear captura de iniciativas y aclaraciones.** (RF-02, RF-03, RF-10)
  Campos dinámicos, borradores, progreso, revisión y envío confirmado.
  **Depende de:** T22, T28, T38  
  **Hecho cuando:** se recupera un borrador tras recarga y se envía exactamente la cantidad configurada.

- [ ] **T40. Crear votación móvil de depuración.** (RF-04, RF-10)
  Tarjetas anónimas, contador exacto N, resumen y estado confirmado.
  **Depende de:** T29, T38  
  **Hecho cuando:** no permite enviar N−1/N+1 y funciona sin scroll horizontal a 360 px.

- [ ] **T41. Crear votación móvil de desempate.** (RF-04, RF-10)
  Mostrar solo empatadas y exigir tantas selecciones como puestos restantes.
  **Depende de:** T12, T40  
  **Hecho cuando:** prueba de componente completa un desempate de 2 puestos entre 4 opciones.

- [ ] **T42. Crear evaluación ICE paso a paso.** (RF-06, RF-10)
  Una iniciativa por paso, controles 1..10, navegación y resumen final.
  **Depende de:** T30, T38  
  **Hecho cuando:** una prueba completa 15 iniciativas, detecta faltantes y confirma el envío.

- [ ] **T43. Crear espera, conexión y recuperación de errores.** (RF-01, RF-08, RF-10)
  Estados offline/enviando/confirmado/error, reintentos y cambio de etapa.
  **Depende de:** T33, T38  
  **Hecho cuando:** pruebas simulan desconexión y el usuario distingue borrador de envío confirmado.

## Fase G — Excel

- [ ] **T44. Definir esquema versionado del respaldo.** (RF-09)
  Documentar hojas, columnas, tipos y manifestación normalizada.
  **Depende de:** T05, T19  
  **Hecho cuando:** fixtures válidos e inválidos cubren todos los campos obligatorios.

- [ ] **T45. Implementar exportación de respaldo completo.** (RF-09)
  Generar `.xlsx` con datos restaurables, metadata y progreso visible.
  **Depende de:** T44  
  **Hecho cuando:** una prueba abre el libro y valida hojas, versión y conteos máximos.

- [ ] **T46. Implementar importación transaccional.** (RF-09)
  Validar antes de guardar, rechazar versiones/corrupción y crear copia preventiva.
  **Depende de:** T21, T45  
  **Hecho cuando:** round-trip conserva el estado y archivos inválidos no modifican la sesión activa.

- [ ] **T47. Implementar modo consulta y reactivación.** (RF-09)
  Mantener datos/progreso y regenerar todos los códigos al reactivar.
  **Depende de:** T24, T46  
  **Hecho cuando:** consulta es inmutable y reactivación conserva envíos con credenciales nuevas.

- [ ] **T48. Implementar reporte Excel compartible.** (RF-09)
  Incluir nombres, autoría y agregados; excluir ballots y calificaciones individuales.
  **Depende de:** T17, T45  
  **Hecho cuando:** inspección automatizada confirma las hojas esperadas y ausencia de datos privados de voto.

## Fase H — Validación y publicación

- [ ] **T49. Añadir pruebas de accesibilidad y viewports.** (RF-10)
  Revisar foco, teclado, etiquetas, `aria-live`, contraste y pantallas objetivo.
  **Depende de:** T32..T43  
  **Hecho cuando:** suite automatizada no reporta bloqueos críticos en móvil, tableta ni escritorio.

- [ ] **T50. Crear E2E del flujo principal 6×5 -> 15 -> ICE.** (RF-01..RF-10)
  Simular facilitador y seis participantes con un desempate incluido.
  **Depende de:** T32..T48  
  **Hecho cuando:** Playwright completa el flujo y verifica ranking y Excel sin intervención manual.

- [ ] **T51. Crear E2E de recuperación y errores.** (RF-01, RF-08, RF-09)
  Cubrir reconexión, cambio de dispositivo, cierre incompleto, importación y expiración.
  **Depende de:** T31, T38, T46, T47  
  **Hecho cuando:** todos los escenarios terminan en el estado previsto sin duplicar datos.

- [ ] **T52. Configurar despliegue en GitHub Pages.** (RF-10)
  Añadir `base`, workflow con gates y publicación desde `main`.
  **Depende de:** T04, T49  
  **Hecho cuando:** el workflow ejecuta tests, lint, build y genera un artefacto navegable con rutas hash.

- [ ] **T53. Validar la spec RF por RF.** (Todos)
  Crear matriz final de pruebas, ejecutar suite completa y realizar demo documentada.
  **Depende de:** T50, T51, T52  
  **Hecho cuando:** cada RF tiene evidencia verde y el veredicto final es “spec cumplida”.
