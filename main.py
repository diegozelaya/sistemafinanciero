from app import create_app
from app.routes import abm_routes
from app.auth_routes import auth_routes
# Crear una instancia de la aplicación Flask
app = create_app()
# Registrar blueprints

app.register_blueprint(auth_routes)
app.register_blueprint(abm_routes) 


#app.register_blueprint(abm_routes)
# Punto de entrada principal
if __name__ == '__main__':
    app.run(port=3000, debug=True)
