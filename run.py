from flask import (Flask,
                   abort,
                   jsonify,
                   render_template,
                   redirect,
                   request,
                   session,
                   url_for,
                   make_response,
                   send_from_directory)
from flask_bower import Bower

app = Flask(__name__, static_url_path='/static')
app.debug = True
Bower(app)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/soundfont/<path:path>')
def send_js(path):
    return send_from_directory('soundfont', path)

app.run(host='0.0.0.0', port=5000)