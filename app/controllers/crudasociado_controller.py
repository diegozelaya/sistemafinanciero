from flask import request, jsonify, render_template, session, redirect, url_for
from datetime import datetime
from ..models import conexion
from app.models.conexion import get_cursor
from flask_mysqldb import MySQL
import mysql.connector
import time

  
from app.models.conexion import get_cursor



# Ruta para agregar usuario
def indexasociado():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    try:
        cursor, con = get_cursor()
        cursor.execute("""
            SELECT 
                ca.idclienteasociado, 
                ca.ci, 
                ca.nombre,
                ca.fechanacimiento,
                c.nombre AS cliente_nombre, 
                c.ci AS cliente_ci, 
                ca.responsable1, 
                ca.telefono1, 
                ca.responsable2, 
                ca.telefono2, 
                ca.activo 
            FROM clienteasociado ca
            JOIN cliente c ON ca.idcliente = c.idcliente
        """)
        users = cursor.fetchall()

       

    except Exception as e:
        print(f"⚠️ Error en indexasociado: {e}")
        users = []  # 🔹 Evita que la plantilla falle si hay error en la consulta

    finally:
        cursor.close()
        con.close()

    return render_template('indexasociado.html')

def buscar_clienteaso():
    query = request.args.get("query", "").strip()
    cursor, con = get_cursor()

    try:
        print(f"🔍 Buscando clientes con: {query}")  # Debugging en la consola

        cursor.execute(
            "SELECT idcliente, ci, nombre, ruc FROM cliente WHERE nombre LIKE %s OR ci LIKE %s OR ruc LIKE %s LIMIT 10",
            (f"%{query}%", f"%{query}%", f"%{query}%")
        )

        clientes = [{"id": row[0], "nombre": row[2]} for row in cursor.fetchall()]
        #print("✅ Resultados:", clientes)  # Ver en consola si devuelve datos
        return jsonify(clientes)

    except Exception as e:
        print("🚨 Error en la consulta:", str(e))
        return jsonify({"error": "Error al buscar clientes"}), 500

    finally:
        cursor.close()
        con.close()



def add_clienteaso():
    print("🔍 Recibiendo solicitud POST en /add_clienteaso")

    # Ver qué está llegando al servidor
    print("📩 request.data:", request.data)  
    print("📩 request.json:", request.json)  
    
    
    data = request.get_json()
    cursor, con= get_cursor()
    cursor.execute("INSERT INTO clienteasociado (ci, nombre, idcliente, responsable1, telefono1, responsable2, telefono2, fechanacimiento, sexo, ualta, falta, activo) VALUES (%s, %s, %s, %s, %s,%s,%s,%s,%s,%s,%s,%s)",
                   (data['ci'], data['nombre'], data['cliente'], data['resp1'], data['telef1'], data['resp2'],
                    data['telef2'], data['fechanac'], data['sexo'], data['ualta'], data['falta'], data['activo'],
                   ))
    con.commit()
    return jsonify({"message": "Alumno agregado correctamente"})

# Ruta para editar usuario
#@app.route('/edit/<int:user_id>', methods=['PUT'])
def edit_clienteaso(user_id):
    data = request.get_json()
    cursor, con = get_cursor()
    cursor.execute("""
        UPDATE clienteasociado 
        SET ci=%s, nombre=%s, idcliente=%s, responsable1=%s, telefono1=%s, responsable2=%s, telefono2=%s, fechanacimiento=%s, sexo=%s
        WHERE idclienteasociado=%s
    """, (data['ci'], data['nombre'], data['cliente'], data['resp1'], data['telef1'], 
          data['resp2'], data['telef2'], data['fechanac'], data['sexo'], user_id))
    
    con.commit()
    return jsonify({"message": "Usuario actualizado correctamente"})


#funcion para traer datos para editar
def get_useraso():
    data = request.json
    user_id = data.get("user_id")

    cursor, con = get_cursor()
    cursor.execute("""
        SELECT ca.idclienteasociado, ca.ci, ca.nombre, ca.fechanacimiento, ca.sexo,
               ca.responsable1, ca.telefono1, ca.responsable2, ca.telefono2, ca.idcliente,
               c.nombre AS nombre_cliente
        FROM clienteasociado ca
        LEFT JOIN cliente c ON ca.idcliente = c.idcliente
        WHERE ca.idclienteasociado = %s
    """, (user_id,))

    user = cursor.fetchone()

    if user:
        user_dict = {
            "idclienteasociado": user[0],
            "ci": user[1],
            "nombre": user[2],
            "fechanacimiento": user[3].strftime("%Y-%m-%d") if user[3] else "",  # Manejo de None
            "sexo": user[4],
            "responsable1": user[5],
            "telefono1": user[6],
            "responsable2": user[7],
            "telefono2": user[8],
            "idcliente": user[9],
            "nombre_cliente": user[10]
        }

        return jsonify(user_dict)
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
def search_clienteaso():
    query = request.args.get('query', '')
    print(f"🔍 Buscando: {query}")  # <-- Ver qué valor se recibe
    cursor, con = get_cursor()
    cursor.execute(
    """
    SELECT 
        clienteasociado.idclienteasociado, 
        clienteasociado.ci AS ci_asociado, 
        clienteasociado.nombre AS nombre_asociado, 
        cliente.ci AS ci_cliente, 
        cliente.nombre AS nombre_cliente, 
        clienteasociado.responsable1, 
        clienteasociado.telefono1, 
        clienteasociado.responsable2, 
        clienteasociado.telefono2, 
        clienteasociado.activo,
        clienteasociado.fechanacimiento
    FROM clienteasociado 
    JOIN cliente ON clienteasociado.idcliente = cliente.idcliente 
    WHERE clienteasociado.nombre LIKE %s 
       OR clienteasociado.ci LIKE %s 
       OR cliente.ci LIKE %s 
    LIMIT 10
    """,
    (f"%{query}%", f"%{query}%", f"%{query}%")
)
    
    users = cursor.fetchall()

    # Convertimos los resultados en una lista de diccionarios
    users_list = []
    for user in users:
        users_list.append({
            "idclienteaso": user[0],
            "ci": user[1],
            "nombreaso": user[2],
            "cicliente": user[3],
            "nombrecliente": user[4],
            "resp1": user[5],
            "cel1": user[6],
            "resp2": user[7],
            "cel2": user[8],
            "activo": user[9],
            "fechanac":user[10]
        })

    return jsonify(users_list)  # 🔹 Devolvemos la lista en formato JSON


def update_statusaso(user_id):
    data = request.get_json()
    nuevo_estado = data.get("activo")

    cursor, con = get_cursor()
    try:
        cursor.execute("UPDATE clienteasociado SET activo = %s WHERE idclienteasociado = %s", (nuevo_estado, user_id))
        con.commit()
        message = {"message": "Estado actualizado correctamente"}
    except Exception as e:
        con.rollback()
        message = {"message": f"Error al actualizar estado: {str(e)}"}
    finally:
        cursor.close()
        con.close()

    return jsonify(message)