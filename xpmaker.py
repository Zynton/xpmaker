import midi
import math
from sys import version_info
import os.path
import re


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
	dotted = False
	tuplet_type = None
	rhythm_value = 0

	tuplet_re = re.compile(r'.*:(\d+)$')
	
	# a dotted note can be inputted "4." -> check for that
	if rhythm_str[-1] == '.':
		dotted = True
		rhythm_value = int(rhythm_str[:-1])
	# a tuplet can be inputted "4:3" -> check for that
	elif tuplet_re.match(rhythm_str):
		tuplet_type = int(re.match(r'.*:?(\d+)$', rhythm_str).group(1))
		print "tuplet_type:", tuplet_type
		print "rhythm_str:", rhythm_str
		print "len(str(tuplet_type)):", len(str(tuplet_type))
		print "rhythm_str[:-(len(str(tuplet_type))+1)]:", rhythm_str[:-(len(str(tuplet_type))+1)]
		rhythm_value = int(rhythm_str[:-(len(str(tuplet_type))+1)])
	else:
		rhythm_value = int(rhythm_str)
	
	rhythm = {'value': rhythm_value, 'dotted': dotted, 'tuplet_type': tuplet_type}
	return rhythm

# Get midi ticks values from rhythms
def rhythm_to_ticks(rhythm_str='4', bpm=100, resolution=220):
	# a quarter note (rhythm = 4) means ticks = qn/1
	# that's qn/2^(log2(rhythm)-2)
	# = qn/2^(2-2) = qn/2^0 = qn/1
	# a rhythm 1 should give a denominator 1/4
	# a rhythm 2 should give a denominator 1/2
	# a rhythm 4 should give a denominator 1
	# a rhythm 8 (8th note) should give a denominator 2
	# a rhythm 16 (16th note) should give a denominator 4
	# a rhythm 32 should give a denominator 8
	def get_denominator(rhythm_int):
		return math.pow(2, (math.log(rhythm_int, 2) - 2))

	qn = resolution # a quarter note is the same tick value as the resolution
	rhythm = parse_rhythm(rhythm_str)
	# a dotted note can be inputted "4." -> check for that
	if rhythm['dotted']:
		denominator = get_denominator(rhythm['value'])
		ticks = qn / denominator
		ticks += qn / get_denominator(rhythm['value'] * 2)
	# whole note -> 1/4
	# quarter note -> 1
	# 4 (x) quarter notes (1) (y) = 1 whole note (1/4) (z)
	# -> y/x=z <=> 1/4 = 1/4
	#
	# 2 (x) half notes (1/2) (y) = 1 whole note (1/4) (z)
	# -> y/x=z <=> 1/2/2 = 1/4
	#
	# Therefore: 3 (x) quarter note triplets (1) (y) = 1 half note (1/2) (z)
	# -> y/x=z <=> y = xz <=> y = 3/2
	# -> triplet_denominator = tuplet_type * get_denominator(rhythm/2)
	elif rhythm['tuplet_type']:
		denominator = rhythm['tuplet_type'] * get_denominator(rhythm['value'] / 2)
		ticks = qn / denominator
	else:
		denominator = get_denominator(rhythm['value'])
		ticks = qn/denominator
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

def ask_user(question, repeat=False):
	question += ' '
	if not repeat:
		return simp_input(question)
	else:
		print question, "\n (leave blank if you're done) \n"
		item = None
		items = []
		i = 1
		while item is not '':
			item = simp_input("#" + str(i) + ": ")
			if item is not '': items.append(item)
			i += 1
		print ""
		return items


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
	print "File saved as", filename


### RUNNING THE PROGRAM
### ===================


def run_creation(bpm, notes, rhythms):
	# Convert notes to midi pitch values
	notes = [pitch_to_midi(note) for note in notes]
	print "notes:", notes, '\n'
	# Convert rhythms to midi tick values
	rhythms = [rhythm_to_ticks(bpm=bpm, rhythm_str=rhythm) for rhythm in rhythms]
	print "rhythms:", rhythms, '\n'

	# Make the xp notes loop
	xp = xp_mix_and_match(notes, rhythms)
	print 'xp:', xp

	# Make midi out of xp notes values
	pattern = create_midi_xp(xp, bpm)
	print 'pattern:', pattern

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
def run_test(bpm, notes, rhythms, filename='xp'):
	pattern = run_creation(bpm, notes, rhythms)
	write_midifile(filename, pattern)

def run_tuplets_test():
	bpm = 120

#run_user()
# EMPTY WHITE ROOM
#run_test(120, ['F3', 'G#3', 'F3', 'C#4', 'E3', 'C3', 'G#3'], ['4', '8', '4.', '2', '8', '8'], 'empty_white_room')
# TUPLETS
run_test(120, ['C3'], ['4', '4', '4.', '8', 
		'4:3', '4:3', '4:3', '4:3', '4:3', '4:3',
		'2:5', '2:5', '2:5', '2:5', '2:5',
		'8:6', '8:6', '8:6', '8:6', '8:6', '8:6'], tuplets)