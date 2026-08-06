from flask import request, jsonify, render_template, session, url_for, redirect
from datetime import datetime
from ..models import conexion
from app.models.conexion import get_cursor
from flask_mysqldb import MySQL
import mysql.connector


def contrato():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de contrato."""
    return render_template('contratos_faltantes.html')

def listar_contratos(anio):
    cursor, conn = get_cursor()
    cursor.execute("""
        SELECT 
            m.idmatricula,
            ca.nombre AS alumno,
            c.descripcion AS grado,
            COALESCE(m.contrato, 0) AS contrato
        FROM matricula m
        INNER JOIN clienteasociado ca ON m.idclienteasociado = ca.idclienteasociado
        INNER JOIN cursos c ON m.idgrado = c.idcurso
        WHERE m.anolectivo = %s
          AND COALESCE(m.contrato, 0) = 0
          AND m.activo = 1
        ORDER BY c.idcurso ASC, ca.nombre ASC
    """, (anio,))
    filas = cursor.fetchall()
    cursor.close()
    return jsonify([{"idmatricula": f[0], "nombre": f[1], "grado": f[2], "contrato": f[3]} for f in filas])
