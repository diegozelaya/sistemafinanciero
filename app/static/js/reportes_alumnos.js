document.getElementById("btnGenerar").addEventListener("click", async () => {
  const idAnio = document.getElementById("selectAnioLectivo").value;
  const idGrado = document.getElementById("selectGrado").value;
  const orden = document.querySelector('input[name="orden"]:checked').value;

  if (!idAnio || !idGrado) {
    alert("⚠️ Debe seleccionar año lectivo y grado");
    return;
  }

  try {
    const res = await fetch(`/listar_alumnos/${idAnio}/${idGrado}?orden=${orden}`);
    const data = await res.json();

    const tbody = document.querySelector("#tablaAlumnos tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center">Sin alumnos para mostrar</td></tr>`;
      document.getElementById("btnExportar").classList.add("d-none");
      return;
    }

    // Contadores
    let totalF = 0;
    let totalM = 0;
    let edades = {}; // { 10: 3, 11: 5, 12: 2 }

    data.forEach((alumno, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${alumno.nombre}</td>
        <td>${alumno.grado}</td>
        <td>${alumno.Edad}</td>
        <td>${alumno.aniolectivo}</td>
        <td>${alumno.Sexo}</td>
        <td>${alumno.fecha_matricula}</td>
        <td>${alumno.Resp1 || ""}</td>
        <td>${alumno.Tel1 || ""}</td>
        <td>${alumno.Resp2 || ""}</td>
        <td>${alumno.Tel2 || ""}</td>
      `;
      tbody.appendChild(tr);

      // Contar F y M
      if (alumno.Sexo === "F") totalF++;
      if (alumno.Sexo === "M") totalM++;

      // Contar edades
      const edad = alumno.Edad;
      if (edad) {
        edades[edad] = (edades[edad] || 0) + 1;
      }
    });

    // Agregar fila resumen de género
    const trResumenGenero = document.createElement("tr");
    trResumenGenero.classList.add("table-info", "fw-bold");
    trResumenGenero.innerHTML = `
      <td colspan="11" class="text-center">
        👧 Niñas (F): ${totalF} &nbsp;&nbsp; 👦 Varones (M): ${totalM} &nbsp;&nbsp; 👨‍👩‍👧‍👦 Total: ${data.length}
      </td>
    `;
    tbody.appendChild(trResumenGenero);

    // Agregar fila resumen de edades
    const trResumenEdad = document.createElement("tr");
    trResumenEdad.classList.add("table-light");
    const resumenEdades = Object.entries(edades)
      .sort(([a], [b]) => a - b)
      .map(([edad, cantidad]) => `${edad} años: ${cantidad}`)
      .join(" | ");
    trResumenEdad.innerHTML = `
      <td colspan="11" class="text-center">📊 Distribución por edad → ${resumenEdades}</td>
    `;
    tbody.appendChild(trResumenEdad);

    // Mostrar botón exportar cuando hay resultados
    document.getElementById("btnExportar").classList.remove("d-none");
    document.getElementById("btnPDF").classList.remove("d-none");


  } catch (err) {
    console.error("❌ Error al listar alumnos:", err);
  }
});

// 🧹 Botón limpiar
document.getElementById("btnLimpiar").addEventListener("click", () => {
  document.getElementById("selectAnioLectivo").value = "";
  document.getElementById("selectGrado").value = "";
  document.querySelector("#tablaAlumnos tbody").innerHTML = "";
  document.getElementById("btnExportar").classList.add("d-none");
});

// 📘 Exportar tabla a Excel real (.xlsx)
document.getElementById("btnExportar").addEventListener("click", () => {
  const tabla = document.getElementById("tablaAlumnos");

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabla);

  XLSX.utils.book_append_sheet(wb, ws, "Listado");

  XLSX.writeFile(wb, "Listado_Alumnos.xlsx");
});


// 📄 Generar PDF
const btnPDF = document.getElementById("btnPDF");
if (btnPDF) {
  btnPDF.addEventListener("click", () => {
    const idAlumno = $('#alumnoestado').val();
    const anio = document.getElementById("selectAnioLectivo").value;

    if (!idAlumno || !anio) {
      alert("Debe seleccionar un alumno y un año lectivo.");
      return;
    }

    // Abrir el PDF generado por Flask en una nueva pestaña
    window.open(`/generar_pdf_estado/${idAlumno}/${anio}`, '_blank');
  });
}

