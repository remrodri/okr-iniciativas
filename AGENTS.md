# AGENTS.md — OKR Iniciativas

## Proyecto
Aplicación web colaborativa para diseñar y priorizar iniciativas de OKR.
Frontend React + Vite + TypeScript + Material UI, publicado en GitHub Pages;
sincronización temporal entre dispositivos mediante un servicio administrado.

## Comandos
- Ejecutar: `npm run dev`
- Tests: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

> Contrato objetivo; no ejecutar hasta que exista `package.json`.

## Estilo y convenciones
- TypeScript estricto; componentes y tipos con nombres en inglés.
- Interfaz, mensajes y documentación funcional en español.
- Lógica de dominio separada de React, Firebase y almacenamiento.
- Diseño mobile-first con Material UI.

## Reglas
- Lee `docs/constitution.md` y la spec activa antes de tocar código.
- No implementes comportamientos que no estén en la spec aprobada.
- No añadas dependencias ni cambies contratos sin actualizar antes spec y plan.
- No modifiques `specs/` salvo petición explícita.
- Trabaja una sola tarea de `tasks.md` por vez y escribe primero sus pruebas.

## Al terminar cualquier tarea
- Ejecuta tests, lint y build; no avances si alguno falla.
- Indica qué RF cubre y marca la tarea solo después de verificarla.

