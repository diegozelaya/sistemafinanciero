from flask import request, render_template, jsonify
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os

def buscar_facturas():
    data = request.get_json()
    fecha_inicio = data.get("fechaInicio")
    fecha_fin = data.get("fechaFin")
    cliente = data.get("cliente")
    nro_factura = data.get("nroFactura")
    asociado = data.get("alumno")  # Este es el idasociado que queremos filtrar
    print("Datos recibidos:", data)

    query = """
        SELECT v.idventa, v.factura, v.fecha, c.nombre,
               (cob.importeefectivo + cob.importetarjeta + cob.importecheque + cob.importetransferencia) AS monto,
               v.activo
        FROM venta AS v
        JOIN cliente AS c ON c.idcliente = v.idcliente
        JOIN cobro AS cob ON cob.idventa = v.idventa
        WHERE 1=1
    """
    params = []

    if fecha_inicio:
        query += " AND v.fecha >= %s"
        params.append(fecha_inicio)
    if fecha_fin:
        query += " AND v.fecha <= %s"
        params.append(fecha_fin)
    if cliente:
        query += " AND c.idcliente LIKE %s"
        cliente_like = f"%{cliente}%"
        params.append(cliente_like)
    if nro_factura:
        query += " AND v.factura = %s"
        params.append(nro_factura)

    if asociado:
        query += """
            AND EXISTS (
                SELECT 1
                FROM ventadet vd2
                LEFT JOIN matriculadet md2 ON md2.idmatriculadet = vd2.idmatriculadet
                LEFT JOIN matricula m1 ON m1.idmatricula = md2.idmatricula

                LEFT JOIN cuenta_aso_detalle cad2 ON cad2.idcuentaasodet = vd2.idcuentaasociado
                LEFT JOIN cuenta_asociado ca2 ON ca2.idcuentaasociado = cad2.cuenta_aso
                LEFT JOIN matricula m2 ON m2.idmatricula = ca2.idmatricula

                WHERE vd2.idventa = v.idventa
                  AND (
                      m1.idclienteasociado = %s OR
                      m2.idclienteasociado = %s OR
                      vd2.idclienteasociado = %s
                  )
            )
        """
        params.extend([asociado, asociado, asociado])

    query += " ORDER BY v.fecha DESC"

    print("Parámetros:", params)
    cur, con = get_cursor()
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
        

def buscar_alumnofact():
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



def obtener_venta(id_venta):
    try:
        cursor, conn = get_cursor()

        # Detalles de la venta con resolución del nombre del asociado
        cursor.execute("""
            SELECT 
                dv.descripcion,
                dv.cantidad,
                dv.preciounitario,
                COALESCE(ca1.nombre, ca2.nombre, ca3.nombre) AS nombre_asociado,
                dv.descuento
            FROM ventadet dv
            LEFT JOIN matriculadet md ON dv.idmatriculadet = md.idmatriculadet
            LEFT JOIN matricula m1 ON md.idmatricula = m1.idmatricula
            LEFT JOIN clienteasociado ca1 ON m1.idclienteasociado = ca1.idclienteasociado

            LEFT JOIN cuenta_aso_detalle dc ON dv.idcuentaasociado = dc.idcuentaasodet
            LEFT JOIN cuenta_asociado cu ON dc.idcuentaasodet = cu.idcuentaasociado
            LEFT JOIN matricula m2 ON cu.idmatricula = m2.idmatricula
            LEFT JOIN clienteasociado ca2 ON m2.idclienteasociado = ca2.idclienteasociado

            LEFT JOIN clienteasociado ca3 ON dv.idclienteasociado = ca3.idclienteasociado

            WHERE dv.idventa = %s
        """, (id_venta,))
        detalles = cursor.fetchall()

        # Formas de cobro (una sola fila con múltiples columnas)
        cursor.execute("""
            SELECT importeefectivo, importetransferencia, importecheque, importedescuento
            FROM cobro
            WHERE idventa = %s
        """, (id_venta,))
        cobros_raw = cursor.fetchone()

        cursor.close()

        # Procesar detalles
        detalles_json = [
            {
                'descripcion': d[0],
                'cantidad': d[1],
                'precio_unitario': int(d[2]),
                'asociado': d[3],
                'descuento': d[4]
            } for d in detalles
        ]

        # Procesar cobros
        formas = ['Efectivo', 'Transferencia', 'Cheque', 'Descuento']
        cobros = []
        if cobros_raw:
            for i, monto in enumerate(cobros_raw):
                if monto and monto > 0:
                    cobros.append({
                        'forma_pago': formas[i],
                        'monto': int(monto)
                    })
        print("los detalles son", detalles_json)
        return jsonify({
            'detalles': detalles_json,
            'cobros': cobros
        })

    except Exception as e:
        print(f"Error al obtener venta: {e}")
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

    fecha = data.get('fecha')
    nro_factura = data.get('nro_factura')

    # Función auxiliar para convertir a int seguro
    def to_int(val):
        try:
            return int(val) if val not in (None, "", "null") else 0
        except ValueError:
            return 0

    monto_total = to_int(data.get('monto'))
    pago_efectivo = to_int(data.get('pago_efectivo'))
    pago_transferencia = to_int(data.get('pago_transferencia'))
    pago_cheque = to_int(data.get('pago_cheque'))
    pago_descuento = to_int(data.get('pago_descuento'))

    # Validar suma de pagos
    suma_pagos = pago_efectivo + pago_transferencia + pago_cheque + pago_descuento
    if suma_pagos != monto_total:
        return jsonify({
            'success': False,
            'error': f"La suma de los pagos ({suma_pagos}) no coincide con el monto original ({monto_total})."
        })

    try:
        cursor, conn = get_cursor()

        # Actualizar tabla venta
        cursor.execute("""
            UPDATE venta
            SET fecha = %s,
                factura = %s
            WHERE idventa = %s
        """, (fecha, nro_factura, venta_id))

        # Actualizar tabla cobro
        cursor.execute("""
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
            venta_id
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)})


    try:
        cursor, conn = get_cursor()

        # Actualizar tabla venta
        cursor.execute("""
            UPDATE venta
            SET fecha = %s,
                factura = %s
            WHERE idventa = %s
        """, (fecha, nro_factura, venta_id))

        # Actualizar tabla cobro
        cursor.execute("""
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
            venta_id
        ))

        conn.commit()
        conn.close()

        return jsonify({'success': True})

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'error': str(e)})


    
    
    

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
    


def anular_factura(idventa):
    try:
        cur, conn = get_cursor()

        # 1. Anular la venta
        cur.execute("UPDATE venta SET activo = 0 WHERE idventa = %s", (idventa,))

        # 2. Anular los detalles de venta
        cur.execute("UPDATE ventadet SET activo = 0 WHERE idventa = %s", (idventa,))

        # 3. Anular el cobro
        cur.execute("""
            UPDATE cobro
            SET importeefectivo = 0,
                importetarjeta = 0,
                importecheque = 0,
                importetransferencia = 0,
                importedescuento = 0
            WHERE idventa = %s
        """, (idventa,))

        # 4. Obtener los detalles para tratamiento especial
        cur.execute("""
            SELECT idventadet, subtotal, descuento, idmatriculadet, idcuentaasociado
            FROM ventadet
            WHERE idventa = %s
        """, (idventa,))
        detalles = cur.fetchall()

        # 5. Aplicar lógica contable por detalle
        for detalle in detalles:
            actualizar_movimiento(detalle, cur)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'ok': True})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})


def actualizar_movimiento(detalle, cur):
    """
    Actualiza los campos crédito y débito según el tipo de detalle (cuota o cuenta).
    
    detalle: tupla con (idventadet, subtotal, descuento, idmatriculadet, idcuentaasodet)
    cur: cursor de base de datos activo
    """
    subtotal = detalle[1]
    descuento = detalle[2]
    idmatriculadet = detalle[3]
    idcuentaasodet = detalle[4]

    if idmatriculadet:
        # Restar subtotal al crédito
        cur.execute("""
            UPDATE matriculadet
            SET credito = credito - %s
            WHERE idmatriculadet = %s
        """, (subtotal, idmatriculadet))

        # Si hay descuento, actualizar débito directamente con subtotal + descuento
        if descuento and descuento > 0:
            nuevo_debito = subtotal + descuento
            cur.execute("""
                UPDATE matriculadet
                SET debito = %s
                WHERE idmatriculadet = %s
            """, (nuevo_debito, idmatriculadet))

    elif idcuentaasodet:
        # Solo se resta subtotal al crédito, no se toca el débito
        cur.execute("""
            UPDATE cuenta_aso_detalle
            SET credito = credito - %s
            WHERE idcuentaasodet = %s
        """, (subtotal, idcuentaasodet))
    
  
  
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