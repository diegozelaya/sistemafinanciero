from flask import request, render_template, jsonify, session, redirect, url_for
from ..models import conexion
from app.models.conexion import get_cursor
from datetime import date
import json
import os


def productos():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('productos.html')

def obtener_productos():
    cursor, con = get_cursor()
    cursor.execute("SELECT idproducto, nomproducto, activo FROM producto ")
    productos = cursor.fetchall()
    return jsonify([{"id": p[0], "nombre": p[1], "activo":p[2]} for p in productos])


def agregar_producto():
    data = request.get_json()
    cursor, con = get_cursor()
    hoy= date.today()
    cursor.execute("INSERT INTO producto (nomproducto, activo, falta) VALUES (%s, 1, %s)", (data["nombre"], hoy ))
    con.commit()
    return jsonify({"success": True})


def editar_producto(id):
    data = request.get_json()
    cursor, con = get_cursor()
    cursor.execute("UPDATE producto SET nomproducto=%s WHERE idproducto=%s", (data["nombre"],  id))
    con.commit()
    return jsonify({"success": True})


def toggle_producto(id):
    cursor, con = get_cursor()
    
    # Leer el estado actual
    cursor.execute("SELECT activo FROM producto WHERE idproducto = %s", (id,))
    result = cursor.fetchone()
    if not result:
        return jsonify({"success": False, "message": "Producto no encontrado"}), 404

    estado_actual = result[0]
    nuevo_estado = 0 if estado_actual == 1 else 1  # alternar

    # Actualizar
    cursor.execute(
        "UPDATE producto SET activo=%s WHERE idproducto=%s",
        (nuevo_estado, id)
    )
    con.commit()

    return jsonify({"success": True, "nuevo_estado": nuevo_estado})