#import midi
import math
from sys import version_info
import os.path
import re


def give_name():
	return "Antoine"

### MIDI STANDARDS
### ==============


# Get pitch midi value from string
# Strings are of form C0 or F#3
def pitch_to_midi(pitch_str='C0'):
	octave = re.match(r'.*?([+-]?\d+)$', pitch_str).group(1)
	midi_octave = int(octave) + 2
	pitch_str = re.sub(octave, str(midi_octave), pitch_str)

	pitch_str = pitch_str[:-1] + '_' + pitch_str[-1:]

	pitch_str = pitch_str.replace('#', 's')
	return getattr(midi, pitch_str)

def parse_rhythm(rhythm_str):
	tuplet_re = re.compile(r'.*:(\d+)$')
	
	# a dotted note can be inputted "4."
	# this transforms it into 
	if rhythm_str[-1] == '.':
		rhythm_value = int(rhythm_str[:-1])
		rhythm_float = rhythm_value * 2/3.
	# a tuplet can be inputted "4:3" -> check for that
	elif tuplet_re.match(rhythm_str):
		tuplet_value = int(re.match(r'.*:?(\d+)$', rhythm_str).group(1))
		rhythm_value = float(rhythm_str[:-(len(str(tuplet_value))+1)])
		# Assuming the piece is in a binary time signature,
		# the full tuplet will have the length of the nearest lower
		# power of 2 times the length of the rhythm value
		rv_length_in_beats = parse_rhythm(str(rhythm_value))
		total_length = rv_length_in_beats * int(pow(2, math.floor(math.log(tuplet_value, 2))))
		rhythm_float = 4 / (total_length / tuplet_value)
	else:
		rhythm_float = float(rhythm_str)
	
	length_in_beats = 4 / rhythm_float
	return length_in_beats

# Get midi ticks values from rhythms
def rhythm_to_ticks(rhythm_str='4', bpm=100, resolution=220):
	length_in_beats = parse_rhythm(rhythm_str)
	ticks = resolution * length_in_beats
	return int(ticks)

# Format tempo for midi tempo event
# This takes a tempo (in bpm), converts it to microseconds per beat
# then converts that number into an array of 8-bit words
# (splitting it up by powers of 256)
def make_tempo_event(bpm=100):
	mspb = 60 * 1000000 / int(bpm)
	return [(mspb >> (16 - (8 * x)) & 0xFF) for x in range(3)]

# Helper function to get BPM from midi tempo event
def evt_to_bpm(evt):
    a = evt[0]*65536
    b = evt[1]*256
    c = evt[2]*64
    abc = a+b+c
    return int(abc*60/1000000.0)


### USER INPUT
### ==========


# Deal with Python version
def simp_input(question):
	# Create boolean value for test that Python major version > 2
	py3 = version_info[0] > 2
	
	if py3:
		return input(question)
	else:
		return raw_input(question)

# Console ask
def ask_user(question, repeat=False):
	question += ' '
	if not repeat:
		return simp_input(question)
	else:
		print(question + "\n (leave blank if you're done) \n")
		item = None
		items = []
		i = 1
		while item is not '':
			item = simp_input("#" + str(i) + ": ")
			if item is not '': items.append(item)
			i += 1
		print("")
		return items

# Parse webapp strings
def parse_input(input_str):
	return input_str.split()


### XP MAKING
### =========


# Mix and match notes and rhythms,
# thereby creating the XP.
# Returns a list of (note, rhythm) tuples
def xp_mix_and_match(notes, rhythms):
	note = (notes[0], rhythms[0])
	xp = [note]
	notes_i = 0
	rhythms_i = 0
	while True:
		notes_i = (notes_i + 1) % len(notes)
		rhythms_i = (rhythms_i + 1) % len(rhythms)
		note = (notes[notes_i], rhythms[rhythms_i])
		if notes_i is 0 and rhythms_i is 0: break
		xp.append(note)
	return xp

def get_xp_length(xp):
	length = 0.
	for event in xp:
		length += parse_rhythm(event[1])
	return length

# Creates the midi pattern from the xp and the tempo
# Returns the pattern
def create_midi_xp(xp, bpm):
	# Instantiate a MIDI Pattern (contains a list of tracks)
	pattern = midi.Pattern()
	# Instantiate a MIDI Track (contains a list of MIDI events)
	track = midi.Track()
	# Append the track to the pattern
	pattern.append(track)
	# Append the tempo to the track
	tempoEvent = midi.SetTempoEvent(tick=0, data=make_tempo_event(bpm))
	track.append(tempoEvent)
	# Add the notes
	for event in xp:
		# Instantiate a MIDI note on event, append it to the track
		on = midi.NoteOnEvent(tick=0, velocity=20, pitch=event[0])
		track.append(on)
		# Instantiate a MIDI note off event, append it to the track
		off = midi.NoteOffEvent(tick=event[1], pitch=event[0])
		track.append(off)
	# Add the end of track event, append it to the track
	eot = midi.EndOfTrackEvent(tick=1)
	track.append(eot)
	return pattern

def rhythm_to_vexflow(rhythm_str):
	mapping = {'1': 'f',
			   '2': 'h',
			   '4': 'q'
			   }
	if rhythm_str in mapping:
		note = mapping[rhythm_str]
	else:
		note = rhythm_str
	note = note.replace('.', 'd')
	return note

def note_to_vexflow(note_str):
	note = re.findall(r'\w#?', note_str)[0] + '/' + re.findall(r'\d', note_str)[0]
	return note

# XP to Vexflow
def create_vexflow_xp(xp, bpm):
	for event in xp:
		length = parse_rhythm(event[1])
		note = note_to_vexflow(event[0])
		rhythm = rhythm_to_vexflow(event[1])

		vex_str = 'new VF.StaveNote({clef: "treble", '
		vex_str += 'keys: ["' + note + '"], '
		vex_str += 'duration: "' + rhythm + '" })'

		if '##' in note:
			vex_str += '.addAccidental(0, new VF.Accidental("##"))'
		elif '#' in note:
			vex_str += '.addAccidental(0, new VF.Accidental("#"))'
		elif 'bb' in note:
			vex_str += '.addAccidental(0, new VF.Accidental("bb"))'
		elif 'b' in note:
			vex_str += '.addAccidental(0, new VF.Accidental("b"))'
		if 'd' in rhythm:
			vex_str += '.addDotToAll()'

		vex_str += ", "

	num = length
	den = 4
	decimals = length - int(length)
	if decimals > 0.0:
		multiplier = 2
		while ((decimals * multiplier) - int(decimals * multiplier)) != 0.0:
			multiplier = multiplier * 2
		num = num*multiplier
		den = den*multiplier
	ts = (int(num), int(den))
	return vex_str[:-2], ts


### FILE CREATION
### =============


# Check if filename exists before overwriting.
# If it does, add "_1" at the end of it.
# If that already is there, replace "_1" with "_2" etc.
def check_and_fix_filename(filename):
	template = re.compile(r'^(\w+)_(\d+).mid$')
	while os.path.isfile(filename):
		if not template.match(filename):
			filename = filename[:-4] + '_1' + filename[-4:]
		else:
			end_numbers = re.match(r'.*?(\d+).mid$', filename).group(1)
			i = int(end_numbers) + 1
			filename = re.sub(end_numbers, str(i), filename)
	return filename

# Removes any extension in the user inputted filename
def remove_extension(filename):
	filename = filename.replace('.mid', '')
	filename = filename.replace('.', '')
	return filename

# Takes a filename WITHOUT EXTENSION AND SAVES
def write_midifile(filename, pattern):
	filename += ".mid"
	filename = check_and_fix_filename(filename)
	midi.write_midifile(filename, pattern)


### RUNNING THE PROGRAM
### ===================


def run_creation(bpm, notes, rhythms):
	# Convert notes to midi pitch values
	notes = [pitch_to_midi(note) for note in notes]
	# Convert rhythms to midi tick values
	rhythms = [rhythm_to_ticks(bpm=bpm, rhythm_str=rhythm) for rhythm in rhythms]

	# Make the xp notes loop
	xp = xp_mix_and_match(notes, rhythms)

	# Make midi out of xp notes values
	pattern = create_midi_xp(xp, bpm)

	return pattern

## Run program with user input
def run_user():
	# Ask user for tempo
	bpm = ask_user("What's the tempo (in BPM)?")
	# Ask user for notes
	notes = ask_user("Enter your notes", repeat=True)
	# Ask user for rhythm
	rhythms = ask_user("Enter your rhythm", repeat=True)
	# Run
	pattern = run_creation(bpm, notes, rhythms)
	# Save or not
	save = ask_user("Would you like to save your XP as a midi file? (Y/N)")
	if save is not 'N' and save is not 'No' and save is not 'no':
		filename = ask_user("Enter a name for your file:")
		filename = remove_extension(filename)
		# Save the pattern to disk
		write_midifile(filename, pattern)


## Run program with test values
def run_test(bpm, notes, rhythms, filename=None):
	pattern = run_creation(bpm, notes, rhythms)
	if filename:
		write_midifile(filename, pattern)

def run_tuplets_test():
	bpm = 120

#run_user()
# EMPTY WHITE ROOM
#run_test(120, ['F3', 'G#3', 'F3', 'C#4', 'E3', 'C3', 'G#3'], ['4', '8', '4.', '2', '8', '8'], 'empty_white_room')
# TUPLETS
#run_test(120, ['C3'], ['4', '4', '4.', '8', 
#		'4:3', '4:3', '4:3', '4:3', '4:3', '4:3',
#		'2:5', '2:5', '2:5', '2:5', '2:5',
#		'8:6', '8:6', '8:6', '8:6', '8:6', '8:6'], 'tuplets')