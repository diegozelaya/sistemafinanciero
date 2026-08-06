from flask import request, render_template, jsonify, session, redirect, url_for
from ..models import conexion
from app.models.conexion import get_cursor
from datetime import date
import json
import os


def timbrados():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('timbrados.html')

def obtener_timbrados():
    cursor, con = get_cursor()
    cursor.execute("""
    SELECT 
        idtimbrado,
        nrotimbrado,
        establecimiento,
        puntoemision,
        fechadesde,
        fechahasta,
        numerodesde,
        numerohasta,
        falta,
        activo,
        estado
    FROM timbrado
""")

    timbrados = cursor.fetchall()

    return jsonify([
        {
            "id": t[0],          # idtimbrado
            "nrotimbrado": t[1], # nrotimbrado
            "establecimiento": t[2],
            "puntoemision": t[3],
            "fechadesde": t[4],
            "fechahasta": t[5],
            "numerodesde": t[6],
            "numerohasta": t[7],
            "falta": t[8],
            "activo": t[9],
            "estado": t[10]
        }
        for t in timbrados
    ])


from flask import request, jsonify
from datetime import date

# Agregar timbrado

def agregar_timbrado():
    data = request.get_json()
    cursor, con = get_cursor()
    hoy = date.today()
    cursor.execute("""
        INSERT INTO timbrado (
            nrotimbrado, establecimiento, puntoemision,
            fechadesde, fechahasta, numerodesde, numerohasta,
            falta, activo, estado
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, 1)
    """, (
        data["nrotimbrado"],
        data["establecimiento"],
        data["emision"],
        data["desde"],
        data["hasta"],
        data.get("numerodesde", 0),
        data.get("numerohasta", 0),
        hoy
    ))
    con.commit()
    return jsonify({"success": True})


# Editar timbrado

def editar_timbrado(id):
    data = request.get_json()
    cursor, con = get_cursor()
    cursor.execute("""
        UPDATE timbrado
        SET nrotimbrado=%s,
            establecimiento=%s,
            puntoemision=%s,
            fechadesde=%s,
            fechahasta=%s
        WHERE idtimbrado=%s
    """, (
        data["nrotimbrado"],
        data["establecimiento"],
        data["emision"],
        data["desde"],
        data["hasta"],
        id
    ))
    con.commit()
    return jsonify({"success": True})


# Activar / Dar de baja timbrado

def toggle_timbrado(id):
    cursor, con = get_cursor()
    cursor.execute("SELECT activo FROM timbrado WHERE idtimbrado = %s", (id,))
    result = cursor.fetchone()
    if not result:
        return jsonify({"success": False, "message": "Timbrado no encontrado"}), 404

    estado_actual = result[0]
    nuevo_estado = 0 if estado_actual == 1 else 1

    cursor.execute("UPDATE timbrado SET activo=%s WHERE idtimbrado=%s", (nuevo_estado, id))
    con.commit()

    return jsonify({"success": True, "nuevo_estado": nuevo_estado})
