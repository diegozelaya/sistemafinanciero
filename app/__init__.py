from flask import Flask, session, redirect, url_for, make_response
from .routes import abm_routes


def create_app():
    app = Flask(__name__)
    app.secret_key = 'my secret key'

    # Registrar blueprint
   
    # Hook para cabeceras anti-caché
    @app.after_request
    def add_header(response):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    return app