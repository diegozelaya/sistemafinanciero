// Función para cargar todos los productos
function cargarProductos() {
    fetch("/obtener_productos")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#tablaProductos tbody");
            tbody.innerHTML = "";
            data.forEach(prod => {
                const row = document.createElement("tr");

                const btnLabel = prod.activo === 1 ? "Dar de baja" : "Activar";
                const btnClass = prod.activo === 1 ? "btn-danger" : "btn-success";

                row.innerHTML = `
                    <td>${prod.id}</td>
                    <td>${prod.nombre}</td>
                    <td>
                        <button class="btn btn-sm btn-warning editar-btn" 
                            data-id="${prod.id}" 
                            data-nombre="${prod.nombre}">Editar </button>
                           
                        <button class="btn btn-sm ${btnClass} toggle-btn" 
                            data-id="${prod.id}" 
                            data-activo="${prod.activo}">${btnLabel}</button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Asignar eventos a los botones toggle
            document.querySelectorAll(".toggle-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.dataset.id;
                    const activo = btn.dataset.activo;
                    const accion = activo == 1 ? "dar de baja" : "activar";

                    Swal.fire({
                        title: `¿Seguro que deseas ${accion} este producto?`,
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, continuar",
                        cancelButtonText: "Cancelar"
                    }).then(result => {
                        if (result.isConfirmed) {
                            fetch(`/toggle_producto/${id}`, { method: "PUT" })
                                .then(res => res.json())
                                .then(resp => {
                                    if (resp.success) {
                                        Swal.fire("✅ Listo", "El estado del producto fue actualizado", "success");
                                        cargarProductos(); // recargar lista
                                    } else {
                                        Swal.fire("⚠️ Error", resp.message, "error");
                                    }
                                })
                                .catch(err => {
                                    console.error("❌ Error:", err);
                                    Swal.fire("❌ Error", "No se pudo actualizar el producto", "error");
                                });
                        }
                    });
                });
            });
        });
}


// Abrir modal para editar
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("editar-btn")) {
        const id = e.target.dataset.id;
        const nombre = e.target.dataset.nombre;


        document.getElementById("productoId").value = id;
        document.getElementById("productoNombre").value = nombre;


        document.getElementById("modalProductoTitle").textContent = "Editar Producto";

        const modal = new bootstrap.Modal(document.getElementById("modalAgregarProducto"));
        modal.show();
    }
});

// Dar de baja
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("baja-btn")) {
        const id = e.target.dataset.id;
        if (!confirm("¿Desea dar de baja este producto?")) return;

        fetch(`/baja_producto/${id}`, { method: "POST" })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    alert("Producto dado de baja correctamente");
                    cargarProductos();
                } else {
                    alert("Error: " + resp.message);
                }
            });
    }
});

// Guardar (Agregar o Editar)
document.getElementById("guardarProducto").addEventListener("click", () => {
    const id = document.getElementById("productoId").value;
    const nombre = document.getElementById("productoNombre").value;


    const payload = { nombre };

    let url = "/agregar_producto";
    let method = "POST";

    if (id) {
        url = `/editar_producto/${id}`;
        method = "PUT";
    }

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                Swal.fire("✅ Producto guardado", "", "success");

                // 🔹 Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById("modalAgregarProducto"));
                if (modal) {
                    modal.hide();
                }

                // 🔹 Quitar backdrop
                document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());

                // 🔹 Recargar
                setTimeout(() => location.reload(), 500);
            } else {
                Swal.fire("⚠️ Error", resp.message, "error");
            }
        })
        .catch(err => {
            console.error("❌ Error:", err);
            Swal.fire("❌ Error", "No se pudo guardar el producto", "error");
        });
});


// Inicializamos la tabla
document.addEventListener("DOMContentLoaded", cargarProductos);
