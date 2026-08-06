// Cuando se abre el modal de agregar timbrado



function formatearFecha(fechaStr) {
    if (!fechaStr) return "";
    const fecha = new Date(fechaStr);
    // Devuelve YYYY-MM-DD
    return fecha.toISOString().split("T")[0];
}


// Función para cargar todos los timbrados
function cargartimbrados() {
    fetch("/obtener_timbrados")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#tablaTimbrados tbody");
            tbody.innerHTML = "";
            data.forEach(tim => {
                const row = document.createElement("tr");

                const btnLabel = tim.activo === 1 ? "Dar de baja" : "Activar";
                const btnClass = tim.activo === 1 ? "btn-danger" : "btn-success";
                const estado = tim.activo === 1 ? "Activo" : "Inactivo";

                row.innerHTML = `
                    <td>${tim.id}</td>
                    <td>${tim.nrotimbrado}</td>
                    <td>${tim.establecimiento}</td>
                    <td>${tim.puntoemision}</td>
                    <td>${formatearFecha(tim.fechadesde)}</td>
                    <td>${formatearFecha(tim.fechahasta)}</td>
                    <td>${tim.numerodesde}</td>
                    <td>${tim.numerohasta}</td>
                    <td>${estado}</td>
                    <td>
                        <button class="btn btn-sm btn-warning editar-btn" 
                            data-id="${tim.id}" 
                            data-nrotimbrado="${tim.nrotimbrado}"
                            data-establecimiento="${tim.establecimiento}"
                            data-emision="${tim.puntoemision}"
                            data-desde="${tim.fechadesde}"
                            data-hasta="${tim.fechahasta}"
                            data-numerodesde="${tim.numerodesde}"
                            data-numerohasta="${tim.numerohasta}">
                            Editar
                        </button>

                        
                        <button class="btn btn-sm ${btnClass} toggle-btn" 
                            data-id="${tim.id}" 
                            data-activo="${tim.activo}">${btnLabel}</button>
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
                        title: `¿Seguro que deseas ${accion} este timbrado?`,
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sí, continuar",
                        cancelButtonText: "Cancelar"
                    }).then(result => {
                        if (result.isConfirmed) {
                            fetch(`/toggle_timbrado/${id}`, { method: "PUT" })
                                .then(res => res.json())
                                .then(resp => {
                                    if (resp.success) {
                                        Swal.fire("✅ Listo", "El estado del timbrado fue actualizado", "success");
                                        cargartimbrados(); // recargar lista
                                    } else {
                                        Swal.fire("⚠️ Error", resp.message, "error");
                                    }
                                })
                                .catch(err => {
                                    console.error("❌ Error:", err);
                                    Swal.fire("❌ Error", "No se pudo actualizar el timbrado", "error");
                                });
                        }
                    });
                });
            });
        })

        .catch(err => {
            console.error("❌ Error cargando timbrados:", err);
        });



}

// Abrir modal para editar
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("editar-btn")) {
        const id = e.target.dataset.id;
        const nrotimbrado = e.target.dataset.nrotimbrado;
        const establecimiento = e.target.dataset.establecimiento;
        const emision = e.target.dataset.emision;
        const desde = e.target.dataset.desde;
        const hasta = e.target.dataset.hasta;
        const numerodesde = e.target.dataset.numerodesde;
        const numerohasta = e.target.dataset.numerohasta;

        // Pasar valores a los inputs del modal
        document.getElementById("timbradoId").value = id;
        document.getElementById("timbradonroinput").value = nrotimbrado;
        document.getElementById("establecimiento").value = establecimiento;
        document.getElementById("emision").value = emision;
        document.getElementById("desde").value = formatearFecha(desde); // formatear fecha
        document.getElementById("hasta").value = formatearFecha(hasta); // formatear fecha
        document.getElementById("nrodesde").value = numerodesde;
        document.getElementById("nrohasta").value = numerohasta;

        document.getElementById("modalTimbradoTitle").textContent = "Editar Timbrado";

        const modal = new bootstrap.Modal(document.getElementById("modalAgregarTimbrado"));
        modal.show();
    }
});


// Guardar (Agregar o Editar)
document.getElementById("guardartimbrado").addEventListener("click", () => {
    const id = document.getElementById("timbradoId").value;
    const nrotimbrado = document.getElementById("timbradonroinput").value;
    const establecimiento = document.getElementById("establecimiento").value;
    const emision = document.getElementById("emision").value;
    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;

    const payload = { nrotimbrado, establecimiento, emision, desde, hasta };

    let url = "/agregar_timbrado";
    let method = "POST";

    if (id) {
        url = `/editar_timbrado/${id}`;
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
                Swal.fire("✅ Timbrado guardado", "", "success");

                const modal = bootstrap.Modal.getInstance(document.getElementById("modalAgregarTimbrado"));
                if (modal) modal.hide();
                document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());

                cargartimbrados(); // recargar lista sin refrescar toda la página
            } else {
                Swal.fire("⚠️ Error", resp.message, "error");
            }
        })
        .catch(err => {
            console.error("❌ Error:", err);
            Swal.fire("❌ Error", "No se pudo guardar el timbrado", "error");
        });
});

// Inicializamos la tabla
document.addEventListener("DOMContentLoaded", cargartimbrados);


document.getElementById("modalAgregarTimbrado").addEventListener("hidden.bs.modal", () => {
    // Limpiar todos los campos
    document.getElementById("timbradoId").value = "";
    document.getElementById("timbradonroinput").value = "";
    document.getElementById("establecimiento").value = "";
    document.getElementById("emision").value = "";
    document.getElementById("desde").value = "";
    document.getElementById("hasta").value = "";
    document.getElementById("nrodesde").value = "";
    document.getElementById("nrohasta").value = "";

    // Volver el título a "Agregar Timbrado"
    document.getElementById("modalTimbradoTitle").textContent = "Agregar Timbrado";
});

