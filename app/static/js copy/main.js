const btndelete = document.querySelectorAll('.btn-delete');

if (btndelete) {
  const btnarray = Array.from(btndelete);
  btnarray.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!confirm('Estas seguro de eliminar el registro?')) {
        e.preventDefault();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {

  function convertirAFormatoDDMMYYYY(fechaISO) {
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia}/${mes}/${anio}`;
  }


  // Función para formatear el número con separadores de miles
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

  // Función para convertir el valor formateado a número sin separadores
  function unformatNumber(value) {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }

  let inputTotal = document.getElementById('importetotal');
  let inputCuotas = document.getElementById('cantcuotas');
  let btnGenerar = document.getElementById('generarDetalles');

  // Función para manejar la entrada de números en tiempo real
  function handleInputChange(event) {
    let field = event.target;
    let value = field.value;
    let formattedValue = formatNumber(value);
    field.value = formattedValue;
  }

  // Agregar el evento de formateo en los campos relevantes
  inputTotal.addEventListener('input', handleInputChange);

  // Función para agregar un evento a los campos de cuotas para formateo
  function addInputEventForCuotas() {
    let inputsCuotas = document.querySelectorAll('.nro_cuota');
    inputsCuotas.forEach(function (input) {
      input.addEventListener('input', handleInputChange); // Añadir evento de input a cada campo de monto de cuota
    });
  }

  // Al hacer clic en "Generar Detalles de Pagos"
  btnGenerar.addEventListener('click', async function () {
    let importeTotal = inputTotal.value;
    let cantCuotas = parseInt(inputCuotas.value);
    let anoLectivo = document.getElementById('lectivo').value;
    let idCliente = document.getElementById('asociado').value;

    // Verificar si ya existe matrícula vigente
    const res = await fetch('/verificar_matricula', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idcliente: idCliente, anolectivo: anoLectivo })
    });

    const resultado = await res.json();
    if (resultado.existe) {
      alert("Ya existe una matrícula activa para este alumno en el año lectivo seleccionado.");
      return;
    }

    // Verificar estado financiero
    const estadoRes = await fetch('/validar_estado_financiero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idcliente: idCliente, anolectivo: anoLectivo })
    });

    const estado = await estadoRes.json();
     if (estado.ano_regresivo) {
      const continuar = confirm("El alumno ya estuvo matriculado en un año lectivo posterior. ¿Desea continuar con la inscripción en un año anterior?");
      if (!continuar) return;
    }
    // Si tiene cuotas pendientes del año anterior, bloquear
    if (estado.cuotas_pendientes) {
      alert("El alumno tiene cuotas pendientes del año anterior. No puede ser matriculado.");
      return;
    }

    // Si tiene cuentas pendientes, preguntar si desea continuar
    if (estado.cuentas_pendientes) {
      const continuar = confirm("El alumno tiene cuentas pendientes. ¿Desea continuar con la matriculación?");
      if (!continuar) return;
    }

   
    const contenedor = document.getElementById('contenedorBotonGuardar');

    // Evitá duplicar el botón si ya fue creado
    if (document.getElementById('guardarDatos')) return;

    const form = document.getElementById('productForm');

    // Crear el botón
    const botonHTML = `
      <div class="col-auto">
        <button type="submit" id="guardarDatos" class="btn btn-secondary btn-sm w-100">
          Guardar Matrícula
        </button>
      </div>
    `;

    contenedor.insertAdjacentHTML('beforeend', botonHTML);
    document.getElementById('productForm').addEventListener('submit', function () {
      console.log('Formulario enviado al servidor');
    });

    const guardarBtn = document.getElementById('guardarDatos');
    console.log('¿Está dentro del formulario?', guardarBtn.closest('form') !== null);

    // Eliminar formato de miles y convertir a número
    let importeTotalNumerico = unformatNumber(importeTotal);

    if (cantCuotas <= 0 || isNaN(cantCuotas) || importeTotalNumerico <= 0) {
      alert("Por favor ingrese valores válidos para el importe total y la cantidad de cuotas.");
      return;
    } else if (cantCuotas > 10) {
      alert("Válido solo hasta 10 cuotas")
      return;
    }

    // Calcular monto por cuota (sin matrícula)
    let montoPorCuota = importeTotalNumerico / cantCuotas;

    // Limpiar la tabla de detalles de pagos
    let tabla = document.getElementById('detallesPagos').querySelector('tbody');
    tabla.innerHTML = '';

    // Agregar cuota cero (matrícula con valor cero)

    const hoy = new Date();
    const fecha = new Date().toISOString().split('T')[0]; // "2025-06-19"
    const fechaVencimiento = convertirAFormatoDDMMYYYY(fecha);
    console.log("vencimiento mantricula", fechaVencimiento);



    let cuotaCero = {
      nroCuota: 0,
      monto: 400000,
      fechaVencimiento,
      descripcion: "Matrícula"
    };
    console.log(cuotaCero);
    agregarFilaPago(tabla, cuotaCero);

    // Agregar el resto de las cuotas
    const fechasVencimiento = [
      "28/02/2025",
      "10/03/2025",
      "10/04/2025",
      "10/05/2025",
      "10/06/2025",
      "10/07/2025",
      "10/08/2025",
      "10/09/2025",
      "10/10/2025",
      "10/11/2025"
    ];

    const descripcionesCuotas = [
      "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
      "Agosto", "Septiembre", "Octubre", "Noviembre"
    ];

    for (let i = 1; i <= cantCuotas; i++) {
      let cuota = {
        nroCuota: i,
        monto: montoPorCuota.toFixed(2),
        fechaVencimiento: fechasVencimiento[i - 1] || '',
        descripcion: descripcionesCuotas[i - 1] || ''
      };
      agregarFilaPago(tabla, cuota);
    }

    // Agregar el evento de input a cada campo de monto de cuota después de generar las filas
    addInputEventForCuotas();
  });


  // Función para formatear cada cuota antes de cargarla a la tabla
  function formatCuotas(value) {
    let number = parseFloat(value).toFixed(2);  // Convierte a número con dos decimales
    let parts = number.split('.');  // Separa la parte entera de la parte decimal
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');  // Agrega el separador de miles
    return parts.join(',');  // Junta la parte entera con la parte decimal usando una coma como separador
  }

  // Función para agregar una fila a la tabla de pagos
  function agregarFilaPago(tabla, cuota) {
    let fila = document.createElement('tr');
    let vencimiento_formateado = convertirFechaAFormatoDate(cuota.fechaVencimiento); // formatea la fecha a YYY/MM/DD
    console.log("la fecha de vencimiento formateado es ", vencimiento_formateado);

    fila.innerHTML = `
      <td>${cuota.nroCuota}</td>
      <td>${cuota.descripcion}</td>
      <td><input type="text" name="${cuota.descripcion}" value="${formatCuotas(cuota.monto)}"  class="nro_cuota form-control form-control-sm w-50"></td>
      <td><input type="date" name="vencimiento" value="${vencimiento_formateado}"  class=" form-control form-control-sm w-50"></td>
    `;
    tabla.appendChild(fila);
  }

  function convertirFechaAFormatoDate(fecha) {
    const partes = fecha.split('/');
    const dia = partes[0];
    const mes = partes[1];
    const anio = partes[2];
    return `${anio}-${mes}-${dia}`; // Formato YYYY-MM-DD
  }



});




$(document).ready(function () {
  // Select2 para Asociado
  $('#asociado').select2({
    placeholder: 'Buscar asociado...',
    ajax: {
      url: '/buscar_asociado',  // Flask endpoint
      dataType: 'json',
      delay: 250,
      data: function (params) {
        return {
          q: params.term // Término de búsqueda
        };
      },
      processResults: function (data) {
        return {
          results: data
        };
      },
      cache: true
    }
  });

  // Select2 para Cliente
  $('#cliente').select2({
    placeholder: 'Seleccione un cliente...',
    allowClear: true
  });

  // Al seleccionar un asociado, cargar el cliente automáticamente
  $('#asociado').on('select2:select', function (e) {
    var asociadoId = e.params.data.id;

    $.ajax({
      url: '/obtener_cliente',
      data: { asociado_id: asociadoId },
      dataType: 'json',
      success: function (data) {
        console.log("📌 Datos crudos recibidos del servidor:", data);
        console.log("🔍 Tipo de 'data':", typeof data);

        if (Array.isArray(data)) {
          console.log("⚠️ Data es un array, debería ser un objeto. Accediendo al primer elemento...");
          data = {
            id: data[0],
            nombre: data[1],
            ruc: data[2],
            ci: data[3]  // Agregar el CI al objeto si está en la respuesta
          };
        }

        console.log("✅ Datos finales procesados:", data);
        console.log("ID Cliente:", data.id, "Nombre:", data.nombre, "RUC:", data.ruc, "CI:", data.ci);

        if (!data.id || !data.nombre) {
          alert('Error: datos del cliente incompletos');
          return;
        }

        // Si el RUC está vacío, usa el CI
        let rucValue = data.ruc ? data.ruc : data.ci;

        // Asignar el valor al campo RUC
        $("#cliente").on("change", function () {

          $('#ruc').val(rucValue);

        })
        // Agregar cliente al Select2
        $('#cliente').empty()
          .append(new Option(`${data.nombre} - ${rucValue}`, data.id, true, true))
          .trigger('change');
      },
      error: function (xhr, status, error) {
        console.log("🚨 Error en AJAX:", status, error);
        console.log("🔴 Respuesta del servidor:", xhr.responseText);
        alert('Error al cargar el cliente.');
      }
    });
  });


  // Inicializar select2 para cliente con búsqueda dinámica
  $('#cliente').select2({
    placeholder: 'Seleccione o busque un cliente',
    ajax: {
      url: '/buscar_cliente',
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

  // Cuando se selecciona un cliente
  $('#cliente').on('select2:select', function (e) {
    let data = e.params.data;
    let rucValue = data.ruc ? data.ruc : data.ci;
    $('#ruc').val(rucValue);
  });


  $('#productForm').on('submit', function (e) {
    e.preventDefault();  // Evita la recarga de la página
    var importe_Total = $('#importetotal').val().replace(/\./g, '');

    var detalles = [];
    $('#detallesPagos tbody tr').each(function () {
      var nroCuota = $(this).find('td:eq(0)').text();
      var descripcion = $(this).find('td:eq(1)').text();
      var monto = $(this).find('td:eq(2) input').val();
      var fechaVencimiento = $(this).find('td:eq(3) input').val();
      detalles.push({
        nro_cuota: nroCuota,
        descripcion: descripcion,
        monto: monto,
        fecha_vencimiento: fechaVencimiento
      });
    });

    var formData = {
      idclienteasociado: $('#asociado').val(),
      idmoneda: $('#moneda').val(),
      fecha: $('#fecha').val(),
      lectivo: $('#lectivo').val(),
      grado: $('#grado').val(),
      cantcuotas: parseInt($('#cantcuotas').val(), 10),
      importetotal: importe_Total,
      detalles: detalles
    };

    if (!formData.idclienteasociado || !formData.fecha || !formData.lectivo || !formData.grado || !formData.cantcuotas || !formData.importetotal) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    $.ajax({
      url: '/registrar_matricula',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      success: function (response) {
        if (response.success) {
          alert(response.message);
          $('#productForm')[0].reset();
          $('#detallesPagos tbody').empty();
          setTimeout(function () {
            window.location.reload();
          }, 1000)
        } else {
          alert('Error: ' + response.error);
          setTimeout(function () {
            window.location.reload();
          }, 1000)
        }
      },
      error: function (xhr) {
        alert('Error al registrar la matrícula.');
        console.error(xhr.responseText);
      }
    });
  });

  fetch('/get_timbrados')
    .then(response => response.json())
    .then(data => {
      console.log('Datos recibidos:', data);  // Imprimir los datos recibidos

      let timbradoSelect = document.getElementById("timbrado");

      // Verificar si data tiene el formato correcto
      if (Array.isArray(data)) {

        let defaultTimbradoId = data[0].idtimbrado;
        data.forEach(timbrado => {
          console.log('Timbrado:', timbrado);  // Verificar cada timbrado
          let option = document.createElement("option");
          option.value = timbrado.idtimbrado;  // Asignar idtimbrado como valor de la opción
          option.textContent = timbrado.nrotimbrado;  // Asignar nrotimbrado como texto de la opción

          if (timbrado.idtimbrado === defaultTimbradoId) {
            option.selected = true;
          }

          timbradoSelect.appendChild(option);
        });
      } else {
        console.error('Los datos no tienen el formato esperado');
      }
    })
    .catch(error => console.error('Error al obtener los timbrados:', error));
});


