function updateFields(currentField) {
	updateXP();
	if (currentField == "notes") {
		updateNotes();
	} else if (currentField == "rhythms") {
		updateRhythms();
	}
	
};

function updateNotes() {
	
};

function updateRhythms() {
	console.log('updateRhythms()');
	var input_r = $('#rhythms_input').val();
	input_r = input_r.replace(/[-,;:\/\']+/g, ' '); // Replace separators with space
	input_r = input_r.replace(/^\s+|\s+$/g, ''); // Remove trailing spaces

	var r_str = "L: 1\nK: perc stafflines=1\n"; // Make new string
	r_str += input_r.replace(/^|\D+/g, ' B/').slice(1);

	$('#rhythms_translated').val(r_str); // Put new string in a hidden textarea
	console.log($('#rhythms_translated').val());
	// Update the svg score
	rhythm_editor = new ABCJS.Editor("rhythms_translated", { canvas_id: "rhythm_canvas", midi_id:"rhythm_midi", warnings_id:"warnings" });
};

function updateXP() {
	var title = $('#title_input').val() || "XP";
	var bpm = $('#bpm_input').val() || "100";

	var notes_str = $('#notes_input').val();
	var notes = notes_str.split(/[ ]+/);

	var rhythms_str = $('#rhythms_input').val();
	//rhythms_str = rhythms_str.replace(/L:?[ ]+\d?[\n]+/, '');
	//rhythms_str = rhythms_str.replace(/[ ]+/g, '0');
	//rhythms_str = rhythms_str.replace(/\D/g, '');
	//var rhythms = rhythms_str.split(/0/);
	var rhythms = rhythms_str.split(/[\D]+/);

	var xp = xp_mix_and_match(notes, rhythms);
	var xp_abcjs = create_abcjs_xp(xp) || "";

	// Update XP Input
	abcjs_text = mk_abcjs_text(title, bpm, xp_abcjs);
	xp_input = $('#xp_input');
	xp_input.val(abcjs_text);

	xp_editor = new ABCJS.Editor("xp_input", { canvas_id: "xp_canvas",
												 		 midi_id: "xp_midi",
												 		 midi_download_id: "xp_midi_dl",
												 		 midi_options: {
												 		 	generateDownload:"true",
												 		 	downloadLabel:"Download %T.mid"
												 		 },
												 		 warnings_id: "warnings",
												 		 parser_params: {},
												 		 generate_midi: true,
												 		 generate_warnings: false
											    });
};

function update_text_field(field_id, text) {
	$('#' + field_id).val(text);
};

function mk_abcjs_text(title, bpm, xp_abcjs) {
	var abcjs_text = "T: " + title;
	abcjs_text += "\nL: 1";
	abcjs_text += "\nQ: " + bpm;
	//abcjs_text += "\nM: " + ts[0] + "/" + ts[1];
	abcjs_text += "\n||: " + xp_abcjs + ":||";

	return abcjs_text;
};

function xp_mix_and_match(notes, rhythms) {
	var note = [notes[0], rhythms[0]];
	var xp = [note];
	var notes_i = 0;
	var rhythms_i = 0;
	while(true) {
		notes_i = (notes_i + 1) % notes.length;
		rhythms_i = (rhythms_i + 1) % rhythms.length;
		note = [notes[notes_i], rhythms[rhythms_i]];
		if (notes_i == 0 && rhythms_i == 0) {
			break;
		};
		xp.push(note);
	};
	return xp;
};

function create_abcjs_xp(xp) {
	var length = 0;
	var abcjs_str = "";
	for (var i = 0; i < xp.length; i++) {
		evt = xp[i];
		length += parse_rhythm(evt[1]);
		note_rhythm = note_rhythm_to_abcjs(evt[0], evt[1]);

		abcjs_str += note_rhythm + " ";
	};

	//var time_signature = length_to_time_signature(length);
	return abcjs_str;//, time_signature;
};

function parse_rhythm(rhythm_str) {
	tuplet_re = /.*:(\d+)$/;
	
	if (rhythm_str[rhythm_str.length - 1] == '.') {
		var rhythm_value = parseInt(rhythm_str);
		var rhythm_float = rhythm_value * 2/3;
	} else {
		rhythm_float = parseFloat(rhythm_str);
	};
	
	var length_in_beats = 4 / rhythm_float;
	return length_in_beats;
};

function note_rhythm_to_abcjs(note_str, rhythm_str) {
	return note_str + '/' + rhythm_str
};