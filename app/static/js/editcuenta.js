
function formatNumber(value) {
    if (typeof value !== 'string') {
        value = String(value); // Convertir a string si no lo es
    }
    value = value.replace(/[^\d,]/g, ''); // Limpiar el valor eliminando cualquier cosa que no sea número o coma
    let parts = value.split(',');
    let integerPart = parts[0];
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Separadores de miles

    if (parts.length > 1) {
        return integerPart + ',' + parts[1];
    } else {
        return integerPart;
    }
}

// Función para convertir el valor formateado a número sin separadores




document.addEventListener('click', async (e) => {
    const btnVer = e.target.closest('.ver-btncuenta');
    const btnEditar = e.target.closest('.editar-btn');
    const btnAnular = e.target.closest('.anular-btn');

    // 👉 Botón "Ver"
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
            console.log("🔍 Estructura de detallecuota:", data.detallecuota);

            if (Array.isArray(data.cabezamatricula)) {
                const cabeza = data.cabezamatricula[0];
                document.getElementById("infoDescripcion").textContent = cabeza.Descripcion || "";
                document.getElementById("infoProducto").textContent = cabeza.Producto || "";
            }

            if (Array.isArray(data.detallecuota)) {
                data.detallecuota.forEach(item => {
                    const fecha = new Date(item.fechavenc).toISOString().split('T')[0];
                    const [anio, mes, dia] = fecha.split("-");
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${item.nrocuota}</td>
                        <td>${dia}/${mes}/${anio}</td>
                        <td>${formatNumber(item.debito)}</td>
                        <td>${formatNumber(item.credito)}</td>
                        <td>${formatNumber(item.pendiente)}</td>
                    `;
                    tbody.appendChild(row);
                });
            }

            const modalEl = document.getElementById("modalVerDetalle");
            let modalInstance = bootstrap.Modal.getInstance(modalEl);

            if (!modalInstance) {
                modalInstance = new bootstrap.Modal(modalEl);
            }
            modalInstance.show();

        } catch (err) {
            console.error("❌ Error al cargar detalle:", err);
        }
        return;
    }

    // 👉 Botón "Editar"
    if (btnEditar) {
        console.log("✏️ Estoy en editar");
        const idCuenta = btnEditar.dataset.id;
        const modal = new bootstrap.Modal(document.getElementById('modal_editcuenta'));
        modal.show();

        try {
            const res = await fetch(`/obtener_cuenta/${idCuenta}`);
            const data = await res.json();
            console.log("📦 Datos de cuenta a editar:", data);

            // Limpieza previa
            const selectProducto = document.getElementById("editProducto");
            selectProducto.innerHTML = "";

            const cabeza = data.cabezamatricula?.[0];
            if (!cabeza) return console.warn("⚠️ Sin datos de cabeza en la cuenta");

            // 🟢 Cargar descripción
            const inputDescripcion = document.getElementById("editDescripcion");
            inputDescripcion.value = cabeza.Descripcion || "";




            // 🟢 Cargar productos
            const tbody = document.getElementById("tablaDetalleCuentaedit");
            tbody.innerHTML = "";
            const resProd = await fetch('/obtener_productosedit');
            const productos = await resProd.json();

            productos.forEach(producto => {
                const option = document.createElement("option");
                option.value = producto.id;
                option.textContent = producto.descripcion;
                if (producto.descripcion === cabeza.Producto) option.selected = true;
                selectProducto.appendChild(option);
            });

            // 🟢 Cargar las cuotas
            data.detallecuota.forEach(item => {
                let fechaprovisoria = new Date(item.fechavenc);
                let fecha = fechaprovisoria.toISOString().split('T')[0];
                let fechalimpia = convertirAFormatoDDMMYYYY(fecha);

                const row = document.createElement('tr');

                if (item.credito == 0) {
                    row.innerHTML = `
                    <td>${item.nrocuota}</td>
                    <td>
                        <input type="date" class="form-control form-control-sm edit-fecha" 
                            value="${fecha}" data-id="${cabeza.idcuentaasociado}">
                    </td>
                    <td>
                        <input type="number" class="form-control form-control-sm edit-debito" 
                            value="${item.debito}" min="0" step="1000" data-id="${item.idcuentaasodet}">
                    </td>
                    <td>${item.credito}</td>`;
                } else {
                    row.innerHTML = `
                    <td>${item.nrocuota}</td>
                    <td>${fechalimpia}</td>
                    <td>${item.debito}</td>
                    <td>${item.credito}</td>`;
                }

                tbody.appendChild(row);
            });

        } catch (err) {
            console.error("❌ Error cargando cuenta para edición:", err);
        }
        return;
    }

    // 👉 Botón "Anular"
    if (btnAnular) {
        const idcuentaasociado = btnAnular.dataset.id;
        console.log("🗑 ID para anular:", idcuentaasociado);

        if (!confirm('¿Estás seguro de que deseas desactivar esta Cuenta?')) return;
        const res = await fetch(`/desactivar_cuenta/${idcuentaasociado}`, { method: 'POST' });
        const resultado = await res.json();

        if (resultado.ok) {
            btnAnular.classList.add('disabled', 'btn-secondary');
            btnAnular.classList.remove('btn-danger');
            btnAnular.textContent = 'Cuenta Desactivada';
        } else {
            alert('Error al anular: ' + resultado.error);
        }
        return;
    }
});

function convertirAFormatoDDMMYYYY(fechaISO) {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia}/${mes}/${anio}`;
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
            <td>${formatNumber(f.monto_total)}</td>
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
        // 🔹 Agregar fila final con el botón de "Agregar nueva cuenta"
        const trAgregar = document.createElement("tr");
        trAgregar.innerHTML = `
        <td colspan="7" class="text-left">
            <button id="btnNuevaCuenta" class="btn btn-success btn-sm">
                Agregar nueva cuenta
            </button>
        </td>
    `;
        tbody.appendChild(trAgregar);

        // 🟢 Evento: abrir modal desde botón “Agregar nueva cuenta”
        document.addEventListener("click", async (e) => {
            if (e.target && e.target.id === "btnNuevaCuenta") {
                console.log("🟢 Abriendo modal de nueva cuenta");

                const modal = new bootstrap.Modal(document.getElementById("modal_nuevacuenta"));
                modal.show();

                // Limpiar campos
                document.getElementById("nuevaDescripcion").value = "";
                document.querySelector("#tablaCuotasNuevaCuenta tbody").innerHTML = "";

                // Cargar productos en el select
                const selectProd = document.getElementById("nuevoProducto");
                selectProd.innerHTML = "";
                try {
                    const res = await fetch("/obtener_productosedit");
                    const productos = await res.json();

                    productos.forEach(p => {
                        const option = document.createElement("option");
                        option.value = p.id;
                        option.textContent = p.descripcion;
                        selectProd.appendChild(option);
                    });
                } catch (err) {
                    console.error("❌ Error al cargar productos:", err);
                }
            }
        });

        // 🟢 Evento: agregar nueva fila de cuota
        document.getElementById("btnAgregarCuota").addEventListener("click", () => {
            const tbody = document.querySelector("#tablaCuotasNuevaCuenta tbody");
            const nro = tbody.children.length + 1;

            const row = document.createElement("tr");
            row.innerHTML = `
    <td>${nro}</td>
    <td><input type="date" class="form-control form-control-sm fecha-cuota"></td>
    <td><input type="number"  id="debitoCuota" class="form-control form-control-sm debito-cuota" min="0" step="1000"></td>
    <td><button class="btn btn-sm btn-danger eliminar-cuota">🗑</button></td>
  `;
            tbody.appendChild(row);
        });

        // 🟢 Evento: eliminar una fila de cuota
        document.addEventListener("click", (e) => {
            if (e.target && e.target.classList.contains("eliminar-cuota")) {
                e.target.closest("tr").remove();
            }
        });

        // 🟢 Evento: guardar nueva cuenta
        document.getElementById("guardarNuevaCuenta").addEventListener("click", async () => {
            const producto = document.getElementById("nuevoProducto").value;
            const descripcion = document.getElementById("nuevaDescripcion").value.trim();
            const idasociado = document.getElementById("idasociado").value;


            const cuotas = [];
            document.querySelectorAll("#tablaCuotasNuevaCuenta tbody tr").forEach((row, i) => {
                const fecha = row.querySelector(".fecha-cuota").value;
                const debito = row.querySelector(".debito-cuota").value;
                if (fecha && debito) {
                    cuotas.push({ nro: i + 1, fecha, debito });
                }
            });

            const datos = { producto, descripcion, cuotas };
            console.log("📤 Enviando nueva cuenta:", datos);

            try {
                const res = await fetch("/crear_cuenta", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datos)
                });
                const resp = await res.json();

                if (resp.success) {
                    new bootstrap.Toast(document.getElementById("toastSuccess")).show();

                    // Simular click en el botón con data-bs-dismiss
                    document.getElementById("closeModalHidden").click();

                    setTimeout(() => location.reload(), 1500);
                }




                else {
                    alert("⚠️ Error: " + resp.message);
                }
            } catch (err) {
                console.error("❌ Error al guardar nueva cuenta:", err);
            }
        });


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






    document.getElementById("guardarCambiosCuenta").addEventListener("click", () => {
        const Producto = document.getElementById("editProducto").value;
        const Descripcion = document.getElementById("editDescripcion").value;


        const cuotas = [];
        let idcuentaasociado = null;

        document.querySelectorAll("#tablaDetalleCuentaedit tr").forEach(row => {
            const fechaInput = row.querySelector(".edit-fecha");
            const debitoInput = row.querySelector(".edit-debito");

            if (fechaInput && debitoInput) {
                if (!idcuentaasociado) idcuentaasociado = fechaInput.dataset.id;

                cuotas.push({
                    iddetalle: debitoInput.dataset.id,
                    nuevaFecha: fechaInput.value,
                    nuevoDebito: debitoInput.value
                });
            }
        });

        const datos = {
            idcuentaso: idcuentaasociado,
            Product: Producto,
            descripcion: Descripcion,
            cuotas: cuotas
        };

        console.log("📤 Enviando al backend:", datos);

        fetch("/actualizar_cuenta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    alert("✅ Cuenta actualizada correctamente");
                    const modal = bootstrap.Modal.getInstance(document.getElementById("modal_editcuenta"));
                    modal.hide();
                    setTimeout(() => location.reload(), 200);
                } else {
                    alert("⚠️ Error: " + resp.message);
                }
            })
            .catch(err => console.error("❌ Error en el fetch:", err));
    });


    document.getElementById("guardarNuevaCuenta").addEventListener("click", async () => {
        const idAsociado = document.getElementById("alumnocuenta").value;
        const producto = document.getElementById("nuevoProducto").value;
        const descripcion = document.getElementById("nuevaDescripcion").value;


        // Recolectar cuotas
        const cuotas = [];
        document.querySelectorAll("#tablaCuotasNuevaCuenta tbody tr").forEach((row, index) => {
            const fecha = row.querySelector(".fecha-cuota").value;
            const debito = row.querySelector(".debito-cuota").value;

            if (fecha && debito) {
                cuotas.push({
                    nrocuota: index + 1,
                    fechavenc: fecha,
                    debito: debito
                });
            }
        });

        if (cuotas.length === 0) {
            alert("⚠️ Debes agregar al menos una cuota antes de guardar.");
            return;
        }

        const datos = {
            idasociado: idAsociado,
            producto: producto,
            descripcion: descripcion,

            cuotas: cuotas
        };

        console.log("📤 Enviando nueva cuenta:", datos);

        const res = await fetch("/crear_cuenta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        const resp = await res.json();
        if (resp.success) {
            // Mostrar toast (asegúrate de tener el HTML del toast en la página)
            new bootstrap.Toast(document.getElementById("toastSuccess")).show();

            // Forzar cierre del modal
            const modalElement = document.getElementById("modal_nuevacuenta");
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
            modal.hide();

            // Recargar después de un pequeño delay
            setTimeout(() => location.reload(), 1500);
        }



        else {
            alert("⚠️ Error: " + resp.message);
        }
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









});

