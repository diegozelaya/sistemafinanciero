from flask import request, render_template, jsonify
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os

def cuotas_pendientes():
    data = request.json
    idcliente = data['idcliente']

    cursor, con = get_cursor()

    # Obtener matrícula activa
    cursor.execute("""
        SELECT idmatricula
        FROM matricula
        WHERE idclienteasociado = %s AND activo = 1
        ORDER BY anolectivo DESC
        LIMIT 1
    """, (idcliente,))
    matricula = cursor.fetchone()
    if not matricula:
        con.close()
        return jsonify({"cuotas": [], "total": 0, "idmatricula": None})

    idmatricula = matricula[0]

    # Obtener cuotas pendientes
    cursor.execute("""
        SELECT nrocuota, fechavencimiento, (debito - credito) AS monto
        FROM matriculadet
        WHERE idmatricula = %s AND debito > credito AND activo = 1
    """, (idmatricula,))
    cuotas = cursor.fetchall()

    cuotas_lista = [{
        "concepto": f"Cuota {row[0]}",
        "vencimiento": str(row[1]),
        "monto": float(row[2])
    } for row in cuotas]

    total = sum(c["monto"] for c in cuotas_lista)

    con.close()
    return jsonify({
        "cuotas": cuotas_lista,
        "total": total,
        "idmatricula": idmatricula
    })
    
    
    
    
def refinanciar2():
    data = request.json
    idcliente = data['idcliente']
    idmatricula = data['idmatricula']
    total = float(data['total'])
    fechas = data['fechas']
    montos = data['montos']

    cursor, con = get_cursor()

    # Crear nueva cuenta asociada
    cursor.execute("""
        INSERT INTO cuenta_asociado (idmatricula, monto_total, falta, descripcion, activo, idproducto)
        VALUES (%s, %s, NOW(), %s, %s, %s)
    """, (idmatricula, total, "Refinanciación de matrícula", 1, 7))

    idcuenta = cursor.lastrowid

    # Insertar cuotas refinanciadas con valores fijos en nrocuota, monto y ualta
    for i in range(len(fechas)):
        cursor.execute("""
            INSERT INTO cuenta_aso_detalle 
            (cuenta_aso, nrocuota, monto, debito, credito, detalle, fechavenc, ualta, falta, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (
            idcuenta,
            0,                  # nrocuota fijo en 0
            0,                  # monto fijo en 0
            montos[i],          # debito según lista
            0,                  # credito en 0
            f"Cuota refinanciada {i+1}",
            fechas[i],
            1,                  # ualta fijo en 1
            1                   # activo
        ))

    # Dar de baja cuotas originales
    cursor.execute("""
        UPDATE matriculadet
        SET activo = 0
        WHERE idmatricula = %s
    """, (idmatricula,))

    # Dar de baja matrícula principal
    cursor.execute("""
        UPDATE matricula
        SET activo = 0
        WHERE idmatricula = %s
    """, (idmatricula,))

    con.commit()
    con.close()

    return jsonify({"status": "ok", "mensaje": "Refinanciación realizada con éxito"})




def buscar_clientes_con_deuda():
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
        data = [{'id': row[0], 'text': f"{row[1]} - CI: {row[2]}"} for row in results]
        return jsonify({'results': data})
    except Exception as e:
        print(f"Error en /buscar-asociado: {e}")  # Log del error en la consola
        return jsonify({'error': 'Error interno en el servidor'}), 500