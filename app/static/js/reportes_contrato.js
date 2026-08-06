document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("btnGenerar").addEventListener("click", async () => {
    const idAnio = document.getElementById("selectAnioLectivo").value;
    const textoAnio = document.querySelector("#selectAnioLectivo option:checked").textContent;

    // Encabezado dinámico
    const encabezado = document.getElementById("encabezadoReporte");
    encabezado.textContent = `Alumnos sin contrato — Año Lectivo: ${textoAnio}`;
    encabezado.classList.remove("d-none");

    if (!idAnio) {
      alert("⚠️ Debe seleccionar año lectivo");
      return;
    }

    try {
      const res = await fetch(`/listar_contratos/${idAnio}`);
      const data = await res.json();

      const tbody = document.querySelector("#tablaAlumnos tbody");
      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">Todos los alumnos tienen contrato firmado</td></tr>`;
        document.getElementById("btnExportar").classList.add("d-none");
        return;
      }

      // Cargar alumnos
      data.forEach((alumno, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${alumno.nombre}</td>
          <td>${alumno.grado}</td>
        `;
        tbody.appendChild(tr);
      });

      // Mostrar botón exportar
      document.getElementById("btnExportar").classList.remove("d-none");

    } catch (err) {
      console.error("❌ Error al listar alumnos:", err);
    }
  });

  // Botón limpiar
  document.getElementById("btnLimpiar").addEventListener("click", () => {
    document.getElementById("selectAnioLectivo").value = "";
    document.querySelector("#tablaAlumnos tbody").innerHTML = "";
    document.getElementById("btnExportar").classList.add("d-none");
    document.querySelector("#encabezadoReporte").innerHTML = "";
  });

  // Exportar a Excel
  document.getElementById("btnExportar").addEventListener("click", () => {
    const tabla = document.getElementById("tablaAlumnos");
    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Alumnos sin contrato" });
    XLSX.writeFile(wb, "alumnos_sin_contrato.xlsx");
  });
});
