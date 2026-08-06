let cuotasCargadas = []; // cuotas cargadas para la venta
let cuotasPendientes = []; // vector para cargar cuotas pendientes en la parte de ventas

document.addEventListener("DOMContentLoaded", function () {
    cargarMonedas();

    //----------------------------------este es para formatear los inputs
    document.addEventListener("input", function (event) {


        // Lista de IDs de los inputs numéricos
        const camposNumericos = ["tefec", "ttransf", "tcheque", "tdesc", "nrofactura", "montoProducto"];

        // Verificar si el input actual está en la lista
        if (camposNumericos.includes(event.target.id)) {
            let inputs = [
                document.getElementById('tefec'),
                document.getElementById('ttransf'),
                document.getElementById('tcheque'),
                document.getElementById('tdesc'),
                document.getElementById('nrofactura'),
                document.getElementById('montoProducto')

            ];

            // También agregar todos los de .monto-parcial
            inputs.push(...document.querySelectorAll(".monto-parcial"));
            inputs.push(...document.querySelectorAll("#montoParcialCuotas"));
            inputs.push(...document.querySelectorAll("#porcentajevariable"));


            inputs.forEach(input => {
                input?.removeEventListener('input', handleInputChangeventas); // prevenir duplicados
                input?.addEventListener('input', handleInputChangeventas);
            });
        }
    });


    //funcion para validar el valor de los inputs de montos de cuentas
    function validarInputsParciales() {
        const inputs = document.querySelectorAll(".monto-parcial");

        inputs.forEach(input => {
            input.addEventListener("input", function () {
                let valorTexto = input.value;
                let valorLimpio = unformatNumberventas(valorTexto); // Asegúrate que esta función exista y funcione bien

                const max = parseFloat(this.dataset.max) || 0;

                if (valorLimpio > max) {
                    alert(`⚠ El monto no puede ser mayor a ${max.toLocaleString("es-AR")}`);
                    valorLimpio = max;
                    this.value = valorLimpio;
                }


            });
        });
    }




    // Función para formatear el número con separadores de miles
    function formatNumberventas(value) {
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

    function unformatNumberventas(value) {
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    }


    function handleInputChangeventas(event) {
        let field = event.target;
        let value = field.value;
        let formattedValue = formatNumberventas(value);
        field.value = formattedValue;
    }






    // ------------------ codigo para el modal

    document.addEventListener("click", async function (event) {
        if (event.target && event.target.id === "btnCuotas") {
            let seleccionado = $("#asociado").val();
            let textoAsociado = $("#asociado option:selected").text();

            if (!seleccionado) {
                alert("⚠ No hay asociado seleccionado");
                return;
            }

            console.log("📥 Obteniendo cuotas pendientes para:", seleccionado);

            await obtenerCuotasPendientes(seleccionado);

            // Ahora sí, preparar modal
            await prepararModal(seleccionado); // ⬅ importante que sea await también


            let modalElement = document.getElementById("modalCuotas");
            let modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();

            // Al mostrar el modal
            $("#modalCuotas").one("shown.bs.modal", function () {
                $("#contenedorOpcionesPago").empty();
                $("#descuentos").empty();
                if ($.fn.select2 && $("#asociadomod").hasClass("select2-hidden-accessible")) {
                    $("#asociadomod").select2("destroy");
                }

                $("#asociadomod").empty();

                let newOption = new Option(textoAsociado, seleccionado, true, true);
                $("#asociadomod").append(newOption).trigger("change");

                $("#asociadomod").select2({
                    placeholder: "Buscar asociado...",
                    allowClear: true,
                    minimumInputLength: 1,
                    dropdownParent: $("#modalCuotas"),
                    ajax: {
                        url: "/buscar_asociado",
                        dataType: "json",
                        delay: 250,
                        data: function (params) {
                            return { q: params.term };
                        },
                        processResults: function (data) {
                            return { results: data };
                        },
                        cache: true
                    }
                });
                $("#asociadomod").on("select2:opening", function (e) {
                    // Reemplaza '#miDiv' con el ID real de tu div
                    $("#selectpagos").find("input, select, textarea, button").prop("disabled", true);
                    let footcuotas = document.querySelector("#botonescuotascompletas");
                    footcuotas.innerHTML = ``
                    $("#contenedorOpcionesPago").empty();
                    $("#descuentos").empty();
                });

                let tbody = document.querySelector("#cuotasTable tbody");
                tbody.innerHTML = "<tr><td colspan='4'>Cargando cuotas...</td></tr>";

                cargarCuotas(seleccionado)
                    .then(success => {
                        if (!success) {
                            tbody.innerHTML = "<tr><td colspan='4'>No hay cuotas disponibles.</td></tr>";
                        }
                    })
                    .catch(() => {
                        tbody.innerHTML = "<tr><td colspan='4'>Error al cargar cuotas.</td></tr>";
                    });

                // 🔁 Cargar cuentas
                cargarCuentas(seleccionado);


                // Si cambia el asociado desde el modal
                $("#asociadomod").on("change", async function () {
                    $("#selectpagos").find("input, select, textarea, button").prop("disabled", false);
                    let nuevoSeleccionado = $(this).val();
                    console.log("El nuevo seleccionado es:", nuevoSeleccionado);
                    if (!nuevoSeleccionado) {
                        $("#cuotasTable tbody").html("<tr><td colspan='4'>Seleccione un asociado.</td></tr>");
                        $("#cuentasTable tbody").html("<tr><td colspan='4'>Seleccione un asociado.</td></tr>");

                        return;
                    }

                    $("#cuotasTable tbody").html("<tr><td colspan='4'>Cargando cuotas...</td></tr>");

                    const tablaSeleccion = document.querySelector("#tablaCuentasSeleccion tbody");
                    if (tablaSeleccion) {
                        tablaSeleccion.innerHTML = "";  // limpia todas las filas
                    }

                    // También podrías ocultar el contenedor, si lo tenés
                    const contenedorSeleccion = document.getElementById("contenedorCuentasSeleccion");
                    if (contenedorSeleccion) {
                        contenedorSeleccion.classList.add("d-none"); // o tu clase personalizada
                    }

                    await obtenerCuotasPendientes(nuevoSeleccionado);

                    cargarCuotas(nuevoSeleccionado)
                        .then(success => {
                            if (!success) {
                                $("#cuotasTable tbody").html("<tr><td colspan='4'>No hay cuotas disponibles.</td></tr>");
                            }
                        })
                        .catch(() => {
                            $("#cuotasTable tbody").html("<tr><td colspan='4'>Error al cargar cuotas.</td></tr>");
                        });

                    cargarCuentas(nuevoSeleccionado)
                        .then(success => {
                            if (!success) {
                                $("#cuentasTable tbody").html("<tr><td colspan='4'>No hay cuentas disponibles.</td></tr>");
                            }
                        })
                        .catch(() => {
                            $("#cuentasTable tbody").html("<tr><td colspan='4'>Error al cargar cuentas.</td></tr>");
                        });

                    prepararModal(nuevoSeleccionado);

                });





            });



            // 🧼 Limpiar todo al cerrar el modal
            $("#modalCuotas").one("hidden.bs.modal", function () {
                if ($.fn.select2 && $("#asociadomod").hasClass("select2-hidden-accessible")) {
                    $("#asociadomod").select2("destroy");
                }

                $("#asociadomod").empty(); // Limpiar select
                $("#cuotasTable tbody").html(""); // Limpiar tabla
            });
        }

        if (event.target && event.target.id === "btnProductos") {
            //carga de productos
            let seleccionado2 = $("#asociado").val();
            //let textoAsociado = $("#asociado option:selected").text();

            if (!seleccionado2) {
                alert("⚠ Seleccione un asociado válido");
                return;
            }
            let modalElement2 = document.getElementById("modalProductos");
            let modalInstance2 = new bootstrap.Modal(modalElement2);
            modalInstance2.show();

            // Al mostrar el modal
            $("#modalProductos").on("shown.bs.modal", function () {
                cargarProductosSelect();
                console.log("entro bien al modal productos");

                $("#agregarProductoBtn").off("click").on("click", function () {
                    agregarProductoVenta();
                    console.log("entro al boton agregar productos");
                    const modalElement = document.getElementById('modalProductos');
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    modal.hide();
                });
            });


            document.getElementById('modalProductos').addEventListener('hidden.bs.modal', () => {
                // Limpiar el select
                const select = document.getElementById('selectProducto');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione un producto</option>';
                }

                // Limpiar el input
                const inputMonto = document.getElementById('montoProducto');
                if (inputMonto) {
                    inputMonto.value = '';
                }

                console.log("🧹 Modal limpiado al cerrar");
            });




        }


    });

    document.querySelector("#guardarventaBtn").addEventListener("click", function () {
        const datosVenta = obtenerDetalleVenta();
        console.log("Datos enviados para guardar la venta:", datosVenta);


        fetch("/guardar_venta", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosVenta)
        })
            .then(resp => resp.json())
            .then(data => {
                if (data.success) {
                    if (confirm("✅ Venta guardada correctamente. ¿Desea imprimir la factura?")) {
                        // Solo si acepta imprimir, marcamos como impresa
                        fetch("/marcar_impresa", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ id_venta: data.id_venta })
                        });

                        imprimirFactura(datosVenta);
                    }

                    limpiarPantallaVenta();
                } else {
                    alert("❌ Error al guardar venta: " + data.error);
                }
            });
    });


    async function cargarCuotas(idAsociado) {
        console.log("🔄 Cargando cuotas para ID:", idAsociado);
        const tbody = document.querySelector('#cuotasTable tbody');
        tbody.innerHTML = '';

        if (cuotasPendientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No hay cuotas disponibles</td></tr>';
            return false;
        } else {
            console.log("📋 Contenido de cuotasPendientes:", cuotasPendientes);

            cuotasPendientes.forEach(cuota => {
                let fechavenc = new Date(cuota.fecha_vencimiento).toISOString().split("T")[0]; // ✅ Formateo correcto

                let fila = `
       <tr data-id="${cuota.id}">
        <td>${cuota.nro_cuota}</td>
        <td>${cuota.nombre_cuota}</td>
        <td>${fechavenc}</td>
        <td>${cuota.monto}</td>
      </tr>`;
                tbody.innerHTML += fila;
            });

            return true;
        }

    }




    async function cargarCuentas(idAsociado) {
        console.log("🔄 Cargando cuentas para ID:", idAsociado);
        let tbody = document.querySelector("#cuentasTable tbody");
        tbody.innerHTML = "";
        return fetch(`/obtener_cuentas/${idAsociado}`)
            .then(response => {
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                return response.json();
            })
            .then(data => {


                if (!Array.isArray(data) || data.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='4'>No hay cuentas pendientes</td></tr>";
                    return false;
                }
                console.log("🔍 Cuentas recibidas:", data);
                let filas = data.map(cuenta => {
                    let fecha = new Date(cuenta.fechavenc).toISOString().split("T")[0]; // ✅ Formateo correcto
                    return `
                        <tr data-id="${cuenta.idcuentaasodet}">
                             <td class="col-pequena">${cuenta.anolectivo}</td>
                             
                             <td class="col-pequena">${formatNumber(cuenta.monto)}</td>
                              <td class="col-pequena">${fecha}</td>
                              <td class="col-pequena">${cuenta.detalle}</td>
                        </tr>
                    `;
                }).join("");

                tbody.innerHTML = filas;
                return true;
            })
            .catch(error => {
                console.error("❌ Error al obtener cuentas:", error);
                document.querySelector("#cuentasTable tbody").innerHTML =
                    "<tr><td colspan='4'>⚠ Error al cargar cuentas.</td></tr>";
                return false;
            });
    }





    function cargarMonedas() {
        let selectMoneda = document.getElementById("idmoneda"); // ✅ Id corregido

        // Limpiar el select antes de llenarlo
        selectMoneda.innerHTML = '';

        // Hacer una petición fetch al endpoint de Flask para cargar las monedas
        fetch('/obtener_monedas')
            .then(response => response.json())  // Convertir la respuesta a JSON
            .then(data => {
                console.log("Datos recibidos:", data);  // Mostrar los datos recibidos

                // Verificar que los datos sean un array
                if (Array.isArray(data)) {
                    data.forEach(moneda => {
                        let option = document.createElement("option");
                        option.value = moneda.idmoneda;
                        option.text = moneda.nommoneda;
                        selectMoneda.appendChild(option);

                        // Si la moneda es "MONEDA LOCAL", establecerla como predeterminada
                        if (moneda.nommoneda === "MONEDA LOCAL") {
                            option.selected = true;
                        }
                    });
                } else {
                    console.error("Los datos recibidos no son un array", data);
                }
            })
            .catch(error => console.error("Error al cargar las monedas:", error));
    }


    async function prepararModal(idAsociado) {
        console.log("🚀 Preparando modal para asociado:", idAsociado);

        const [hayCuotas, hayCuentas] = await Promise.all([
            cargarCuotas(idAsociado),
            cargarCuentas(idAsociado)
        ]);

        const select = document.getElementById("tipoPago");
        select.innerHTML = ""; // Limpiar opciones anteriores

        // Agregar opción por defecto
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "-- Seleccionar tipo de pago --";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        // Agregar opciones si están disponibles
        if (hayCuotas) {
            const cuotasOption = new Option("Cuotas", "cuotas");
            select.appendChild(cuotasOption);
        }
        if (hayCuentas) {
            const cuentasOption = new Option("Cuentas", "cuentas");
            select.appendChild(cuentasOption);
        }

    }



    //este bloque es para manejar si los pagos van a ser totales de las cuotas o solo parciales
    document.getElementById("tipoPago").addEventListener("change", function () {
        const valor = this.value;
        const contenedorpagocuota = document.getElementById("contenedorOpcionesPago");
        contenedorpagocuota.innerHTML = "";
        let desc = document.getElementById("descuentos")
        desc.innerHTML = "";

        if (valor === "cuotas") {
            mostrarOpcionesCuotas();




            // Formatear automáticamente el input de monto parcial
            const inputCuota = document.getElementById("montoParcialCuotas");
            inputCuota.addEventListener("input", function (e) {
                this.value = formatNumberventas(this.value);
            });

        }

        const tipo = this.value;
        const contenedor = document.getElementById("contenedorCuentasSeleccion");

        if (tipo === "cuentas") {
            contenedor.classList.remove("d-none");
            contenedor.style.display = "block";
            mostrarTablaSeleccionCuentas(); // función que veremos abajo
            let footcuotas = document.querySelector("#botonescuotascompletas");
            if (footcuotas) {
                footcuotas.innerHTML = `
        <button type="button" class="btn btn-primary" id="addCuenta">Agregar cuenta a detalle</button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        `;
            } else {
                console.warn("No se encontró el footer 'botonescuotascompletas'");
            }

            document.getElementById("addCuenta").addEventListener("click", function () {
                agregarCuentaVenta()
                const modalElement = document.getElementById('modalCuotas');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();

            });

        } else {
            contenedor.style.display = "none";
        }


    });



    function mostrarTablaSeleccionCuentas() {
        const tablaOriginal = document.querySelectorAll("#cuentasTable tbody tr");
        const tbodyDestino = document.getElementById("tablaCuentasSeleccion");
        tbodyDestino.innerHTML = ""; // Limpiar antes

        tablaOriginal.forEach((fila, index) => {
            const celdas = fila.querySelectorAll("td");
           // if (celdas.length < 5) return; // Asegura que haya suficientes celdas

            const montoCuenta = parseFloat(celdas[1].textContent.replace(/\./g, "").replace(",", "."));

            const nuevaFila = document.createElement("tr");
            nuevaFila.dataset.id = fila.dataset.id;
            nuevaFila.innerHTML = `
                        <td><input type="radio" name="cuentaSeleccionada" value="${index}" ></td>
                        <td>${celdas[0].textContent}</td>
                        <td>${celdas[1].textContent}</td>
                        <td>${celdas[2].textContent}</td>
                        <td>${celdas[3].textContent}</td>
                      
                        <td>
                            <input type="text" class="form-control monto-parcial" 
                            data-max="${montoCuenta}" placeholder="Monto" id="inputcuenta" disabled/>
                        </td>
                        `;

            tbodyDestino.appendChild(nuevaFila);
        });
        agregarListenerRadioInputs();

        aplicarFormatoInputsParciales();

        validarInputsParciales();

    }



    function aplicarFormatoInputsParciales() {
        document.querySelectorAll(".monto-parcial").forEach(input => {
            input.removeEventListener("input", handleInputChangeventas); // por las dudas
            input.addEventListener("input", handleInputChangeventas);
        });
    }


    function formatNumbermontoparcial(value) {
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

    const inputCuota = document.getElementById("montoParcialCuotas");

    inputCuota.addEventListener("keydown", function (e) {
        const permitido = [
            "Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Home", "End"
        ];
        const esNumero = e.key >= "0" && e.key <= "9";
        const esComa = e.key === ",";
        const yaTieneComa = this.value.includes(",");

        if (!esNumero && !permitido.includes(e.key) && (!esComa || yaTieneComa)) {
            e.preventDefault();
        }
    });


    inputCuota.addEventListener("input", function () {
        let valorLimpio = this.value.replace(/\./g, "").replace(",", ".");
        let valor = parseFloat(valorLimpio) || 0;

        const fila = document.querySelector("#cuotasTable tbody tr");
        let max = 0;
        if (fila) {
            const celdaMonto = fila.querySelectorAll("td")[2];
            console.log("El valor de la celda es: " + celdaMonto);
            if (celdaMonto) {
                max = parseFloat(celdaMonto.textContent.replace(/\./g, "").replace(",", ".")) || 0;
            }
        }

        if (valor > max) {
            alert(`⚠ El monto no puede ser mayor a ${max.toLocaleString("es-AR")}`);
            valor = max;
        }

        this.value = formatNumberventas(valor.toFixed(2).replace(".", ","));
    });




    function agregarListenerRadioInputs() {
        const radios = document.querySelectorAll("input[name='cuentaSeleccionada']");
        const inputs = document.querySelectorAll(".monto-parcial");

        radios.forEach((radio, index) => {
            radio.addEventListener("change", function () {
                inputs.forEach((input, i) => {
                    input.disabled = i !== index;
                    if (i !== index) {
                        input.value = ""; // opcional: limpiar si se deshabilita
                    }
                });
            });
        });
    }


    function mostrarOpcionesCuotas() {
        const contenedor = document.getElementById("contenedorOpcionesPago");

        contenedor.innerHTML = `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="opcionCuota" id="radioCantidad" value="cantidad">
                            <label class="form-check-label" for="radioCantidad">
                                Pagar por cantidad de cuotas
                            </label>
                            <input type="number" id="cantidadCuotas" class="form-control mt-2" placeholder="Cantidad de cuotas" disabled>
                        </div>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="radio" name="opcionCuota" id="radioParcial" value="parcial">
                            <label class="form-check-label" for="radioParcial">
                                Pagar monto parcial
                            </label>
                            <input type="text" id="montoParcialCuotas" class="form-control mt-2" placeholder="Monto parcial" disabled>
                        </div>
                    `;



        // Evento para habilitar/deshabilitar inputs
        document.getElementById("radioCantidad").addEventListener("change", function () {
            document.getElementById("cantidadCuotas").disabled = false;
            document.getElementById("montoParcialCuotas").disabled = true;
            mostrarOpcionesDescuentos();
            let footcuotas = document.querySelector("#botonescuotascompletas");
            if (footcuotas) {
                footcuotas.innerHTML = `
        <button type="button" class="btn btn-primary" id="adddetalle">Agregar a detalle</button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        `;
            } else {
                console.warn("No se encontró el footer 'botonescuotascompletas'");
            }

            document.getElementById("adddetalle").addEventListener("click", function () {
                addCuotas();
                const modalElement = document.getElementById('modalCuotas');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();

            });




        });

        document.getElementById("radioParcial").addEventListener("change", function () {
            let footcuotas = document.querySelector("#botonescuotascompletas");
            footcuotas.innerHTML = `
        <button type="button" class="btn btn-primary" id="addparcial">Agregar pago parcial</button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        `;
            document.getElementById("cantidadCuotas").disabled = true;
            document.getElementById("montoParcialCuotas").disabled = false;
            let desc = document.getElementById("descuentos")
            desc.innerHTML = "";

            document.getElementById("addparcial").addEventListener("click", function () {
                console.log("entro en el boton");

                try {
                    addCuotas();
                    const modalElement = document.getElementById('modalCuotas');
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    modal.hide();
                } catch (error) {
                    console.error("Error al agregar factura parcial:", error);
                    alert("Ocurrió un error al agregar la cuota.");
                }

            });

        });

        // ✅ Ahora sí existe el input en el DOM, agregamos el evento
        document.getElementById("montoParcialCuotas").addEventListener("input", function () {
            const input = this;
            valor = input.value;
            valorLimpio = unformatNumberventas(valor);
            console.log(valor);
            // Obtener monto máximo desde la tabla
            const fila = document.querySelector("#cuotasTable tbody tr");
            let max = 0;
            if (fila) {
                const celdaMonto = fila.querySelectorAll("td")[3];
                if (celdaMonto) {
                    max = parseFloat(celdaMonto.textContent.replace(/\./g, "").replace(",", ".")) || 0;
                }
            }

            if (valorLimpio > max) {
                alert(`⚠ El monto no puede ser mayor a ${max.toLocaleString("es-AR")}`);
                valorLimpio = max;
            }

            // Mostrar con formato
            input.value = formatNumbermontoparcial(valorLimpio.toFixed(0).replace(".", ","));
        });



        const inputCantidad = document.getElementById("cantidadCuotas");

        // Obtener cuántas cuotas hay en la tabla
        const totalCuotas = document.querySelectorAll("#cuotasTable tbody tr").length;

        // Asignar el valor máximo permitido
        inputCantidad.setAttribute("max", totalCuotas);

        // Validar cuando el usuario escribe
        inputCantidad.addEventListener("input", function () {
            const valor = parseInt(this.value);
            if (valor > totalCuotas) {
                alert(`⚠ Solo hay ${totalCuotas} cuota(s) disponibles.`);
                this.value = totalCuotas;
            }
        });


    }


    // Formateador reutilizable
    function formatNumber(numStr) {
        return numStr.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }



    //codigo para elegir los descuentos
    function mostrarOpcionesDescuentos() {
        const contenedordesc = document.getElementById("descuentos");

        contenedordesc.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="opciondesc" id="radioselectdesc" value="descsfijos" checked>
                        <label class="form-check-label" for="radioselectdesc">
                            Elegir tipo de descuento
                        </label>
                        <select name="descuento" id="descuota" class="form-select" >
                                <option value="0" selected>0%</option>
                                <option value="10">Pago Único</option>
                                <option value="15">15% Hermanos</option>
                                <option value="40">Desc. funcionarios</option>
                                <option value="50">50%</option>
                            </select>
                    </div>
                    <div class="form-check mt-3">
                        <input class="form-check-input" type="radio" name="opciondesc" id="radiovariabledesc" value="descvariables">
                        <label class="form-check-label" for="descvariables">
                            Ingresar otro Porcentaje:
                        </label>
                        <input type="number" min="0" step="1" id="porcentajevariable" class="form-control mt-2" placeholder="ingrese el porcentaje a descontar" disabled>
                    </div>
                `;



        // Evento para habilitar/deshabilitar inputs
        document.getElementById("radioselectdesc").addEventListener("change", function () {
            document.getElementById("descuota").disabled = false;
            document.getElementById("porcentajevariable").disabled = true;
        });

        document.getElementById("radiovariabledesc").addEventListener("change", function () {
            document.getElementById("descuota").disabled = true;
            document.getElementById("porcentajevariable").disabled = false;
        });

        // ✅ Ahora sí existe el input en el DOM, agregamos el evento
        document.getElementById("porcentajevariable").addEventListener("input", function () {
            const input = this;
            // let valorLimpio = input.value.replace(/\./g, "").replace(",", ".");
            // let valor = parseFloat(valorLimpio) || 0;
            valor = input.value;
            valor2 = formatNumberventas(valor);
            valorLimpio = unformatNumberventas(valor2);
            console.log(valor);
            // Obtener monto máximo desde la tabla

            let max = 100;


            if (valorLimpio > max) {
                alert(`⚠ El porcentaje no puede ser mayor a 100%`);
                valor = max;
            }

            // Mostrar con formato
            input.value = formatNumbermontoparcial(valor.toFixed(2).replace(".", ","));
        });



    }
    function obtenerDescuentoAplicado() {
        const seleccion = document.querySelector('input[name="opciondesc"]:checked');

        if (!seleccion) {
            console.warn("⚠ No se seleccionó ninguna opción de descuento");
            return null;
        }

        if (seleccion.value === "descsfijos") {
            // Obtener valor del select
            const select = document.getElementById("descuota");
            const valorSeleccionado = select.value; // 👈 esta línea devuelve el value limpio
            console.log("📌 Valor de descuento fijo:", valorSeleccionado);
            return valorSeleccionado;

        } else if (seleccion.value === "descvariables") {
            // Obtener valor del input
            const input = document.getElementById("porcentajevariable");
            const valor = input.value;
            console.log("📌 Porcentaje variable ingresado:", valor);
            return valor;
        }

        return null;
    }

    function agregarAFactura(cuota) {
        const total = cuota.reduce((acumulador, cuota) => { // Halla la suma de todos los montos de cuotas
            return acumulador + parseFloat(cuota.monto);
        }, 0);


        let resultado = "";
        let tipo = "";

        if (cuota.length === 1) {
            resultado = cuota[0].nombre_cuota;
        } else if (cuota.length > 1) {
            const nombreInicial = cuota[0].nombre_cuota;
            const nombreFinal = cuota[cuota.length - 1].nombre_cuota;
            resultado = `De ${nombreInicial} a ${nombreFinal}`;
        } else {
            resultado = "No hay cuotas seleccionadas.";
        }


        const tbody = document.querySelector('#productTable tbody');
        const fila = document.createElement('tr');

        // Guardamos los IDs como atributo data-cuotas
        const idsCuotas = cuota.map(c => c.id);  // [12, 13, 14, ...]
        fila.dataset.idCuota = JSON.stringify(idsCuotas);  // Guarda como string

        if (cuota[0].nombre_cuota == "Matrícula") {
            tipo = "Matrícula";

        } else { tipo = "Cuota"; }

        //let netoparcial = parseFloat(cuota.monto) * parseInt(cant);  
        let porc_desc = obtenerDescuentoAplicado();
        let monto_desc = parseInt(porc_desc) * parseFloat(total) / 100;
        let subtotal = (parseFloat(total) - monto_desc);
        fila.innerHTML = `
          <td>${tipo}</td>
          <td>${resultado + " de " + cuota[0].nombreaso}</td>
         
          <td>${formatNumber(cuota[0].monto)}</td>
          <td>${formatNumber(monto_desc)}</td>
          <td>${cuota.length}</td>    
          <td>${formatNumber(subtotal)}</td>
          <td>0</td>
          <td>${formatNumber(subtotal)}</td>
          <td><button class="eliminar-fila">❌</button></td>
        `;

        // Evento para eliminar cuota
        fila.querySelector('.eliminar-fila').addEventListener('click', () => {
            const tbody = document.querySelector('#productTable tbody');
            const ultimaFila = tbody.lastElementChild;

            if (fila === ultimaFila) {
                const idsAEliminar = JSON.parse(fila.dataset.idCuota);
                cuotasCargadas = cuotasCargadas.filter(c => !idsAEliminar.includes(c.id));
                fila.remove();
                actualizarTotalVenta();
            } else {
                alert("Solo se puede eliminar la última cuota agregada.");
            }
        });



        tbody.appendChild(fila);
        actualizarTotalVenta();
    }


    function agregarAFacturaParcial(idCuotaparc) {
        let tipo = "Cuota";
        const cuotaparcial = document.getElementById("montoParcialCuotas")
        let textoAsociado = $("#asociadomod option:selected").text();


        const tbody = document.querySelector('#productTable tbody');
        const fila = document.createElement('tr');
        const primeraFila = document.querySelector('#cuotasTable tbody tr');
        resultado = "cuota parcial " + primeraFila.children[1].textContent + " de " + textoAsociado;
        let idCuota = null;
        console.log("el parcialisismo", idCuotaparc);
        if (primeraFila) {
            idCuota = primeraFila.dataset.id;
            console.log("ID de la primera fila:", idCuota);
        }
        if (idCuota !== null) {
            // Siempre forzar a que sea array antes de stringify
            fila.dataset.idCuota = JSON.stringify(Array.isArray(idCuotaparc) ? idCuotaparc : [idCuotaparc]);
        }


        const monto = unformatNumberventas(cuotaparcial.value);

        fila.innerHTML = `
          <td>${tipo}</td>
          <td>${resultado}</td>
         
          <td>${formatNumber(monto)}</td>
          <td>0</td>
          <td>1</td>    
          <td>${formatNumber(monto)}</td>
          <td>0</td>
          <td>${formatNumber(monto)}</td>
          <td><button class="eliminar-fila">❌</button></td>
        `;

        // Evento para eliminar cuota
        fila.querySelector('.eliminar-fila').addEventListener('click', () => {
            const tbody = document.querySelector('#productTable tbody');
            const ultimaFila = tbody.lastElementChild;

            if (fila === ultimaFila) {
                const idsAEliminar = idCuota;
                console.log("el id a eliminar es" + idsAEliminar);
                cuotasCargadas = cuotasCargadas.filter(c => !idsAEliminar.includes(c.id));
                fila.remove();
                actualizarTotalVenta();
            } else {
                alert("Solo se puede eliminar la última cuota agregada.");
            }
        });



        tbody.appendChild(fila);
        actualizarTotalVenta();
    }


    function existePagoParcialAlumno(nombreAlumno) {
        console.log("nombre alumno en fc", nombreAlumno);
        const filas = document.querySelectorAll('#productTable tbody tr');
        for (const fila of filas) {
            const texto = fila.children[1].textContent;
            if (texto.includes("cuota parcial") && texto.includes(nombreAlumno)) {
                return true;  // Ya hay pago parcial para este alumno
            }
        }
        return false;
    }

    function existeCuenta() {

        const filas = document.querySelectorAll('#productTable tbody tr');
        for (const fila of filas) {
            const texto = fila.children[0].textContent;
            if (texto.includes("Cuenta")) {
                return true;  // Ya hay pago parcial para este alumno
            }
        }
        return false;
    }


    function verificarMontosYAgregar(cuotasSeleccionadas) {
        if (cuotasSeleccionadas.length === 0) return;

        const primerMonto = cuotasSeleccionadas[0].monto;

        const todosIguales = cuotasSeleccionadas.every(cuota => cuota.monto === primerMonto);

        if (todosIguales) {
            // ✅ Todos los montos son iguales
            cuotasSeleccionadas.forEach(cuota => {
                cuotasCargadas.push(cuota);
                //agregarAFactura(cuota, cantidad);
            });
            agregarAFactura(cuotasSeleccionadas);


        } else {
            // ❌ Hay diferencias en los montos
            alert("⚠️ Para cargar más de una cuota, los montos deben ser iguales entre sí.");
            agregarAFactura([cuotasSeleccionadas[0]]);
        }
    }






    function actualizarTotalVenta() {
        let total = 0;
        let subtotal = 0;

        const filas = document.querySelectorAll('#productTable tbody tr');

        filas.forEach(fila => {
            subtotal = parseFloat(unformatNumberventas(fila.children[7].textContent));
            console.log("el subtotal es: " + subtotal);
            total += subtotal;
        });

        document.getElementById('totalGeneral').textContent = formatNumber(total);
    }


    function addCuotas() {

        let nombreAlumno = $("#asociadomod option:selected").text();
        console.log("nombre alumno", nombreAlumno);
        if (existePagoParcialAlumno(nombreAlumno)) {

            alert("Ya hay un pago parcial cargado para este alumno. No se pueden agregar más cuotas.");
            return;
        }
        let inputcantidad = document.getElementById('cantidadCuotas');

        cantidad = 0;
        if (inputcantidad) {
            cantidad = parseInt(unformatNumberventas(inputcantidad.value));


        }

        let montoParcial = 0;
        const inputParcial = document.getElementById('montoParcialCuotas');
        if (inputParcial) {
            montoParcial = unformatNumberventas(inputParcial.value);
        }

        let cuotasDisponibles = null;

        // ✅ Si hay cantidad ingresada
        if (!isNaN(cantidad) && cantidad > 0) {

            cuotasDisponibles = cuotasPendientes.filter(cuota =>
                !cuotasCargadas.some(c => c.id === cuota.id)
            );

            if (cuotasDisponibles.length === 0) {
                alert('No hay cuotas disponibles.');
                return;
            }

            // ⚠️ Si la primera cuota disponible es matrícula, solo permitir una
            if (cuotasDisponibles[0].nro_cuota === 0 && cantidad > 1) {
                alert("La matrícula se carga en forma independiente a las cuotas");
                cantidad = 1;
            }

            if (cantidad > cuotasDisponibles.length) {
                alert('No hay suficientes cuotas disponibles para cargar.');
                return;
            }


            const cuotasSeleccionadas = cuotasDisponibles.slice(0, cantidad);


            verificarMontosYAgregar(cuotasSeleccionadas);
        }

        // ✅ Si hay monto parcial ingresado
        else if (!isNaN(montoParcial) && montoParcial > 0) {
            let primeraFilaparc = document.querySelector('#cuotasTable tbody tr');   //primera fila provisorio
            let idCuotaparc = null; //
            if (!primeraFilaparc) {
                alert("No hay cuotas disponibles para pago parcial.");
                return;
            }


            idCuotaparc = primeraFilaparc.dataset.id;
            console.log("el id parcial es", idCuotaparc);
            const montoCuota = parseFloat(primeraFilaparc.children[3].textContent.replace(/\./g, "").replace(",", "."));

            //cuotasCargadas.push(idCuotaparc);

            //cuotasDisponibles = cuotasPendientes.filter(cuota =>
            //!cuotasCargadas.some(c => c.id === idCuotaparc)
            //);


            if (montoParcial > montoCuota) {
                alert(`El monto parcial no puede ser mayor al valor de la cuota: ${formatNumber(montoCuota)}`);
                return;
            }

            // Marcar que fue cargada parcialmente
            agregarAFacturaParcial(idCuotaparc);



            cargarCuotas(idCuotaparc); // actualizamos la tabla de pendientes
        }


    }

    // funcion para agregar productos a la venta
    function agregarProductoVenta() {

        let tipo = "";
        let seleccionado2 = $("#asociado").val();
        let textoAsociado = $("#asociado option:selected").text();
        const select = document.getElementById('selectProducto');
        const idProducto = select.value;
        const nombreProducto = select.options[select.selectedIndex].text;
        const monto = formatNumberproducto(document.getElementById("montoProducto").value);
        console.log("Valor original:", document.getElementById("montoProducto").value);
        console.log("Monto convertido:", monto);
        if (idProducto === "7") {
            tipo = "Cuotas Varias";


        } else {

            tipo = "Producto";
        }

        if (isNaN(monto) || monto <= 0) {

            alert("Ingrese un monto válido.");

            return;
        }
        console.log("ID:", idProducto);
        console.log("Nombre:", nombreProducto);



        const tbody = document.querySelector('#productTable tbody');
        const fila = document.createElement('tr');
        if (idProducto !== null) {
            fila.dataset.idProducto = idProducto; // Guardar el ID solo si existe
        }

        //let netoparcial = parseFloat(cuota.monto) * parseInt(cant);  
        let porc_desc = 0;
        let monto_desc = 0;
        let subtotal = monto;
        fila.innerHTML = `
          <td>${tipo}</td>
          <td>${nombreProducto + " de " + textoAsociado}</td>
         
          <td>${monto}</td>
          <td>0</td>
          <td>0</td>    
          <td>${formatNumber(monto)}</td>
          <td>0</td>
          <td>${formatNumber(monto)}</td>
          <td><button class="eliminar-fila">❌</button></td>
        `;

        // Evento para eliminar cuota
        fila.querySelector('.eliminar-fila').addEventListener('click', () => {
            const tbody = document.querySelector('#productTable tbody');
            const ultimaFila = tbody.lastElementChild;

            if (fila === ultimaFila) {
                fila.remove();
                actualizarTotalVenta();
            } else {
                alert("Solo se puede eliminar la última cuota agregada.");
            }
        });



        tbody.appendChild(fila);
        actualizarTotalVenta();
    }

    function agregarCuentaVenta() {
        let textoAsociado = $("#asociadomod option:selected").text();
        if (existeCuenta()) {

            alert("Ya existe una cuenta cargada, solo se puede cargar una cuenta por venta.");
            return;
        }




        //-------bloque para hallar valores
        const radioSeleccionado = document.querySelector('input[name="cuentaSeleccionada"]:checked');
        if (!radioSeleccionado) {
            alert("⚠️ Selecciona una cuenta primero.");
            return;
        }

        // Obtener la fila completa a partir del input radio
        const filaSeleccionada = radioSeleccionado.closest('tr');

        // Obtener el data-id de la fila
        const dataId = filaSeleccionada.dataset.id;

        // Obtener el valor del input (monto parcial)
        const inputMonto = filaSeleccionada.querySelector('.monto-parcial');
        const valorInput = inputMonto.value;

        // Obtener el contenido de la celda 4 (índice 3)
        const nombrecuenta = filaSeleccionada.cells[5].textContent;



        //fin de bloque para traer valores
        let tipo = "";

        const monto = unformatNumberventas(valorInput);
        console.log("Monto formateado:", monto);
        if (nombrecuenta === "Pagos cuotas varias") {
            tipo = "Cuenta Cuotas Varias";


        } else {

            tipo = " Cuenta Producto";
        }

        if (isNaN(monto) || monto <= 0) {
            alert("Ingrese un monto válido.");
            

            return;
        }


        // Mostrar los resultados (puedes usarlos como necesites)
        console.log("ID:", dataId);
        console.log("Monto ingresado:", valorInput);
        console.log("cuenta:", nombrecuenta);
        console.log("alumno", textoAsociado);
        console.log("tipo", tipo);

        const tbody = document.querySelector('#productTable tbody');
        const fila = document.createElement('tr');
        if (dataId !== null) {
            fila.dataset.idcuentadet = dataId; // Guardar el ID solo si existe
        }

        //let netoparcial = parseFloat(cuota.monto) * parseInt(cant);  
        let porc_desc = 0;
        let monto_desc = 0;
        let subtotal = monto;
        fila.innerHTML = `
          <td>${tipo}</td>
          <td>${nombrecuenta + " de " + textoAsociado}</td>
         
          <td>${formatNumber(monto)}</td>
          <td>0</td>
          <td>0</td>    
          <td>${formatNumber(monto)}</td>
          <td>0</td>
          <td>${formatNumber(monto)}</td>
          <td><button class="eliminar-fila">❌</button></td>
        `;

        // Evento para eliminar cuota
        fila.querySelector('.eliminar-fila').addEventListener('click', () => {
            const tbody = document.querySelector('#productTable tbody');
            const ultimaFila = tbody.lastElementChild;

            if (fila === ultimaFila) {
                fila.remove();
                actualizarTotalVenta();
            } else {
                alert("Solo se puede eliminar la última cuota agregada.");
            }
        });
        tbody.appendChild(fila);
        actualizarTotalVenta();

    }




    async function obtenerCuotasPendientes(idAsociado) {
        try {
            const response = await fetch(`/obtener_cuotas/${idAsociado}`);
            if (!response.ok) {
                throw new Error("Error al traer las cuotas");
            }

            const data = await response.json();

            // Solo guardamos cuotas que aún no están cargadas
            cuotasPendientes = data.filter(cuota =>
                !cuotasCargadas.some(c => c.id === cuota.id)
            );

            return cuotasPendientes; // ✅ Devolver la lista

        } catch (error) {
            console.error("❌ Error al obtener cuotas:", error);
            return []; // Devolver array vacío si falla
        }
    }

    document.getElementById('agregarProductoBtn').addEventListener('click', () => {
        const idProducto = document.getElementById('selectProducto').value;
        const nombreProducto = document.getElementById('selectProducto').selectedOptions[0].text;
        const monto = parseFloat(document.getElementById('montoProducto').value);

        if (!idProducto || isNaN(monto) || monto <= 0) {
            alert("Por favor, seleccione un producto y un monto válido.");
            return;
        }

        // Aquí agregá la lógica para sumar el producto y el monto a tu detalle
        console.log("Producto:", nombreProducto, "Monto:", monto);

        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalProductos'));
        modal.hide();
    });

    //Carga los productos en el select para la venta
    function cargarProductosSelect() {
        const select = document.getElementById('selectProducto');

        fetch('/get_productos')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    select.innerHTML = '<option value="">Seleccione un producto</option>';
                    console.log(data.productos);
                    data.productos.forEach(producto => {
                        const option = document.createElement('option');
                        option.value = producto.id;
                        option.textContent = producto.nombre;
                        select.appendChild(option);
                    });
                } else {
                    console.error("Error al cargar productos:", data.error);
                    alert("Error al cargar productos. Revisa la consola.");
                }
            })
            .catch(error => {
                console.error("Error en la petición:", error);
                alert("Error en la conexión con el servidor.");
            });
    }
    function obtenerDetalleVenta() {
        const filas = document.querySelectorAll("#productTable tbody tr");
        let detalles = [];

        // Obtener encabezado
        const fecha = document.querySelector('input[name="fechaventa"]').value;
        const condicion = document.querySelector('select[name="condicionventa"]').value;
        const efectivo = parseInt(unformatNumberventas(document.querySelector('input[name="tefec"]').value)) || 0;
        const transferencia = parseInt(unformatNumberventas(document.querySelector('input[name="ttransf"]').value)) || 0;
        const cheque = parseInt(unformatNumberventas(document.querySelector('input[name="tcheque"]').value)) || 0;
        const descuento_sueldo = parseInt(unformatNumberventas(document.querySelector('input[name="tdesc"]').value)) || 0;
        const moneda = document.querySelector('select[name="moneda"]').value;
        const idcliente = document.querySelector('select[name="cliente"]').value;
        const clienteSelect = document.querySelector('select[name="cliente"]');
        const razon = clienteSelect.options[clienteSelect.selectedIndex].text;
        const timbrado = document.querySelector('select[name="timbrado"]').value;
        const factura = formatNumberproducto(document.querySelector('input[name="nrofactura"]').value);
        const ruc = document.querySelector('input[name="ruc"]').value;
        const asociado = document.querySelector('select[name="asociado"]').value;

        const totalGeneral = parseInt(unformatNumberventas(document.getElementById("totalGeneral")?.innerText || "0"));

        // Validar encabezado
        if (!fecha || !condicion || !moneda || !idcliente || !timbrado || !factura) {
            alert("⚠️ Por favor complete todos los campos del encabezado.");
            return null;
        }

        // Validar que suma de pagos == total
        const sumaPagos = efectivo + transferencia + cheque + descuento_sueldo;
        if (sumaPagos !== totalGeneral) {
            alert(`⚠️ La suma de pagos (${sumaPagos.toLocaleString()}) no coincide con el total (${totalGeneral.toLocaleString()}).`);
            return null;
        }

        // Recorremos las filas de detalle
        filas.forEach(fila => {
            if (fila.dataset.idProducto) {
                detalles.push({
                    tipo: "Producto",
                    id_producto: parseInt(fila.dataset.idProducto),
                    monto: parseInt(unformatNumberventas(fila.cells[7]?.innerText || "0")),
                    descripcion: fila.cells[1]?.innerText,
                    descuento: parseInt(unformatNumberventas(fila.cells[3]?.innerText || "0")),
                });
            }
            else if (fila.dataset.idCuota) {
                let ids = JSON.parse(fila.dataset.idCuota);
                const cantidad = parseInt(fila.cells[4]?.innerText || "1"); // cuotas
                const total = parseInt(unformatNumberventas(fila.cells[7]?.innerText || "0"));
                const descTotal = parseInt(unformatNumberventas(fila.cells[3]?.innerText || "0"));
                const montoUnit = total / cantidad;
                const descuentoUnit = cantidad > 0 ? (descTotal / cantidad) : 0;

                ids.forEach(idmatriculadet => {
                    detalles.push({
                        tipo: "Cuota",
                        id_matriculadet: idmatriculadet,
                        monto: Math.round(montoUnit),
                        descuento: Math.round(descuentoUnit),
                        descripcion: fila.cells[1]?.innerText
                    });
                });
            }
            else if (fila.dataset.idcuentadet) {
                detalles.push({
                    tipo: "Cuenta",
                    id_cuenta: parseInt(fila.dataset.idcuentadet),
                    monto: parseInt(unformatNumberventas(fila.cells[7]?.innerText || "0")),
                    descuento: 0,
                    descripcion: fila.cells[1]?.innerText
                });
            }
        });

        // Construir encabezado final
        const encabezado = {
            fecha,
            condicion,
            efectivo,
            transferencia,
            cheque,
            descuento_sueldo,
            moneda,
            idcliente,
            timbrado,
            factura,
            totalGeneral,
            ruc,
            razon,
            asociado
        };

        return { encabezado, detalles };
    }

    function imprimirFactura(datosVenta) {
        const { encabezado, detalles } = datosVenta;
        // formateo de fecha
        const fechaOriginal = encabezado.fecha.replaceAll("-", "/"); // ahora seguro es "2025/06/21"
        const partes = fechaOriginal.split("/"); // ["2025", "06", "21"]

        const fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        console.log("Fecha formateada:", fechaFormateada);

        razon_social = extraerNombreCompleto(encabezado.razon);


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
            <div class="campo condicion">${encabezado.condicion === "1" ? 'Contado' : 'Crédito'}</div>

            <table class="tabla-productos">
                ${detalles.map(d => `
                    <tr>
                        <td style="width: 2cm;">1</td>
                        <td style="width: 8cm;">${extraerNombreCompleto(d.descripcion)}</td>
                        <td style="width: 2.5cm; text-align:center;">${d.monto.toLocaleString()}</td>
                        <td style="width: 2.5cm; text-align:center;">${d.monto.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </table>

          <div class="importe-total">
              <strong>Son: ${numeroALetras(encabezado.totalGeneral)}</strong> 
              <span style="margin-left: 400px;">
              ${encabezado.totalGeneral.toLocaleString()}
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


    function extraerNombreCompleto(descripcion) {
        const indiceGuion = descripcion.lastIndexOf(" -");
        if (indiceGuion !== -1) {
            return descripcion.substring(0, indiceGuion).trim();
        }
        return descripcion; // Por si no tiene guion
    }

    function formatNumberproducto(valor) {
        if (!valor) return NaN;

        // Si tiene coma decimal, primero la convertimos
        if (valor.includes(',')) {
            valor = valor.replace(/\./g, '').replace(',', '.');
        } else {
            valor = valor.replace(/\./g, '');
        }

        return parseFloat(valor.trim());
    }

    function limpiarPantallaVenta() {
        // Campos a preservar
        const fecha = document.getElementById("fechaventa").value;
        const timbrado = document.getElementById("timbrado").value;
        const ruc_cliente = document.getElementById("ruc");
        if (ruc_cliente) {
            ruc_cliente.innerText = "";
        }

        // Limpiar campos de texto y selects (excepto los preservados)
        document.querySelectorAll("#productForm input, #productForm select").forEach(el => {
            if (el.id !== "fechaventa" && el.id !== "timbrado") {
                if (el.tagName === "SELECT") {
                    el.selectedIndex = 0;
                    if ($(el).hasClass("select2-hidden-accessible")) {
                        $(el).val(null).trigger("change"); // si usás select2
                    }
                } else {
                    el.value = "";
                }
            }
        });

        // Restaurar los campos preservados
        document.getElementById("fechaventa").value = fecha;
        document.getElementById("timbrado").value = timbrado;

        // Limpiar tabla de productos/cobros
        const tbody = document.querySelector("#productTable tbody");
        if (tbody) {
            tbody.innerHTML = "";
        }

        // Reiniciar total general
        const totalElement = document.getElementById("totalGeneral");
        if (totalElement) {
            totalElement.innerText = "0";
        }

        // Limpiar variables globales si usás
        if (typeof cuotasCargadas !== 'undefined') {
            cuotasCargadas = [];
        }

        if (typeof cuotasPendientes !== 'undefined') {
            cuotasCargadas = [];
        }
    }





})


document.addEventListener("hidden.bs.modal", function (event) {
    if (event.target.id === "modalCuotas") {
        document.body.classList.remove("modal-open");
        let backdrop = document.querySelector(".modal-backdrop");
        if (backdrop) {
            backdrop.remove();
        }
    }
});


