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
        });

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
                <td>${item.nrocuota}</td>
                <td>${fechalimpia}</td>
                <td>${item.debito}</td>
                <td>${item.credito}</td>
                <td>${item.pendiente}</td>
            `;
            tbody.appendChild(row);
        });
    })
    .catch(error => {
        console.error("❌ Error en fetch:", error);
    });
