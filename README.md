# Control de Taxis

Aplicación web sencilla para gestionar una flota de taxis: registro de viajes,
asignación de taxis y conductores, seguimiento de estados y reportes de ingresos.

## Funcionalidades

- **Viajes**: registrar solicitudes (cliente, origen, destino, tarifa), asignar taxi y conductor,
  iniciar, finalizar o cancelar. Filtro por estado.
- **Taxis**: alta de vehículos por placa, activar/desactivar, eliminar. Estado automático
  (disponible / ocupado).
- **Conductores**: alta por documento, activar/desactivar, eliminar. Estado automático.
- **Reportes**: totales de viajes, ingresos de viajes finalizados y resumen por conductor.

Un taxi o conductor queda **ocupado** mientras tenga un viaje en estado *asignado* o *en curso*.

## Uso

No requiere instalación ni servidor. Abra `index.html` en el navegador.

Los datos se guardan en el `localStorage` del navegador, así que son locales a ese equipo y navegador.

## Estructura

```
index.html   Interfaz
styles.css   Estilos (incluye modo oscuro y diseño responsive)
app.js       Lógica y persistencia
```

## Pendientes sugeridos

- Backend y base de datos compartida entre varios usuarios.
- Autenticación de operadores.
- Exportar reportes a CSV/PDF.
- Asignación automática por cercanía.
