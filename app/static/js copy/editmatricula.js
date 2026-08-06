


document.addEventListener('DOMContentLoaded', () => {

    //limpiar formulario
    const btnLimpiar = document.getElementById("btnLimpiar");
    const formulario = document.getElementById("filtromatriculas");
    const tabla = document.getElementById("tablamatricula");

    btnLimpiar.addEventListener("click", function () {
        // Limpiar todos los campos del formulario
        formulario.reset();

        // Limpiar Select2 si estás usando Select2

        if ($('#alumno').hasClass("select2-hidden-accessible")) {
            $('#alumno').val(null).trigger('change');
        }

        // Vaciar la tabla de resultados
        tabla.innerHTML = "";
    });




    // Buscar facturas
    document.getElementById("filtromatriculas").addEventListener("submit", function (e) {
        e.preventDefault();

        const datos = {
            alumno: document.getElementById("alumno").value
        };
        console.log("Datos enviados:", datos);

        fetch("/buscar_matricula", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(data => cargarTabla(data))
            .catch(err => console.error("Error:", err));
    });

    // Cargar datos en la tabla
    function cargarTabla(matricula) {
        console.log("estoy cargando tabla");

        const tbody = document.getElementById("tablamatricula");
        tbody.innerHTML = "";

        matricula.forEach(f => {
            let fechaprovisoria = new Date(f.falta);
            let fechactivo = fechaprovisoria.toISOString().split('T')[0];
            let fechalimpia = convertirAFormatoDDMMYYYY(fechactivo);

            const tr = document.createElement("tr");





            // Botón de anulación según estado
            const botonDesactivar = f.activo === 1
                ? `<button class="btn btn-sm btn-danger anular-btn" data-id="${f.idmatricula}">🗑 Desactivar</button>`
                : `<button class="btn btn-sm btn-secondary" disabled>Matricula Desactivada</button>`;

            // Botón de edición según estado
            const botonEditar = f.activo === 1
                ? `<button class="btn btn-sm btn-warning editar-btn" data-id="${f.idmatricula}">✏ Editar</button>`
                : `<button class="btn btn-sm btn-warning" disabled>✏ Editar</button>`;

            tr.innerHTML = `
            <td>${fechalimpia}</td>
            <td>${f.nombre}</td>
            <td>${f.descripcion}</td>
            <td>${f.anolectivo}</td>
            <td>${f.activo === 1 ? 'Activo' : 'Inactivo'}</td>
            <td>
                <button class="btn btn-sm btn-info ver-btn" data-id="${f.idmatricula}">👁 Ver</button>
                ${botonEditar}
                ${botonDesactivar}
                
            </td>
        `;
            tbody.appendChild(tr);
        });









        // Botón anular
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('anular-btn')) {
                const idmatricula = e.target.getAttribute('data-id');
                console.log("el id para anular es ", idmatricula);
                if (!confirm('¿Estás seguro de que deseas desactivar esta matricula?')) return;

                const res = await fetch(`/desactivar_mat/${idmatricula}`, { method: 'POST' });
                const resultado = await res.json();

                if (resultado.ok) {
                    e.target.classList.add('disabled');
                    e.target.textContent = 'Matrícula Desactivada';
                    e.target.classList.remove('btn-danger');
                    e.target.classList.add('btn-secondary');
                } else {
                    alert('Error al anular la matricula: ' + resultado.error);
                }
            }
        });
    }

    // Guardar cambios en modal
    document.querySelector("#modalEditarFactura .btn-primary").addEventListener("click", function () {
        const id = document.getElementById("modalEditarFactura").dataset.id;
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



    $('#matricula').select2({
        placeholder: 'Seleccione o busque un alumno',
        ajax: {
            url: '/buscar_alumno',
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
            url: '/buscar_alumno',
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
    document.getElementById("tablamatricula").addEventListener("click", async function (e) {
        if (e.target.classList.contains("ver-btn")) {
            const id_matricula = e.target.getAttribute("data-id");


            fetch(`/obtener_matricula/${id_matricula}`)
                .then(response => {
                    if (!response.ok) throw new Error("Error al obtener la matrícula");
                    return response.json();
                })
                .then(data => {
                    const tbody = document.getElementById('tablaDetalleMatricula');
                    if (!Array.isArray(data.cabezamatricula)) throw new Error("Formato inesperado en cabeza");
                    data.cabezamatricula.forEach(cabeza => {
                        document.getElementById("infoAlumno").textContent = cabeza.nombre;
                        document.getElementById("infoAnoLectivo").textContent = cabeza.anolectivo;
                        document.getElementById("infoCurso").textContent = cabeza.grado;


                    })


                    // Validar estructura
                    if (!Array.isArray(data.detallecuota)) throw new Error("Formato inesperado en detalles");

                    tbody.innerHTML = ""; // Limpia la tabla antes de insertar nuevas filas
                    // Cargar detalles
                    data.detallecuota.forEach(item => {
                        let fechaprovisoria = new Date(item.fechavenc);
                        let fecha = fechaprovisoria.toISOString().split('T')[0];
                        let fechalimpia = convertirAFormatoDDMMYYYY(fecha);

                        const row = document.createElement('tr');
                        row.innerHTML = `
                <td>
                    ${item.nrocuota}
                
                </td>
                <td>${fechalimpia}</td>
                <td>${item.debito}</td>
                    <td>${item.credito}</td>
                <td>${item.pendiente}</td>
        `;
                        tbody.appendChild(row);
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
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                font-size: 16px;
            }
            .contenedor {
                position: relative;
                width: 21cm;
                height: 14.8cm;
                padding: 0.5cm;
            }
            .campo {
                position: absolute;
                font-size: 16px;
            }
            .fecha { top: 3.9cm; left: 3.5cm; }          /* antes estaba en 2.4cm + 1.5cm */
            .ruc { top: 5cm; left: 3.5cm; }            /* 0.5cm debajo de fecha */
            .razon { top: 5.5cm; left: 4.2cm; }          /* 0.5cm debajo del RUC */

            .condicion { top: 3.9cm; left: 17.5cm; }     /* acompaña a la fecha */

            .tabla-productos {
                position: absolute;
                top: 8.2cm; /* antes estaba en 5.2cm + 2.5cm */
                left: 1cm;
                width: 19cm;
                font-size: 16px;
            }

            .importe-total {
                position: absolute;
                top: 13.6cm; /* antes 12.1cm + 1.5cm */
                left: 1.5cm;
                width: 18cm;
                font-weight: bold;
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
        if (num === 100) return "cien guaraníes";

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
            const idMatricula = e.target.getAttribute("data-id");

            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('modal_editmatricula'));
            modal.show();

            // Limpiar selects
            document.getElementById("editCurso").innerHTML = "";
            document.getElementById("editAnoLectivo").innerHTML = "";

            // Obtener datos de la matrícula actual
            fetch(`/obtener_matricula/${idMatricula}`)
                .then(res => res.json())
                .then(data => {


                    // Cargar año lectivo
                    const cabeza = data.cabezamatricula[0]; // Asegurate de que el array tenga al menos un elemento
                    const id_matricula = cabeza.idmatricula;
                    console.log("Este es", cabeza.anolectivo);
                    let anho = parseInt(cabeza.anolectivo);
                    const selectAno = document.getElementById("editAnoLectivo");
                    for (let año = 2024; año <= 2026; año++) {
                        const option = document.createElement("option");
                        option.value = año;
                        option.textContent = año;
                        if (año == anho) option.selected = true;
                        selectAno.appendChild(option);
                    }

                    // Cargar cursos desde API
                    fetch('/obtener_cursos')
                        .then(res => res.json())
                        .then(cursos => {
                            const selectCurso = document.getElementById("editCurso");
                            cursos.forEach(curso => {
                                const option = document.createElement("option");
                                option.value = curso.id;
                                option.textContent = curso.descripcion;
                                if (curso.descripcion === cabeza.grado) option.selected = true;
                                selectCurso.appendChild(option);
                            });
                        });

                    if (!Array.isArray(data.detallecuota)) throw new Error("Formato inesperado en detalles");
                    const tbody = document.getElementById("tablaDetalleMatriculaedit");
                    tbody.innerHTML = ""; // Limpia la tabla antes de insertar nuevas filas
                    // Cargar detalles
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
                       value="${fecha}" data-id="${id_matricula}">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm edit-debito" 
                       value="${item.debito}" min="0" step="1000" data-id="${item.idmatriculadet}">
            </td>
            <td>${item.credito}</td>
        `;
                        } else {
                            row.innerHTML = `
            <td>${item.nrocuota}</td>
            <td>${fechalimpia}</td>
            <td>${item.debito}</td>
            <td>${item.credito}</td>
        `;
                        }

                        tbody.appendChild(row);
                    });



                });
        }
    });

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
                    const modal = bootstrap.Modal.getInstance(document.getElementById("modal_editmatricula"));
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






});

