import mysql.connector

def get_cursor():
    conn = mysql.connector.connect(
        user="root",
        password="",
        host="localhost",
        database="empresa",
        port="3306"
    )
    conn.autocommit = False
    cursor = conn.cursor()
    return cursor, conn  # Cursor y conexión por separado

