export function numeroALetras(numero) {
    // Simplificado para mostrar la idea — reemplazá con tu función completa
    return `${numero} guaraníes`;
}

export function extraerNombreCompleto(nombre) {
    return nombre ? nombre.toUpperCase() : '';
}

export function imprimirFactura(datosVenta) {
    const { encabezado, detalles } = datosVenta;
    const partes = encabezado.fecha.replaceAll("-", "/").split("/");
    const fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    const razon_social = extraerNombreCompleto(encabezado.razon);

    const html = `
  <html>
  <head>
    <style>
      body { font-family: Arial; font-size: 16px; margin: 0; padding: 0; }
      .contenedor { width: 21cm; height: 14.8cm; padding: 0.5cm; position: relative; }
      .campo { position: absolute; font-size: 16px; }
      .fecha { top: 3.9cm; left: 3.5cm; }
      .ruc { top: 5cm; left: 3.5cm; }
      .razon { top: 5.5cm; left: 4.2cm; }
      .condicion { top: 3.9cm; left: 17.5cm; }
      .tabla-productos { position: absolute; top: 8.2cm; left: 1cm; width: 19cm; font-size: 16px; }
      .importe-total { position: absolute; top: 13.6cm; left: 1.5cm; width: 18cm; font-weight: bold; }
    </style>
  </head>
  <body onload="window.print(); setTimeout(() => window.close(), 500);">
    <div class="contenedor">
      <div class="campo fecha">${fechaFormateada}</div>
      <div class="campo ruc">${encabezado.ruc || ''}</div>
      <div class="campo razon">${razon_social}</div>
      <div class="campo condicion">${encabezado.condicion === "1" ? "Contado" : "Crédito"}</div>

      <table class="tabla-productos">
        ${detalles.map((d, i) => `
          <tr>
            <td style="width: 2cm;">${i + 1}</td>
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

    const win = window.open("", "Impresión", "width=800,height=600");
    win.document.write(html);
    win.document.close();
}