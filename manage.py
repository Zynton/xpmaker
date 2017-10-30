from flask import (Flask,
                   abort,
                   jsonify,
                   render_template,
                   redirect,
                   request,
                   session,
                   url_for,
                   make_response)

from xpmaker import (parse_input,
                     create_vexflow_xp,
                     xp_mix_and_match)

app = Flask(__name__, static_url_path='/static')
app.debug = True


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
    xp_vexflow, ts, prints = create_vexflow_xp(xp, bpm)

    return render_template('index.html', xp=xp_vexflow, ts=ts)

#app.run(host='0.0.0.0', port=5000)