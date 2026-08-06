
let idMatricula = null;
let totalAdeudado = 0;
document.addEventListener("DOMContentLoaded", function () {

  $('#selectCliente').select2({
    ajax: {
      url: '/buscar_clientes_con_deuda',
      dataType: 'json',
      delay: 250,
      data: params => ({ q: params.term }),
      processResults: data => ({
        results: data.results
      })

    }
  });

  $('#selectCliente').on('change', async function () {
    const idcliente = $(this).val();
    const res = await fetch('/cuotas_pendientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idcliente })
    });

    const data = await res.json();
    idMatricula = data.idmatricula;
    totalAdeudado = data.total;
    $('#tablaCuotas tbody').html('');

    const conceptosCuota = [
      "Matrícula", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre"
    ];

    if (data.cuotas.length === 0) {
      $('#tablaCuotas tbody').append(
        `<tr><td colspan="3" style="text-align:center; color: #a00;">No existen cuotas para refinanciación</td></tr>`
      );
    } else {
      data.cuotas.forEach(c => {
        const nro = parseInt(c.concepto.replace("Cuota ", ""));
        const conceptoFinal = conceptosCuota[nro] || c.concepto;
        $('#tablaCuotas tbody').append(
          `<tr><td>${conceptoFinal}</td><td>${c.vencimiento}</td><td>${c.monto}</td></tr>`
        );
      });
    }

    $('#totalAdeudado').text(formatNumber(totalAdeudado));
  });

  $('#btnRefinanciar').on('click', function () {
    limpiarModalRefinanciacion();
    $('#modalRefinanciar').modal('show');
  });


  $('#cantidadCuotas').on('change', function () {
    const n = parseInt(this.value);
    const container = $('#fechasContainer');
    container.html('');

    for (let i = 0; i < n; i++) {
      container.append(`
      <div class="cuotaGrupo">
        <label class="me-2">Cuota ${i + 1}:</label>
        <input type="date" class="form-control form-control-sm fechaCuota me-2" name="fecha_${i}" />
        <input type="number" class="form-control form-control-sm montoCuota" name="monto_${i}" placeholder="$ Monto" step="0.01" />
      </div>
    `);
    }
  });

  $('#confirmarRefinanciacion').on('click', async function () {
    const fechas = $('.fechaCuota').map((_, el) => el.value).get();
    const montos = $('.montoCuota').map((_, el) => parseFloat(el.value)).get();
    
    
    const total = montos.reduce((acc, val) => acc + val, 0);
    if(totalAdeudado != total){
      alert("La suma de las cuotas no coincide con el total a refinanciar")
      return;

    }
    console.log('Total:', total);
    const idcliente = $('#selectCliente').val();

    if (montos.some(m => isNaN(m) || m <= 0)) {
      alert('Hay montos inválidos o vacíos.');
      return;
    }




    if (fechas.length !== montos.length) {
      alert('La cantidad de fechas y montos no coincide.');
      return;
    }

    const res = await fetch('/refinanciar2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idcliente,
        idmatricula: idMatricula,
        total: totalAdeudado,
        fechas,
        montos
      })
    });

    const result = await res.json();
    alert(result.mensaje);
    location.reload();
  });

  function formatNumber(value) {
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

  function limpiarModalRefinanciacion() {
    document.getElementById('cantidadCuotas').value = '';
    document.getElementById('fechasContainer').innerHTML = '';
  }



});