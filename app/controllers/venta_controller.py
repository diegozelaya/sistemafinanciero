from flask import request, render_template, jsonify, session, redirect, url_for
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os

def venta():
    
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    """Renderiza la página de ventas."""
    return render_template('Venta-1.html')

def refinanciar():
    if "user_id" not in session:
        return redirect(url_for("auth_routes.login"))
    
    
    return render_template('refinanciar.html')

def edit_venta():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    """Renderiza la página de ventas."""
    return render_template('edit-factura.html')

def get_products():
    """Obtiene productos desde un formulario y devuelve los datos en formato JSON."""
    try:
        nombre = request.form['nombre']
        precio = float(request.form['precio'])
        cantidad = int(request.form['cantidad'])
        descuento = float(request.form['descuento'])
        iva = int(request.form['IVA'])

        producto = {
            "nombre": nombre,
            "precio": precio,
            "cantidad": cantidad,
            "descuento": descuento,
            "iva": iva
        }
        
        productos = [producto]
        return jsonify(productos)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def delete_product():
    """Elimina un producto del archivo JSON local."""
    producto_nombre = request.form['nombre']

    productos_path = 'data/products.json'
    if os.path.exists(productos_path):
        with open(productos_path, 'r') as f:
            productos = json.load(f)
    else:
        productos = []

    # Eliminar el producto que coincida con el nombre
    productos = [producto for producto in productos if producto['nombre'] != producto_nombre]

    # Guardar la lista actualizada en el archivo JSON
    with open(productos_path, 'w') as f:
        json.dump(productos, f, indent=4)

    return jsonify({"status": "success", "message": "Producto eliminado correctamente."})

def get_productos():
    """Obtiene productos desde la base de datos y los devuelve en formato JSON."""
    try:
        cursor, con = get_cursor()
        cursor.execute("SELECT idproducto, nomproducto FROM producto")
        rows = cursor.fetchall()
        cursor.close()

        productos = [{"idproducto": row[0], "nomproducto": row[1]} for row in rows]
        return jsonify(productos)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#Obtiene el timbrado para la cabecera
def get_timbrados():
    cursor,con = get_cursor()
    cursor.execute("SELECT idtimbrado, nrotimbrado FROM timbrado WHERE activo = 1")  # Ajusta según tu estructura
    
    timbrados = [{'idtimbrado': row[0], 'nrotimbrado': row[1]} for row in cursor.fetchall()]
    return jsonify(timbrados)


# Obtener las cuotas para listar en el modal para agregar al detalle
def obtener_cuotas(id_asociado):
    cuotas_lista = []
    nombres_cuotas = ["Matrícula", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre"]
    
    cursor,con = get_cursor()
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
    WHERE md.debito > md.credito
    AND m.idclienteasociado = %s and md.activo=1
    """, (id_asociado,))
    cuotas = cursor.fetchall()
    
    # Formatear los datos para JSON
    #cuotas_lista = [{"id": row[0], "nro_cuota": row[1], "fecha_vencimiento": row[2], "monto": row[3], "asociado": row[4], "nombreaso": row[5]} for row in cuotas]
    for row in cuotas:
        nro_cuota = row[1]
        nombre_cuota = nombres_cuotas[nro_cuota] if nro_cuota < len(nombres_cuotas) else f"Cuota {nro_cuota}"
    
        cuota = {
        "id": row[0],
        "nro_cuota": nro_cuota,
        "nombre_cuota": nombre_cuota,
        "fecha_vencimiento": row[2],
        "monto": row[7],
        "asociado": row[4],
        "nombreaso": row[6]
    }

        cuotas_lista.append(cuota)
    return jsonify(cuotas_lista)


def obtener_cuentas(id_asociado):
    cursor, con = get_cursor()
    cursor.execute("""
        SELECT 
            caso.idcuentaasociado,
            cdet.idcuentaasodet,
            m.anolectivo, 
            cdet.nrocuota, 
            cdet.monto, 
            p.nomproducto,
            cdet.fechavenc,
            (cdet.debito - cdet.credito) AS monto_pendiente,
            cdet.detalle 
        FROM 
            matricula AS m
        JOIN 
            cuenta_asociado AS caso ON m.idmatricula = caso.idmatricula
        JOIN 
            cuenta_aso_detalle AS cdet ON caso.idcuentaasociado = cdet.cuenta_aso
        LEFT JOIN
            producto AS p ON caso.idproducto = p.idproducto
        
        WHERE 
            m.idclienteasociado = %s AND cdet.debito>cdet.credito
    """, (id_asociado,))
    
    cuentas = cursor.fetchall()
    
    # ✅ CORREGIDO: Los índices y los nombres de campo coinciden ahora
    cuentas_lista = [{
        "idcuenta": row[0],
        "idcuentaasodet": row[1],
        "anolectivo": row[2],
        "nrocuota": row[3],
        "monto": row[7],
        "producto": row[5],
        "fechavenc": row[6],
         "detalle": row[8]
    } for row in cuentas]

    return jsonify(cuentas_lista)


def get_productos():
    try:
        cursor,con = get_cursor()
        cursor.execute("SELECT idproducto, nomproducto FROM producto ORDER BY nomproducto ASC")
        productos = cursor.fetchall()

        # Convertir a lista de diccionarios
        productos_list = [{'id': p[0], 'nombre': p[1]} for p in productos]
       

        return jsonify({'success': True, 'productos': productos_list})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    

   
def guardar_venta():
    
    import datetime

    datos = request.get_json()
    print("Datos recibidos:", datos)

    encabezado = datos['encabezado']
    detalles = datos['detalles']
    print ("los detales son", detalles)
    cursor,con = get_cursor()
    try:
        # Insertar en VENTA
        cursor.execute("""
            INSERT INTO venta (fecha, idcondpago, idcliente, idmoneda, factura, idtimbrado, falta, activo, ualta)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (encabezado['fecha'], encabezado['condicion'], encabezado['idcliente'], 
             encabezado['moneda'], encabezado['factura'], encabezado['timbrado'], datetime.datetime.now().date(), 1, 1))
        id_venta = cursor.lastrowid

        # Insertar en COBRO
        cursor.execute("""
            INSERT INTO cobro (idventa, fecha, idcliente, idmoneda, importeefectivo, importetransferencia, importecheque, importedescuento, importetarjeta, falta, ualta, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,%s)
        """, (
            id_venta,
            encabezado['fecha'],
            encabezado['idcliente'],
            encabezado['moneda'],
            encabezado['efectivo'],
            encabezado['transferencia'],
            encabezado['cheque'],
            encabezado['descuento_sueldo'],
            0,
            datetime.datetime.now().date(),
            1,
            1

        ))

        # Insertar en VENTADET
        for det in detalles:
            if det['tipo'] == "Producto":
                cursor.execute("""
                    INSERT INTO ventadet (idventa, idproducto, preciounitario, subtotal, porcent_iva, ualta, falta, activo, descuento, idclienteasociado,cantidad, descripcion)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,%s)
                """, (
                    id_venta, det['id_producto'], det['monto'],  det['monto'], 0,1, 
                    datetime.datetime.now().date(), 
                    1, det['descuento'], encabezado['asociado'],1,  det['descripcion']
                ))
            elif det['tipo'] == "Cuota":
                
                    cursor.execute("""
                        INSERT INTO ventadet (idventa, idmatriculadet,cantidad,  preciounitario, subtotal, ualta, falta, activo, descuento, descripcion)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        id_venta, det['id_matriculadet'], 1, det['monto'], det['monto'],1, datetime.datetime.now().date(), 1, det['descuento'],  det['descripcion'] 
                    ))
                     # Actualizar matriculadet: sumar al crédito lo pagado
                    cursor.execute("""
                        UPDATE matriculadet
                        SET credito = IFNULL(credito, 0) + %s
                        WHERE idmatriculadet = %s
                    """, (det['monto'], det['id_matriculadet']))

                    # Si hay descuento, restarlo al débito
                    if det['descuento'] > 0:
                        cursor.execute("""
                            UPDATE matriculadet
                            SET debito = IFNULL(debito, 0) - %s
                            WHERE idmatriculadet = %s
                        """, (det['descuento'], det['id_matriculadet']))


            elif det['tipo'] == "Cuenta":
                cursor.execute("""
                    select cuenta_asociado.idproducto from  cuenta_asociado  inner join cuenta_aso_detalle ON 
                    cuenta_asociado.idcuentaasociado=cuenta_aso_detalle.cuenta_aso WHERE
                    cuenta_aso_detalle.idcuentaasodet=%s           
                """,(det['id_cuenta'],))
                producto=cursor.fetchone()                   
                if producto:
                    idproducto = producto[0]   # primer registro, primer campo
                else:
                    idproducto = None
                
                print("el id del producto es::::", idproducto)
                cursor.execute("""
                    INSERT INTO ventadet (idventa, idcuentaasociado, cantidad, preciounitario, subtotal, ualta, falta, activo, descuento, descripcion, idproducto)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    id_venta, det['id_cuenta'],1, det['monto'], det['monto'],1, datetime.datetime.now().date(), 1, det['descuento'],  det['descripcion'], idproducto 
                ))
                cursor.execute("""
                    UPDATE cuenta_aso_detalle
                    SET credito = IFNULL(credito, 0) + %s
                        WHERE idcuentaasodet = %s
                    """, (det['monto'], det['id_cuenta']))


        con.commit()
        return jsonify({"success": True, "id_venta":id_venta})
    except Exception as e:
        con.rollback()
        return jsonify({"success": False, "error": str(e)})
    
    


 
def marcar_impresa():
    try:
        data = request.get_json()
        id_venta = data.get("id_venta")

        if not id_venta:
            return jsonify({"success": False, "error": "ID de venta no proporcionado"}), 400

        cursor, con = get_cursor()

        # Verificamos si la venta existe antes de actualizar
        cursor.execute("SELECT idventa FROM venta WHERE idventa = %s", (id_venta,))
        if cursor.fetchone() is None:
            cursor.close()
            return jsonify({"success": False, "error": "Venta no encontrada"}), 404

        # Actualizamos el campo impreso
        cursor.execute("UPDATE venta SET impreso = 1 WHERE idventa = %s", (id_venta,))
        con.commit()
        cursor.close()

        return jsonify({"success": True})

    except Exception as e:
        print("Error en marcar_impresa:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500