from flask import request, render_template, jsonify, session, redirect, url_for
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os



def editmatricula():
    if "user_id" not in session:
        return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('edit-matricula.html')


from flask import request, jsonify

def buscar_matricula():
    data = request.get_json()
    asociado = data.get("alumno")  # Este es el idclienteasociado que queremos filtrar
    print("Datos recibidos:", data)

    # Validar que se recibió el ID del alumno
    if not asociado:
        return jsonify({"error": "Falta el parámetro 'alumno' en el cuerpo de la solicitud"}), 400

    query = """
        SELECT 
            m.idmatricula, 
            m.idclienteasociado, 
            alumno.nombre,
            m.anolectivo, 
            m.falta, 
            m.activo, 
            m.idgrado,
            c.descripcion
        FROM matricula AS m
        INNER JOIN clienteasociado AS alumno ON m.idclienteasociado = alumno.idclienteasociado
        INNER JOIN cursos as c on m.idgrado=c.idcurso
        WHERE alumno.idclienteasociado = %s;
    """

    params = (asociado,)  # 👈 Tu parámetro para el WHERE
    print("Parámetros:", params)

    cur, con = get_cursor()  # Asegúrate de que esta función retorna cursor y conexión
    cur.execute(query, params)
    filas = cur.fetchall()

    columnas = [col[0] for col in cur.description]
    resultados = [dict(zip(columnas, fila)) for fila in filas]

    return jsonify(resultados)




def obtener_factura(id):
    cur = get_cursor()
    cur.execute("SELECT cliente, monto FROM factura WHERE id = %s", (id,))
    row = cur.fetchone()
    if row:
        return jsonify({"cliente": row[0], "monto": row[1]})
    return jsonify({"error": "No encontrada"}), 404



def editar_factura(id):
    data = request.get_json()
    cliente = data.get("cliente")
    monto = data.get("monto")

    cur = get_cursor()
    cur.execute("UPDATE factura SET cliente = %s, monto = %s WHERE id = %s", (cliente, monto, id))
    cur.connection.commit()
    return jsonify({"success": True})






def buscar_clientefact():
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
        

def buscar_alumno():
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
        data = [{'id': row[0], 'nombre':row[1], 'ci':  row[2]} for row in results]
        return jsonify(data)

    except Exception as e:
        print(f"Error en /buscar-asociado: {e}")  # Log del error en la consola
        return jsonify({'error': 'Error interno en el servidor'}), 500



def obtener_matricula(id_matricula):
    try:
        cursor, conn = get_cursor()

        # Cabecera de matrícula con contrato
        cursor.execute("""
        SELECT 
            m.idmatricula, 
            m.idclienteasociado, 
            alumno.nombre,
            m.anolectivo, 
            m.falta, 
            m.activo, 
            m.idgrado,
            c.descripcion,
            COALESCE(m.contrato, 0) AS contrato   -- 🔹 si es NULL, devuelve 0
        FROM matricula AS m
        INNER JOIN clienteasociado AS alumno ON m.idclienteasociado = alumno.idclienteasociado
        INNER JOIN cursos as c on m.idgrado=c.idcurso
        WHERE m.idmatricula = %s;
        """, (id_matricula,))
       
        detalles = cursor.fetchall()

        # Detalles de cuotas
        cursor.execute("""
        SELECT
            md.idmatriculadet, 
            md.nrocuota, 
            DATE(md.fechavencimiento) as fecha_vencimiento, 
            md.debito,
            md.credito, 
            m.idclienteasociado, 
            aso.nombre,  
            (md.debito - md.credito) AS monto_pendiente
        FROM matriculadet md
        JOIN matricula m ON m.idmatricula = md.idmatricula
        JOIN clienteasociado aso ON m.idclienteasociado = aso.idclienteasociado
        WHERE  m.idmatricula = %s
        """, (id_matricula,))
        cuotas_raw = cursor.fetchall()

        cursor.close()

        # Procesar cabecera
        detalles_json = [
            {
                'idmatricula': d[0],
                'nombre': d[2],
                'anolectivo': d[3],
                'grado': d[7],
                'contrato': d[8]   # 🔹 ya viene como 0 si era NULL
            } for d in detalles
        ]

        # Procesar cuotas
        detalles_cuotas = [
            {
                'idmatriculadet': c[0],
                'nrocuota': c[1],
                'fechavenc': c[2],
                'debito': c[3],
                'credito': c[4],
                'pendiente': c[7]
            } for c in cuotas_raw
        ]
        
        return jsonify({
            'cabezamatricula': detalles_json,
            'detallecuota': detalles_cuotas
        })
    
    except Exception as e:
        print(f"Error al obtener matrícula: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

    
    

    
    

def datosfactura(id_venta):
    try:
        cursor, conn = get_cursor()

        # Obtener encabezado: fecha, cliente, CI/RUC, tipo de pago, total
        cursor.execute("""
            SELECT 
                v.fecha, 
                c.nombre AS razon, 
                c.ci AS ruc, 
                v.condicion, 
                v.total
            FROM venta v
            JOIN clienteasociado c ON v.idclienteasociado = c.idclienteasociado
            WHERE v.idventa = %s
        """, (id_venta,))
        encabezado_raw = cursor.fetchone()

        if not encabezado_raw:
            return jsonify({'error': 'Venta no encontrada'}), 404

        encabezado = {
            'fecha': encabezado_raw[0].strftime('%Y-%m-%d'),
            'razon': encabezado_raw[1],
            'ruc': encabezado_raw[2],
            'condicion': str(encabezado_raw[3]),
            'totalGeneral': int(encabezado_raw[4])
        }

        # Obtener detalles: descripción y monto (precio unitario)
        cursor.execute("""
            SELECT 
                descripcion, 
                preciounitario
            FROM ventadet
            WHERE idventa = %s
        """, (id_venta,))
        detalles_raw = cursor.fetchall()

        detalles = [
            {
                'descripcion': row[0],
                'monto': int(row[1])
            } for row in detalles_raw
        ]

        cursor.close()
        return jsonify({
            'encabezado': encabezado,
            'detalles': detalles
        })

    except Exception as e:
        print(f"Error al obtener datos factura: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    

def obtener_venta_por_id(venta_id):
    cursor, conn= get_cursor()
    cursor = conn.cursor(dictionary=True)

    # Obtener encabezado
    cursor.execute("""
    SELECT 
        v.fecha, 
        c.ruc, 
        c.nombre, 
        v.idcondpago,
        (SELECT SUM(subtotal) FROM ventadet WHERE idventa = v.idventa) AS total_general
    FROM venta AS v
    JOIN cliente AS c ON v.idcliente = c.idcliente
    WHERE v.idventa = %s
    """, (venta_id,))

    encabezado = cursor.fetchone()

    # Obtener detalles
    cursor.execute("SELECT descripcion, subtotal FROM ventadet WHERE idventa = %s", (venta_id,))
    detalles = cursor.fetchall()

    cursor.close()
    conn.close()

    if encabezado:
        return {
            'encabezado': encabezado,
            'detalles': detalles
        }
    return None




def editar_factura(venta_id):
    data = request.get_json()

    idventa = data.get('id_venta')
    fecha = data.get('fecha')
    pago_efectivo = data.get('pago_efectivo', 0)
    pago_transferencia = data.get('pago_transferencia', 0)
    pago_cheque = data.get('pago_cheque', 0)
    pago_descuento = data.get('pago_descuento', 0)

    if not idventa:
        return jsonify({'ok': False, 'error': 'Falta id_venta'})

    try:
        cur, conn = get_cursor()

        # Actualizar tabla ventas
        cur.execute("""
            UPDATE venta
            SET fecha = %s
            WHERE idventa = %s
        """, (fecha, idventa))

        # Actualizar tabla cobro
        cur.execute("""
            UPDATE cobro
            SET importeefectivo = %s,
                importetransferencia = %s,
                importecheque = %s,
                importedescuento = %s
            WHERE idventa = %s
        """, (
            pago_efectivo,
            pago_transferencia,
            pago_cheque,
            pago_descuento,
            idventa
        ))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'ok': True})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})
    
    
    

def detalle_factura(id_venta):
    try:
        cur, conn = get_cursor()

        # Consultar la venta
        cur.execute("""
            SELECT nro_factura, fecha
            FROM ventas
            WHERE idventa = %s
        """, (id_venta,))
        venta = cur.fetchone()

        if not venta:
            return jsonify({'ok': False, 'error': 'Venta no encontrada'})

        # Consultar el cobro relacionado
        cur.execute("""
            SELECT efectivo, transferencia, cheque, descuento_sueldo
            FROM cobro
            WHERE idventa = %s
        """, (id_venta,))
        cobro = cur.fetchone()

        cur.close()
        conn.close()

        # Combinar resultados en un solo dict
        factura = {
            'nro_factura': venta[0],
            'fecha': venta[1].strftime('%Y-%m-%d') if venta[1] else '',
            'pago_efectivo': cobro[0] if cobro else 0,
            'pago_transferencia': cobro[1] if cobro else 0,
            'pago_cheque': cobro[2] if cobro else 0,
            'pago_descuento': cobro[3] if cobro else 0
        }

        return jsonify(factura)

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})
    
    
    

def detalle(id_venta):
    try:
        cur, conn = get_cursor()

        # Consultar la venta
        cur.execute("""
            SELECT factura, fecha
            FROM venta
            WHERE idventa = %s
        """, (id_venta,))
        venta = cur.fetchone()

        if not venta:
            return jsonify({'ok': False, 'error': 'Venta no encontrada'})

        # Consultar el cobro relacionado
        cur.execute("""
            SELECT importeefectivo, importetransferencia, importecheque, importedescuento
            FROM cobro
            WHERE idventa = %s
        """, (id_venta,))
        cobro = cur.fetchone()

        cur.close()
        conn.close()

        # Combinar resultados en un solo dict
        factura = {
            'nro_factura': venta[0],
            'fecha': venta[1].strftime('%Y-%m-%d') if venta[1] else '',
            'pago_efectivo': cobro[0] if cobro else 0,
            'pago_transferencia': cobro[1] if cobro else 0,
            'pago_cheque': cobro[2] if cobro else 0,
            'pago_descuento': cobro[3] if cobro else 0
        }

        return jsonify(factura)

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})
    


def desactivar_mat(idmatricula):
    try:
        cur, conn = get_cursor()

        # 1. Anular la venta
        cur.execute("UPDATE matricula SET activo = 0 WHERE idmatricula = %s", (idmatricula,))

        # 2. Anular los detalles de venta
        cur.execute("UPDATE matriculadet SET activo = 0 WHERE idmatricula = %s", (idmatricula,))

        

       

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'ok': True})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})



    
def obtener_cursos():
    cursor, conn = get_cursor()
    cursor.execute("SELECT idcurso, descripcion FROM cursos ORDER BY idcurso")
    cursos = cursor.fetchall()
    cursor.close()
    return jsonify([
        {'id': c[0], 'descripcion': c[1]} for c in cursos
    ])


def actualizar_matricula():
    try:
        data = request.get_json()

        # Datos principales
        id_matricula = data.get("idMatricula")
        ano_lectivo = data.get("anoLectivo")
        curso_id = data.get("curso")
        contrato = data.get("contrato", 0)   # 🔹 si no viene, se guarda como 0
        cuotas = data.get("cuotas", [])

        if not id_matricula or not ano_lectivo or not curso_id:
            return jsonify({"success": False, "message": "Faltan datos principales"}), 400

        cursor, con = get_cursor()

        # 🔹 Actualizar cabecera de matrícula
        cursor.execute("""
            UPDATE matricula 
            SET anolectivo = %s, idgrado = %s, contrato = %s
            WHERE idmatricula = %s
        """, (ano_lectivo, curso_id, contrato, id_matricula))

        # 🔹 Actualizar detalle de cuotas
        for cuota in cuotas:
            iddetalle = cuota.get("iddetalle")
            nueva_fecha = cuota.get("nuevaFecha")
            nuevo_debito = cuota.get("nuevoDebito")

            if not iddetalle:
                continue

            cursor.execute("""
                UPDATE matriculadet
                SET fechavencimiento = %s, debito = %s
                WHERE idmatriculadet = %s
            """, (nueva_fecha, nuevo_debito, iddetalle))

        con.commit()
        return jsonify({"success": True, "message": "Matrícula actualizada correctamente"})

    except Exception as e:
        print("❌ Error en actualizar_matricula:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

