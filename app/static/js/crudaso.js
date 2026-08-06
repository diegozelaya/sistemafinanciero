document.addEventListener("DOMContentLoaded", function () {
    let searchInput = document.getElementById("searchBoxaso");
    let resultsContainer = document.getElementById("userTableaso");

    $('#addModalaso').on('shown.bs.modal', function () {
        // Limpiar todos los inputs dentro del modal



        if ($.fn.select2 && $('#clientebusq').data("select2")) {
            $('#clientebusq').select2('destroy');
        }

        $('#clientebusq').select2({
            dropdownParent: $('#addModalaso'),
            width: '100%',
            placeholder: 'Seleccione o busque un cliente',
            ajax: {
                url: '/buscar_clienteaso',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return { query: params.term };
                },
                processResults: function (data) {
                    return {
                        results: data.map(cliente => ({
                            id: cliente.id,
                            text: cliente.nombre
                        }))
                    };
                },
                cache: true
            },
            minimumInputLength: 2
        });
    });

    $('#clientebusq').select2({
        placeholder: 'Seleccione o busque un cliente',
        ajax: {
            url: '/buscar_clienteaso',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { query: params.term };
            },
            processResults: function (data) {
                return {
                    results: data.map(cliente => ({
                        id: cliente.id,
                        text: cliente.nombre
                    }))
                };
            },
            cache: true
        },
        minimumInputLength: 2
    });

    searchInput.addEventListener("input", function () {
        let query = searchInput.value.trim();

        if (query.length > 0) {
            fetch(`/search_clienteaso?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    resultsContainer.innerHTML = "";

                    if (data.length === 0) {
                        resultsContainer.innerHTML = "<tr><td colspan='6'>No se encontraron resultados</td></tr>";
                        return;
                    }

                    data.forEach(user => {
                        let fechaprovisoria = new Date(user.fechanac);
                        let fechanac = fechaprovisoria.toISOString().split('T')[0];
                        let fechalimpia = convertirAFormatoDDMMYYYY(fechanac);
                        fechalimpia = convertirAFormatoDDMMYYYY(fechanac);


                        let statusText = user.activo == 1 ? "Activo" : "Inactivo";
                        let row = `
                            <tr>
                                <td>${user.idclienteaso}</td>
                                <td>${user.ci}</td>
                                <td>${user.nombreaso}</td>
                                 <td>${fechalimpia}</td>
                                <td>${user.nombrecliente}</td>
                                <td>${user.resp1}</td>
                                <td>${user.cel1}</td>
                                 <td>${user.resp2}</td>
                                <td>${user.cel2}</td>
                                <td>${statusText}</td>
                                
                                <td>
                                    <button class="editBtnaso btn btn-primary btn-sm btn-xs" style="background-color: #343a40; color: white;" data-id="${user.idclienteaso}">Editar</button>
                                    <button class="toggleStatusBtnaso btn btn-secondary btn-sm btn-xs" data-id="${user.idclienteaso}" data-status="${user.activo}">
                                        ${user.activo == 1 ? "Baja" : "Activar"} 
                                    </button>
                                </td>
                            </tr>
                        `;
                        resultsContainer.innerHTML += row;
                    });
                })
                .catch(error => console.error("🚨 Error en búsqueda:", error));
        } else {
            location.reload();
        }
    });

    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("editBtnaso")) {


            let userId = event.target.getAttribute("data-id");

            fetch("/get_useraso", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            })
                .then(response => response.json())
                .then(user => {
                    console.log(user); // Verifica la estructura del objeto `user`
                    console.log("Fecha recibida:", user.fechanacimiento);
                    document.getElementById("edit_idaso").value = userId;
                    document.getElementById("cedulaaso").value = user.ci;
                    document.getElementById("nombreaso").value = user.nombre || "";
                    document.getElementById("fechanac").value = user.fechanacimiento || "";
                    document.getElementById("responsable1").value = user.responsable1 || "";
                    document.getElementById("responsable1cel").value = user.celular1 || "";
                    document.getElementById("responsable2").value = user.responsable2 || "";
                    document.getElementById("responsable2cel").value = user.celular2 || "";
                    document.getElementById("sexoaso").value = user.sexo || "";

                    let clienteSelect = $("#clientebusq");
                    let existingOption = clienteSelect.find(`option[value='${user.idcliente}']`);

                    if (existingOption.length) {
                        clienteSelect.val(user.idcliente).trigger("change");
                    } else {
                        let newOption = new Option(user.nombre_cliente || "Cliente sin nombre", user.idcliente, true, true);
                        clienteSelect.append(newOption).trigger("change");
                    }

                    // 🔹 Abre el modal después de cargar los datos
                    $("#addModalaso").modal("show");
                })  // Cierre de la promesa
        }  // Cierre del evento click
    });  // Cierre del document.addEventListener

    document.getElementById("saveUseraso").addEventListener("click", function () {
        let userId = document.getElementById("edit_idaso").value;
        let ci = document.getElementById("cedulaaso").value.trim();
        let nombre = document.getElementById("nombreaso").value.trim();
        let sexaso = document.getElementById("sexoaso").value;

        if (!ci || !nombre || !sexaso) {
            alert("❌ Los campos CI, Nombre y Sexo son obligatorios.");
            return;
        }

        let data = {
            ci: ci,
            nombre: nombre,
            cliente: document.getElementById("clientebusq")?.value || null,
            fechanac: document.getElementById("fechanac")?.value || null,
            sexo: sexaso,
            resp1: document.getElementById("responsable1")?.value.trim() || null,
            telef1: document.getElementById("responsable1cel")?.value.trim() || null,
            resp2: document.getElementById("responsable2")?.value.trim() || null,
            telef2: document.getElementById("responsable2cel")?.value.trim() || null,
            tipocliente: 1,
            falta: new Date().toISOString().split('T')[0],
            ualta: 1,
            activo: 1
        };

        // 🚀 Depuración: Verificar valores antes de enviarlos
        console.log("📊 Datos a enviar:", JSON.stringify(data, null, 2));

        let url = userId ? `/edit_clienteaso/${userId}` : "/add_clienteaso";

        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(responseData => {
                alert(responseData.message);
                location.reload();
            })
            .catch(error => {
                console.error("Error en la solicitud:", error);
                alert("Hubo un problema al guardar el cliente");
            });
    });




    $(document).ready(function () {
        $(document).on("click", ".toggleStatusBtnaso", function () {
            let userId = $(this).data("id");
            let currentStatus = $(this).data("status");
            let newStatus = currentStatus === 1 ? 0 : 1; // Cambia el estado

            let confirmMessage = currentStatus === 1
                ? "¿Seguro que quieres dar de baja a este usuario?"
                : "¿Seguro que quieres activar a este usuario?";

            if (confirm(confirmMessage)) {
                $.ajax({
                    url: `/update_statusaso/${userId}`,
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ activo: newStatus }),
                    success: function (response) {
                        alert(response.message);
                        location.reload();
                    },
                    error: function (xhr, status, error) {
                        console.error("Error:", error);
                        alert("Hubo un problema al actualizar el estado.");
                    }
                });
            }
        });
    });


    document.getElementById("btnaddaso").addEventListener("click", function () {
        // Limpiar todos los inputs dentro del modal
        document.querySelectorAll("#addModalaso input").forEach(input => {
            if (input.type !== "hidden") input.value = "";
        });

        // También podés limpiar selects si es necesario
        document.querySelectorAll("#addModalaso select").forEach(select => {
            select.selectedIndex = 0;
        });


    });

    function convertirAFormatoDDMMYYYY(fechaISO) {
        const [anio, mes, dia] = fechaISO.split('-');
        return `${dia}/${mes}/${anio}`;
    }


});  // Cierre del DOMContentLoaded
