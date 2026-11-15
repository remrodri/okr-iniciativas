# Esquema del respaldo Excel v1

El respaldo restaurable usa `formatVersion = 1` y contiene exactamente nueve
hojas. La importación acepta únicamente archivos generados por
`okr-iniciativas`, con la misma versión y todas las columnas declaradas.

## Reglas generales

- La primera fila física de cada hoja contiene los encabezados definidos por el
  esquema TypeScript `BACKUP_SHEETS`.
- `Metadata` y `Session` contienen exactamente una fila de datos.
- Las demás hojas pueden contener cero o más filas.
- Los valores `null` se representan como celdas vacías únicamente en columnas
  declaradas como anulables.
- Fechas y horas se guardan como texto ISO 8601 UTC.
- Identificadores, alias y textos se guardan como texto, aunque parezcan números.
- No se guardan tokens privados completos. `accessTokenId` es un identificador
  opaco histórico; al reactivar se generan credenciales nuevas.
- `checksum` protege el manifiesto lógico normalizado, no los bytes físicos del
  archivo. Su cálculo se implementa con la exportación.

## Hojas

| Hoja | Contenido |
|---|---|
| `Metadata` | Versión, aplicación, identificador, fecha y suma de control. |
| `Session` | Escenario, etapa, límites, configuración ICE y ciclo de vida. |
| `Participants` | Alias, nombre privado, progreso y vínculo histórico. |
| `Initiatives` | Texto vigente, estado de fusión y revisión. |
| `Refinements` | Autoría, originales, finalistas, empate y aclaraciones. |
| `Votes` | Una fila por iniciativa seleccionada en cada ballot. |
| `IceRatings` | Una fila por participante, finalista y terna ICE. |
| `Results` | Medianas, puntuación completa y posición del ranking. |
| `Audit` | Eventos; los detalles se normalizan en pares clave/valor. |

Las columnas, tipos, anulabilidad y valores enumerados son los definidos en
`src/infrastructure/workbook/workbookSchema.ts`, que es el contrato ejecutable.

## Normalización de relaciones

`Refinements.kind` admite:

- `AUTHOR`: `initiativeId` se relaciona con el participante de `relatedId`.
- `ORIGINAL`: conserva texto, autor y fecha de una propuesta fusionada.
- `FINALIST`: `numericValue` conserva el orden entre finalistas.
- `TIE_CANDIDATE`: conserva candidatas y puestos restantes.
- `CLARIFICATION`: conserva solicitud, estado y respuesta sin añadir autoría
  pública.

`Votes` repite los metadatos del ballot y usa una fila por selección, ordenada
por `selectionOrder`. `IceRatings` usa una fila por iniciativa para evitar JSON
dentro de las celdas. `Audit` usa una fila por detalle; un evento sin detalles
lleva `detailKey` y `detailValue` vacíos.
