# Especificación 001: Sesión colaborativa de priorización OKR

**Estado:** Aprobada  
**Fecha:** 2026-11-14

## 1. Propósito

Permitir que un facilitador conduzca una sesión colaborativa para definir una
situación actual (X0), una situación deseada (Xf), recopilar iniciativas,
depurarlas por votación y priorizar las finalistas mediante un único método ICE.

## 2. Roles

### Facilitador

Crea y controla la sesión, configura las etapas, revisa iniciativas, publica
resultados, conserva el registro completo y realiza importaciones o exportaciones.

### Participante

Accede mediante código o QR, se identifica con un alias y completa únicamente la
actividad que el facilitador haya habilitado.

## 3. Flujo principal

1. El facilitador registra X0 y Xf.
2. Define el número esperado de participantes, iniciativas por participante y
   cantidad de iniciativas finalistas.
3. Crea una sesión y comparte un código, enlace o QR.
4. Los participantes ingresan con un alias.
5. El facilitador abre el brainstorming.
6. Cada participante redacta la cantidad configurada de iniciativas y las envía.
7. El facilitador cierra la recepción y revisa, corrige o fusiona duplicados.
8. Abre la depuración y los participantes seleccionan iniciativas.
9. El sistema ordena por votos y conserva la cantidad objetivo, resolviendo el
   empate del límite mediante una ronda adicional.
10. El facilitador elige un único método ICE y abre la evaluación.
11. Cada participante califica todas las finalistas en Impacto, Confianza y
    Facilidad con valores enteros de 1 a 10.
12. El sistema calcula medianas, aplica el método elegido y publica el ranking.
13. El facilitador exporta el resultado y finaliza la sesión.

## 4. Etapas de la sesión

- CONFIGURACION
- SALA_DE_ESPERA
- BRAINSTORMING
- REVISION
- DEPURACION
- DESEMPATE_DEPURACION (condicional)
- CONFIGURACION_ICE
- EVALUACION_ICE
- RESULTADO_FINAL
- FINALIZADA

Solo el facilitador puede cambiar de etapa. Los envíos quedan bloqueados al cerrar
la etapa correspondiente.

## 5. Requisitos funcionales

### RF-01 — Creación y acceso

- La sesión debe tener un código público corto y difícil de adivinar.
- Debe ofrecer enlace y QR equivalentes.
- El control del facilitador debe estar separado del código público.
- Al crear la sesión, el sistema entrega al facilitador una clave privada y un QR
  de recuperación que permiten retomar el control desde otro dispositivo mientras
  los datos compartidos sigan disponibles.
- El código público y los códigos personales de participantes nunca conceden
  permisos de facilitador.
- El facilitador debe ver participantes conectados y su estado de avance.
- Al configurar la cantidad de participantes, el sistema genera para cada uno un
  alias neutral aleatorio y un código personal o QR de acceso.
- Los alias provienen de una lista de palabras neutrales y no muestran números ni
  información personal, por ejemplo Faro, Nexo, Prisma o Brújula.
- Cada participante registra su nombre real de forma privada al ingresar; la
  relación entre nombre, alias y código permanece oculta al facilitador y a los
  demás hasta finalizar la priorización.
- El código personal identifica al participante y permite recuperar su acceso
  desde el mismo navegador o desde otro dispositivo sin duplicar envíos.

### RF-02 — Brainstorming

- El total esperado se calcula como participantes por iniciativas por participante.
- Cada participante solo puede editar sus iniciativas mientras la etapa esté abierta.
- El facilitador puede continuar con ausentes mediante confirmación explícita.

### RF-03 — Revisión

- El facilitador puede corregir únicamente ortografía y puntuación, sin cambiar
  el significado de una iniciativa.
- Si una iniciativa requiere cambios de contenido o mayor claridad, el
  facilitador envía una solicitud anónima de aclaración y solo su autor puede
  modificarla mientras la revisión permanezca abierta.
- El facilitador puede fusionar propuestas similares; antes de continuar, el
  sistema muestra el texto consolidado y conserva todas las versiones originales.
- Una fusión debe conservar trazabilidad hacia las propuestas originales.
- Una iniciativa consolidada cuenta como una sola opción durante depuración e
  ICE, pero mantiene vinculadas todas las propuestas y autores originales.
- La fusión no altera el registro de cumplimiento del brainstorming de quienes
  aportaron las propuestas originales.
- El sistema conserva internamente la autoría para mantener la trazabilidad.
- La autoría permanece oculta al facilitador y a los participantes durante la
  revisión, la depuración y la evaluación ICE para reducir sesgos.
- La autoría podrá consultarse únicamente después de finalizar la priorización.
- Al finalizar, el reporte puede relacionar los nombres reales con sus alias y
  aportes para fines académicos, reconociendo a todos los autores de una fusión.

### RF-04 — Depuración

- El facilitador establece la cantidad N de iniciativas finalistas antes de abrir la votación.
- N debe ser como mínimo 1 y no puede superar la cantidad de iniciativas
  disponibles después de la revisión.
- Si N coincide con la cantidad disponible, el sistema omite la votación de
  depuración y todas las iniciativas pasan directamente a la configuración ICE.
- Cada participante debe seleccionar exactamente N iniciativas distintas para poder enviar su voto.
- No puede votar dos veces por la misma iniciativa.
- El sistema selecciona las N iniciativas con más votos.
- Un empate en el puesto N produce una ronda solo entre las empatadas; cada
  participante debe seleccionar exactamente tantas iniciativas como puestos
  falten para completar N.
- Si el empate persiste, el facilitador decide y el sistema registra la decisión.
- El sistema espera la participación de todas las personas registradas, pero el
  facilitador puede cerrar anticipadamente después de una advertencia si existen
  al menos dos votos completos.
- Al cerrar anticipadamente, solo se cuentan envíos completos; los parciales se
  descartan y el reporte registra que hubo participación incompleta.

### RF-05 — Configuración ICE

- El facilitador debe elegir exactamente un método antes de abrir la evaluación.
- Métodos permitidos:
  - Multiplicativo: `impacto * confianza * facilidad`.
  - Ponderado: `impacto * pesoImpacto + confianza * pesoConfianza + facilidad * pesoFacilidad`.
- En el método ponderado, los tres pesos deben sumar exactamente 100 %.
- El método y sus pesos quedan bloqueados al comenzar la evaluación.

### RF-06 — Evaluación ICE

- Cada participante debe evaluar todas las finalistas en los tres criterios.
- Cada calificación es un entero entre 1 y 10.
- No se permite enviar una evaluación incompleta.
- Los votos individuales no son visibles durante la etapa.
- El facilitador puede cerrar anticipadamente después de una advertencia si
  existen al menos dos evaluaciones completas; las parciales se descartan y el
  reporte registra la participación incompleta.
- Para un número par de votos, la mediana es el promedio de los dos valores centrales.
- Los cálculos conservan toda su precisión y la interfaz muestra hasta dos decimales.

### RF-07 — Ranking

- El ranking se ordena por puntuación descendente.
- En empate se compara Impacto, luego Confianza y luego Facilidad.
- Si persiste, las iniciativas comparten posición.
- Se muestra un solo ranking correspondiente al método elegido.
- Las medianas y puntuaciones se muestran con un máximo de dos decimales, pero
  los cálculos, el orden y los desempates utilizan los valores completos sin
  redondear.

### RF-08 — Persistencia y recuperación

- El navegador del facilitador guarda automáticamente el estado completo.
- El dispositivo del participante puede guardar la identidad técnica de la
  sesión, su estado de acceso y borradores pendientes para permitir recargas,
  cierres accidentales y reintentos desde el mismo navegador.
- Los datos locales del participante se eliminan al finalizar la sesión o al
  abandonar voluntariamente su participación.
- La sincronización debe confirmar que cada envío fue recibido.
- Una interrupción temporal no debe producir duplicados.
- El facilitador puede pausar, recuperar y finalizar una sesión.
- El facilitador puede recuperar el panel desde otro dispositivo mediante su
  clave o QR privados mientras la sesión compartida continúe disponible.
- Al finalizar una sesión, los datos del servicio compartido se conservan durante
  24 horas como periodo de recuperación. Al vencer, la sesión queda expirada e
  inaccesible automáticamente.
- El plazo comienza cuando el facilitador confirma “Finalizar sesión”. Si la
  reabre con su clave privada durante ese periodo, la eliminación se cancela y la
  sesión vuelve a estar activa.
- Para conservar el costo cero, la eliminación física se realiza de forma diferida
  cuando el facilitador vuelve a usar la aplicación o ejecuta la limpieza manual;
  la expiración impide todo acceso aunque los documentos aún no se hayan borrado.
- La eliminación de los datos compartidos no afecta el respaldo Excel ni la copia
  local conservada por el facilitador.

### RF-09 — Excel

- El facilitador puede exportar un respaldo completo `.xlsx` restaurable que
  incluye votos y evaluaciones individuales.
- Puede exportar un reporte `.xlsx` legible para análisis o entrega que incluye
  nombres, autoría, totales, medianas y ranking, pero no revela cómo votó o
  calificó cada participante.
- El respaldo contiene versión de formato, configuración, participantes,
  iniciativas, depuración, evaluación ICE y ranking.
- La importación valida estructura y versión antes de modificar el estado actual.
- Antes de importar se crea una copia preventiva de la sesión activa.
- La importación del MVP solo acepta respaldos generados por la propia aplicación;
  no admite plantillas creadas o modificadas manualmente.
- Cada archivo incluye una versión interna de formato. El MVP importa únicamente
  respaldos cuya versión coincida exactamente con la admitida; ante otra versión,
  muestra un mensaje claro y no modifica la sesión activa.
- Al importar, el facilitador puede abrir el respaldo en modo de solo consulta o
  elegir “Reactivar como nueva sesión”.
- La reactivación conserva participantes, nombres, alias, iniciativas, fusiones,
  votos, evaluaciones, progreso, configuración y etapa del respaldo, pero genera
  códigos nuevos de sesión, facilitador y participantes.
- Los envíos ya confirmados permanecen completos y únicamente continúan las
  actividades que estaban pendientes.

### RF-10 — Diseño responsive

- La aplicación sigue un enfoque mobile-first desde 360 px.
- No debe requerir desplazamiento horizontal en los flujos principales.
- Las tablas se convierten en tarjetas o vistas compactas en móvil.
- La evaluación ICE muestra progreso y controles táctiles claros.
- El facilitador puede operar desde móvil, aunque escritorio es la vista recomendada.

### RF-11 — Presencia, desconexión y recuperación

- Facilitador y participantes deben ver su propio estado de conexión: conectado,
  sin conexión o reconectando.
- Cada cliente activo renueva una señal de presencia; después de 90 segundos sin
  señal, el sistema lo considera desconectado aunque el navegador no haya podido
  notificar el cierre.
- El facilitador ve la presencia vigente de cada participante, no un indicador
  permanente basado únicamente en su ingreso inicial.
- Los participantes reciben un aviso cuando el facilitador está temporalmente
  desconectado y pueden continuar preparando actividades que no requieran un
  cambio de etapa.
- Al perder conexión, los borradores permanecen en el dispositivo y ningún envío
  se muestra como confirmado hasta que Firebase lo acepte.
- Al recuperar conexión, la interfaz sincroniza y reintenta explícitamente los
  envíos pendientes sin duplicarlos.
- Las acciones críticas del facilitador se bloquean mientras su navegador esté
  sin conexión.
- Al recargar, los listeners esperan la restauración de Firebase Authentication;
  no deben mostrar errores transitorios de permisos en inglés.

## 6. Requisitos no funcionales

- La aplicación debe funcionar en versiones actuales de Chrome, Edge, Firefox y Safari.
- El MVP admite hasta 40 participantes, 10 iniciativas por participante, 400
  iniciativas iniciales y 40 iniciativas finalistas para ICE.
- Cada iniciativa admite hasta 300 caracteres; X0 y Xf admiten hasta 1.000
  caracteres cada uno.
- El navegador del facilitador conserva hasta 20 sesiones locales; al alcanzar el
  límite debe exportar o eliminar una antes de crear o importar otra.
- Debe ofrecer estados visibles de conexión, guardado, envío y error.
- Las acciones destructivas requieren confirmación.
- Las reglas del servicio compartido deben separar permisos de facilitador y participante.
- Los datos temporales compartidos deben poder eliminarse al finalizar.
- El prototipo debe operar dentro de servicios gratuitos y sin servidor administrado
  por el equipo del proyecto.

## 7. Criterios de aceptación de extremo a extremo

1. Con seis participantes y cinco iniciativas por persona, el sistema recibe hasta
   treinta iniciativas e informa el avance de cada participante.
2. Si el objetivo es quince, la depuración produce exactamente quince salvo que
   exista un desempate todavía abierto.
3. Un participante no puede enviar dos votos para la misma etapa.
4. Con valores medianos 3, 10 y 10, el método multiplicativo produce 300.
5. Con los mismos valores y pesos 50 %, 25 % y 25 %, el ponderado produce 6,5.
6. No se puede iniciar ICE ponderado si los pesos no suman 100 %.
7. Recargar el navegador del facilitador recupera la sesión sin pérdida.
8. Un respaldo Excel exportado puede importarse y reconstruir el mismo estado.
9. Los flujos del participante son utilizables en una pantalla de 360 px sin
   desplazamiento horizontal.
10. Al cerrar un participante, el panel lo muestra desconectado en un máximo de
    90 segundos; ambos roles reciben avisos claros al perder y recuperar conexión.

## 8. Fuera del alcance del MVP

- Múltiples facilitadores simultáneos.
- Autenticación mediante cuentas personales.
- Comparación histórica entre organizaciones.
- Aplicación nativa móvil.
- Trabajo colaborativo totalmente sin internet.
- Exportación PDF y paneles estadísticos avanzados.

## 9. Aprobación

La entrevista inicial y la clarificación QA están completas. La constitución y
esta especificación fueron aprobadas el 2026-11-14.

