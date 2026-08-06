from flask import Blueprint
from .controllers import contact_controller, refinanciacion, venta_controller, matricula_controller, crudpadre_controller, crudasociado_controller, editfactura, editmatricula, productos, editcuenta, reporte_alumnos, reporte_cobranza, arqueo_controller, timbrado, ingresos_producto, reporte_contrato, resumen_ventas, logoutback
from .utils import login_required
from flask import redirect, url_for






abm_routes = Blueprint('abm_routes', __name__)
abm_routes.route('/logout', methods=['POST'])(logoutback.logout)









# Definición correcta de rutas
abm_routes.route('/', methods=['GET'])(lambda: redirect(url_for('auth_routes.login')))
abm_routes.route('/', methods=['GET'])(contact_controller.index)
abm_routes.route('/add_contact', methods=['POST'])(contact_controller.add_contact)
abm_routes.route('/edit/<int:id>', methods=['GET'])(contact_controller.edit_contact)
abm_routes.route('/venta', methods=['GET'])(venta_controller.venta)
abm_routes.route('/edit_venta', methods=['GET'])(venta_controller.edit_venta)
abm_routes.route('/refinanciar', methods=['GET'])(venta_controller.refinanciar)

#Definicion de matricula
abm_routes.route('/matricula', methods=['GET'])(matricula_controller.matricula)
abm_routes.route('/delete/<int:id>')(contact_controller.delete_contact)  # <- Agregada correctamente
abm_routes.route('/update/<int:id>', methods=['POST'])(contact_controller.update_contact)
abm_routes.route('/obtener_monedas', methods=['GET'])(matricula_controller.obtener_monedas)
abm_routes.route('/buscar_asociado', methods=['GET'])(matricula_controller.buscar_asociado)
abm_routes.route('/obtener_cliente', methods=['GET'])(matricula_controller.obtener_cliente)
abm_routes.route('/buscar_cliente', methods=['GET'])(matricula_controller.buscar_cliente)
abm_routes.route('/registrar_matricula', methods=['POST'])(matricula_controller.registrar_matricula)
abm_routes.route('/verificar_matricula', methods=['POST'])(matricula_controller.verificar_matricula)
abm_routes.route('/validar_estado_financiero', methods=['POST'])(matricula_controller.validar_estado_financiero)
#abm_routes.route('/obtener_moneda', methods=['POST'])(matricula_controller.obtener_monedas)

#Definicion de crud padres
abm_routes.route('/crud_padre', methods=['GET'])(crudpadre_controller.indexpadres)
abm_routes.route('/add_cliente', methods=['POST'])(crudpadre_controller.add_cliente)
abm_routes.route('/get_user', methods=['POST'])(crudpadre_controller.get_user)
abm_routes.route('/edit_cliente/<int:user_id>', methods=['POST'])(crudpadre_controller.edit_cliente)
abm_routes.route('/search_cliente', methods=['GET'])(crudpadre_controller.search_cliente)
abm_routes.route('/delete_cliente/<int:user_id>', methods=['DELETE'])(crudpadre_controller.delete_cliente)
abm_routes.route('/update_status/<int:user_id>', methods=['POST'])(crudpadre_controller.update_status)

#Definicion de crud alumnos
abm_routes.route('/crud_asociado', methods=['GET'])(crudasociado_controller.indexasociado)
abm_routes.route('/buscar_clienteaso', methods=['GET'])(crudasociado_controller.buscar_clienteaso)
abm_routes.route('/add_clienteaso', methods=['POST'])(crudasociado_controller.add_clienteaso)
abm_routes.route('/edit_clienteaso/<int:user_id>', methods=['POST'])(crudasociado_controller.edit_clienteaso)
abm_routes.route('/get_useraso', methods=['POST'])(crudasociado_controller.get_useraso)
abm_routes.route('/update_statusaso/<int:user_id>', methods=['POST'])(crudasociado_controller.update_statusaso)
abm_routes.route('/search_clienteaso', methods=['GET'])(crudasociado_controller.search_clienteaso)


#Definicion de rutas de ventas
abm_routes.route('/get_timbrados', methods=['GET'])(venta_controller.get_timbrados)
abm_routes.route('/obtener_cuotas/<int:id_asociado>', methods=['GET'])(venta_controller.obtener_cuotas)
abm_routes.route('/obtener_cuentas/<int:id_asociado>', methods=['GET'])(venta_controller.obtener_cuentas)
abm_routes.route('/get_productos', methods=['GET'])(venta_controller.get_productos)
abm_routes.route('/guardar_venta', methods=['POST'])(venta_controller.guardar_venta)
abm_routes.route('/marcar_impresa', methods=['POST'])(venta_controller.marcar_impresa)

#Anulacion de facturas
abm_routes.route('/buscar_facturas', methods=['POST'])(editfactura.buscar_facturas)
abm_routes.route('/obtener_factura/<int:id>', methods=['POST'])(editfactura.obtener_factura)
abm_routes.route('/editar_factura/<int:venta_id>', methods=['POST'])(editfactura.editar_factura)
abm_routes.route('/buscar_clientefact', methods=['GET'])(editfactura.buscar_clientefact)
abm_routes.route('/buscar_alumnofact', methods=['GET'])(editfactura.buscar_alumnofact)
abm_routes.route('/obtener_venta/<int:id_venta>', methods=['GET'])(editfactura.obtener_venta)
abm_routes.route('/datosfactura/<int:id_venta>', methods=['GET'])(editfactura.datosfactura)
abm_routes.route('/obtener_venta_por_id/<int:venta_id>', methods=['GET'])(editfactura.obtener_venta_por_id)
abm_routes.route('/detalle/<int:id_venta>', methods=['GET'])(editfactura.detalle)
abm_routes.route('/anular_factura/<int:idventa>', methods=['POST'])(editfactura.anular_factura)


#Refinanciacion de cuotas
abm_routes.route('/cuotas_pendientes', methods=['POST'])(refinanciacion.cuotas_pendientes)
abm_routes.route('/refinanciar2', methods=['POST'])(refinanciacion.refinanciar2)
abm_routes.route('/buscar_clientes_con_deuda', methods=['GET'])(refinanciacion.buscar_clientes_con_deuda)


#Edicion de facturas
abm_routes.route('/editmatricula', methods=['GET'])(editmatricula.editmatricula)

#Edicion de Matriculas
abm_routes.route('/buscar_alumno', methods=['GET'])(editmatricula.buscar_alumno)
abm_routes.route('/buscar_matricula', methods=['POST'])(editmatricula.buscar_matricula)
abm_routes.route('/obtener_matricula/<int:id_matricula>', methods=['GET'])(editmatricula.obtener_matricula)
abm_routes.route('/obtener_cursos', methods=['GET'])(editmatricula.obtener_cursos)
abm_routes.route('/actualizar_matricula', methods=['POST'])(editmatricula.actualizar_matricula)
abm_routes.route('/desactivar_mat/<int:idmatricula>', methods=['POST'])(editmatricula.desactivar_mat)


#Edicion de Productos
abm_routes.route('/productos', methods=['GET'])(productos.productos)
abm_routes.route('/obtener_productos', methods=['GET'])(productos.obtener_productos)
abm_routes.route('/agregar_producto', methods=['POST'])(productos.agregar_producto)
abm_routes.route('/editar_producto/<int:id>', methods=['PUT'])(productos.editar_producto)
abm_routes.route('/toggle_producto/<int:id>', methods=['PUT'])(productos.toggle_producto)

#Edicion de Cuentas

abm_routes.route('/buscar_alumnocuenta', methods=['GET'])(editcuenta.buscar_alumnocuenta)
abm_routes.route('/buscar_cuenta', methods=['POST'])(editcuenta.buscar_cuenta)
abm_routes.route('/editcuenta', methods=['GET'])(editcuenta.editcuenta)
abm_routes.route('/obtener_cuenta/<int:id_cuenta>', methods=['GET'])(editcuenta.obtener_cuenta)
abm_routes.route('/obtener_productosedit', methods=['GET'])(editcuenta.obtener_productosedit)
abm_routes.route('/desactivar_cuenta/<int:idcuentaasociado>', methods=['POST'])(editcuenta.desactivar_cuenta)
abm_routes.route('/actualizar_cuenta', methods=['POST'])(editcuenta.actualizar_cuenta)
abm_routes.route('/crear_cuenta', methods=['POST'])(editcuenta.crear_cuenta)

#Reportes
abm_routes.route('/pagina_listado', methods=['GET'])(reporte_alumnos.pagina_listado)
abm_routes.route('/listar_alumnos/<int:id_anio>/<int:id_grado>', methods=['GET'])(reporte_alumnos.listar_alumnos)
abm_routes.route('/reporte_cobranza', methods=['GET'])(reporte_cobranza.reporte_cobranza)
abm_routes.route('/listar_cobranza/<int:id_anio>/<int:id_grado>', methods=['GET'])(reporte_cobranza.listar_cobranza)
abm_routes.route('/estado_cuenta', methods=['GET'])(reporte_cobranza.estado_cuenta)
abm_routes.route('/buscar_alumnoestado', methods=['GET'])(reporte_cobranza.buscar_alumnoestado)
abm_routes.route('/get_cuotas/<int:id_alumno>/<int:anio>', methods=['GET'])(reporte_cobranza.get_cuotas)
abm_routes.route('/generar_pdf_estado', methods=['POST'])(reporte_cobranza.generar_pdf_estado)
abm_routes.route('/obtener_cuenta_reporte/<int:idclienteasociado>/<int:aniolectivo>', methods=['GET'])(reporte_cobranza.obtener_cuenta_reporte)

#Arqueo
abm_routes.route('/arqueo', methods=['GET'])(arqueo_controller.arqueo)
abm_routes.route('/generar-planilla', methods=['POST'])(arqueo_controller.generar_planilla)
abm_routes.route('/formatear_numero', methods=['GET'])(arqueo_controller.formatear_numero)
abm_routes.route('/exportar_excel', methods=['POST'])(arqueo_controller.exportar_excel)
abm_routes.route('/generar_planilla_data', methods=['POST'])(arqueo_controller.generar_planilla_data)

#Edicion de Timbrados
abm_routes.route('/timbrado', methods=['GET'])(timbrado.timbrados)
abm_routes.route('/obtener_timbrados', methods=['GET'])(timbrado.obtener_timbrados)
abm_routes.route('/agregar_timbrado', methods=['POST'])(timbrado.agregar_timbrado)
abm_routes.route('/editar_timbrado/<int:id>', methods=['PUT'])(timbrado.editar_timbrado)
abm_routes.route('/toggle_timbrado/<int:id>', methods=['PUT'])(timbrado.toggle_timbrado)


# ingresos por producto
abm_routes.route('/ingresos_por_producto', methods=['GET', 'POST'])(ingresos_producto.ingresos_por_producto)
abm_routes.route('/ingresos', methods=['GET'])(ingresos_producto.ingresos_products)


abm_routes.route('/contrato/', methods=['GET'])(reporte_contrato.contrato)
abm_routes.route('/listar_contratos/<int:anio>', methods=['GET'])(reporte_contrato.listar_contratos)

abm_routes.route('/resumen', methods=['GET'])(resumen_ventas.resumen)
abm_routes.route('/generar_planilla_r', methods=['POST'])(resumen_ventas.generar_planilla_r)
abm_routes.route('/obtener_ventas', methods=['POST'])(resumen_ventas.obtener_ventas)
abm_routes.route('/formatear_numero_r', methods=['GET'])(resumen_ventas.formatear_numero_r)
abm_routes.route('/exportar_excel_r', methods=['POST'])(resumen_ventas.exportar_excel_r)
abm_routes.route('/generar_planilla_data_r', methods=['POST'])(resumen_ventas.generar_planilla_data_r)
abm_routes.route('/obtener_ventas_ex', methods=['POST'])(resumen_ventas.obtener_ventas_ex)


