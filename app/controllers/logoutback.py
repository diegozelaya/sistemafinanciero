from flask import session, redirect, url_for

from flask import Flask

def logout():
    session.clear()
    return redirect(url_for("auth_routes.login"))