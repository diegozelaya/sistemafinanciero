from flask import request, render_template, jsonify
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os
from flask_mysqldb import MySQL
from datetime import datetime
import io
import pandas as pd
from flask import send_file, session, redirect, url_for


def arqueo():
    if "user_id" not in session:
        return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('arqueo.html')

from decimal import Decimal

def generar_planilla():
    fecha_desde = request.form['fecha_desde']
    fecha_hasta = request.form['fecha_hasta']

    cursor, con = get_cursor()

    # --- Consulta de ventas ---
    query = """
        SELECT 
            vd.idventadet,
            vd.subtotal,
            c.nombre,
            v.idventa,
            v.factura,
            m.nrocuota,
            p.nomproducto AS producto_nombre,
            ca.idproducto AS producto_cuenta,
            ca.descripcion,
            v.activo
        FROM ventadet vd
        INNER JOIN venta v ON v.idventa = vd.idventa
        INNER JOIN cliente c ON c.idcliente = v.idcliente
        LEFT JOIN matriculadet m ON vd.idmatriculadet = m.idmatriculadet
        LEFT JOIN producto p ON vd.idproducto = p.idproducto
        LEFT JOIN cuenta_aso_detalle cd ON vd.idcuentaasociado = cd.idcuentaasodet
        LEFT JOIN cuenta_asociado ca ON cd.idcuentaasodet = ca.idcuentaasociado
        WHERE v.fecha BETWEEN %s AND %s;
    """
    cursor.execute(query, (fecha_desde, fecha_hasta))
    resultados = cursor.fetchall()

    columnas = [desc[0] for desc in cursor.description]
    resultados_dict = [dict(zip(columnas, fila)) for fila in resultados]

    # --- Consulta de cobros por venta ---
    query_cobros = """
        SELECT 
            v.factura,
            SUM(c.importeefectivo) AS efectivo,
            SUM(c.importecheque) AS cheque,
            SUM(c.importetransferencia) AS transferencia,
            SUM(c.importedescuento) AS descuento
        FROM cobro c
        INNER JOIN venta v ON v.idventa = c.idventa
        WHERE c.fecha BETWEEN %s AND %s
        GROUP BY v.factura;
    """
    cursor.execute(query_cobros, (fecha_desde, fecha_hasta))
    resultados_cobros = cursor.fetchall()
    cobros_dict = {fila[0]: fila[1:] for fila in resultados_cobros}

    # --- Inicialización ---
    facturas = {}
    totales = {col: 0 for col in ["Matricula", "Cuota", "Fotocopia", "Seguro Médico", "Mora", "Uniforme", "Libros", "Librería", "R Justas"]}
    total_cobros = {"Efectivo": 0, "Cheque": 0, "Transferencia": 0, "Desc. Sueldo": 0}

    # --- Procesamiento de ventas ---
    for fila in resultados_dict:
        factura = fila['factura']

        if fila['activo'] == 0:
            facturas[factura] = ["Anulado", factura] + [0] * 9 
            continue

        if factura not in facturas:
            facturas[factura] = [fila['nombre'], factura] + [0] * 9

        fila_planilla = facturas[factura]

        # Clasificación por tipo de movimiento
        if fila['nrocuota'] == 0:
            fila_planilla[2] += fila['subtotal']
            totales["Matricula"] += fila['subtotal']
        elif fila['nrocuota'] is not None and fila['nrocuota'] != 0:
            fila_planilla[3] += fila['subtotal']
            totales["Cuota"] += fila['subtotal']

        producto = fila['producto_nombre']
        descripcion = fila['descripcion']

        if producto == "Fotocopias":
            fila_planilla[4] += fila['subtotal']
            totales["Fotocopia"] += fila['subtotal']
        elif producto == "Seguro Médico":
            fila_planilla[5] += fila['subtotal']
            totales["Seguro Médico"] += fila['subtotal']
        elif producto == "Libros de Apoyo":
            fila_planilla[8] += fila['subtotal']
            totales["Libros"] += fila['subtotal']
        elif producto in ["Artículos librería", "Artículos Librería"]:
            fila_planilla[9] += fila['subtotal']
            totales["Librería"] += fila['subtotal']
        elif producto in ["cuotas", "cuotas varias", "Pagos cuotas varias"]:
            fila_planilla[3] += fila['subtotal']
            totales["Cuota"] += fila['subtotal']
        elif producto == "Uniformes":
            fila_planilla[7] += fila['subtotal']
            totales["Uniforme"] += fila['subtotal']
        elif producto == "Interes Mora":
            fila_planilla[6] += fila['subtotal']
            totales["Mora"] += fila['subtotal']
        elif producto == "remeras justas":
            fila_planilla[10] += fila['subtotal']
            totales["R Justas"] += fila['subtotal']

        if descripcion == "Refinanciación de matrícula":
            fila_planilla[3] += fila['subtotal']
            totales["Cuota"] += fila['subtotal']

    # --- Agregar cobros a cada fila (convertimos None a 0) ---
    for factura, fila_planilla in facturas.items():
        if factura in cobros_dict:
            cobros = cobros_dict[factura]
            cobros_limpios = [(val or 0) for val in cobros]  # 👈 convertimos None a 0
            fila_planilla.extend(cobros_limpios)
            total_cobros["Efectivo"] += cobros_limpios[0]
            total_cobros["Cheque"] += cobros_limpios[1]
            total_cobros["Transferencia"] += cobros_limpios[2]
            total_cobros["Desc. Sueldo"] += cobros_limpios[3]
        else:
            fila_planilla.extend([0,0,0,0])

    # --- Convertir a lista y formatear (ventas + cobros) ---
    planilla = []
    for fila in facturas.values():
        fila_formateada = []
        for val in fila:
            if isinstance(val, (int, float, Decimal)):   # 👈 incluimos Decimal
                fila_formateada.append(formatear_numero(val))
            else:
                fila_formateada.append(val)
        planilla.append(fila_formateada)

    # --- Totales Ventas dentro de la planilla ---
    planilla.append(
        ["Totales Ventas", ""] +
        [formatear_numero(totales[col]) for col in totales] +
        ["", "", "", "", ""]
    )

    # --- Totales Cobros separados ---
    totales_cobros_final = {
        "Efectivo": formatear_numero(total_cobros["Efectivo"]),
        "Cheque": formatear_numero(total_cobros["Cheque"]),
        "Transferencia": formatear_numero(total_cobros["Transferencia"]),
        "Desc. Sueldo": formatear_numero(total_cobros["Desc. Sueldo"])
    }
    
    # 🔹 Calcular total general de cobros
    total_general_cobros = (
        total_cobros["Efectivo"] +
        total_cobros["Cheque"] +
        total_cobros["Transferencia"] +
        total_cobros["Desc. Sueldo"]
    )

    totales_cobros_final["Total General"] = formatear_numero(total_general_cobros)

    cursor.close()
    con.close()

    return render_template(
        "arqueo.html",
        planilla=planilla,
        totales_cobros=totales_cobros_final,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )


   









def exportar_excel():
    fecha_desde = request.form.get("fecha_desde")
    fecha_hasta = request.form.get("fecha_hasta")
    print("las fechas", fecha_desde, fecha_hasta)
    planilla = generar_planilla_data(fecha_desde, fecha_hasta)

    # Depuración: verificar estructura
    # for fila in planilla:
    #     print(len(fila), fila)

    df = pd.DataFrame(planilla, columns=[
        "Cliente", "Factura", "Matrícula", "Cuota", "Fotocopia",
        "Seguro Médico", "Mora", "Uniforme", "Libros", "Librería", "R Justas"
    ])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Planilla")
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="planilla.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


    


def formatear_numero(valor):
    """
    Devuelve el número con separador de miles (formato latino).
    Ejemplo: 1234567 -> '1.234.567'
    """
    if valor is None or valor == "":
        return ""
    try:
        return f"{int(valor):,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(valor)


def generar_planilla_data(fecha_desde, fecha_hasta):
    cursor, con = get_cursor()

    query = """
        SELECT 
            vd.idventadet,
            vd.subtotal,
            c.nombre,
            v.factura,
            m.nrocuota,
            p.nomproducto AS producto_nombre,
            ca.idproducto AS producto_cuenta,
            ca.descripcion,
            v.activo
        FROM ventadet vd
        INNER JOIN venta v ON v.idventa = vd.idventa
        INNER JOIN cliente c ON c.idcliente = v.idcliente
        LEFT JOIN matriculadet m ON vd.idmatriculadet = m.idmatriculadet
        LEFT JOIN producto p ON vd.idproducto = p.idproducto
        LEFT JOIN cuenta_aso_detalle cd ON vd.idcuentaasociado = cd.idcuentaasodet
        LEFT JOIN cuenta_asociado ca ON cd.idcuentaasodet = ca.idcuentaasociado
        WHERE v.fecha BETWEEN %s AND %s;
    """
    cursor.execute(query, (fecha_desde, fecha_hasta))
    resultados = cursor.fetchall()

    columnas = [desc[0] for desc in cursor.description]
    resultados_dict = [dict(zip(columnas, fila)) for fila in resultados]

    facturas = {}
    totales = {col: 0 for col in ["Matricula", "Cuota", "Fotocopia", "Seguro Médico", "Mora", "Uniforme", "Libros", "Librería", "R Justas"]}

    for fila in resultados_dict:
        factura = fila['factura']

        if fila['activo'] == 0:
            facturas[factura] = ["Anulado", factura] + [None] * 9
            continue

        if factura not in facturas:
            facturas[factura] = [fila['nombre'], factura] + [0] * 9

        fila_planilla = facturas[factura]

        producto = (fila['producto_nombre'] or "").strip().lower()
        descripcion = (fila['descripcion'] or "").strip().lower()

        if fila['nrocuota'] == 0:
            fila_planilla[2] += fila['subtotal']; totales["Matricula"] += fila['subtotal']
        elif fila['nrocuota'] not in (None, 0):
            fila_planilla[3] += fila['subtotal']; totales["Cuota"] += fila['subtotal']

        if producto == "fotocopias":
            fila_planilla[4] += fila['subtotal']; totales["Fotocopia"] += fila['subtotal']
        elif producto == "seguro médico":
            fila_planilla[5] += fila['subtotal']; totales["Seguro Médico"] += fila['subtotal']
        elif producto in ["cuotas", "cuotas varias", "pagos cuotas varias"] or descripcion in ["cuotas", "pagos cuotas varias"]:
            fila_planilla[3] += fila['subtotal']; totales["Cuota"] += fila['subtotal']
        elif producto == "libros de apoyo":
            fila_planilla[8] += fila['subtotal']; totales["Libros"] += fila['subtotal']
        elif producto == "artículos librería":
            fila_planilla[9] += fila['subtotal']; totales["Librería"] += fila['subtotal']
        elif producto == "uniformes":
            fila_planilla[7] += fila['subtotal']; totales["Uniforme"] += fila['subtotal']
        elif producto == "interes mora":
            fila_planilla[6] += fila['subtotal']; totales["Mora"] += fila['subtotal']
        elif producto == "remeras justas":
            fila_planilla[10] += fila['subtotal']; totales["R Justas"] += fila['subtotal']

        if descripcion == "refinanciación de matrícula":
            fila_planilla[3] += fila['subtotal']; totales["Cuota"] += fila['subtotal']

    planilla = list(facturas.values())
    planilla.append(["Totales", ""] + [totales[col] for col in totales])
    print("ìmprimo la planilla para excel", planilla)
    cursor.close(); con.close()
    return planilla
