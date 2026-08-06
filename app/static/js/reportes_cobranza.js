

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("btnGenerar").addEventListener("click", async () => {
    const idAnio = document.getElementById("selectAnioLectivo").value;
    const idGrado = document.getElementById("selectGrado").value;
    // Obtener el texto visible de los selects
    const textoAnio = document.querySelector("#selectAnioLectivo option:checked").textContent;
    const textoGrado = document.querySelector("#selectGrado option:checked").textContent;

    // Mostrar el encabezado dinámico
    const encabezado = document.getElementById("encabezadoReporte");
    encabezado.textContent = `Curso: ${textoGrado} — Año Lectivo: ${textoAnio}`;
    encabezado.classList.remove("d-none");

    if (!idAnio || !idGrado) {
      alert("⚠️ Debe seleccionar año lectivo y grado");
      return;
    }

    try {
      const res = await fetch(`/listar_cobranza/${idAnio}/${idGrado}`);
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
        console.log(alumno);
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${alumno.nombre}</td>
        <td>${alumno.Matricula}</td>
        <td>${alumno.Fotocopia}</td>
        <td>${alumno.Seguro}</td>
        <td>${alumno.Feb}</td>
        <td>${alumno.Mar}</td>
        <td>${alumno.Ab}</td>
        <td>${alumno.May}</td>
        <td>${alumno.Jun}</td>
        <td>${alumno.Jul}</td>
        <td>${alumno.Ago}</td>
        <td>${alumno.Set}</td>
        <td>${alumno.Oct}</td>
        <td>${alumno.Nov}</td>
      `;
        tbody.appendChild(tr);


      });

      


      // Mostrar botón exportar cuando hay resultados
      console.log("mostrando botones");
      document.getElementById("btnExportar").classList.remove("d-none");


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
    document.querySelector("#encabezadoReporte").innerHTML = "";
  });

  // 📘 Exportar tabla a Excel real (.xlsx)
  document.getElementById("btnExportar").addEventListener("click", () => {
    const tabla = document.getElementById("tablaAlumnos");

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(tabla);

    XLSX.utils.book_append_sheet(wb, ws, "Listado");

    XLSX.writeFile(wb, "Listado_Alumnos.xlsx");
  });


 

});



