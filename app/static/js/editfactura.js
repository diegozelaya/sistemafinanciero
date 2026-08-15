


document.addEventListener('DOMContentLoaded', () => {

    //limpiar formulario
    const btnLimpiar = document.getElementById("btnLimpiar");
    const formulario = document.getElementById("filtroFacturas");
    const tabla = document.getElementById("tablaFacturas");

    btnLimpiar.addEventListener("click", function () {
        // Limpiar todos los campos del formulario
        formulario.reset();

        // Limpiar Select2 si estás usando Select2
        if ($('#cliente').hasClass("select2-hidden-accessible")) {
            $('#cliente').val(null).trigger('change');
        }
        if ($('#alumno').hasClass("select2-hidden-accessible")) {
            $('#alumno').val(null).trigger('change');
        }

        // Vaciar la tabla de resultados
        tabla.innerHTML = "";
    });




    // Buscar facturas
    document.getElementById("filtroFacturas").addEventListener("submit", function (e) {
        e.preventDefault();

        const datos = {
            fechaInicio: document.getElementById("fechaInicio").value,
            fechaFin: document.getElementById("fechaFin").value,
            cliente: document.getElementById("cliente").value,
            nroFactura: document.getElementById("nroFactura").value,
            alumno: document.getElementById("alumno").value
        };
        console.log("Datos enviados:", datos);

        fetch("/buscar_facturas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(data => cargarTabla(data))
            .catch(err => console.error("Error:", err));
    });

    // Cargar datos en la tabla
    function cargarTabla(facturas) {
        console.log("estoy cargando tabla");

        const tbody = document.getElementById("tablaFacturas");
        tbody.innerHTML = "";

        facturas.forEach(f => {
            let fechaprovisoria = new Date(f.fecha);
            let fechanac = fechaprovisoria.toISOString().split('T')[0];
            let fechalimpia = convertirAFormatoDDMMYYYY(fechanac);

            const tr = document.createElement("tr");

            // Botón de anulación según estado
            const botonAnular = f.activo === 1
                ? `<button class="btn btn-sm btn-danger anular-btn" data-id="${f.idventa}">🗑 Anular</button>`
                : `<button class="btn btn-sm btn-secondary" disabled>Factura anulada</button>`;

            // Botón de edición según estado
            const botonEditar = f.activo === 1
                ? `<button class="btn btn-sm btn-warning editar-btn" data-id="${f.idventa}"  data-monto="${f.monto}">✏ Editar</button>`
                : `<button class="btn btn-sm btn-warning" disabled>✏ Editar</button>`;

            tr.innerHTML = `
            <td>${f.factura}</td>
            <td>${fechalimpia}</td>
            <td>${f.nombre}</td>
            <td>${f.monto.toLocaleString()}</td>
            <td>${f.activo === 1 ? 'Activo' : 'Anulado'}</td>
            <td>
                <button class="btn btn-sm btn-info ver-btn" data-id="${f.idventa}">👁 Ver</button>
                ${botonEditar}
                ${botonAnular}
                <button class="btn btn-sm btn-success imprimir-btn" data-id="${f.idventa}">🖨 Imprimir</button>
            </td>
        `;
            tbody.appendChild(tr);
        });


        function imprimirVentaComoFactura(idVenta) {
            fetch(`/datosfactura/${idVenta}`)
                .then(resp => {
                    if (!resp.ok) throw new Error("Error al obtener los datos de la venta");
                    return resp.json();
                })
                .then(datosVenta => {
                    imprimirFactura(datosVenta); // esta función está en tu archivo compartido
                })
                .catch(error => {
                    console.error("No se pudo imprimir la factura:", error);
                    alert("Hubo un problema al preparar la impresión.");
                });
        }






        // Botón anular
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('anular-btn')) {
                const idventa = e.target.getAttribute('data-id');
                console.log("el id para anular es ", idventa);
                if (!confirm('¿Estás seguro de que deseas anular esta factura?')) return;

                const res = await fetch(`/anular_factura/${idventa}`, { method: 'POST' });
                const resultado = await res.json();

                if (resultado.ok) {
                    e.target.classList.add('disabled');
                    e.target.textContent = 'Factura anulada';
                    e.target.classList.remove('btn-danger');
                    e.target.classList.add('btn-secondary');
                } else {
                    alert('Error al anular la factura: ' + resultado.error);
                }
            }
        });
    }



    // Guardar cambios en modal
    document.querySelector("#modal_edit .btn-primary").addEventListener("click", async function () {
        const modalElement = document.getElementById("modal_edit");
        const id = modalElement.dataset.id;
        const monto = modalElement.dataset.monto;

        console.log("el id de la venta", id);
        console.log("el monto es", monto);

        // Capturar valores de los inputs
        const fecha = document.getElementById('editFecha').value;
        const nro = document.getElementById('editNroFactura').value;
        const efectivo = document.getElementById('editPagoEfectivo').value;
        const transf = document.getElementById('editPagoTransferencia').value;
        const cheque = document.getElementById('editPagoCheque').value;
        const desc = document.getElementById('editPagoDescuento').value;

        const datos = {
            fecha: fecha,
            nro_factura: nro|| 0,
            pago_efectivo: efectivo|| 0,
            pago_transferencia: transf|| 0,
            pago_cheque: cheque|| 0,
            pago_descuento: desc|| 0,
            monto: monto   // ← si quieres enviar también el monto
        };

        console.log("los datos son:", datos);

        try {
            const res = await fetch(`/editar_factura/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            const resp = await res.json();

            if (resp.success) {
                alert("Factura actualizada correctamente.");
                bootstrap.Modal.getInstance(document.getElementById("modal_edit")).hide();
                document.getElementById("filtroFacturas").dispatchEvent(new Event("submit"));
            } else {
                alert("Error al actualizar la factura.");
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            alert("Hubo un problema al intentar actualizar.");
        }
    });





    $('#cliente').select2({
        placeholder: 'Seleccione o busque un cliente',
        ajax: {
            url: '/buscar_clientefact',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    query: params.term
                };
            },
            processResults: function (data) {
                return {
                    results: data.map(cliente => ({
                        id: cliente.id,
                        text: cliente.nombre,
                        ci: cliente.ci,
                        ruc: cliente.ruc
                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 2
    });


    $('#alumno').select2({
        placeholder: 'Seleccione o busque un alumno',
        ajax: {
            url: '/buscar_alumnofact',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return {
                    q: params.term
                };
            },
            processResults: function (data) {
                console.log(data);
                return {
                    results: data.map(alumno => ({
                        id: alumno.id,
                        text: alumno.nombre,


                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 2
    });


    function convertirAFormatoDDMMYYYY(fechaISO) {
        const [anio, mes, dia] = fechaISO.split('-');
        return `${dia}/${mes}/${anio}`;
    }



    // Funcion para ver las facturas


    // Delegación de eventos para botones "Ver"
    document.getElementById("tablaFacturas").addEventListener("click", async function (e) {
        if (e.target.classList.contains("ver-btn")) {
            const id_venta = e.target.getAttribute("data-id");


            fetch(`/obtener_venta/${id_venta}`)
                .then(response => {
                    if (!response.ok) throw new Error("Error al obtener la venta");
                    return response.json();
                })
                .then(data => {
                    const tbody = document.getElementById('tablaDetalleVenta');
                    const listaCobros = document.getElementById('listaCobros');
                    const totalVenta = document.getElementById('totalVenta');

                    tbody.innerHTML = '';
                    listaCobros.innerHTML = '';
                    let total = 0;

                    // Validar estructura
                    if (!Array.isArray(data.detalles)) throw new Error("Formato inesperado en detalles");
                    if (!Array.isArray(data.cobros)) throw new Error("Formato inesperado en cobros");

                    // Cargar detalles
                    data.detalles.forEach(item => {
                        const subtotal = item.cantidad * item.precio_unitario;
                        total += subtotal;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                <td>
                    ${item.descripcion}
                
                </td>
                <td>${item.precio_unitario.toLocaleString()}</td>
                <td>${item.cantidad}</td>
                    <td>${item.descuento}</td>
                <td>${item.precio_unitario}</td>
        `;
                        tbody.appendChild(row);
                    });

                    totalVenta.textContent = total.toLocaleString();

                    // Cargar formas de cobro
                    data.cobros.forEach(cobro => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        li.innerHTML = `
          <span>${cobro.forma_pago}</span>
          <span class="fw-bold">${cobro.monto.toLocaleString()}</span>
        `;
                        listaCobros.appendChild(li);
                    });

                    // Mostrar el modal
                    const modal = new bootstrap.Modal(document.getElementById('modalVerDetalle'));
                    modal.show();
                })
                .catch(error => {
                    console.error('Error al cargar el detalle de la venta:', error);
                    alert('No se pudo cargar el detalle de la venta.');
                });
        }
        if (e.target.classList.contains("imprimir-btn")) {
            const ventaId = e.target.getAttribute("data-id");
            console.log("respondo al boton impr");

            try {
                const res = await fetch(`/obtener_venta_por_id/${ventaId}`);
                const datosVenta = await res.json();

                imprimirFactura(datosVenta);
            } catch (error) {
                console.error('Error al obtener datos de la venta:', error);
            }
        }


    });


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


    function imprimirFactura(datosVenta) {
        const { encabezado, detalles } = datosVenta;
        console.log("Encabezado", encabezado);
        console.log("Detalles", detalles);
        // formateo de fecha
        const fecha = new Date(encabezado.fecha); // Maneja bien ese formato
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0'); // +1 porque los meses van de 0 a 11
        const año = fecha.getFullYear();
        const fechaFormateada = `${dia}/${mes}/${año}`;
        console.log("Fecha formateada:", fechaFormateada);

        let razon_social = encabezado.nombre;


        let html = `
    <html>
    <head>
        <style>
            @page {
                margin: 0;
            }
            body {
                font-family: "Courier New", Courier, monospace; /* fuente monoespaciada */
                margin: 0;
                padding: 0;
                font-size: 16px; /* tamaño restaurado */
            }
            .contenedor {
                position: relative;
                width: 15cm;
                height: 22cm;
                padding: 0.5cm;
                top: 1cm; /* bajar todo 1cm */
            }
            .campo {
                position: absolute;
                font-size: 16px; /* tamaño restaurado */
            }
            .fecha { top: 3.4cm; left: 3.5cm; }
            .ruc { top: 4cm; left: 3.5cm; }
            .razon { top: 4.5cm; left: 5.2cm; }

            .condicion { top: 3.9cm; left: 17.5cm; }

            .tabla-productos {
                position: absolute;
                top: 6.2cm;
                left: -0.5cm;
                width: 19cm;
                font-size: 16px; /* tamaño restaurado */
            }

            .tabla-productos td {
                padding: 0.2cm;
                font-size: 16px; /* tamaño restaurado */
            }

            /* Cantidad: correr 1cm a la derecha */
            .tabla-productos td:nth-child(1) {
                text-align: center;
                padding-left: 1cm;
            }

            /* Primer monto: correr 1.5cm a la izquierda */
            .tabla-productos td:nth-child(3) {
                text-align: right;
                margin-left: -3.5cm;
            }

            /* Segundo monto: correr 4.5cm a la izquierda */
            .tabla-productos td:nth-child(4) {
                text-align: right;
                margin-left: -6.5cm;
            }

            /* Monto en letras: correr 2cm a la derecha */
            .importe-total {
                position: absolute;
                top: 11.5cm;
                left: 4.5cm; /* antes 2.5cm */
                width: 18cm;
                font-weight: bold;
                font-size: 16px; /* tamaño restaurado */
            }
        </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 500);">
        <div class="contenedor">
            <div class="campo fecha">${fechaFormateada}</div>
            <div class="campo ruc">${encabezado.ruc || ''}</div>
            <div class="campo razon">${razon_social || ''}</div>
            <div class="campo condicion">${encabezado.idcondpago === "1" ? 'Contado' : 'Crédito'}</div>

            <table class="tabla-productos">
                ${detalles.map(d => `
                    <tr>
                        <td style="width: 2cm;">1</td>
                        <td style="width: 8cm;">${extraerNombreCompleto(d.descripcion)}</td>
                        <td style="width: 2.5cm; text-align:center;">${d.subtotal.toLocaleString()}</td>
                        <td style="width: 2.5cm; text-align:center;">${d.subtotal.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </table>

          <div class="importe-total">
              <strong>Son: ${numeroALetras(encabezado.total_general)}</strong> 
              <span style="margin-left: 400px;">
              ${encabezado.total_general.toLocaleString()}
            </span>
           </div>

        </div>
        
    </body>
    </html>
    `;

        let win = window.open("", "Impresión", "width=800,height=600");
        win.document.write(html);
        win.document.close();
    }




    function extraerNombreCompleto(descripcion) {
        const indiceGuion = descripcion.lastIndexOf(" -");
        if (indiceGuion !== -1) {
            return descripcion.substring(0, indiceGuion).trim();
        }
        return descripcion; // Por si no tiene guion
    }

    function numeroALetras(num) {
        const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
        const especiales = ["diez", "once", "doce", "trece", "catorce", "quince"];
        const decenas = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
        const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

        if (num === 0) return "cero guaraníes";
        if (num === 100.000) return "cien mil";

        let letras = "";

        const millones = Math.floor(num / 1000000);
        if (millones > 0) {
            letras += numeroALetras(millones) + " millón" + (millones > 1 ? "es" : "") + " ";
            num %= 1000000;
        }

        const miles = Math.floor(num / 1000);
        if (miles > 0) {
            if (miles === 1) {
                letras += "mil ";
            } else {
                letras += numeroALetras(miles) + " mil ";
            }
            num %= 1000;
        }

        const centenasNum = Math.floor(num / 100);
        const decenasNum = Math.floor((num % 100) / 10);
        const unidadesNum = num % 10;

        if (centenasNum > 0) {
            letras += centenas[centenasNum] + " ";
        }

        const resto = num % 100;

        if (resto >= 10 && resto < 16) {
            letras += especiales[resto - 10];
        } else {
            if (decenasNum > 0) {
                letras += decenas[decenasNum];
                if (unidadesNum > 0) letras += " y ";
            }
            if (unidadesNum > 0) {
                letras += unidades[unidadesNum];
            }
        }

        letras = letras.trim();
        return letras.charAt(0).toUpperCase() + letras.slice(1);
    }



    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('editar-btn')) {
            const id_venta = e.target.getAttribute("data-id");
            const monto = e.target.getAttribute("data-monto"); // ← aquí traes el monto

            const res = await fetch(`/detalle/${id_venta}`);
            const factura = await res.json();

            document.getElementById('editFecha').value = factura.fecha;
            document.getElementById('editNroFactura').value = factura.nro_factura;
            document.getElementById('editPagoEfectivo').value = factura.pago_efectivo || 0;
            document.getElementById('editPagoTransferencia').value = factura.pago_transferencia || 0;
            document.getElementById('editPagoCheque').value = factura.pago_cheque || 0;
            document.getElementById('editPagoDescuento').value = factura.pago_descuento || 0;

            // Guardar id y monto en el dataset del modal
            const modalElement = document.getElementById('modal_edit');
            modalElement.dataset.id = id_venta;
            modalElement.dataset.monto = monto;

          
            

            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    });



});

