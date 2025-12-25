# Plan Detallado de Cancelación de Servicios - Grúa RD

Este documento detalla la lógica de negocio, fórmulas y condiciones para el sistema de penalizaciones por cancelación de servicios, asegurando compensación para el conductor y flexibilidad para el cliente ante retrasos.

## 1. Estructura de Penalización Proporcional

En lugar de montos fijos, la penalización se calculará como un porcentaje del **Costo Total** del servicio solicitado.

| Estado del Servicio | % Penalización (Base) | Margen por Reincidencia* | Máximo Permitido | Justificación Técnica |
|---------------------|-----------------------|--------------------------|------------------|-----------------------|
| **Pendiente**       | 0%                    | 0%                       | 0%               | No se ha asignado operador ni recursos. |
| **Aceptado**        | 10%                   | +2% por cada cancel. sem. | 25%              | El operador ya inició el despliegue. |
| **En Sitio**        | 25%                   | +5% por cada cancel. sem. | 50%              | El operador consumió combustible y tiempo de llegada. |
| **Cargando/Progreso**| 50%                  | +10% por cada cancel. sem.| 100%             | Operación en curso, máxima afectación al operador. |

*\*Reincidencia: Basado en cancelaciones en los últimos 7 días.*

## 2. Factor de Distancia (Compensación Gastos)

Si el conductor ha recorrido una distancia considerable antes de la cancelación del cliente, se aplica un ajuste:

- **Distancia < 5km:** Sin recargo adicional.
- **Distancia 5km - 10km:** Se asegura un mínimo de RD$ 200 adicionales a la penalización base.
- **Distancia > 10km:** Se aplica el 100% de la penalización del siguiente nivel de estado (ej: si está en "Aceptado", se cobra como "En Sitio").

## 3. Exoneración por Retraso del Operador (Protección al Cliente)

El cliente podrá cancelar **sin penalización alguna** si se cumplen las siguientes condiciones de demora:

### Fórmula de Tiempo Límite de Espera (TLE)
`TLE = ETA (Estimado Mapbox) + Margen_Tráfico + Tolerancia_Fija`

- **Margen_Tráfico:** 20% del ETA original.
- **Tolerancia_Fija:** 10 minutos.

**Ejemplo:**
- ETA: 20 min.
- Margen Tráfico (20%): 4 min.
- Tolerancia: 10 min.
- **TLE Total:** 34 minutos. Si el operador no ha llegado en 34 min, el cliente cancela gratis.

## 4. Política de Ratings

- **Clientes:** No se aplicará reducción de estrellas ni penalizaciones de rating por cancelar. La compensación es puramente económica.
- **Conductores:** Si el conductor cancela sin causa justificada (avería mecánica probada), se mantiene la penalización actual de 0.25 a 1.0 estrellas según la gravedad.

## 5. Almacenamiento y Transparencia

Cada cancelación debe registrar los siguientes metadatos para auditoría y visualización del cliente/admin:
- `tiempo_espera_real`: Minutos desde la aceptación.
- `distancia_recorrida_operador`: KM validados por GPS.
- `eta_original`: Tiempo prometido inicialmente.
- `justificacion_calculada`: Texto explicativo del porqué del monto (ej: "Penalización del 25% por llegada a sitio + 8km recorridos").

## 6. Lógica de Reembolsos

- **Pago con Tarjeta (Azul):** Si aplica penalización, se realiza una captura parcial del monto autorizado y se libera el resto. Si no aplica penalización, se anula la autorización completa.
- **Billetera/Efectivo:** La penalización se carga como saldo deudor en la cuenta del cliente para su próximo servicio.
