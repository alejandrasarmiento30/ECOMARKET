# EcoMarket

Dashboard responsive para administrar un catálogo de productos locales y sostenibles. Abre `index.html` en un navegador; el catálogo se guarda en `localStorage` del mismo navegador.

## Funcionalidades

- Portada con navegación hacia el dashboard y el inventario.
- Indicadores de productos activos, stock bajo y valor del inventario.
- Gráfico de productos por categoría, actualizado al modificar el catálogo.
- Búsqueda por producto o productor y filtros por categoría, ciudad y estado.
- Crear, editar y eliminar productos; los cambios se conservan en `localStorage`.
- Validación del dataset con resumen, correcciones seguras y exclusión de registros inválidos.
- Exportación del catálogo actual como un archivo JSON válido.

## Proceso de generación con IA y refinamiento de prompts

Los registros del catálogo son datos de demostración ficticios. El siguiente proceso sirve para generar o ampliar el dataset sin introducir datos personales ni inventario real:

1. **Prompt inicial — generación estructurada**

   > Actúa como asistente de datos para una tienda colombiana de productos locales y sostenibles. Genera 30 productos ficticios como un arreglo JSON válido, sin Markdown ni texto adicional. Cada objeto debe tener `id`, `nombre`, `categoria`, `precio`, `stock`, `stockMinimo`, `productor`, `ciudad`, `organico`, `fechaRegistro` y `activo`. Usa precios enteros positivos en COP, existencias enteras no negativas y fechas `AAAA-MM-DD`. Limita las categorías a Frutas y verduras, Despensa, Cuidado personal y Hogar sostenible. Usa ciudades colombianas y nombres de productores ficticios.

2. **Refinamiento — reglas de negocio**

   > Revisa el arreglo anterior. Conserva exactamente el esquema y los tipos JSON; asegúrate de que todos los IDs sean únicos y positivos, el precio sea mayor que cero y stock/stockMinimo sean enteros no negativos. No inventes certificaciones: `organico` debe ser un booleano. Incluye algunos productos agotados o con stock bajo (`stock <= stockMinimo`) para probar los indicadores. Devuelve únicamente el arreglo JSON corregido.

3. **Refinamiento — validación independiente**

   > Valida cada registro contra este esquema y estas reglas. Devuelve un reporte con índice, campo, valor observado y corrección sugerida. No cambies silenciosamente la categoría, ciudad, precio ni existencias; marca el registro como inválido si esos datos no cumplen las reglas. Comprueba también IDs duplicados, fechas ISO reales y campos de texto vacíos.

4. **Integración y verificación**

   - Se revisó que los campos y valores pertenezcan al dominio admitido por el formulario.
   - Se implementó `validarYCorregirProductos` para volver a validar los datos al cargar y al solicitar una revisión.
   - Solo se corrigen automáticamente espacios externos, IDs ausentes o repetidos, booleanos ausentes/incorrectos y fechas inválidas. Los campos esenciales inválidos se excluyen y se informan.
   - La opción **Exportar JSON** genera el catálogo vigente con `JSON.stringify`; el archivo descargado es JSON estricto independiente del formato del archivo semilla JavaScript.

## Reglas del catálogo

| Campo | Regla |
|---|---|
| `id` | Entero positivo y único |
| `nombre` | Texto de 3 a 80 caracteres |
| `categoria` | Una de las cuatro categorías permitidas |
| `precio` | Entero seguro mayor que cero (COP) |
| `stock`, `stockMinimo` | Enteros seguros no negativos |
| `productor` | Texto de 2 a 80 caracteres |
| `ciudad` | Ciudad disponible en el formulario |
| `organico`, `activo` | Booleanos |
| `fechaRegistro` | Fecha real en formato `AAAA-MM-DD` |

El estado de inventario se calcula como **Agotado** cuando `stock` es cero, **Stock bajo** cuando `stock` no supera `stockMinimo` y **Disponible** en los demás casos.

## Validación manual

1. Abre la portada y usa sus enlaces para navegar al dashboard y al inventario.
2. Comprueba que los KPI, el gráfico y las tarjetas coincidan con el catálogo.
3. Agrega, edita y elimina un producto; recarga la página para verificar la persistencia.
4. Aplica varios filtros a la vez y usa **Limpiar filtros**.
5. Pulsa **Validar ahora** y confirma el reporte. Prueba **Exportar JSON** y abre el archivo descargado para comprobar que contiene un arreglo JSON.
6. Para probar recuperación de datos, modifica temporalmente el valor `ecomarket_productos` en `localStorage` desde las herramientas del navegador con un registro inválido, recarga y revisa el reporte de correcciones/exclusiones.
