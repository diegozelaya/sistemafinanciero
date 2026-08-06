from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import check_password_hash
import mysql.connector
from app.models.conexion import get_cursor
auth_routes = Blueprint('auth_routes', __name__)



@auth_routes.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        cursor, conn = get_cursor()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect('/venta')
        else:
            flash("Usuario o contraseña incorrectos")

    return render_template('login.html')

@auth_routes.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth_routes.login'))
