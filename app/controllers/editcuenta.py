from flask import request, render_template, jsonify, session, redirect, url_for
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os



def editcuenta():
    
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('edit-cuentas.html')


from flask import request, jsonify

def buscar_cuenta():
    data = request.get_json()
    asociado = data.get("alumno")  # Este es el idclienteasociado que queremos filtrar
    print("Datos recibidos:", data)

    # Validar que se recibió el ID del alumno
    if not asociado:
        return jsonify({"error": "Falta el parámetro 'alumno' en el cuerpo de la solicitud"}), 400

    query = """
                SELECT 
            c.idcuentaasociado,    
            alumno.nombre,
            c.monto_total,
            mat.anolectivo,
            cursos.descripcion AS curso,
            c.descripcion AS cuenta,
            producto.nomproducto,
            c.activo
        FROM clienteasociado AS alumno
        INNER JOIN matricula AS mat 
            ON alumno.idclienteasociado = mat.idclienteasociado
        INNER JOIN cursos 
            ON cursos.idcurso = mat.idgrado
        INNER JOIN cuenta_asociado AS c 
            ON c.idmatricula = mat.idmatricula
        LEFT JOIN producto 
            ON c.idproducto = producto.idproducto
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
        

def buscar_alumnocuenta():
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



def obtener_cuenta(id_cuenta):
    try:
        cursor, conn = get_cursor()

        # Detalles de la venta con resolución del nombre del asociado
        cursor.execute( """
    select c.idcuentaasociado, 
       m.idmatricula, 
       c.descripcion, 
       p.idproducto, 
       c.activo,
       p.nomproducto,
       m.anolectivo
    from
       cuenta_asociado as c join matricula as m on m.idmatricula=c.idmatricula
       left join producto as p on c.idproducto=p.idproducto
    WHERE
		c.idcuentaasociado=%s
    """, (id_cuenta,))
       
        detalles = cursor.fetchall()

        # Detalles de la cuenta
        cursor.execute("""
        SELECT
            cd.idcuentaasodet, 
            cd.nrocuota, 
            DATE(cd.fechavenc) as fecha_vencimiento, 
            cd.debito,
            cd.credito,  
            (cd.debito - cd.credito) AS monto_pendiente
    FROM cuenta_aso_detalle cd
    JOIN cuenta_asociado c ON cd.cuenta_aso = c.idcuentaasociado
    
  
    WHERE  c.idcuentaasociado =%s""", (id_cuenta,))
        cuotas_raw = cursor.fetchall()

        cursor.close()

        # Procesar detalles
        detalles_json = [
            {
                'idcuentaasociado': d[0],
                'Descripcion': d[2],
                'Producto': d[5],
                'Aniolectivo': d[6]
               
                
                
            } for d in detalles
        ]

        detalles_cuotas = [
            {
                'idcuentaasodet': c[0],
                'nrocuota': c[1],
                
                'fechavenc': c[2],
                'debito': c[3],
                'credito': c[4],
                'pendiente': c[5]
                
            } for c in cuotas_raw
        ]
        print("📤 Datos enviados cabeza:", detalles_json);
        print("📤 Datos enviados detalles cuota:", detalles_cuotas);
        return jsonify({
            'cabezamatricula': detalles_json,
            'detallecuota': detalles_cuotas
        })
    
    
    except Exception as e:
        print(f"Error al obtener cuenta: {e}")
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
    


def desactivar_cuenta(idcuentaasociado):
    print ("el id descactivado es", idcuentaasociado)
    try:
        cur, conn = get_cursor()

        # 1. Anular la venta
        cur.execute("UPDATE cuenta_asociado SET activo = 0 WHERE idcuentaasociado = %s", (idcuentaasociado,))

        # 2. Anular los detalles de venta
        cur.execute("UPDATE cuenta_aso_detalle SET activo = 0 WHERE cuenta_aso = %s", (idcuentaasociado,))

        

       

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({'ok': True})

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})



    

def obtener_productosedit():
    try:
        cursor, conn = get_cursor()
        cursor.execute("SELECT idproducto, nomproducto FROM producto")
        productos = cursor.fetchall()
        
        # Convertir a formato JSON
        resultado = [{'id': p[0], 'descripcion': p[1]} for p in productos]
        return jsonify(resultado)
    
    except Exception as e:
        print("❌ Error en obtener_productosedit:", e)
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Cerrar recursos
        if cursor:
            cursor.close()
        if conn:
            conn.close()



def actualizar_cuenta():
    try:
        data = request.get_json()

        # Datos principales
        id_cuenta = data.get("idcuentaso")
        producto=data.get("Product")
        descripcion=data.get("descripcion")
        cuotas = data.get("cuotas", [])
        print ("El id del producto", producto)
        print ("El id de la cuenta", id_cuenta)
        print ("las cuentas", cuotas)

        cursor, con = get_cursor()

        # 🔹 Actualizar cabecera de matrícula
        cursor.execute("""
            UPDATE cuenta_asociado 
            SET idproducto = %s, 
            descripcion=%s
            
            WHERE idcuentaasociado = %s
        """, (producto, descripcion, id_cuenta))

        # 🔹 Actualizar detalle de cuotas
        for cuota in cuotas:
            iddetalle = cuota.get("iddetalle")
            nueva_fecha = cuota.get("nuevaFecha")
            nuevo_debito = cuota.get("nuevoDebito")

            if not iddetalle:
                continue  # saltar si no hay id

            cursor.execute("""
                UPDATE cuenta_aso_detalle
                SET fechavenc = %s, debito = %s
                WHERE idcuentaasodet = %s
            """, (nueva_fecha, nuevo_debito, iddetalle))

        con.commit()
        return jsonify({"success": True, "message": "Cuenta actualizada correctamente"})

    except Exception as e:
        print("❌ Error en actualizar_cuenta:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500




def crear_cuenta():
    try:
        data = request.get_json()
        idasociado = data.get("idasociado")
        producto = data.get("producto")
        descripcion = data.get("descripcion")
       
        cuotas = data.get("cuotas", [])
        print ("Estos son los datos de la nueva cuenta", data)
        print("idasociado", idasociado)
        cursor, con = get_cursor()
    

        # 🔹 Obtener matrícula activa
        cursor.execute("""
            SELECT idmatricula, anolectivo FROM matricula 
            WHERE idclienteasociado = %s AND activo = 1
            LIMIT 1
        """, (idasociado,))
        matricula = cursor.fetchone()
        if not matricula:
            return jsonify({"success": False, "message": "El alumno no tiene matrícula activa."})

        idmatricula = matricula[0]
        anho= matricula[1]

        # calcular la suma de todos los debitos
        total_debito = sum(float(c["debito"]) for c in cuotas)
        
        # obtener la descripcion del producto
        cursor.execute("""select nomproducto from producto
                       
                       where idproducto=%s
        """,(producto,))             
        nomproducto=cursor.fetchone();
        producto_nombre=nomproducto[0];
                    
        
        # 🔹 Insertar cabecera
        cursor.execute("""
            INSERT INTO cuenta_asociado ( idmatricula, idproducto, descripcion, monto_total, activo)
            VALUES (%s, %s, %s, %s,  1)
        """, ( idmatricula, producto, descripcion, total_debito))
        idcuentaasociado = cursor.lastrowid

        
        
        # 🔹 Insertar detalle de cuotas
        for c in cuotas:
            
            detalle_conc = f"Año:{anho} - {producto_nombre} - {c['nrocuota']}"
            cursor.execute("""
                INSERT INTO cuenta_aso_detalle (cuenta_aso, nrocuota, fechavenc, debito, detalle, credito, activo, monto, ualta)
                VALUES (%s, %s, %s, %s, %s, 0,1,0, 1)
            """, (idcuentaasociado, c["nrocuota"], c["fechavenc"], c["debito"], detalle_conc))

        con.commit()
        return jsonify({"success": True, "message": "Cuenta creada correctamente"})

    except Exception as e:
        print("❌ Error al crear cuenta:", e)
        return jsonify({"success": False, "message": str(e)})
