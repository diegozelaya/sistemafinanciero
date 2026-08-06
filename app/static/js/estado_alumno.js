// par sacar el estado de cuenta de alumnos
// Botón Buscar
$(document).ready(function () {
    $('#alumnoestado').select2({
        placeholder: '',
        ajax: {
            url: '/buscar_alumnoestado',
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

})
document.getElementById("btnBuscar").addEventListener("click", () => {
    const idAlumno = $('#alumnoestado').val();
    const anio = document.getElementById("selectAnioLectivo").value;
    console.log(idAlumno, anio);
    if (!idAlumno || !anio) {
        alert("Debe seleccionar un alumno y un año lectivo.");
        return;
    }

    cargarCuotasDetalladas(idAlumno, anio);
    cargarCuentasEspeciales(idAlumno, anio);
});


async function cargarCuotasDetalladas(idAlumno, anio) {
    const contenedor = document.getElementById("tablaCuotas");
    contenedor.innerHTML = "<p class='text-muted'>Cargando cuotas...</p>";

    try {
        const resp = await fetch(`/get_cuotas/${idAlumno}/${anio}`);
        const cuotas = await resp.json();

        if (cuotas.length === 0) {
            contenedor.innerHTML = "<p class='text-danger'>No se encontraron cuotas.</p>";
            return;
        }

        // ✅ Obtener datos para el encabezado
        const alumnoSelect = document.getElementById("alumnoestado");
        const nombreAlumno = alumnoSelect.options[alumnoSelect.selectedIndex].text;
        const grado = cuotas[0].grado || "—";

        // ✅ Encabezado informativo
        let encabezadoHTML = `
        <div class="mb-3 text-center">
            <h5 class="fw-bold">Estado de Cuenta del Alumno</h5>
            <p class="mb-1"><strong>Alumno:</strong> ${nombreAlumno}</p>
            <p class="mb-1"><strong>Grado:</strong> <span id="gradoAlumno">${grado}</span></p>
            <p class="mb-1"><strong>Año Lectivo:</strong> <span id="selectAnioLectivo">${anio}</span></p>
        </div>
        `;

        // ✅ Tabla detallada
        let tablaHTML = `
        <div class="table-responsive">
            <table class="table-bordered align-middle text-center" id="tablaCuotas">
                <thead class="table-dark">
                    <tr>
                        <th>Mes</th>
                        <th>N° Factura</th>
                        <th>Fecha</th>
                        <th>Monto Pagado (Gs)</th>
                        <th>Saldo (Gs)</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cuotas.forEach(cuota => {
            const pagos = cuota.pagos;

            if (pagos.length > 0) {
                pagos.forEach((pago, index) => {
                    const mostrarSaldo = index === pagos.length - 1;
                    tablaHTML += `
                    <tr>
                        <td class="fw-bold">${cuota.mes}</td>
                        <td>${pago.factura}</td>
                        <td>${pago.fecha}</td>
                        <td class="monto">${pago.monto.toLocaleString('es-PY')}</td>
                        <td class="saldo fw-bold">${mostrarSaldo ? cuota.saldo.toLocaleString('es-PY') : "—"}</td>
                        <td>${mostrarSaldo ? `<span class="badge bg-${cuota.color}">${cuota.estado}</span>` : "—"}</td>
                    </tr>
                    `;
                });
            } else {
                tablaHTML += `
                <tr>
                    <td class="fw-bold">${cuota.mes}</td>
                    <td class="text-muted">—</td>
                    <td class="text-muted">—</td>
                    <td class="text-end">0</td>
                    <td class="fw-bold text-end">${cuota.saldo.toLocaleString('es-PY')}</td>
                    <td><span class="badge bg-${cuota.color}">${cuota.estado}</span></td>
                </tr>
                `;
            }
        });

        tablaHTML += `
                </tbody>
            </table>
        </div>
        `;

        let cuentasHTML = `
<div class="mb-4">
  <h5 class="fw-bold text-center">Cuentas del Alumno y Pagos Realizados</h5>
`;



        contenedor.innerHTML = encabezadoHTML + tablaHTML;


        // ✅ Mostrar botones de exportación

        document.getElementById("btnExportarPDFBackend").classList.remove("d-none");

    } catch (error) {
        console.error("Error al cargar cuotas:", error);
        contenedor.innerHTML = "<p class='text-danger'>Error al cargar los datos.</p>";
    }
}


const btnLimpiar = document.getElementById("btnLimpiar");
if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
        document.getElementById("selectAnioLectivo").value = "";
        $('#alumnoestado').val(null).trigger('change');
        document.getElementById("tablaCuotas").innerHTML = "";
        document.getElementById("tablaCuentasEspeciales").innerHTML = "";
        document.getElementById("tablaCuotas").innerHTML = "";
        document.getElementById("btnExportarPDFBackend").classList.add("d-none");
    });
}


// 📘 Exportar tabla a Excel
const btnExportar = document.getElementById("btnExportar");
if (btnExportar) {
    btnExportar.addEventListener("click", () => {
        const tabla = document.querySelector("#tablaCuotas table");
        if (!tabla) {
            alert("No hay datos para exportar.");
            return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(tabla);
        XLSX.utils.book_append_sheet(wb, ws, "Estado de Cuenta");
        XLSX.writeFile(wb, "EstadoCuenta_Alumno.xlsx");
    });
}

// 📘 Exportar tabla a PDF
const btnExportarPDFInstitucional = document.getElementById("btnExportarPDFBackend");
if (btnExportarPDFInstitucional) {
    btnExportarPDFInstitucional.addEventListener("click", async () => {
        const alumnoSelect = document.getElementById("alumnoestado");
        const nombreAlumno = alumnoSelect.options[alumnoSelect.selectedIndex].text;
        const gradoElem = document.getElementById("gradoAlumno");
        const grado = gradoElem ? gradoElem.textContent.trim() : "—";  // 👈 validación segura
        const anio = document.getElementById("selectAnioLectivo").textContent.trim();

        // 📊 Recorrer cuotas principales
        const filas = document.querySelectorAll("#tablaCuotas tbody tr");
        const cuotas = [];
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll("td");
            if (celdas.length !== 6) return;

            const mes = celdas[0].textContent.trim();
            const factura = celdas[1].textContent.trim();
            const fecha = celdas[2].textContent.trim();
            const montoStr = celdas[3].textContent.trim().replace(/\./g, "").replace(",", ".");
            const saldoStr = celdas[4].textContent.trim().replace(/\./g, "").replace(",", ".");
            const estado = celdas[5].textContent.trim();

            const monto = parseFloat(montoStr) || 0;
            const saldo = parseFloat(saldoStr) || 0;

            const pagos = (factura !== "—" && fecha !== "—")
                ? [{ factura, fecha, monto }]
                : [];

            cuotas.push({ mes, pagos, saldo, estado });
        });

        // 📘 Recorrer cuentas especiales
        const cuentas = [];
        const bloquesCuentas = document.querySelectorAll(".bloqueCuenta");
        // 👆 cada cuenta debe estar envuelta en un div con clase .bloqueCuenta

        bloquesCuentas.forEach(bloque => {
            const descripcion = bloque.querySelector(".descripcionCuenta")?.textContent.trim() || "Cuenta";
            const producto = bloque.querySelector(".productoCuenta")?.textContent.trim() || "";
            const aniolectivo = bloque.querySelector(".anioCuenta")?.textContent.trim() || "";
            const montoTotal = bloque.querySelector(".montoTotalCuenta")?.textContent.trim() || "0";
            const saldoCuenta = bloque.querySelector(".saldoCuenta")?.textContent.trim() || "0";

            // 📊 cuotas de la cuenta
            const filasCuotas = bloque.querySelectorAll(".tablaCuotasCuenta tbody tr");
            const cuotasCuenta = [];
            filasCuotas.forEach(fila => {
                const celdas = fila.querySelectorAll("td");
                if (celdas.length < 5) return;
                cuotasCuenta.push({
                    numero: celdas[0].textContent.trim(),
                    vencimiento: celdas[1].textContent.trim(),
                    total: celdas[2].textContent.trim(),
                    abonado: celdas[3].textContent.trim(),
                    saldo: celdas[4].textContent.trim()
                });
            });

            // 💵 pagos realizados
            const filasPagos = bloque.querySelectorAll(".tablaPagosCuenta tbody tr");
            const pagos = [];
            filasPagos.forEach(fila => {
                const celdas = fila.querySelectorAll("td");
                if (celdas.length < 3) return;
                pagos.push({
                    factura: celdas[0].textContent.trim(),
                    fecha: celdas[1].textContent.trim(),
                    monto: celdas[2].textContent.trim()
                });
            });

            cuentas.push({
                descripcion,
                producto,
                aniolectivo,
                montoTotal,
                saldoCuenta,
                cuotas: cuotasCuenta,
                pagos: pagos
            });
        });
        
        // 📤 Payload completo
        const payload = {
            alumno: nombreAlumno,
            grado: grado,
            anio: anio,
            cuotas: cuotas,
            cuentas: cuentas   // 👈 ahora sí se envía
        };
        

        const resp = await fetch("/generar_pdf_estado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `EstadoCuenta_${nombreAlumno.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            alert("❌ Error al generar el PDF institucional.");
        }
    });
}






document.addEventListener('DOMContentLoaded', () => {
    const fecha = new Date();
    const opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const opcionesHora = { hour: '2-digit', minute: '2-digit', second: '2-digit' };

    document.getElementById('fechaReporte').textContent = fecha.toLocaleDateString('es-PY', opcionesFecha);
    document.getElementById('horaReporte').textContent = fecha.toLocaleTimeString('es-PY', opcionesHora);
});


function obtenerDatosDeCuotas() {
    const filas = document.querySelectorAll("#tablaCuotas tbody tr");
    const cuotas = [];

    filas.forEach((fila, index) => {
        const celdas = fila.querySelectorAll("td");
        if (celdas.length < 6) {
            console.warn(`⚠️ Fila ${index + 1} tiene menos de 6 columnas. Se omitirá.`);
            return;
        }

        const mes = celdas[0].textContent.trim();
        const factura = celdas[1].textContent.trim();
        const fecha = celdas[2].textContent.trim();
        const montoPagadoStr = celdas[3].textContent.trim().replace(/\./g, "").replace(",", ".");
        const saldoStr = celdas[4].textContent.trim().replace(/\./g, "").replace(",", ".");
        const estado = celdas[5].textContent.trim();

        const montoPagado = parseFloat(montoPagadoStr) || 0;
        const saldo = parseFloat(saldoStr) || 0;

        const pagos = fecha && montoPagado > 0
            ? [{ fecha, monto: montoPagado }]
            : [];

        cuotas.push({
            mes,
            pagos,
            saldo,
            estado
        });
    });

    return cuotas;
}


async function cargarCuentasEspeciales(idCliente, anioLectivo) {
    const contenedor = document.getElementById("tablaCuentasEspeciales");
    contenedor.innerHTML = "<p class='text-muted'>Cargando cuentas especiales...</p>";

    try {
        const res = await fetch(`/obtener_cuenta_reporte/${idCliente}/${anioLectivo}`);
        const data = await res.json();
        const reporte = data.reporte || [];

        if (reporte.length === 0) {
            contenedor.innerHTML = "<p class='text-muted'>No se encontraron cuentas especiales.</p>";
            return;
        }

        let html = "";

        reporte.forEach((cuenta, i) => {
            html += `
      <div class="bloqueCuenta border rounded p-3 mb-4">
        <h6 class="fw-bold text-primary descripcionCuenta">Cuenta ${i + 1}: ${cuenta.descripcion}</h6>
        <p><strong>Producto:</strong> <span class="productoCuenta">${cuenta.producto}</span></p>
        <p><strong>Año Lectivo:</strong> <span class="anioCuenta">${cuenta.aniolectivo}</span></p>
        <p><strong>Monto Total de la Cuenta:</strong> 
            <span class="montoTotalCuenta">${cuenta.total_cuenta.toLocaleString('es-PY')} Gs</span></p>
        <p><strong>Saldo para cancelar la Cuenta:</strong> 
            <span class="saldoCuenta">${cuenta.saldo_cuenta !== undefined
                    ? cuenta.saldo_cuenta.toLocaleString('es-PY')
                    : "0"} Gs</span></p>

        <!-- Tabla de cuotas de la cuenta -->
        <table class="table table-sm table-bordered text-center mb-3 tablaCuotasCuenta">
          <thead class="table-light">
            <tr>
              <th>N° Cuota</th>
              <th>Vencimiento</th>
              <th>Total Cuota</th>
              <th>Monto Abonado</th>
              <th>Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody>
            ${cuenta.cuotas.map(cuota => `
              <tr>
                <td>${cuota.nrocuota}</td>
                <td>${cuota.fechavenc}</td>
                <td class="text-end">${cuota.debito.toLocaleString('es-PY')} Gs</td>
                <td class="text-end">${cuota.credito.toLocaleString('es-PY')} Gs</td>
                <td class="text-end">${cuota.pendiente.toLocaleString('es-PY')} Gs</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Tabla de pagos realizados -->
        <h6 class="fw-bold">Pagos Realizados</h6>
        <table class="table table-sm table-bordered text-center tablaPagosCuenta">
          <thead class="table-light">
            <tr>
              <th>Factura</th>
              <th>Fecha</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${cuenta.pagos.length > 0 ? cuenta.pagos.map(pago =>
                        `
              <tr>
                <td>${pago.factura}</td>
                <td>${pago.fecha}</td>
                <td class="text-end">${pago.subtotal.toLocaleString('es-PY')} Gs</td>
              </tr>
            `).join("") : `
              <tr><td colspan="3" class="text-muted">No se registraron pagos</td></tr>
            `}
          </tbody>
        </table>
      </div>
      `;
        });

        contenedor.innerHTML = html;
        const btn = document.getElementById("btnExportarPDFBackend");

        if (btn) { // primero aseguramos que el elemento existe
            // Verificar si el botón está oculto
            if (btn.classList.contains("d-none")) {
                btn.classList.remove("d-none"); // lo mostramos
                console.log("Botón ahora visible");
            }
        }


    } catch (error) {
        console.error("Error al cargar cuentas especiales:", error);
        contenedor.innerHTML = "<p class='text-danger'>Error al cargar las cuentas especiales.</p>";
    }
}
