from flask import request, render_template, jsonify, send_file, request, session, url_for, redirect
from ..models import conexion
from app.models.conexion import get_cursor
import json
import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet
import io
from datetime import datetime
from weasyprint import HTML
from io import BytesIO
import re
import unicodedata
from reportlab.lib.styles import ParagraphStyle


estilo_monto = ParagraphStyle(name="Monto", fontName="Courier", alignment=1)  # 1 = center

# Sanitizar el nombre del alumno
def limpiar_nombre(nombre):
    # Eliminar tildes y acentos
    nombre = unicodedata.normalize('NFKD', nombre).encode('ASCII', 'ignore').decode('utf-8')
    # Reemplazar espacios y caracteres raros por guiones bajos
    nombre = re.sub(r'[^A-Za-z0-9]+', '_', nombre)
    return nombre.strip('_')





def listar_cobranza(id_anio, id_grado):
    orden = request.args.get("orden", "nombre")  # "nombre" o "matricula"

    cursor, conn = get_cursor()

  

    cursor.execute(f"""
       SELECT 
            m.idmatricula,
            a.nombre AS alumno,

            -- Cuotas mensuales (pivot)
            MAX(CASE WHEN md.nrocuota = 0 THEN md.credito END) AS matricula,
            MAX(CASE WHEN md.nrocuota = 1 THEN md.credito END) AS febrero,
            MAX(CASE WHEN md.nrocuota = 2 THEN md.credito END) AS marzo,
            MAX(CASE WHEN md.nrocuota = 3 THEN md.credito END) AS abril,
            MAX(CASE WHEN md.nrocuota = 4 THEN md.credito END) AS mayo,
            MAX(CASE WHEN md.nrocuota = 5 THEN md.credito END) AS junio,
            MAX(CASE WHEN md.nrocuota = 6 THEN md.credito END) AS julio,
            MAX(CASE WHEN md.nrocuota = 7 THEN md.credito END) AS agosto,
            MAX(CASE WHEN md.nrocuota = 8 THEN md.credito END) AS setiembre,
            MAX(CASE WHEN md.nrocuota = 9 THEN md.credito END) AS octubre,
            MAX(CASE WHEN md.nrocuota = 10 THEN md.credito END) AS noviembre,

            -- Productos adicionales (por ID)
            MAX(CASE WHEN vd.idproducto = 3 THEN vd.preciounitario END) AS fotocopia,
            MAX(CASE WHEN vd.idproducto = 4 THEN vd.preciounitario END) AS seguro_medico

        FROM matriculadet md
        INNER JOIN matricula m ON md.idmatricula = m.idmatricula
        INNER JOIN clienteasociado a ON m.idclienteasociado = a.idclienteasociado
        INNER JOIN cursos c ON m.idgrado = c.idcurso

        -- Relación con las ventas (para productos adicionales)
        LEFT JOIN ventadet vd ON vd.idclienteasociado = a.idclienteasociado
        LEFT JOIN producto p ON vd.idproducto = p.idproducto

        WHERE 
            md.activo = 1
            AND m.anolectivo = %s
            AND c.idcurso = %s

        GROUP BY 
            m.idmatricula, a.nombre

        ORDER BY 
            a.nombre;

                    
                    """, (id_anio, id_grado))

    alumnos = cursor.fetchall()
    conn.close()

    lista = [
        {
            "nombre": r[1],
            "Matricula": r[2] or 0,
            "Feb": r[3] or 0,
            "Mar": r[4] or 0,
            "Ab": r[5] or 0,
            "May": r[6] or 0,
            "Jun": r[7]or 0,
            "Jul": r[8]or 0,
            "Ago": r[9] or 0,
            "Set": r[10] or 0,
            "Oct": r[11] or 0,
            "Nov": r[12] or 0,
            "Fotocopia": r[13] or 0,
            "Seguro": r[14] or 0
        } for r in alumnos
    ]
    print(lista)
    return jsonify(lista)



def reporte_cobranza():
    if "user_id" not in session:
            return redirect(url_for("auth_routes.login"))
    
    
    cursor, conn = get_cursor()

    
    cursor.execute("SELECT idcurso, descripcion FROM cursos ORDER BY descripcion ASC")
    grados = [{"idcurso": r[0], "nomcurso": r[1]} for r in cursor.fetchall()]

    conn.close()

    return render_template("reportes_cobranza_grado.html", grados=grados)


def buscar_alumnoestado():
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



def estado_cuenta():
    
    return render_template("Estado_cuenta.html")


def buscar_alumnoestado():
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
    
    
   
def get_cuotas(id_alumno, anio):
    cursor, con = get_cursor()

    cursor.execute("""
        SELECT 
            md.idmatriculadet, md.nrocuota, md.credito, md.debito, cursos.descripcion
        FROM 
            matriculadet md 
            INNER JOIN matricula m ON m.idmatricula = md.idmatricula
            inner join cursos on m.idgrado=cursos.idcurso
        WHERE 
            m.idclienteasociado = %s 
            AND m.anolectivo = %s 
            AND m.activo=1
        ORDER BY md.nrocuota;
    """, (id_alumno, anio))
    cuotas = cursor.fetchall()
    grado = cuotas[0][4] if cuotas else None

    # 🗓️ Mapeo de número de cuota → mes
    meses = {
        1: "Febrero",
        2: "Marzo",
        3: "Abril",
        4: "Mayo",
        5: "Junio",
        6: "Julio",
        7: "Agosto",
        8: "Setiembre",
        9: "Octubre",
        10: "Noviembre"
    }

    resultado = []

    for idmatriculadet, nrocuota, credito, debito, descripcion in cuotas:
        cursor.execute("""
           SELECT 
                v.factura, v.fecha, vd.preciounitario
           FROM venta v inner join ventadet vd
                on v.idventa=vd.idventa
                 inner join matriculadet md on md.idmatriculadet=vd.idmatriculadet
            WHERE md.idmatriculadet =%s
            ORDER BY v.fecha;
        """, (idmatriculadet,))
        pagos = cursor.fetchall()

        total_pagado = sum(p[2] for p in pagos)
        saldo = debito - total_pagado
        print(total_pagado, saldo, credito)

        # 🟢 Estado segun saldo
        if saldo == 0:
            estado, color = "Cancelado", "success"
        elif total_pagado == 0:
            estado, color = "Pendiente", "danger"
        else:
            estado, color = "Parcial", "warning"

        # 🧩 Determinar mes
        mes = meses.get(nrocuota, f"Cuota {nrocuota}")  # fallback si nro fuera >10

        resultado.append({
            "grado":grado,
            "mes": mes,
            "monto_total": float(credito),
            "estado": estado,
            "color": color,
            "saldo": float(saldo),
            "pagos": [
                {
                    "factura": p[0],
                    "fecha": p[1].strftime("%d/%m/%Y"),
                    "monto": float(p[2])
                } for p in pagos
            ]
        })

    return jsonify(resultado)

from reportlab.platypus import HRFlowable

def limpiar_numero(valor):
    """Convierte un valor que puede venir como string con puntos, comas o 'Gs' en float."""
    if not valor:
        return 0
    try:
        limpio = str(valor).replace("Gs", "").replace(".", "").replace(",", "").strip()
        return float(limpio) if limpio else 0
    except:
        return 0

def generar_pdf_estado():
    data = request.get_json()
    alumno = data.get("alumno")
    anio = data.get("anio")
    cuotas = data.get("cuotas", [])
    cuentas = data.get("cuentas", [])
    nombre_alumno = str(alumno)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M")

    # Logo y membrete
    ruta_logo = os.path.join(os.path.dirname(__file__), '..', 'static', 'img', 'logo.png')
    if os.path.exists(ruta_logo):
        logo = Image(ruta_logo, width=70, height=70)
        story.append(logo)

    story.append(Paragraph("<b>Esc. Bás. Priv. Subv. Claretiana María Dolores Solá</b>", styles["Title"]))
    story.append(Paragraph("Departamento de Administración - Estado de Cuentas", styles["Normal"]))
    story.append(Paragraph(f"Generado el {fecha_actual}", styles["Italic"]))
    story.append(Spacer(1, 12))

    # Encabezado alumno
    grado = data.get("grado", "-")
    story.append(Paragraph(f"<b>Alumno:</b> {nombre_alumno}", styles["Normal"]))
    story.append(Paragraph(f"<b>Grado:</b> {grado}", styles["Normal"]))
    story.append(Paragraph(f"<b>Año Lectivo:</b> {anio}", styles["Normal"]))
    story.append(Spacer(1, 12))

    # 📊 Tabla de cuotas principales
    if cuotas:
        data_table = [["Mes", "Pagos Realizados", "Monto Pagado", "Saldo", "Estado"]]
        for c in cuotas:
            pagos_txt = ", ".join([p["fecha"] for p in c["pagos"]]) if c["pagos"] else "-"
            monto_pagado = sum([limpiar_numero(p.get("monto")) for p in c["pagos"]])
            saldo = limpiar_numero(c.get("saldo"))

            data_table.append([
                c["mes"],
                f"{len(c['pagos'])} pago(s): {pagos_txt}" if c["pagos"] else "-",
                f"{monto_pagado:,.0f} Gs",
                f"{saldo:,.0f} Gs",
                c["estado"]
            ])
        t = Table(data_table, hAlign="LEFT", colWidths=[70, 150, 80, 80, 60])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.grey),
            ("TEXTCOLOR", (0,0), (-1,0), colors.whitesmoke),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("GRID", (0,0), (-1,-1), 0.5, colors.black),
            ("BACKGROUND", (0,1), (-1,-1), colors.beige)
        ]))
        story.append(t)
    else:
        story.append(Paragraph("<b>No se registraron cuotas principales.</b>", styles["Normal"]))
        story.append(Spacer(1, 12))

    # 📘 Sección de cuentas especiales
    if cuentas:
        story.append(Spacer(1, 20))
        story.append(Paragraph("<b>Cuentas del Alumno y Pagos Realizados</b>", styles["Heading2"]))
        for cuenta in cuentas:
            # Encabezado visual de la cuenta
            encabezado = [[f"Cuenta: {cuenta['descripcion']} ({cuenta['producto']})"]]
            t_encabezado = Table(encabezado, colWidths=[450])
            t_encabezado.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), colors.green),
                ("TEXTCOLOR", (0,0), (-1,-1), colors.whitesmoke),
                ("ALIGN", (0,0), (-1,-1), "CENTER"),
                ("FONTSIZE", (0,0), (-1,-1), 12),
                ("BOX", (0,0), (-1,-1), 1, colors.black)
            ]))
            story.append(t_encabezado)
            story.append(Spacer(1, 6))

            # Datos principales
            story.append(Paragraph(f"Año Lectivo: {cuenta.get('aniolectivo','-')}", styles["Normal"]))
            story.append(Paragraph(f"Monto Total: {cuenta.get('montoTotal','0')}", styles["Normal"]))
            story.append(Paragraph(f"Saldo de la Cuenta: {cuenta.get('saldoCuenta','0')}", styles["Normal"]))
            story.append(Spacer(1, 8))

            # Tabla de cuotas de la cuenta
            if cuenta.get("cuotas"):
                data_cuotas = [["N° Cuota", "Vencimiento", "Total", "Abonado", "Saldo"]]
                for q in cuenta["cuotas"]:
                    total = limpiar_numero(q.get("total"))
                    abonado = limpiar_numero(q.get("abonado"))
                    saldo = limpiar_numero(q.get("saldo"))
                    data_cuotas.append([q["numero"], q["vencimiento"],
                                        f"{total:,.0f} Gs",
                                        f"{abonado:,.0f} Gs",
                                        f"{saldo:,.0f} Gs"])
                t_cuotas = Table(data_cuotas, hAlign="LEFT", colWidths=[60, 80, 80, 80, 80])
                t_cuotas.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                    ("GRID", (0,0), (-1,-1), 0.5, colors.black),
                    ("ALIGN", (0,0), (-1,-1), "CENTER")
                ]))
                story.append(t_cuotas)
                story.append(Spacer(1, 8))
            else:
                story.append(Paragraph("<i>No se registraron cuotas para esta cuenta.</i>", styles["Normal"]))
                story.append(Spacer(1, 8))

            # Tabla de pagos realizados
            story.append(Paragraph("Pagos Realizados", styles["Italic"]))
            data_pagos = [["Factura", "Fecha", "Monto"]]
            if cuenta.get("pagos"):
                for p in cuenta["pagos"]:
                    monto = limpiar_numero(p.get("monto"))
                    data_pagos.append([p["factura"], p["fecha"], f"{monto:,.0f} Gs"])
            else:
                data_pagos.append(["—", "—", "0 Gs"])
            t_pagos = Table(data_pagos, hAlign="LEFT", colWidths=[80, 80, 80])
            t_pagos.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                ("GRID", (0,0), (-1,-1), 0.5, colors.black),
                ("ALIGN", (0,0), (-1,-1), "CENTER")
            ]))
            story.append(t_pagos)

            # Separador visual entre cuentas
            story.append(Spacer(1, 12))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
            story.append(Spacer(1, 12))

    # Pie de página
    story.append(Spacer(1, 20))
    story.append(Paragraph("<i>Documento generado automáticamente - Sistema de Gestión Escolar</i>", styles["Normal"]))

    doc.build(story)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"EstadoCuenta_{limpiar_nombre(nombre_alumno)}.pdf",
        mimetype="application/pdf"
    )











def obtener_cuenta_reporte(idclienteasociado, aniolectivo):
    try:
        cursor, conn = get_cursor()

        # 🔍 Obtener todas las cuentas activas del alumno en ese año lectivo
        cursor.execute("""
            SELECT c.idcuentaasociado, 
                   m.idmatricula, 
                   c.descripcion, 
                   p.idproducto, 
                   c.activo,
                   p.nomproducto,
                   m.anolectivo,
                   c.monto_total
            FROM cuenta_asociado AS c
            JOIN matricula AS m ON m.idmatricula = c.idmatricula
            LEFT JOIN producto AS p ON c.idproducto = p.idproducto
            WHERE m.idclienteasociado = %s   AND c.activo = 1
        """, (idclienteasociado,))
        detalles = cursor.fetchall()

        ids_cuentas = [d[0] for d in detalles]
        if not ids_cuentas:
            return jsonify({'reporte': []})

        format_strings = ','.join(['%s'] * len(ids_cuentas))

        # 📄 Obtener cuotas por cuenta (detalle sin SUM)
        cursor.execute(f"""
            SELECT cd.idcuentaasodet, 
                   cd.nrocuota, 
                   DATE(cd.fechavenc) AS fecha_vencimiento, 
                   cd.debito,
                   cd.credito,  
                   (cd.debito - cd.credito) AS monto_pendiente,
                   cd.cuenta_aso
            FROM cuenta_aso_detalle cd
            WHERE cd.cuenta_aso IN ({format_strings})
        """, tuple(ids_cuentas))
        cuotas_raw = cursor.fetchall()

        # 💰 Obtener saldo total por cuenta (con SUM)
        cursor.execute(f"""
            SELECT cd.cuenta_aso,
                   SUM(cd.debito) - SUM(cd.credito) AS saldo_cuenta
            FROM cuenta_aso_detalle cd
            WHERE cd.cuenta_aso IN ({format_strings})
            GROUP BY cd.cuenta_aso
        """, tuple(ids_cuentas))
        saldos_raw = cursor.fetchall()
        saldos_por_cuenta = {s[0]: s[1] for s in saldos_raw}

        # 💳 Obtener pagos por cuenta
        cursor.execute(f"""
            SELECT 
                vd.idcuentaasociado,
                vd.subtotal,
                v.factura,
                v.fecha,
                cta.idcuentaasociado AS id_encabezado_cuenta
            FROM ventadet vd
            INNER JOIN venta v ON vd.idventa = v.idventa
            INNER JOIN cuenta_aso_detalle cd ON cd.idcuentaasodet = vd.idcuentaasociado
            INNER JOIN cuenta_asociado cta ON cd.cuenta_aso = cta.idcuentaasociado
            WHERE cta.idcuentaasociado IN ({format_strings}) AND vd.activo = 1
        """, tuple(ids_cuentas))
        pagos_raw = cursor.fetchall()
        
        cursor.close()

        # 🧮 Agrupar cuotas por cuenta
        cuotas_por_cuenta = {}
        for c in cuotas_raw:
            cuenta_id = c[6]
            cuota = {
                'idcuentaasodet': c[0],
                'nrocuota': c[1],
                'fechavenc': c[2].strftime("%d/%m/%Y") if c[2] else "-",
                'debito': c[3],
                'credito': c[4],
                'pendiente': c[5]
            }
            cuotas_por_cuenta.setdefault(cuenta_id, []).append(cuota)

        # 💳 Agrupar pagos por cuenta
        pagos_por_cuenta = {}
        for p in pagos_raw:
            cuenta_id = p[4]
            pago = {
                'subtotal': p[1],
                'factura': p[2],
                'fecha': p[3].strftime("%d/%m/%Y") if p[3] else "-"
            }
            pagos_por_cuenta.setdefault(cuenta_id, []).append(pago)

        # 📦 Consolidar reporte por cuenta
        reporte_json = [
            {
                'idcuentaasociado': d[0],
                'descripcion': d[2],
                'producto': d[5],
                'aniolectivo': d[6],
                'total_cuenta': d[7],
                'saldo_cuenta': saldos_por_cuenta.get(d[0], 0),  # ✅ ahora sí disponible
                'cuotas': cuotas_por_cuenta.get(d[0], []),
                'pagos': pagos_por_cuenta.get(d[0], [])
            }
            for d in detalles
        ]

        return jsonify({'reporte': reporte_json})

    except Exception as e:
        print(f"Error al obtener cuenta: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500


    
    

def movimiento_caja():
    desde = request.args.get('desde')
    hasta = request.args.get('hasta')
    cursor, conn= get_cursor()
    query = """
    SELECT 
        v.idventadet,
        v.monto,
        v.nombrecliente,
        m.nrocuota,
        p.nombre AS producto_nombre,
        ca.idproducto AS producto_cuenta
    FROM ventadet v
    LEFT JOIN matriculadet m ON v.idmatriculadet = m.idmatriculadet
    LEFT JOIN producto p ON v.idproducto = p.idproducto
    LEFT JOIN cuenta_detalle cd ON v.idcuentaasociado = cd.idcuenta_detalle
    LEFT JOIN cuenta_asociado ca ON cd.idcuenta_asociado = ca.idcuenta_asociado
    WHERE v.fecha BETWEEN %s AND %s
    """
    cursor.execute(query, (desde, hasta))
    resultados = cursor.fetchall()

    # Procesamiento para agrupar por cliente y categorizar montos
    planilla = {}
    for r in resultados:
        nombre = r['nombrecliente']
        if nombre not in planilla:
            planilla[nombre] = {
                'matricula': 0,
                'cuota': 0,
                'fotocopias': 0,
                'libros': 0,
                'uniformes': 0,
                'otros': 0,
                'total': 0
            }

        monto = r['monto']
        categoria = 'otros'

        if r['nrocuota'] is not None:
            categoria = 'matricula' if r['nrocuota'] == 0 else 'cuota'
        elif r['producto_nombre']:
            categoria = r['producto_nombre'].lower()
        elif r['producto_cuenta']:
            # Aquí podrías mapear el idproducto a nombre si lo necesitas
            categoria = obtener_nombre_producto(r['producto_cuenta'])

        if categoria not in planilla[nombre]:
            planilla[nombre][categoria] = 0

        planilla[nombre][categoria] += monto
        planilla[nombre]['total'] += monto

    return render_template('planilla.html', planilla=planilla, desde=desde, hasta=hasta)


def obtener_nombre_producto(idproducto):
    cursor, conn=get_cursor()
    cursor.execute("SELECT nombre FROM producto WHERE idproducto = %s", (idproducto,))
    resultado = cursor.fetchone()
    return resultado['nombre'].lower() if resultado else 'otros'

