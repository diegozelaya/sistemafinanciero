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

def resumen():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    """Renderiza la página de ventas."""
    return render_template('resumen.html')

from decimal import Decimal



def generar_planilla_r():
    fecha_desde = request.form.get("fecha_desde")
    fecha_hasta = request.form.get("fecha_hasta")

    # Llamamos a la función que arma la planilla con SQL puro
    planilla, total_general = obtener_ventas(fecha_desde, fecha_hasta)

    return render_template(
            "resumen.html",
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            planilla=planilla,
            total_general=total_general
        )



def obtener_ventas(fecha_desde, fecha_hasta):
    cursor, conn = get_cursor()
    
    cursor.execute("""
        SELECT v.factura,
               v.fecha,
               c.nombre AS nombre,
               COALESCE(c.ruc, c.ci) AS ruc,
               CASE 
                   WHEN v.activo = 0 THEN 0
                   ELSE SUM(d.subtotal)
               END AS total,
               CASE 
                   WHEN v.activo = 0 THEN 'ANULADO'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idproducto IS NOT NULL) THEN 'PRODUCTOS'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idmatriculadet IS NOT NULL) THEN 'CUOTAS'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idcuentaasociado IS NOT NULL) THEN 'CUENTAS'
                   ELSE 'VENTA'
               END AS concepto
        FROM venta v
        LEFT JOIN cliente c ON v.idcliente = c.idcliente
        LEFT JOIN ventadet d ON v.idventa = d.idventa
        WHERE v.fecha BETWEEN %s AND %s
        GROUP BY v.idventa, v.factura, v.fecha, c.ruc, c.ci, c.nombre, v.activo
        ORDER BY v.fecha ASC;
    """, (fecha_desde, fecha_hasta))

    filas = cursor.fetchall()
    conn.close()

    planilla = []
    total_general = 0 

    for factura, fecha, nombre, ruc, total, concepto in filas:
        fila = {
            "nro_factura": factura,
            "fecha": fecha.strftime("%Y-%m-%d"),
            "tipo": "FACTURA",
            "ruc": ruc,
            "concepto": concepto,
            "total": formatear_numero_r(total),
            "nombre": nombre,
            "monto": 0,
            "tasa": 0
        }
        planilla.append(fila)
        total_general += total  

    return planilla, formatear_numero_r(total_general)





def generar_planilla_r():
    fecha_desde = request.form.get("fecha_desde")
    fecha_hasta = request.form.get("fecha_hasta")

    # Llamamos a la función que arma la planilla con SQL puro
    planilla, total_general = obtener_ventas(fecha_desde, fecha_hasta)

    return render_template(
            "resumen.html",
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            planilla=planilla,
            total_general=total_general
        )



def obtener_ventas_ex(fecha_desde, fecha_hasta):
    cursor, conn = get_cursor()
    
    cursor.execute("""
        SELECT v.factura,
               v.fecha,
               c.nombre AS nombre,
               COALESCE(c.ruc, c.ci) AS ruc,
               CASE 
                   WHEN v.activo = 0 THEN 0
                   ELSE SUM(d.subtotal)
               END AS total,
               CASE 
                   WHEN v.activo = 0 THEN 'ANULADO'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idproducto IS NOT NULL) THEN 'PRODUCTOS'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idmatriculadet IS NOT NULL) THEN 'CUOTAS'
                   WHEN EXISTS (SELECT 1 FROM ventadet d2 WHERE d2.idventa = v.idventa AND d2.idcuentaasociado IS NOT NULL) THEN 'CUENTAS'
                   ELSE 'VENTA'
               END AS concepto
        FROM venta v
        LEFT JOIN cliente c ON v.idcliente = c.idcliente
        LEFT JOIN ventadet d ON v.idventa = d.idventa
        WHERE v.fecha BETWEEN %s AND %s
        GROUP BY v.idventa, v.factura, v.fecha, c.ruc, c.ci, c.nombre, v.activo
        ORDER BY v.fecha ASC;
    """, (fecha_desde, fecha_hasta))

    filas = cursor.fetchall()
    conn.close()

    planilla = []
    total_general = 0 

    for factura, fecha, nombre, ruc, total, concepto in filas:
        fila = {
            "nro_factura": factura,
            "fecha": fecha.strftime("%Y-%m-%d"),
            "tipo": "FACTURA",
            "ruc": ruc,
            "concepto": concepto,
            "total": total,
            "nombre": nombre,
            "monto": 0,
            "tasa": 0
        }
        planilla.append(fila)
        total_general += total  

    return planilla, total_general



   
def exportar_excel_r():
    fecha_desde = request.form.get("fecha_desde")
    fecha_hasta = request.form.get("fecha_hasta")
    print("las fechas", fecha_desde, fecha_hasta)

    planilla, total_general = generar_planilla_data_r(fecha_desde, fecha_hasta)

    # Crear DataFrame con la planilla
    df = pd.DataFrame(planilla)

    # Agregar fila de TOTAL GENERAL al final
    df.loc[len(df)] = ["", "", "", "", "", "TOTAL GENERAL", total_general, 0, 0]

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Planilla")

        # Obtener workbook y worksheet
        workbook  = writer.book
        worksheet = writer.sheets["Planilla"]

        # Formato numérico sin puntos ni decimales
        formato_numero = workbook.add_format({"num_format": "0"})

        # Aplicar formato a las columnas que tienen números
        # (columna 6 = "IVA INCLUIDO", columna 7 = "Monto", columna 8 = "Tasa")
        worksheet.set_column(6, 8, 15, formato_numero)

    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="planilla_ventas.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )










    


def formatear_numero_r(valor):
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


def generar_planilla_data_r(fecha_desde, fecha_hasta):
    print("las fechas", fecha_desde, fecha_hasta)
    # Llamamos a la función que arma la planilla con SQL puro
    planilla, total_general = obtener_ventas_ex(fecha_desde, fecha_hasta)
    

    return planilla, total_general
           
           
            
        


