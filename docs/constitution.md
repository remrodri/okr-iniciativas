# Constitución del proyecto

## Principios

1. **La especificación precede al código.** Ninguna funcionalidad se implementa
   sin requisitos y criterios de aceptación revisados.
2. **Mobile-first y accesible.** Las tareas del participante deben funcionar
   cómodamente desde un teléfono de 360 px de ancho.
3. **Integridad de la dinámica.** Las etapas, votos y evaluaciones deben impedir
   duplicados y cambios fuera del periodo habilitado.
4. **Privacidad por diseño.** Se recopilan solo los datos necesarios; los votos
   individuales no se muestran durante una votación.
5. **Recuperación antes que pérdida.** El facilitador dispone de guardado local,
   sincronización temporal y respaldo importable/exportable en Excel.
6. **Cálculos deterministas.** Medianas, desempates, ponderaciones y redondeos
   deben estar documentados y cubiertos por pruebas automatizadas.
7. **Costo operativo cero para el prototipo.** La solución debe poder publicarse
   en GitHub Pages y operar dentro de niveles gratuitos, sin servidor propio.

## Restricciones iniciales

- Frontend: React, Vite, TypeScript y Material UI.
- Publicación: GitHub Pages.
- Sincronización: servicio administrado en tiempo real; Firebase es la opción
  propuesta, sujeta a confirmación en el plan técnico.
- Persistencia principal del facilitador: almacenamiento local y respaldo Excel.
- Los participantes no requieren persistencia permanente en sus dispositivos.
- En cada sesión se utiliza un solo método ICE: multiplicativo o ponderado.

## Puertas de calidad

- Especificación aprobada antes del plan técnico.
- Plan técnico aprobado antes de crear tareas de implementación.
- Criterios de aceptación verificables para cada historia.
- Pruebas unitarias obligatorias para cálculos y transiciones de etapa.
- Revisión responsive en móvil, tableta y escritorio antes de publicar.

