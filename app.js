const STORAGE_KEY = "ecomarket_productos";
const CATEGORIAS_VALIDAS = [
  "Frutas y verduras",
  "Despensa",
  "Cuidado personal",
  "Hogar sostenible"
];
const CIUDADES_VALIDAS = [
  "Bucaramanga",
  "Floridablanca",
  "Girón",
  "Bogotá",
  "Medellín",
  "Cali",
  "Tunja",
  "Cúcuta"
];

let productos = [];
let editandoId = null;
let ultimoElementoEnfocado = null;
let graficoCategorias = null;

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenu();
  inicializarEventos();
  cargarProductos();
});

function inicializarMenu({
  button = document.getElementById("menu-toggle"),
  sidebar = document.getElementById("sidebar"),
  overlay = document.getElementById("sidebar-overlay")
} = {}) {
  if (!button || !sidebar) return () => {};

  const mediaQuery = window.matchMedia("(max-width: 767px)");
  const closeMenu = () => {
    sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Abrir menú de navegación");
    button.textContent = "☰";
  };
  const openMenu = () => {
    sidebar.classList.add("active");
    if (overlay) overlay.classList.add("active");
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-label", "Cerrar menú de navegación");
    button.textContent = "×";
  };
  const toggleMenu = () => {
    if (sidebar.classList.contains("active")) {
      closeMenu();
    } else {
      openMenu();
    }
  };
  const handleOutsideClick = event => {
    if (
      mediaQuery.matches &&
      sidebar.classList.contains("active") &&
      !sidebar.contains(event.target) &&
      !button.contains(event.target)
    ) {
      closeMenu();
    }
  };
  const handleMenuLink = event => {
    if (event.target.closest(".nav-link")) closeMenu();
  };
  const handleKeydown = event => {
    if (event.key === "Escape") closeMenu();
  };
  const handleBreakpointChange = event => {
    if (!event.matches) closeMenu();
  };

  button.addEventListener("click", toggleMenu);
  document.addEventListener("pointerdown", handleOutsideClick);
  sidebar.addEventListener("click", handleMenuLink);
  document.addEventListener("keydown", handleKeydown);
  mediaQuery.addEventListener("change", handleBreakpointChange);
  if (overlay) overlay.addEventListener("click", closeMenu);

  return () => {
    button.removeEventListener("click", toggleMenu);
    document.removeEventListener("pointerdown", handleOutsideClick);
    sidebar.removeEventListener("click", handleMenuLink);
    document.removeEventListener("keydown", handleKeydown);
    mediaQuery.removeEventListener("change", handleBreakpointChange);
    if (overlay) overlay.removeEventListener("click", closeMenu);
  };
}

function cargarProductos() {
  let datosGuardados;
  let usarCatalogoInicial = false;

  try {
    datosGuardados = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("No se pudo acceder al almacenamiento local.", error);
    mostrarMensaje("No se pudo acceder al almacenamiento local. Los cambios no podrán persistirse.");
  }

  if (datosGuardados !== null && datosGuardados !== undefined) {
    try {
      const productosGuardados = JSON.parse(datosGuardados);
      if (!Array.isArray(productosGuardados)) {
        throw new TypeError("El contenido guardado no es una lista de productos.");
      }
      productos = productosGuardados;
    } catch (error) {
      console.error("Los datos guardados no son válidos; se cargará el catálogo inicial.", error);
      productos = productosEcoMarket.map(producto => ({ ...producto }));
      usarCatalogoInicial = true;
    }
  } else {
    productos = productosEcoMarket.map(producto => ({ ...producto }));
    usarCatalogoInicial = true;
  }

  const informe = validarYCorregirProductos(productos);
  productos = informe.productos;
  if (usarCatalogoInicial || informe.corregidos.length || informe.rechazados.length) {
    guardarProductos();
  }
  actualizarInterfaz(informe);
}

function validarYCorregirProductos(lista) {
  const idsUsados = new Set();
  let siguienteId = lista.reduce((maximo, producto) => {
    const id = producto && Number.isSafeInteger(producto.id) && producto.id > 0 ? producto.id : 0;
    return Math.max(maximo, id);
  }, 0) + 1;
  const productosValidos = [];
  const corregidos = [];
  const rechazados = [];
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaValida = fecha =>
    typeof fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) &&
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;

  lista.forEach((original, indice) => {
    if (!original || typeof original !== "object" || Array.isArray(original)) {
      rechazados.push(`Registro ${indice + 1}: no es un objeto de producto.`);
      return;
    }

    const producto = { ...original };
    const cambios = [];
    for (const campo of ["nombre", "productor"]) {
      if (typeof producto[campo] === "string") {
        const valorLimpio = producto[campo].trim();
        if (valorLimpio !== producto[campo]) {
          producto[campo] = valorLimpio;
          cambios.push(`${campo} sin espacios externos`);
        }
      }
    }

    const camposRequeridosValidos =
      typeof producto.nombre === "string" &&
      producto.nombre.length >= 3 &&
      producto.nombre.length <= 80 &&
      typeof producto.productor === "string" &&
      producto.productor.length >= 2 &&
      producto.productor.length <= 80 &&
      CATEGORIAS_VALIDAS.includes(producto.categoria) &&
      CIUDADES_VALIDAS.includes(producto.ciudad) &&
      Number.isSafeInteger(producto.precio) &&
      producto.precio >= 1 &&
      Number.isSafeInteger(producto.stock) &&
      producto.stock >= 0 &&
      Number.isSafeInteger(producto.stockMinimo) &&
      producto.stockMinimo >= 0;

    if (!camposRequeridosValidos) {
      rechazados.push(`Registro ${indice + 1} (${producto.nombre || "sin nombre"}): incumple un campo requerido o regla de negocio.`);
      return;
    }

    if (!Number.isSafeInteger(producto.id) || producto.id < 1 || idsUsados.has(producto.id)) {
      while (idsUsados.has(siguienteId)) siguienteId += 1;
      producto.id = siguienteId;
      siguienteId += 1;
      cambios.push("identificador asignado o duplicado reemplazado");
    }
    idsUsados.add(producto.id);

    if (typeof producto.organico !== "boolean") {
      producto.organico = false;
      cambios.push("orgánico establecido en falso");
    }
    if (typeof producto.activo !== "boolean") {
      producto.activo = true;
      cambios.push("activo establecido en verdadero");
    }
    if (!fechaValida(producto.fechaRegistro)) {
      producto.fechaRegistro = hoy;
      cambios.push("fecha de registro reemplazada por la fecha actual");
    }

    if (cambios.length) {
      corregidos.push(`${producto.nombre}: ${cambios.join(", ")}.`);
    }
    productosValidos.push(producto);
  });

  return {
    productos: productosValidos,
    corregidos,
    rechazados,
    stockBajo: productosValidos.filter(producto => producto.stock <= producto.stockMinimo).length
  };
}

function guardarProductos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los cambios del inventario.", error);
    mostrarMensaje("No se pudieron guardar los cambios. Revisa el almacenamiento disponible en este navegador.");
    return false;
  }
}

function actualizarInterfaz(informe = validarYCorregirProductos(productos)) {
  productos = informe.productos;
  if (informe.corregidos.length || informe.rechazados.length) guardarProductos();
  poblarFiltrosSelects();
  filtrarProductos();
  actualizarKPIs();
  renderizarInformeValidacion(informe);
  actualizarGraficoCategorias();
}

function renderizarInformeValidacion(informe) {
  const contenedor = document.getElementById("validation-report");
  if (!contenedor) return;

  const resumen = crearElemento(
    "p",
    informe.corregidos.length || informe.rechazados.length ? "validation-status validation-status-warning" : "validation-status",
    informe.rechazados.length
      ? "Se aplicaron correcciones seguras y se excluyeron registros inválidos."
      : informe.corregidos.length
        ? "Se aplicaron correcciones seguras al dataset."
        : "Dataset válido: todos los productos cumplen las reglas de negocio."
  );
  const estadisticas = crearElemento(
    "p",
    "validation-summary",
    `${informe.productos.length} válidos · ${informe.corregidos.length} corregidos · ${informe.rechazados.length} excluidos · ${informe.stockBajo} con stock bajo`
  );
  const detalles = [...informe.corregidos, ...informe.rechazados];
  const lista = document.createElement("ul");
  lista.className = "validation-details";
  detalles.slice(0, 5).forEach(detalle => lista.appendChild(crearElemento("li", "", detalle)));
  if (detalles.length > 5) {
    lista.appendChild(crearElemento("li", "", `Y ${detalles.length - 5} observaciones más.`));
  }
  contenedor.replaceChildren(resumen, estadisticas);
  if (detalles.length) contenedor.appendChild(lista);
}

function exportarDatasetJSON() {
  const contenido = JSON.stringify(productos, null, 2);
  const archivo = new Blob([contenido], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `ecomarket-productos-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function actualizarGraficoCategorias() {
  const canvas = document.getElementById("category-chart");
  const mensaje = document.getElementById("chart-message");
  if (!canvas || !mensaje) return;

  if (typeof Chart === "undefined") {
    mensaje.textContent = "No se pudo cargar Chart.js. Revisa tu conexión para ver el gráfico.";
    mensaje.hidden = false;
    return;
  }

  const categorias = [...new Set([
    ...CATEGORIAS_VALIDAS,
    ...productos.map(producto => producto.categoria).filter(Boolean)
  ])];
  const cantidades = categorias.map(categoria =>
    productos.filter(producto => producto.categoria === categoria).length
  );
  mensaje.hidden = true;
  mensaje.textContent = "";

  try {
    if (!graficoCategorias) {
      graficoCategorias = new Chart(canvas, {
        type: "bar",
        data: {
          labels: categorias,
          datasets: [{
            label: "Productos",
            data: cantidades,
            backgroundColor: ["#315a37", "#d78a4a", "#78a878", "#9ab58d", "#8d755b"],
            borderRadius: 8,
            maxBarThickness: 64
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: context => `${context.parsed.y} ${context.parsed.y === 1 ? "producto" : "productos"}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 },
              title: { display: true, text: "Cantidad de productos" }
            },
            x: {
              grid: { display: false },
              ticks: { maxRotation: 0 }
            }
          }
        }
      });
      return;
    }

    graficoCategorias.data.labels = categorias;
    graficoCategorias.data.datasets[0].data = cantidades;
    graficoCategorias.update();
  } catch (error) {
    console.error("No se pudo actualizar el gráfico de productos por categoría.", error);
    mensaje.textContent = "No se pudo mostrar el gráfico de productos por categoría.";
    mensaje.hidden = false;
  }
}

function calcularEstado(stock, stockMinimo) {
  if (stock === 0) return { texto: "Agotado", clase: "agotado" };
  if (stock <= stockMinimo) return { texto: "Stock bajo", clase: "stock-bajo" };
  return { texto: "Disponible", clase: "disponible" };
}

function crearElemento(tag, className, text) {
  const elemento = document.createElement(tag);
  if (className) elemento.className = className;
  if (text !== undefined) elemento.textContent = text;
  return elemento;
}

function renderizarProductos(lista) {
  const container = document.getElementById("productos-container");
  const summary = document.getElementById("results-summary");
  if (!container) return;

  container.replaceChildren();
  if (summary) {
    summary.textContent = `${lista.length} ${lista.length === 1 ? "producto encontrado" : "productos encontrados"}`;
  }

  if (lista.length === 0) {
    container.appendChild(
      crearElemento("p", "empty-message", "No se encontraron productos que coincidan con los filtros.")
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  lista.forEach(producto => {
    const estado = calcularEstado(producto.stock, producto.stockMinimo);
    const card = crearElemento("article", "product-card");
    const cardHeader = crearElemento("div", "card-header");
    const badge = crearElemento("span", `badge ${estado.clase}`, estado.texto);
    const code = crearElemento("span", "card-id", `ECO${String(producto.id).padStart(3, "0")}`);
    const cardBody = crearElemento("div", "card-body");
    const title = crearElemento("h3", "card-title", producto.nombre);
    const category = crearElemento("p", "card-detail", `Categoría: ${producto.categoria}`);
    const city = crearElemento("p", "card-detail", `Ciudad: ${producto.ciudad}`);
    const price = crearElemento(
      "p",
      "card-price",
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
      }).format(producto.precio)
    );
    const stock = crearElemento("p", "card-detail", `Stock disponible: ${producto.stock}`);
    const producer = crearElemento("p", "card-detail", `Productor: ${producto.productor}`);
    const footer = crearElemento("div", "card-footer");
    const editButton = crearElemento("button", "button button-card button-edit", "Editar");
    const deleteButton = crearElemento("button", "button button-card button-delete", "Eliminar");

    cardHeader.append(badge, code);
    cardBody.append(title, category, city, price, stock, producer);
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.productId = producto.id;
    editButton.setAttribute("aria-label", `Editar ${producto.nombre}`);
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.productId = producto.id;
    deleteButton.setAttribute("aria-label", `Eliminar ${producto.nombre}`);
    footer.append(editButton, deleteButton);
    card.append(cardHeader, cardBody, footer);
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

function actualizarKPIs() {
  const productosActivos = productos.filter(producto => producto.activo !== false);
  const inventarioBajo = productosActivos.filter(producto => producto.stock <= producto.stockMinimo).length;
  const valorInventario = productosActivos.reduce(
    (total, producto) => total + producto.precio * producto.stock,
    0
  );
  const formatoMoneda = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });

  const registrados = document.getElementById("kpi-registrados");
  const bajo = document.getElementById("kpi-bajo");
  const valor = document.getElementById("kpi-valor");
  if (registrados) registrados.textContent = String(productosActivos.length);
  if (bajo) bajo.textContent = String(inventarioBajo);
  if (valor) {
    valor.replaceChildren(document.createTextNode(formatoMoneda.format(valorInventario)));
    valor.appendChild(crearElemento("span", "", " COP"));
  }
}

function poblarFiltrosSelects() {
  poblarSelect("filtro-categoria", "Todas las categorías", productos.map(producto => producto.categoria));
  poblarSelect("filtro-ciudad", "Todas las ciudades", productos.map(producto => producto.ciudad));
}

function poblarSelect(id, textoPredeterminado, opciones) {
  const select = document.getElementById(id);
  if (!select) return;

  const valorActual = select.value;
  const fragment = document.createDocumentFragment();
  const opcionInicial = document.createElement("option");
  opcionInicial.value = "";
  opcionInicial.textContent = textoPredeterminado;
  fragment.appendChild(opcionInicial);

  [...new Set(opciones.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach(valor => {
      const opcion = document.createElement("option");
      opcion.value = valor;
      opcion.textContent = valor;
      fragment.appendChild(opcion);
    });

  select.replaceChildren(fragment);
  if ([...select.options].some(option => option.value === valorActual)) {
    select.value = valorActual;
  }
}

function filtrarProductos() {
  const texto = (document.getElementById("input-busqueda")?.value || "").trim().toLocaleLowerCase("es");
  const categoria = document.getElementById("filtro-categoria")?.value || "";
  const ciudad = document.getElementById("filtro-ciudad")?.value || "";
  const estadoFiltro = document.getElementById("filtro-estado")?.value || "";

  const filtrados = productos.filter(producto => {
    const coincideTexto =
      producto.nombre.toLocaleLowerCase("es").includes(texto) ||
      producto.productor.toLocaleLowerCase("es").includes(texto);
    const coincideCategoria = !categoria || producto.categoria === categoria;
    const coincideCiudad = !ciudad || producto.ciudad === ciudad;
    const estado = calcularEstado(producto.stock, producto.stockMinimo);
    const coincideEstado = !estadoFiltro || estado.clase === estadoFiltro;
    return coincideTexto && coincideCategoria && coincideCiudad && coincideEstado;
  });

  renderizarProductos(filtrados);
}

function limpiarFiltros() {
  document.getElementById("input-busqueda").value = "";
  document.getElementById("filtro-categoria").value = "";
  document.getElementById("filtro-ciudad").value = "";
  document.getElementById("filtro-estado").value = "";
  filtrarProductos();
}

function abrirModal(id = null) {
  const modal = document.getElementById("product-modal");
  const form = document.getElementById("product-form");
  const title = document.getElementById("modal-title");
  if (!modal || !form || !title) return;

  ultimoElementoEnfocado = document.activeElement;
  form.reset();
  editandoId = id;

  if (id !== null) {
    const producto = productos.find(item => item.id === id);
    if (!producto) {
      mostrarMensaje("No se encontró el producto seleccionado.");
      return;
    }
    title.textContent = "Editar producto";
    document.getElementById("nombre").value = producto.nombre;
    document.getElementById("categoria").value = producto.categoria;
    document.getElementById("precio").value = producto.precio;
    document.getElementById("stock").value = producto.stock;
    document.getElementById("stockMinimo").value = producto.stockMinimo;
    document.getElementById("productor").value = producto.productor;
    document.getElementById("ciudad").value = producto.ciudad;
    document.getElementById("organico").checked = Boolean(producto.organico);
    document.getElementById("activo").checked = producto.activo !== false;
  } else {
    title.textContent = "Agregar producto";
    document.getElementById("activo").checked = true;
  }

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("nombre").focus();
}

function cerrarModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  editandoId = null;
  if (ultimoElementoEnfocado instanceof HTMLElement) ultimoElementoEnfocado.focus();
}

function guardarProducto(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const nombre = document.getElementById("nombre").value.trim();
  const categoria = document.getElementById("categoria").value;
  const precio = Number(document.getElementById("precio").value);
  const stock = Number(document.getElementById("stock").value);
  const stockMinimo = Number(document.getElementById("stockMinimo").value);
  const productor = document.getElementById("productor").value.trim();
  const ciudad = document.getElementById("ciudad").value;
  const organico = document.getElementById("organico").checked;
  const activo = document.getElementById("activo").checked;

  const camposValidos =
    nombre.length >= 3 &&
    nombre.length <= 80 &&
    CATEGORIAS_VALIDAS.includes(categoria) &&
    Number.isSafeInteger(precio) &&
    precio >= 1 &&
    Number.isSafeInteger(stock) &&
    stock >= 0 &&
    Number.isSafeInteger(stockMinimo) &&
    stockMinimo >= 0 &&
    productor.length >= 2 &&
    productor.length <= 80 &&
    Boolean(ciudad);

  if (!camposValidos) {
    mostrarMensaje("Revisa los campos: categoría válida, precio entero mayor que cero y existencias enteras no negativas.");
    return;
  }

  let nuevosProductos;
  if (editandoId !== null) {
    nuevosProductos = productos.map(producto =>
      producto.id === editandoId
        ? { ...producto, nombre, categoria, precio, stock, stockMinimo, productor, ciudad, organico, activo }
        : producto
    );
  } else {
    const nuevoId = productos.length ? Math.max(...productos.map(producto => Number(producto.id) || 0)) + 1 : 1;
    nuevosProductos = [
      ...productos,
      {
        id: nuevoId,
        nombre,
        categoria,
        precio,
        stock,
        stockMinimo,
        productor,
        ciudad,
        organico,
        fechaRegistro: new Date().toISOString().slice(0, 10),
        activo
      }
    ];
  }

  const productosAnteriores = productos;
  productos = nuevosProductos;
  if (!guardarProductos()) {
    productos = productosAnteriores;
    return;
  }

  actualizarInterfaz();
  limpiarMensaje();
  cerrarModal();
}

function eliminarProducto(id) {
  const producto = productos.find(item => item.id === id);
  if (!producto || !window.confirm(`¿Quieres eliminar "${producto.nombre}" del inventario?`)) return;

  const productosAnteriores = productos;
  productos = productos.filter(item => item.id !== id);
  if (!guardarProductos()) {
    productos = productosAnteriores;
    return;
  }
  actualizarInterfaz();
  limpiarMensaje();
}

function mostrarMensaje(texto) {
  const mensaje = document.getElementById("app-message");
  if (!mensaje) {
    window.alert(texto);
    return;
  }
  mensaje.textContent = texto;
  mensaje.hidden = false;
}

function limpiarMensaje() {
  const mensaje = document.getElementById("app-message");
  if (mensaje) {
    mensaje.textContent = "";
    mensaje.hidden = true;
  }
}

function inicializarEventos() {
  const form = document.getElementById("product-form");
  document.getElementById("btn-abrir-modal")?.addEventListener("click", () => abrirModal());
  document.getElementById("btn-cerrar-modal")?.addEventListener("click", cerrarModal);
  document.getElementById("btn-cancelar-modal")?.addEventListener("click", cerrarModal);
  form?.addEventListener("submit", guardarProducto);

  document.getElementById("input-busqueda")?.addEventListener("input", filtrarProductos);
  document.getElementById("filtro-categoria")?.addEventListener("change", filtrarProductos);
  document.getElementById("filtro-ciudad")?.addEventListener("change", filtrarProductos);
  document.getElementById("filtro-estado")?.addEventListener("change", filtrarProductos);
  document.getElementById("btn-limpiar-filtros")?.addEventListener("click", limpiarFiltros);
  document.getElementById("btn-validar-dataset")?.addEventListener("click", () => {
    actualizarInterfaz(validarYCorregirProductos(productos));
  });
  document.getElementById("btn-exportar-json")?.addEventListener("click", exportarDatasetJSON);

  document.getElementById("productos-container")?.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.productId);
    if (button.dataset.action === "edit") abrirModal(id);
    if (button.dataset.action === "delete") eliminarProducto(id);
  });

  const modal = document.getElementById("product-modal");
  modal?.addEventListener("click", event => {
    if (event.target === modal) cerrarModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal?.classList.contains("active")) cerrarModal();
  });
}
