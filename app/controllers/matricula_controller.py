from flask import request, jsonify, render_template
from datetime import datetime
from ..models import conexion
from app.models.conexion import get_cursor
from flask_mysqldb import MySQL
import mysql.connector

def matricula():
    """Renderiza la página de matriculación."""
    return render_template('Matriculacion.html')

def registrar_matricula():
    data = request.get_json()
    print("Datos recibidos:", data)

    cursor, conn = get_cursor()
    try:
        idclienteasociado = data['idclienteasociado']
        fecha = data['fecha']
        contrato = data['contrato']
        año_lectivo = data['lectivo']
        idgrado = data['grado']
        cant_cuotas = data['cantcuotas']
        importe_total = data['importetotal']
        fecha_alta = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 🔍 Verificar si ya existe matrícula activa para ese alumno y año lectivo
        sql_verificar = """
            SELECT COUNT(*) FROM matricula
            WHERE idclienteasociado = %s AND anolectivo = %s AND activo = 1
        """
        cursor.execute(sql_verificar, (idclienteasociado, año_lectivo))
        existe = cursor.fetchone()[0]

        if existe > 0:
            return jsonify({
                'success': False,
                'error': 'Ya existe una matrícula activa para este alumno en el año lectivo seleccionado.'
            })

        # 🧹 Desactivar otras matrículas y sus detalles
        sql_desactivar_matriculas = """
            UPDATE matricula SET activo = 0
            WHERE idclienteasociado = %s AND idmatricula NOT IN (
                SELECT idmatricula FROM (
                    SELECT idmatricula FROM matricula
                    WHERE idclienteasociado = %s AND anolectivo = %s
                ) AS sub
            )
        """
        cursor.execute(sql_desactivar_matriculas, (idclienteasociado, idclienteasociado, año_lectivo))

        sql_desactivar_detalles = """
            UPDATE matriculadet SET activo = 0
            WHERE idmatricula IN (
                SELECT idmatricula FROM matricula
                WHERE idclienteasociado = %s AND anolectivo != %s
            )
        """
        cursor.execute(sql_desactivar_detalles, (idclienteasociado, año_lectivo))

        # 🆕 Insertar nueva matrícula
        sql_matricula = """
            INSERT INTO matricula (idclienteasociado, fecha, anolectivo, idgrado, cantidadcuotas, importetotal, falta, activo, contrato)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 1, %s)
        """
        cursor.execute(sql_matricula, (idclienteasociado, fecha, año_lectivo, idgrado, cant_cuotas, importe_total, fecha_alta, contrato))
        idmatricula = cursor.lastrowid

        # 📥 Insertar detalles de matrícula
        detalles = data['detalles']
        sql_detalle = """
            INSERT INTO matriculadet (
                idmatricula, nrocuota, debito, credito, fechavencimiento, ualta, falta, activo
            )
            VALUES (%s, %s, CAST(%s AS DECIMAL(15,2)), %s, %s, %s, %s, 1)
        """

        for detalle in detalles:
            try:
                monto_raw = str(detalle['monto'])
                monto_limpio = float(monto_raw.replace('.', '').replace(',', '.'))
            except ValueError:
                conn.rollback()
                return jsonify({'success': False, 'error': f"El monto '{detalle['monto']}' no es válido."})

            cursor.execute(sql_detalle, (
                idmatricula,
                detalle['nro_cuota'],
                monto_limpio,
                0,  # crédito por defecto
                detalle['fecha_vencimiento'],
                1,  # ualta por defecto
                fecha_alta
            ))

        conn.commit()
        return jsonify({'success': True, 'message': 'Matrícula registrada exitosamente'})

    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({'success': False, 'error': str(err)})

    finally:
        cursor.close()
        conn.close()



def obtener_monedas():
    try:
        curmoneda, conn = get_cursor()
        
        # Consulta SQL segura para obtener las monedas
        curmoneda.execute("SELECT idmoneda, nommoneda FROM moneda")
        
        # fetchall() devuelve una lista de tuplas, lo transformamos en diccionarios
        monedas = [{'idmoneda': row[0], 'nommoneda': row[1]} for row in curmoneda.fetchall()]

        return jsonify(monedas)
    except mysql.connector.Error as err:
        # Devuelve el error en formato JSON
        return jsonify({'error': str(err)})
    finally:
        # Cierra el cursor solo si se abrió correctamente
        if curmoneda:
            curmoneda.close()
            conn.close()

# Codigo para buscar asociado en matricula

def buscar_asociado():
    try:
        term = request.args.get('q', '').strip()
        
        if not term:
            return jsonify([])  # Si no hay término de búsqueda, retorna vacío

        
        cursor, conn = get_cursor()

        cursor.execute("""
            SELECT idclienteasociado, nombre, ci
            FROM clienteasociado
            WHERE nombre LIKE %s OR ci LIKE %s
            LIMIT 10
        """, (f'%{term}%', f'%{term}%'))

        results = cursor.fetchall()
        
        cursor.close()

        # Validar que la consulta retorne datos
        if not results:
            return jsonify([])  # Sin resultados, retorna una lista vacía

        # Construir la respuesta
        data = [{'id': row[0], 'text': f"{row[1]} - {row[2]}"} for row in results]
        return jsonify(data)

    except Exception as e:
        print(f"Error en /buscar-asociado: {e}")  # Log del error en la consola
        return jsonify({'error': 'Error interno en el servidor'}), 500

#buscar el Cliente al seleccionar el asociado en el modulo de matriculacion


def obtener_cliente():
    try:
        print("📌 Parámetros recibidos:", request.args, flush=True)  # Debug

        asociado_id = request.args.get('asociado_id')

        if not asociado_id or not asociado_id.isdigit():
            return jsonify({'error': 'ID inválido'}), 400

        asociado_id = int(asociado_id)
        cursor, conn = get_cursor()

        cursor.execute("""
            SELECT cliente.idcliente, cliente.nombre, cliente.ruc
            FROM cliente
            JOIN clienteasociado ON cliente.idcliente = clienteasociado.idcliente
            WHERE clienteasociado.idclienteasociado = %s
            LIMIT 1
        """, (asociado_id,))

        cliente = cursor.fetchone()
        cursor.close()

        if cliente:
            # Devuelve un diccionario en lugar de una lista
            respuesta = {
                'id': cliente[0],
                'nombre': cliente[1],
                'ruc': cliente[2]
            }
            print("✅ Cliente encontrado:", respuesta, flush=True)  # Debug
            return jsonify(respuesta)
        else:
            print("❌ Cliente no encontrado", flush=True)  # Debug
            return jsonify({'error': 'Cliente no encontrado'}), 404

    except Exception as e:
        print(f"🚨 Error en /obtener_cliente: {e}", flush=True)
        return jsonify({'error': 'Error interno en el servidor'}), 500




    # Hace la busqueda del cliente independientemente al asociado
   
def buscar_cliente():
    query = request.args.get("query", "").strip()  # ✅ Evita None y quita espacios extra
    cursor, con = get_cursor()  

    try:
        cursor.execute(
            "SELECT idcliente, ci, nombre, ruc FROM cliente WHERE nombre LIKE %s OR ci LIKE %s OR ruc LIKE %s LIMIT 10",
            (f"%{query}%", f"%{query}%", f"%{query}%")  # ✅ Pasar 3 valores correctamente
        )

        clientes = [{"id": row[0], "ci": row[1], "nombre": row[2], "ruc":row[3]} for row in cursor.fetchall()]  # ✅ Corregir índice de nombre
        return jsonify(clientes)  # ✅ Devolver en JSON
    
    except Exception as e:
        print("🚨 Error en la consulta:", str(e))  # 🔴 Loggear error en consola
        return jsonify({"error": "Error al buscar clientes"}), 500  # ✅ Respuesta HTTP 500 en caso de error
    
    finally:
        cursor.close()  # ✅ Cerrar cursor
        con.close()     # ✅ Cerrar conexión

#funcion para hacer la matriculacion guardando la matricula y sus respectivos detalles


def obtener_cliente():
    try:
        
        asociado_id = request.args.get('asociado_id', type=int)
        if not asociado_id:
            return jsonify({'error': 'No se proporcionó un ID válido'}), 400

        # ✅ Desempaqueta correctamente cursor y conexión
        cursor, conn = get_cursor()  
        
        cursor.execute("""
            SELECT cliente.idcliente, cliente.nombre, cliente.ruc
            FROM cliente
            JOIN clienteasociado ON cliente.idcliente = clienteasociado.idcliente
            WHERE clienteasociado.idclienteasociado = %s
            LIMIT 1
        """, (asociado_id,))
        
        result = cursor.fetchone()
        cursor.close()

        if result:
            return jsonify(result)  # Devuelve la tupla directamente como JSON
        else:
            return jsonify(())

    except Exception as e:
        print(f"Error en /obtener-cliente: {e}")
        return jsonify({'error': 'Error interno en el servidor'}), 500




    data = request.get_json()
    print("Datos recibidos:", data)

    # Obtener el cursor y la conexión correctamente descomprimidos
    cursor, conn = get_cursor()
    print(type(cursor), type(conn))  # Debería imprimir <class 'mysql.connector.cursor_cext.CMySQLCursor'> <class 'mysql.connector.connection_cext.CMySQLConnection'>
    try:
        # Datos para la tabla `matricula`
        idclienteasociado = data['idclienteasociado']
        idmoneda = data['idmoneda']
        fecha = data['fecha']
        año_lectivo = data['lectivo']
        idgrado = data['grado']
        cant_cuotas = data['cantcuotas']
        importe_total = data['importetotal']
        fecha_alta = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        activo= 1

        # Inserción en la tabla `matricula`
        sql_matricula = """
            INSERT INTO matricula (idclienteasociado, idmoneda, fecha, anolectivo, idgrado, cantidadcuotas, importetotal, falta, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        print("Valores a insertar en matricula:", (idclienteasociado, idmoneda, fecha, año_lectivo, idgrado, cant_cuotas, importe_total, fecha_alta, activo))
        cursor.execute(sql_matricula, (idclienteasociado, idmoneda, fecha, año_lectivo, idgrado, cant_cuotas, importe_total, fecha_alta, activo))
        
        idmatricula = cursor.lastrowid  # Obtener el ID de la matrícula insertada
        
        # Inserción en la tabla `matriculadet`
        detalles = data['detalles']  
        sql_detalle = """
            INSERT INTO matriculadet (idmatricula, nrocuota, debito, fechavencimiento, falta)
            VALUES (%s, %s, CAST(%s AS DECIMAL(15,2)), %s, %s)
        """
        
        for detalle in detalles:
            try:
                monto_limpio = float(detalle['monto'].replace('.', '').replace(',', '.'))
            except ValueError:
                return jsonify({'success': False, 'error': f"El monto '{detalle['monto']}' no es válido."})
             
            cursor.execute(sql_detalle, (
                idmatricula,
                detalle['nro_cuota'],
                monto_limpio,
                detalle['fecha_vencimiento'],
                fecha_alta
            ))
        
        # Confirmar los cambios
        conn.commit()
        return jsonify({'success': True, 'message': 'Matrícula registrada exitosamente'})
    
    except mysql.connector.Error as err:
        conn.rollback()  # Deshacer cambios si ocurre un error
        return jsonify({'success': False, 'error': str(err)})
    
    finally:
        cursor.close()
        conn.close()


def verificar_matricula():
    data = request.get_json()
    idcliente = data.get('idcliente')
    anolectivo = data.get('anolectivo')

    cur, conn = get_cursor()
    cur.execute("""
        SELECT COUNT(*) 
        FROM matricula 
        WHERE idclienteasociado = %s AND anolectivo = %s AND activo = 1
    """, (idcliente, anolectivo))
    existe = cur.fetchone()[0] > 0

    cur.close()
    conn.close()
    return jsonify({'existe': existe})



def validar_estado_financiero():
    data = request.json
    id_asociado = data['idcliente']
    ano_actual = int(data['anolectivo'])

    cursor, con = get_cursor()

    # Verificar cuotas pendientes del año anterior
    cursor.execute("""
        SELECT md.idmatriculadet
        FROM matriculadet md
        JOIN matricula m ON m.idmatricula = md.idmatricula
        WHERE md.debito > md.credito
          AND m.idclienteasociado = %s
          AND m.anolectivo = %s
          AND md.activo = 1
    """, (id_asociado, ano_actual - 1))
    cuotas_pendientes = cursor.fetchall()

    # Verificar cuentas pendientes
    cursor.execute("""
        SELECT cdet.idcuentaasodet
        FROM cuenta_aso_detalle cdet
        JOIN cuenta_asociado caso ON caso.idcuentaasociado = cdet.cuenta_aso
        JOIN matricula m ON m.idmatricula = caso.idmatricula
        WHERE m.idclienteasociado = %s AND cdet.debito > cdet.credito
    """, (id_asociado,))
    cuentas_pendientes = cursor.fetchall()
    
    # Verificar si el año lectivo solicitado es anterior al último registrado
    cursor.execute("""
    SELECT MAX(anolectivo) AS ultimo_ano
    FROM matricula
    WHERE idclienteasociado = %s AND activo = 1
    """, (id_asociado,))
    resultado = cursor.fetchone()
    ano_maximo = resultado[0]

    ano_regresivo = False
    
    if ano_maximo and ano_actual < ano_maximo:
        ano_regresivo = True
    
    

    con.close()

    return jsonify({
        "cuotas_pendientes": bool(cuotas_pendientes),
        "cuentas_pendientes": bool(cuentas_pendientes),
        "ano_regresivo": ano_regresivo

    })