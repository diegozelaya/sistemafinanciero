document.addEventListener("DOMContentLoaded", function () {
    let searchInput = document.getElementById("searchBox");
    let resultsContainer = document.getElementById("userTable"); // 🔹 Contenedor de resultados

    searchInput.addEventListener("input", function () {
        let query = searchInput.value.trim();

        if (query.length > 0) {
            fetch(`/search_cliente?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    console.log("📌 Datos recibidos:", data);

                    resultsContainer.innerHTML = ""; // 🔄 Limpiar resultados previos

                    if (data.length === 0) {
                        resultsContainer.innerHTML = "<tr><td colspan='6'>No se encontraron resultados</td></tr>";
                        return;
                    }

                    data.forEach(user => {
                        console.log("🔎 Usuario recibido:", user); // ⬅️ Muestra la estructura real en la consola

                        let statusText = user.activo == 1 ? "Activo" : "Inactivo"; // ✅ Usa el nombre real del campo
                        console.log("🔎 Estado activo:", user.activo);
                        let row = `
                <tr>
                    <td>${user.idcliente}</td>
                    <td>${user.ci}</td>       
                    <td>${user.ruc}</td>
                     <td>${user.nombre}</td>
                    <td>${user.telefono}</td>
                    <td>${user.celular}</td>
                    <td>${user.mail}</td>
                    <td>${user.direccion}</td>
                    <td>${statusText}</td>  <!-- ✅ Aquí mostramos "Activo" o "Inactivo" -->
                    <td>
                        <button class="editBtn btn btn-primary btn-sm px-2 py-1" style="background-color: #343a40; color: white;" data-id="${user.idcliente}">Editar</button>
                        <button class="toggleStatusBtn btn btn-secondary btn-sm px-2 py-1" data-id="${user.idcliente}" data-status="${user.activo}">
                            ${user.activo == 1 ? "Dar de baja" : "Activar cliente"} 
                        </button>
                    </td>
                </tr>
            `;
                        resultsContainer.innerHTML += row;
                    });
                })
                .catch(error => console.error("🚨 Error en búsqueda:", error));

        } else {
            location.reload(); // 🔄 Si la caja de búsqueda está vacía, recargar la página
        }
    });

    // ✅ Aquí comienza el código de guardar y editar usuarios
    document.getElementById("saveUser").addEventListener("click", function () {
        let userId = document.getElementById("edit_id").value;

        let ci = document.getElementById("cedula").value.trim();
        let nombre = document.getElementById("nombre").value.trim();

        // 🛑 Validación: CI y Nombre son obligatorios
        if (!ci || !nombre) {
            alert("❌ Los campos CI y Nombre son obligatorios.");
            return; // ⛔ Detener la ejecución
        }

        let data = {
            ci: ci,
            ruc: document.getElementById("ruc").value,
            nombre: nombre,
            telefono: document.getElementById("telefono").value,
            celular: document.getElementById("celular").value,
            mail: document.getElementById("email").value,
            direccion: document.getElementById("direccion").value,
            tipocliente: 1,
            falta: new Date().toISOString().split('T')[0],
            ualta: 1
        };

        let url = userId ? `/edit_cliente/${userId}` : "/add_cliente";
        let method = "POST";

        fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                location.reload();
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Hubo un problema al guardar el cliente");
            });
    });


    // ✅ Manejar el evento de clic para editar usuario
    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("editBtn")) {
            let userId = event.target.getAttribute("data-id");

            fetch("/get_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            })
                .then(response => response.json())
                .then(user => {
                    console.log("📌 Datos recibidos:", user);

                    // ✅ Guardamos el ID en el input hidden
                    document.getElementById("edit_id").value = userId;

                    // ✅ Llenamos los demás campos
                    document.getElementById("cedula").value = user.ci;
                    document.getElementById("ruc").value = user.ruc;
                    document.getElementById("nombre").value = user.nombre;
                    document.getElementById("telefono").value = user.telefono;
                    document.getElementById("celular").value = user.celular;
                    document.getElementById("email").value = user.mail;
                    document.getElementById("direccion").value = user.direccion;

                    // ✅ Mostrar el modal de edición
                    let editModal = new bootstrap.Modal(document.getElementById("addModal"));
                    editModal.show();
                })
                .catch(error => {
                    console.error("🚨 Error al obtener usuario:", error);
                    alert("No se pudo cargar los datos del usuario");
                });
        }
    });

    $(document).on("click", ".deleteBtn", function () {
        let userId = $(this).data("id"); // Captura el ID del botón clickeado
        console.log("🗑️ ID del usuario a eliminar:", userId); // Verifica en la consola

        if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
            $.ajax({
                url: `/delete_cliente/${userId}`, // Endpoint en Flask
                type: "DELETE",
                success: function (response) {
                    alert(response.message); // Mensaje de éxito
                    location.reload(); // Recargar la página
                },
                error: function (xhr, status, error) {
                    console.error("🚨 Error al eliminar:", error);
                    alert("Hubo un problema al eliminar el usuario.");
                }
            });
        }
    });


    $(document).ready(function () {
        $(document).on("click", ".toggleStatusBtn", function () {
            let userId = $(this).data("id");
            let currentStatus = $(this).data("status");
            let newStatus = currentStatus === 1 ? 0 : 1; // Cambia el estado

            let confirmMessage = currentStatus === 1
                ? "¿Seguro que quieres dar de baja a este usuario?"
                : "¿Seguro que quieres activar a este usuario?";

            if (confirm(confirmMessage)) {
                $.ajax({
                    url: `/update_status/${userId}`,
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


    document.getElementById("btnadd").addEventListener("click", function () {
        // Limpiar todos los inputs dentro del modal
        document.querySelectorAll("#addModal input").forEach(input => {
            if (input.type !== "hidden") input.value = "";
        });

        // También podés limpiar selects si es necesario
        document.querySelectorAll("#addModal select").forEach(select => {
            select.selectedIndex = 0;
        });


    });

});
