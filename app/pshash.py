from werkzeug.security import generate_password_hash
import mysql.connector
from app.models.conexion import get_cursor

cursor,conn=get_cursor()

cursor = conn.cursor(dictionary=True)

cursor.execute("SELECT id, password_hash FROM users")  # suponiendo que la columna vieja se llama 'password'
usuarios = cursor.fetchall()

for u in usuarios:
    hashed = generate_password_hash(u['password_hash'])
    cursor.execute("UPDATE users SET password_hash=%s WHERE id=%s", (hashed, 2))

conn.commit()
conn.close()
