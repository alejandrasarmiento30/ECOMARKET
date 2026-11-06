/**
 * Lógica Principal de la Aplicación - EcoMarket Dashboard
 * Incluye: Carga de datos, Renderizado en tarjetas, KPIs, Filtros, CRUD y LocalStorage
 */

let productos = [];
let editandoId = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    inicializarEventos();
});

// 1. Cargar productos (localStorage o dataset inicial)
function cargarProductos() {
    const datosGuardados = localStorage.getItem("ecomarket_productos");
    if (datosGuardados !== null) {
        try {
            const productosGuardados = JSON.parse(datosGuardados);
            if (!Array.isArray(productosGuardados)) {
                throw new TypeError("Los productos guardados no tienen un formato válido.");
            }
            productos = productosGuardados;
        } catch (e) {
            console.error("Error al parsear localStorage:", e);
            productos = productosEcoMarket.map(producto => ({ ...producto }));
            guardarProductos();
        }
    } else {
        productos = productosEcoMarket.map(producto => ({ ...producto }));
        guardarProductos();
    }
    inicializarApp();
}

// 2. Guardar en localStorage
function guardarProductos() {
    localStorage.setItem("ecomarket_productos", JSON.stringify(productos));
}

function inicializarApp() {
    poblarFiltrosSelects();
    renderizarProductos(productos);
    actualizarKPIs();
}

// 3. Calcular Estado dinámico
function calcularEstado(stock, stockMinimo) {
    if (stock === 0) return { texto: "Agotado", clase: "agotado" };
    if (stock <= stockMinimo) return { texto: "Stock bajo", clase: "stock-bajo" };
    return { texto: "Disponible", clase: "disponible" };
}

// 4. Renderizar Productos como Tarjetas (Cards)
function renderizarProductos(lista) {
    const container = document.getElementById("productos-container");
    if (!container) return;

    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<p class="empty-message">No se encontraron productos que coincidan con los filtros.</p>`;
        return;
    }

    lista.forEach(prod => {
        const estado = calcularEstado(prod.stock, prod.stockMinimo);
        const card = document.createElement("article");
        card.className = "product-card";
        
        card.innerHTML = `
            <div class="card-header">
                <span class="badge ${estado.clase}">${estado.texto}</span>
                <span class="card-id">#${prod.id}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${prod.nombre}</h3>
                <p class="card-category">📁 ${prod.categoria}</p>
                <p class="card-location">📍 ${prod.ciudad}</p>
                <p class="card-price">$${prod.precio.toLocaleString("es-CO")} <span class="currency">COP</span></p>
                <div class="card-meta">
                    <span>Stock: <strong>${prod.stock}</strong> (Mín: ${prod.stockMinimo})</span>
                    <span>Productor: <em>${prod.productor}</em></span>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-edit" onclick="abrirModal(${prod.id})">✏️ Editar</button>
                <button class="btn-delete" onclick="eliminarProducto(${prod.id})">🗑️ Eliminar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 5. Actualizar KPIs
function actualizarKPIs() {
    const totalRegistrados = productos.length;
    const inventarioBajo = productos.filter(p => p.stock <= p.stockMinimo).length;
    const valorInventario = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);

    const elRegistrados = document.getElementById("kpi-registrados");
    const elBajo = document.getElementById("kpi-bajo");
    const elValor = document.getElementById("kpi-valor");

    if (elRegistrados) elRegistrados.textContent = totalRegistrados;
    if (elBajo) elBajo.textContent = inventarioBajo;
    if (elValor) elValor.textContent = `$${valorInventario.toLocaleString("es-CO")}`;
}

// 6. Búsqueda y Filtros Combinados
function poblarFiltrosSelects() {
    const selectCat = document.getElementById("filtro-categoria");
    const selectCiudad = document.getElementById("filtro-ciudad");
    
    if (!selectCat || !selectCiudad) return;

    const categorias = [...new Set(productos.map(p => p.categoria))];
    const ciudades = [...new Set(productos.map(p => p.ciudad))];

    selectCat.innerHTML = `<option value="">Todas las categorías</option>` + categorias.map(c => `<option value="${c}">${c}</option>`).join("");
    selectCiudad.innerHTML = `<option value="">Todas las ciudades</option>` + ciudades.map(c => `<option value="${c}">${c}</option>`).join("");
}

function filtrarProductos() {
    const texto = document.getElementById("input-busqueda").value.toLowerCase();
    const cat = document.getElementById("filtro-categoria").value;
    const ciudad = document.getElementById("filtro-ciudad").value;
    const estadoFiltro = document.getElementById("filtro-estado").value;

    const filtrados = productos.filter(p => {
        const coincideTexto = p.nombre.toLowerCase().includes(texto) || p.productor.toLowerCase().includes(texto);
        const coincideCat = cat === "" || p.categoria === cat;
        const coincideCiudad = ciudad === "" || p.ciudad === ciudad;
        
        const estadoObj = calcularEstado(p.stock, p.stockMinimo);
        const coincideEstado = estadoFiltro === "" || estadoObj.texto.toLowerCase().replace(" ", "-") === estadoFiltro;

        return coincideTexto && coincideCat && coincideCiudad && coincideEstado;
    });

    renderizarProductos(filtrados);
}

function limpiarFiltros() {
    document.getElementById("input-busqueda").value = "";
    document.getElementById("filtro-categoria").value = "";
    document.getElementById("filtro-ciudad").value = "";
    document.getElementById("filtro-estado").value = "";
    renderizarProductos(productos);
}

// 7. Operaciones CRUD (Modal, Crear, Actualizar, Eliminar)
function abrirModal(id = null) {
    const modal = document.getElementById("product-modal");
    const form = document.getElementById("product-form");
    const title = document.getElementById("modal-title");
    
    form.reset();
    editandoId = id;

    if (id !== null) {
        title.textContent = "Editar Producto";
        const prod = productos.find(p => p.id === id);
        if (prod) {
            document.getElementById("nombre").value = prod.nombre;
            document.getElementById("categoria").value = prod.categoria;
            document.getElementById("precio").value = prod.precio;
            document.getElementById("stock").value = prod.stock;
            document.getElementById("stockMinimo").value = prod.stockMinimo;
            document.getElementById("productor").value = prod.productor;
            document.getElementById("ciudad").value = prod.ciudad;
            document.getElementById("organico").checked = prod.organico;
            document.getElementById("activo").checked = prod.activo;
        }
    } else {
        title.textContent = "Agregar Nuevo Producto";
    }

    modal.style.display = "flex";
}

function cerrarModal() {
    document.getElementById("product-modal").style.display = "none";
}

function guardarProducto(e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const categoria = document.getElementById("categoria").value;
    const precio = Number(document.getElementById("precio").value);
    const stock = Number(document.getElementById("stock").value);
    const stockMinimo = Number(document.getElementById("stockMinimo").value);
    const productor = document.getElementById("productor").value.trim();
    const ciudad = document.getElementById("ciudad").value;
    const organico = document.getElementById("organico").checked;
    const activo = document.getElementById("activo").checked;

    if (!nombre || !categoria || isNaN(precio) || isNaN(stock) || isNaN(stockMinimo) || !productor || !ciudad) {
        alert("Por favor completa todos los campos obligatorios correctamente.");
        return;
    }

    if (editandoId !== null) {
        // Actualizar
        productos = productos.map(p => p.id === editandoId ? {
            ...p,
            nombre, categoria, precio, stock, stockMinimo, productor, ciudad, organico, activo
        } : p);
    } else {
        // Crear nuevo
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        const nuevoProd = {
            id: nuevoId,
            nombre,
            categoria,
            precio,
            stock,
            stockMinimo,
            productor,
            ciudad,
            organico,
            fechaRegistro: new Date().toISOString().split('T')[0],
            activo
        };
        productos.push(nuevoProd);
    }

    guardarProductos();
    renderizarProductos(productos);
    actualizarKPIs();
    poblarFiltrosSelects();
    cerrarModal();
}

function eliminarProducto(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este producto del inventario?")) {
        productos = productos.filter(p => p.id !== id);
        guardarProductos();
        renderizarProductos(productos);
        actualizarKPIs();
        poblarFiltrosSelects();
    }
}

// Inicializar escuchadores de eventos
function inicializarEventos() {
    const btnAbrir = document.getElementById("btn-abrir-modal");
    const btnCerrar = document.getElementById("btn-cerrar-modal");
    const form = document.getElementById("product-form");
    
    if (btnAbrir) btnAbrir.addEventListener("click", () => abrirModal(null));
    if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
    if (form) form.addEventListener("submit", guardarProducto);

    // Filtros en tiempo real
    const inputBusqueda = document.getElementById("input-busqueda");
    const filtroCat = document.getElementById("filtro-categoria");
    const filtroCiudad = document.getElementById("filtro-ciudad");
    const filtroEstado = document.getElementById("filtro-estado");
    const btnLimpiar = document.getElementById("btn-limpiar-filtros");

    if (inputBusqueda) inputBusqueda.addEventListener("input", filtrarProductos);
    if (filtroCat) filtroCat.addEventListener("change", filtrarProductos);
    if (filtroCiudad) filtroCiudad.addEventListener("change", filtrarProductos);
    if (filtroEstado) filtroEstado.addEventListener("change", filtrarProductos);
    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarFiltros);

    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const navLinks = document.querySelectorAll(".nav-link");

    const cerrarMenu = () => {
        if (!sidebar || !sidebarOverlay || !menuToggle) return;
        sidebar.classList.remove("active");
        sidebarOverlay.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menú de navegación");
    };

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener("click", () => {
            const estaAbierto = sidebar.classList.toggle("active");
            sidebarOverlay.classList.toggle("active", estaAbierto);
            menuToggle.setAttribute("aria-expanded", String(estaAbierto));
            menuToggle.setAttribute(
                "aria-label",
                estaAbierto ? "Cerrar menú de navegación" : "Abrir menú de navegación"
            );
        });
        sidebarOverlay.addEventListener("click", cerrarMenu);
        navLinks.forEach(link => link.addEventListener("click", cerrarMenu));
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") cerrarMenu();
        });
    }
}