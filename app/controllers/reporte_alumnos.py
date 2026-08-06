from flask import request, render_template, jsonify, redirect, session, url_for
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os




def listar_alumnos(id_anio, id_grado):
    orden = request.args.get("orden", "nombre")  # "nombre" o "matricula"

    cursor, conn = get_cursor()

    orden_sql = "a.nombre ASC" if orden == "nombre" else "m.idmatricula ASC"

    cursor.execute(f"""
        SELECT 
            a.nombre AS nombre,
            c.descripcion AS grado,
            m.anolectivo,
            DATE_FORMAT(m.fecha, '%d/%m/%Y') AS fecha_matricula,
            TIMESTAMPDIFF(YEAR, a.fechanacimiento, CURDATE()) AS edad,
            a.sexo,
            a.responsable1,
            a.telefono1,
            a.responsable2,
            a.telefono2
            
        FROM matricula m
        JOIN clienteasociado a ON a.idclienteasociado = m.idclienteasociado
        JOIN cursos c ON c.idcurso = m.idgrado
        WHERE m.anolectivo = %s AND m.idgrado = %s
        ORDER BY {orden_sql}
    """, (id_anio, id_grado))

    alumnos = cursor.fetchall()
    conn.close()

    lista = [
        {
            "nombre": r[0],
            "grado": r[1],
            "aniolectivo": r[2],
            "fecha_matricula": r[3],
            "Edad": r[4],
            "Sexo": r[5],
            "Resp1": r[6],
            "Tel1": r[7],
            "Resp2": r[8],
            "Tel2": r[9],
        } for r in alumnos
    ]
    return jsonify(lista)



def pagina_listado():
    
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
        
    cursor, conn = get_cursor()

    
    cursor.execute("SELECT idcurso, descripcion FROM cursos ORDER BY descripcion ASC")
    grados = [{"idcurso": r[0], "nomcurso": r[1]} for r in cursor.fetchall()]

    conn.close()

    return render_template("reportes_alumnos.html", grados=grados)

