from flask import request, redirect, url_for, flash, render_template, jsonify
from app.models.conexion import get_cursor

# contact_controller.py
from app.models.conexion import get_cursor

def index():
    cur, conn = get_cursor()  # Usa get_cursor() en lugar de conexion.cursor()
    cur.execute('SELECT * FROM cliente')
    data = cur.fetchall()

    return render_template('index.html', prueba=data)


def add_contact():
    """Añadir un nuevo contacto a la base de datos."""
    if request.method == 'POST':
        try:
            fullname = request.form['fullname']
            phone = request.form['phone']
            email = request.form['mail']
            
            cur, conn = get_cursor()
            cur.execute(
                'INSERT INTO prueba (nombre, telefono, descripcion) VALUES (%s, %s, %s)',
                (fullname, phone, email)
            )
            
            conn.commit()
            flash('Contacto agregado satisfactoriamente')
            cur.close()
            return redirect(url_for('abm_routes.index'))
        except Exception as e:
            cur.rollback()
            flash(f'Error al agregar el contacto: {e}')
            cur.close
            return redirect(url_for('abm_routes.index'))
        
        

def edit_contact(id):
    """Cargar la información de un contacto para editar."""
    try:
        cur, conn = get_cursor()  # get_cursor() devuelve el cursor directamente
        cur.execute('SELECT * FROM prueba WHERE idprueba = %s', (id,))
        
        data = cur.fetchone()
        print("Datos obtenidos de la BD:", data)  # Depuración en consola
        
        if data:
            return render_template('edit-contact.html', contact=data)
        else:
            flash('Contacto no encontrado')
            return redirect(url_for('abm_routes.index'))
    except Exception as e:
        flash(f'Error al cargar el contacto: {e}')
        return redirect(url_for('abm_routes.index'))
    finally:
        cur.close()  # Cerrar el cursor después de usarlo


def update_contact(id):
    """Actualizar la información de un contacto."""
    if request.method == 'POST':
        try:
            fullname = request.form['fullname']
            phone = request.form['phone']
            email = request.form['mail']
            
            cur, conn = get_cursor()
            cur.execute(
                """UPDATE prueba 
                SET nombre=%s, telefono=%s, descripcion=%s 
                WHERE idprueba=%s""", 
                (fullname, phone, email, id)
            )
            conn.commit()
            flash('Contacto actualizado satisfactoriamente')
            return redirect(url_for('abm_routes.index'))
        except Exception as e:
            
            flash(f'Error al actualizar el contacto: {e}')
            return redirect(url_for('abm_routes.index'))

def delete_contact(id):
    """Eliminar un contacto de la base de datos."""
    try:
        cur, conn = get_cursor()
        cur.execute('DELETE FROM prueba WHERE idprueba = %s', (id,))
        conn.commit()
        flash('Contacto eliminado satisfactoriamente')
        return redirect(url_for('abm_routes.index'))
    except Exception as e:
        flash(f'Error al eliminar el contacto: {e}')
        return redirect(url_for('abm_routes.index'))
