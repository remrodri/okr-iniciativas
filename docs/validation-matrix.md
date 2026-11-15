# Matriz final de validación — Spec 001

Fecha de validación: 2026-11-15

| Requisito | Evidencia automatizada | Resultado |
|---|---|---|
| RF-01 Creación y acceso | Reglas de acceso, provisión de 40 participantes y E2E 6×5 | Cumple |
| RF-02 Brainstorming | Dominio, reglas y E2E con 30 iniciativas | Cumple |
| RF-03 Revisión | Pruebas de revisión, aclaración, fusión y trazabilidad | Cumple |
| RF-04 Depuración | Unitarias de N, ballots y empate; E2E 30→15 con empate | Cumple |
| RF-05 Configuración ICE | Validación de método único, pesos y bloqueo | Cumple |
| RF-06 Evaluación ICE | Medianas, integridad 1..10 y E2E de 15 finalistas × 6 | Cumple |
| RF-07 Ranking | Orden, desempates, posiciones compartidas y publicación E2E | Cumple |
| RF-08 Persistencia y recuperación | IndexedDB, borradores, reconexión, cambio de dispositivo y expiración | Cumple |
| RF-09 Excel | Respaldo/importación round-trip, reactivación y reporte sin votos individuales | Cumple |
| RF-10 Responsive | Axe + Playwright en 360×800, 768×1024 y 1440×900 | Cumple |

## Puertas de calidad

- Suite unitaria y de componentes: `npm test`.
- Reglas y adaptadores Firebase: `npm run test:emulators`.
- Accesibilidad y recorridos completos: `npm run test:e2e`.
- Tipos y artefacto de producción: `npm run build`.
- Convenciones del proyecto: `npm run lint`.

## Veredicto

**Spec cumplida.** Cada requisito RF-01..RF-10 cuenta con evidencia automatizada
y el recorrido principal produce ranking y reporte Excel sin intervención manual.
