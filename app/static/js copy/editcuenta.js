
// 🔹 Listener robusto para el botón "Ver" dentro de la tabla de cuentas
const tablaEl = document.getElementById("tablacuentas");
if (!tablaEl) {
    console.error("❌ No se encontró #tablacuentas en el DOM");
} else {
    console.log("✅ Listener de tablacuentas se va a adjuntar");
    tablaEl.addEventListener("click", async function (e) {
        try {
            // Evitar errores si el target no es un elemento
            let clicked = e.target;
            if (clicked && clicked.nodeType === Node.TEXT_NODE) clicked = clicked.parentElement;

            const btnVer = clicked ? clicked.closest(".ver-btncuenta") : null;
            console.log("click detectado. e.target:", e.target, "resolved clicked:", clicked, "btnVer:", btnVer);

            if (!btnVer) return;

            const id_cuenta = btnVer.getAttribute("data-id") || btnVer.dataset.id;
            console.log("📌 id_cuenta detectado:", id_cuenta);

            const response = await fetch(`/obtener_cuenta/${id_cuenta}`);
            if (!response.ok) {
                console.error("⚠️ fetch devolvió status", response.status);
                throw new Error("Error al obtener la cuenta");
            }
            const data = await response.json();
            console.log("📦 Datos recibidos:", data);

            const tbody = document.getElementById('tablaDetalleCuentaVer');
            if (!tbody) {
                console.warn("⚠️ No se encontró #tablaDetalleCuentaVer en el DOM");
                return;
            }

            tbody.innerHTML = "";

            // Cabeza
            if (Array.isArray(data.cabezamatricula)) {
                data.cabezamatricula.forEach(cabeza => {
                    const elDesc = document.getElementById("infoDescripcion");
                    const elProd = document.getElementById("infoProducto");
                    if (elDesc) elDesc.textContent = cabeza.Descripcion || "";
                    if (elProd) elProd.textContent = cabeza.Producto || "";
                });
            } else {
                console.warn("Formato inesperado en data.cabezamatricula:", data.cabezamatricula);
            }

            // Detalle
            if (Array.isArray(data.detallecuota)) {
                data.detallecuota.forEach(item => {
                    const fechaISO = item.fechavencimiento || item.fechavenc || null;
                    let fechalimpia = "";
                    if (fechaISO) {
                        const d = new Date(fechaISO);
                        if (!isNaN(d)) {
                            const [y, m, dd] = d.toISOString().split('T')[0].split('-');
                            fechalimpia = `${dd}/${m}/${y}`;
                        }
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.nrocuota ?? ''}</td>
                        <td>${fechalimpia}</td>
                        <td>${item.debito ?? ''}</td>
                        <td>${item.credito ?? ''}</td>
                        <td>${item.pendiente ?? ''}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                console.warn("Formato inesperado en data.detallecuota:", data.detallecuota);
            }

            // Mostrar modal
            const modalEl = document.getElementById('modalVerDetalle');
            if (!modalEl) {
                console.error("❌ No se encontró #modalVerDetalle en el DOM");
                return;
            }
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

        } catch (err) {
            console.error("❌ Error en handler ver-btncuenta:", err);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 Fin del JS alcanzado correctamente");
    //limpiar formulario
    const btnLimpiar = document.getElementById("btnLimpiar");
    const formulario = document.getElementById("filtrocuentas");
    const tabla = document.getElementById("tablacuentas");

    $('#alumnocuenta').select2({
        placeholder: 'Seleccione o busque un alumno',
        ajax: {
            url: '/buscar_alumnocuenta',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term || ""   // si no hay término
                };
            },
            processResults: function (data) {
                console.log("📌 Data recibida:", data);
                return {
                    results: data.map(alumno => ({
                        id: alumno.id,       // Flask devuelve 'id'
                        text: alumno.nombre, // texto que se muestra
                        ci: alumno.ci        // si querés usarlo más adelante
                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 2
    });


    btnLimpiar.addEventListener("click", function () {
        // Limpiar todos los campos del formulario
        formulario.reset();

        // Limpiar Select2 si estás usando Select2

        if ($('#alumnocuenta').hasClass("select2-hidden-accessible")) {
            $('#alumnocuenta').val(null).trigger('change');
        }

        // Vaciar la tabla de resultados
        tabla.innerHTML = "";
    });





    document.getElementById("filtrocuentas").addEventListener("submit", function (e) {
        e.preventDefault();

        const datos = {
            alumno: document.getElementById("alumnocuenta").value
        };
        console.log("Datos enviados:", datos);

        fetch("/buscar_cuenta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(data => cargarTabla(data))
            .catch(err => console.error("Error:", err));
    });


    
    // Cargar datos en la tabla
    function cargarTabla(cuenta) {
        console.log("estoy cargando tabla");

        const tbody = document.getElementById("tablacuentas");
        tbody.innerHTML = "";

        cuenta.forEach(f => {


            const tr = document.createElement("tr");





            // Botón de anulación según estado
            const botonDesactivar = f.activo === 1
                ? `<button class="btn btn-sm btn-danger anular-btn" data-id="${f.idcuentaasociado}">🗑 Desactivar</button>`
                : `<button class="btn btn-sm btn-secondary" disabled>Cuenta Desactivada</button>`;

            // Botón de edición según estado
            const botonEditar = f.activo === 1
                ? `<button class="btn btn-sm btn-warning editar-btn" data-id="${f.idcuentaasociado}">✏ Editar</button>`
                : `<button class="btn btn-sm btn-warning" disabled>✏ Editar</button>`;

            tr.innerHTML = `
            <td>${f.nombre}</td>
            <td>${f.monto_total}</td>
            <td>${f.anolectivo}</td>
            <td>${f.curso}</td>
            <td>${f.cuenta}</td>
            <td>${f.activo === 1 ? 'Activo' : 'Inactivo'}</td>
            <td>
                <button class="btn btn-sm btn-info ver-btncuenta" data-id="${f.idcuentaasociado}">👁 Ver</button>
                ${botonEditar}
                ${botonDesactivar}
                
            </td>
        `;
            tbody.appendChild(tr);
        });


    }

    // Guardar cambios en modal
    document.querySelector("#modaleditcuenta .btn-primary").addEventListener("click", function () {
        const id = document.getElementById("modaleditcuenta").dataset.id;
        const datos = {
            cliente: document.getElementById("editCliente").value,
            monto: document.getElementById("editMonto").value
        };

        fetch(`/editar_factura/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    alert("Factura actualizada.");
                    bootstrap.Modal.getInstance(document.getElementById("modalEditarFactura")).hide();
                    document.getElementById("filtroFacturas").dispatchEvent(new Event("submit"));
                } else {
                    alert("Error al actualizar.");
                }
            });
    });








    function convertirAFormatoDDMMYYYY(fechaISO) {
        const [anio, mes, dia] = fechaISO.split('-');
        return `${dia}/${mes}/${anio}`;
    }








    function verDetalleVenta(idVenta) {
        fetch(`/obtener_venta/${idVenta}`)
            .then(response => response.json())
            .then(data => {
                // Limpiar contenido anterior
                const tbody = document.getElementById('tablaDetalleVenta');
                const listaCobros = document.getElementById('listaCobros');
                tbody.innerHTML = '';
                listaCobros.innerHTML = '';

                let total = 0;

                // Cargar detalles de productos
                data.detalles.forEach(item => {
                    const row = document.createElement('tr');
                    const subtotal = item.cantidad * item.precio_unitario;
                    total += subtotal;

                    row.innerHTML = `
                    <td>${item.descripcion}</td>
                    <td>${item.cantidad}</td>
                    <td>${item.precio_unitario.toFixed(2)}</td>
                    <td>${subtotal.toFixed(2)}</td>
                    `;
                    tbody.appendChild(row);
                });

                document.getElementById('totalVenta').textContent = total.toFixed(2);

                // Cargar formas de cobro
                data.cobros.forEach(cobro => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = `${cobro.forma_pago} - ${cobro.monto.toFixed(2)}`;
                    listaCobros.appendChild(li);
                });

                // Mostrar el modal
                const modal = new bootstrap.Modal(document.getElementById('modalVerDetalle'));
                modal.show();
            })
            .catch(error => {
                console.error('Error al cargar la venta:', error);
            });
    }



    document.getElementById("guardarCambiosMatricula").addEventListener("click", () => {
        console.log("Estoy en el bton guardars");
        // Recolectar selects principales
        const anoLectivo = document.getElementById("editAnoLectivo").value;
        const curso = document.getElementById("editCurso").value;

        const cuotas = [];
        let idmatricula = null;  // lo sacamos de cualquier edit-fecha

        // 🔹 Recorremos todas las filas
        document.querySelectorAll("#tablaDetalleMatriculaedit tr").forEach(row => {
            const fechaInput = row.querySelector(".edit-fecha");
            const debitoInput = row.querySelector(".edit-debito");

            if (fechaInput && debitoInput) {
                // Solo necesito leer el idmatricula 1 vez (todas las filas tienen el mismo)
                if (!idmatricula) {
                    idmatricula = fechaInput.dataset.id;
                }

                cuotas.push({
                    iddetalle: debitoInput.dataset.id,   // id único de la cuota
                    nuevaFecha: fechaInput.value,
                    nuevoDebito: debitoInput.value
                });
            }
        });

        // 🔹 Objeto final para enviar
        const datos = {
            idMatricula: idmatricula,
            anoLectivo: anoLectivo,
            curso: curso,
            cuotas: cuotas
        };

        console.log("📤 Enviando al backend:", datos);
        fetch("/actualizar_matricula", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    alert("✅ Matrícula actualizada correctamente");
                    // Opcional: cerrar modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById("modal_editcuenta"));
                    modal.hide();

                    setTimeout(() => {
                        location.reload();
                    }, 100); // espera 100 ms para cerrar el modal antes de recargar
                } else {
                    alert("⚠️ Error: " + resp.message);
                }
            })
            .catch(err => console.error("❌ Error en el fetch:", err));

    });


    function cargarTablaMatriculas() {
        fetch("/obtener_matriculas")
            .then(res => res.json())
            .then(data => {
                const tbody = document.querySelector("#tablaMatriculas tbody");
                tbody.innerHTML = "";
                data.forEach(m => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                    <td>${m.idmatricula}</td>
                    <td>${m.alumno}</td>
                    <td>${m.anolectivo}</td>
                    <td>${m.grado}</td>
                    <td>
                        <button class="editar-btn" data-id="${m.idmatricula}">Editar</button>
                    </td>
                `;
                    tbody.appendChild(row);
                });
            });
    }






    document.addEventListener('click', async (e) => {
        const btnVer = e.target.closest('.ver-btncuenta');
        const btnEditar = e.target.closest('.editar-btn');
        const btnAnular = e.target.closest('.anular-btn');

        // 👉 Click en "Ver"
        if (btnVer) {
            console.log("✅ Click detectado en botón Ver:", btnVer);
            const id_cuenta = btnVer.dataset.id;
            try {
                const response = await fetch(`/obtener_cuenta/${id_cuenta}`);
                if (!response.ok) throw new Error("Error al obtener la cuenta");
                const data = await response.json();
                console.log("📦 Datos recibidos:", data);

                const tbody = document.getElementById("tablaDetalleCuentaVer");
                tbody.innerHTML = "";

                if (Array.isArray(data.cabezamatricula)) {
                    const cabeza = data.cabezamatricula[0];
                    document.getElementById("infoDescripcion").textContent = cabeza.descripcion || "";
                    document.getElementById("infoProducto").textContent = cabeza.nomproducto || "";
                }

                if (Array.isArray(data.detallecuota)) {
                    data.detallecuota.forEach(item => {
                        const fecha = new Date(item.fechavencimiento).toISOString().split('T')[0];
                        const [anio, mes, dia] = fecha.split("-");
                        const row = document.createElement("tr");
                        row.innerHTML = `
                        <td>${item.nrocuota}</td>
                        <td>${dia}/${mes}/${anio}</td>
                        <td>${item.debito}</td>
                        <td>${item.credito}</td>
                        <td>${item.pendiente}</td>
                    `;
                        tbody.appendChild(row);
                    });
                }

                const modal = new bootstrap.Modal(document.getElementById("modalVerDetalle"));
                modal.show();
            } catch (err) {
                console.error("❌ Error al cargar detalle:", err);
            }
            return; // evita que los otros botones procesen este click
        }

        // 👉 Click en "Editar"
        if (btnEditar) {
            console.log("✏️ Estoy en editar");
            const idCuenta = btnEditar.dataset.id;
            const modal = new bootstrap.Modal(document.getElementById('modal_editcuenta'));
            modal.show();

            try {
                const res = await fetch(`/obtener_cuenta/${idCuenta}`);
                const data = await res.json();
                console.log("📦 Datos de cuenta a editar:", data);

                // ... tu lógica de carga de selects y tabla acá ...

            } catch (err) {
                console.error("❌ Error cargando cuenta:", err);
            }
            return;
        }

        // 👉 Click en "Anular"
        if (btnAnular) {
            const idmatricula = btnAnular.dataset.id;
            console.log("🗑 ID para anular:", idmatricula);

            if (!confirm('¿Estás seguro de que deseas desactivar esta matrícula?')) return;
            const res = await fetch(`/desactivar_mat/${idmatricula}`, { method: 'POST' });
            const resultado = await res.json();

            if (resultado.ok) {
                btnAnular.classList.add('disabled', 'btn-secondary');
                btnAnular.classList.remove('btn-danger');
                btnAnular.textContent = 'Matrícula Desactivada';
            } else {
                alert('Error al anular: ' + resultado.error);
            }
            return;
        }
    });



});

