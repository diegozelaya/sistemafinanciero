from flask import request, render_template, jsonify
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os
from flask_mysqldb import MySQL
from datetime import datetime
import io
import pandas as pd
from flask import send_file
from flask import flash, redirect, url_for, session



def ingresos_products():
    
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    cursor, conn = get_cursor()
    cursor.execute("SELECT idproducto, nomproducto FROM producto  WHERE idproducto NOT IN (7, 145) ORDER BY nomproducto ASC")
    productos = [{"idproducto": r[0], "nombre": r[1]} for r in cursor.fetchall()]
    conn.close()

    return render_template('ingresos_por_producto.html', productos=productos)



def ingresos_por_producto():
    cursor, conn = get_cursor()
    cursor.execute("""
        SELECT idproducto, nomproducto
        FROM producto
        WHERE idproducto NOT IN (7, 145)
        ORDER BY nomproducto ASC
    """)
    productos = [{"idproducto": r[0], "nombre": r[1]} for r in cursor.fetchall()]

    print("Productos:", productos)

    resultados = []
    fecha_desde = fecha_hasta = None

    if request.method == "POST":
        producto = request.form["producto"]
        fecha_desde = request.form["fecha_desde"]
        fecha_hasta = request.form["fecha_hasta"]

        # Validación de fechas
        if fecha_desde > fecha_hasta:
            flash("⚠️ La fecha inicial no puede ser mayor o igual que la fecha final.")
        else:
            cursor.execute("""
                SELECT p.nomproducto AS concepto, COALESCE(SUM(vd.preciounitario),0) AS monto
                FROM ventadet vd
                INNER JOIN venta v ON vd.idventa = v.idventa
                INNER JOIN producto p ON vd.idproducto = p.idproducto
                WHERE vd.idproducto = %s
                  AND v.fecha BETWEEN %s AND %s
                GROUP BY p.nomproducto
            """, (producto, fecha_desde, fecha_hasta))

            resultados = [{"concepto": r[0], "monto": r[1]} for r in cursor.fetchall()]

    conn.close()
    return render_template("ingresos_por_producto.html",
                           productos=productos,
                           resultados=resultados,
                           fecha_desde=fecha_desde,
                           fecha_hasta=fecha_hasta)

