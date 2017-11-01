from flask import (Flask,
                   abort,
                   jsonify,
                   render_template,
                   redirect,
                   request,
                   session,
                   url_for,
                   make_response)
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
    notes_str = request.form['notes']
    rhythms_str = request.form['rhythms']
    
    bpm = request.form['bpm']
    notes = parse_input(notes_str)
    rhythms = parse_input(rhythms_str)

    xp = xp_mix_and_match(notes, rhythms)
    xp_vexflow, ts = create_vexflow_xp(xp, bpm, fourfour=True)

    return render_template('index.html', xp=xp_vexflow, ts=ts)

@app.route('/abcjs')
def abcjs():
    return render_template('abcjs.html')

@app.route('/abcjs', methods=['POST'])
def submit_abcjs():
    notes_str = request.form['notes']
    print("note_str: " + notes_str)
    rhythms_str = request.form['rhythms']
    print("rhythms_str: " + rhythms_str)

    notes = parse_input(notes_str)
    rhythms_str = re.sub("\D", " ", rhythms_str)
    rhythms = rhythms_str.split()
    rhythms = rhythms[1:]
    print("notes:", notes)
    print("rhythms:", rhythms)

    xp = xp_mix_and_match(notes, rhythms)
    print("xp:", xp)
    xp_abcjs, ts = create_abcjs_xp(xp)
    print("xp_abcjs:", xp_abcjs)
    print("ts:", ts)

    return render_template('abcjs.html', xp=xp_abcjs, ts=ts)

app.run(host='0.0.0.0', port=5000)