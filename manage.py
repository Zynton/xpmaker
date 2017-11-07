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

import re

from xpmaker import (parse_input,
                     create_vexflow_xp,
                     create_abcjs_xp,
                     xp_mix_and_match)

app = Flask(__name__, static_url_path='/static')
app.debug = True
Bower(app)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/', methods=['POST'])
def submit():
    title = request.form['title'] or 'XP'

    bpm = request.form['bpm'] or 100

    notes_str = request.form['notes']
    notes = parse_input(notes_str)

    rhythms_str = request.form['rhythms']
    rhythms_str = re.sub("\D", " ", rhythms_str)
    rhythms = rhythms_str.split()
    rhythms = rhythms[1:]

    xp = xp_mix_and_match(notes, rhythms)
    xp_abcjs, ts = create_abcjs_xp(xp)

    return render_template('abcjs.html', xp=xp_abcjs, ts=ts, title=title, bpm=bpm)

@app.route('/soundfont/<path:path>')
def send_js(path):
    return send_from_directory('soundfont', path)

app.run(host='0.0.0.0', port=5000)