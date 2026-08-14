from flask import request, jsonify, render_template, session, redirect, url_for
from datetime import datetime
from ..models import conexion
from app.models.conexion import get_cursor
from flask_mysqldb import MySQL
import mysql.connector
  
from app.models.conexion import get_cursor



# Ruta para agregar usuario
def indexpadres():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    cursor, con = get_cursor()
    cursor.execute("SELECT idcliente, ci, ruc, nombre, telefono, celular, mail, direccion, activo FROM cliente")
    users = cursor.fetchall()
    cursor.close()
    con.close()
    return render_template('indexpadre.html')
#@app.route('/add', methods=['POST'])
def add_cliente():
    data = request.get_json()
    cursor, con = get_cursor()

    sql = """
        INSERT INTO cliente (
            ci, ruc, nombre, telefono, celular, mail, tipocliente,
            falta, ualta, direccion, activo
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
    """

    cursor.execute(sql, (
        data['ci'],
        data.get('ruc'),
        data['nombre'],
        data.get('telefono'),
        data.get('celular'),
        data.get('mail'),
        data['tipocliente'],
        data['falta'],
        data['ualta'],
        data.get('direccion')
    ))

    con.commit()
    return jsonify({"message": "Usuario agregado correctamente"})


# Ruta para editar usuario
#@app.route('/edit/<int:user_id>', methods=['PUT'])
def edit_cliente(user_id):
    data = request.get_json()
    cursor, con = get_cursor()
    cursor.execute("""
        UPDATE cliente 
        SET ci=%s, ruc=%s, nombre=%s, telefono=%s, celular=%s, mail=%s, tipocliente=%s, falta=%s, ualta=%s, direccion=%s
        WHERE idcliente=%s
    """, (data['ci'], data['ruc'], data['nombre'], data['telefono'], data['celular'], 
          data['mail'], data['tipocliente'], data['falta'], data['ualta'], data['direccion'], user_id))
    
    con.commit()
    return jsonify({"message": "Usuario actualizado correctamente"})


#funcion para traer datos para editar
def get_user():
    data = request.get_json()  # 🔹 Recibe los datos JSON enviados en el POST
    user_id = data.get("user_id")  # 🔹 Extrae el user_id del JSON

    print(f"🛠 Recibido user_id: {user_id}")  # Para depuración

    if not user_id:
        return jsonify({"error": "Falta el user_id"}), 400  # 🔹 Manejo de error si falta el ID

    try:
        cursor, con = get_cursor()
        cursor.execute("SELECT ci, ruc, nombre, telefono, celular, mail, direccion FROM cliente WHERE idcliente = %s", (user_id,))
        user = cursor.fetchone()
    except Exception as e:
        print(f"❌ Error en la base de datos: {e}")
        return jsonify({"error": "Error al obtener usuario"}), 500
    finally:
        cursor.close()
        con.close()

    if user:
        user_dict = {
            "ci": user[0],  
            "ruc": user[1],
            "nombre": user[2],
            "telefono": user[3],
            "celular": user[4],
            "mail": user[5],
            "direccion": user[6]
        }
        return jsonify(user_dict)  # ✅ Devuelve el usuario encontrado
    else:
        return jsonify({"error": "Usuario no encontrado"}), 404


# Ruta para eliminar usuario
#@app.route('/delete/<int:user_id>', methods=['DELETE'])
def delete_cliente(user_id):
    cursor, con = get_cursor()
    print(f"🛠 Recibido user_id para eliminar: {user_id}")
    try:
        cursor.execute("DELETE FROM cliente WHERE idcliente=%s", (user_id,))
        con.commit()
        message = {"message": "Usuario eliminado correctamente"}
    except Exception as e:
        con.rollback()
        message = {"message": f"Error al eliminar usuario: {str(e)}"}
    finally:
        cursor.close()
        con.close()
    
    return jsonify(message)



# Ruta para buscar usuarios
#@app.route('/search', methods=['GET'])
def search_cliente():
    query = request.args.get('query', '')
    print(f"🔍 Buscando: {query}")  # <-- Ver qué valor se recibe
    cursor, con = get_cursor()
    cursor.execute("""
        SELECT idcliente, ci, ruc, nombre, telefono, celular, mail, direccion, activo
        FROM cliente 
        WHERE ci LIKE %s OR nombre LIKE %s OR ruc LIKE %s
    """, (f"%{query}%", f"%{query}%", f"%{query}%"))
    
    users = cursor.fetchall()

    # Convertimos los resultados en una lista de diccionarios
    users_list = []
    for user in users:
        users_list.append({
            "idcliente": user[0],
            "ci": user[1],
            "ruc": user[2],
            "nombre": user[3],
            "telefono": user[4],
            "celular": user[5],
            "mail": user[6],
            "direccion": user[7],
             "activo": user[8],
        })

    return jsonify(users_list)  # 🔹 Devolvemos la lista en formato JSON


def update_status(user_id):
    data = request.get_json()
    nuevo_estado = data.get("activo")

    cursor, con = get_cursor()
    try:
        cursor.execute("UPDATE cliente SET activo = %s WHERE idcliente = %s", (nuevo_estado, user_id))
        con.commit()
        message = {"message": "Estado actualizado correctamente"}
    except Exception as e:
        con.rollback()
        message = {"message": f"Error al actualizar estado: {str(e)}"}
    finally:
        cursor.close()
        con.close()

    return jsonify(message)