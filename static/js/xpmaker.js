function updateFields(currentField) {
	updateXP();
	if (currentField == "notes") {
		updateNotes();
	} else if (currentField == "rhythms") {
		updateRhythms();
	}
	
};

function updateNotes() {
	var input_n = $('#notes_input').val();
	input_n = input_n.replace(/[-,;:\/\']+/g, ' '); // Replace separators with space
	input_n = removeTrailingSpace(input_n); // Remove trailing spaces

	var n_str = "L: 1\n"; // Make new string
	n_str += input_n;
	//n_str += input_n.replace(/^|\W^[#]+/g, ' ^').slice(1);

	$('#notes_translated').val(n_str); // Put new string in a hidden textarea
	// Update the svg score
	notes_editor = new ABCJS.Editor("notes_translated", { canvas_id: "notes_canvas", midi_id:"rhythm_midi", warnings_id:"warnings" });
};

function updateRhythms() {
	var input_r = $('#rhythms_input').val();
	input_r = input_r.replace(/[-,;:\/\']+/g, ' '); // Replace separators with space
	input_r = removeTrailingSpace(input_r); // Remove trailing spaces

	var r_str = "L: 1\nK: perc stafflines=1\n"; // Make new string
	r_str += input_r.replace(/^|\D+/g, ' B/').slice(1); // Add "B/" before each number

	$('#rhythms_translated').val(r_str); // Put new string in a hidden textarea
	// Update the svg score
	rhythm_editor = new ABCJS.Editor("rhythms_translated", { canvas_id: "rhythm_canvas", midi_id:"rhythm_midi", warnings_id:"warnings" });
};

function removeTrailingSpace(str) {
	return str.replace(/^\s+|\s+$/g, ''); // Remove trailing spaces
};

function updateXP() {
	var title = $('#title_input').val() || "XP";
	var bpm = $('#bpm_input').val() || "100";

	var notes_str = $('#notes_input').val();
	notes_str = removeTrailingSpace(notes_str);
	var notes = notes_str.split(/[ ]+/);

	var rhythms_str = $('#rhythms_input').val();
	rhythms_str = removeTrailingSpace(rhythms_str);
	//rhythms_str = rhythms_str.replace(/L:?[ ]+\d?[\n]+/, '');
	//rhythms_str = rhythms_str.replace(/[ ]+/g, '0');
	//rhythms_str = rhythms_str.replace(/\D/g, '');
	//var rhythms = rhythms_str.split(/0/);
	var rhythms = rhythms_str.split(/[\D]+/);

	var xp = xp_mix_and_match(notes, rhythms);
	var creation = create_abcjs_xp(xp);
	var xp_abcjs = creation[0] || "";
	var ts = creation[1] || [4,4];

	// Update XP Input
	abcjs_text = mk_abcjs_text(title, bpm, xp_abcjs, ts);
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

function mk_abcjs_text(title, bpm, xp_abcjs, ts) {
	var abcjs_text = "T: " + title;
	abcjs_text += "\nL: 1";
	abcjs_text += "\nQ: " + bpm;
	abcjs_text += "\nM: " + ts[0] + "/" + ts[1];
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

	var time_signature = length_to_time_signature(length);
	time_signature = divide_ts(time_signature);
	abcjs_str = make_bars_fit(time_signature, abcjs_str);
	abcjs_str = adjust_beams(abcjs_str, time_signature);

	return [abcjs_str, time_signature];
};

function length_to_time_signature(length) {
	var num = length;
	var den = 4;
	var decimals = length - parseInt(length);
	if (decimals > 0.0) {
		var multiplier = 2;
		while(((decimals * multiplier) - parseInt(decimals * multiplier)) != 0.0) {
			multiplier = multiplier * 2;
		};
		num = num * multiplier;
		den = den * multiplier;
	};
	var ts = [parseInt(num), parseInt(den)];
	return ts;
};

function divide_ts(ts) {
	if (ts[0] % ts[1] != 0 || ts[0] == ts[1]) {
		return ts;
	} else {
		var num = ts[0] / (ts[0] / ts[1]);
		var new_ts = [num, ts[1]];
	};
	return new_ts;
};

function make_bars_fit(ts, abcjs_str) {
	var rhythms = rhythm_from_abcjs(abcjs_str); // make list of rhythms out of the string
	current_bar = 0;
	for (var i = 0; i < rhythms.length - 1; i++) { // - 1 to avoid getting a bar line at the end
		current_bar += ts[1] / parseInt(rhythms[i]); // convert rhythm to make sense with ts den
		if (current_bar >= ts[0]) {
			var j = getPosition(abcjs_str, ' ', i+1); // find the position of the note in the string
			abcjs_str = abcjs_str.substring(0, j) + '|' + abcjs_str.substring(j, abcjs_str.length); // add bar line
			current_bar -= ts[0]; // reset length
		};
	};
	return abcjs_str;
};

function adjust_beams(abcjs_str, ts) {
	var rhythms = rhythm_from_abcjs(abcjs_str); // make list of rhythms out of the string
	abcjs_str = abcjs_str.replace(/[ ]+/g, '0');
	current_bar = 0;
	var new_str = abcjs_str;
	for (var i = 0; i < rhythms.length; i++) {
		current_bar += ts[1] / parseInt(rhythms[i]); // convert rhythm to make sense with ts den
		if (current_bar <= ts[0] && i > 0) {
			j = getPosition(abcjs_str, '0', i);
			new_str = new_str.substr(0,j) + '%' + new_str.substr(j+1,new_str.length);
		};
		if (current_bar >= ts[0]) {
			current_bar -= ts[0]; // reset length
		};
	};
	new_str = new_str.replace(/[0]+/g, ' ');
	new_str = new_str.replace(/[%]+/g, '');
	return new_str;
}

function getPosition(string, subString, index) {
	return string.split(subString, index).join(subString).length;
}

function rhythm_from_abcjs(abcjs_str) {
	abcjs_str = removeTrailingSpace(abcjs_str);
	abcjs_str = abcjs_str.replace(/[ ]+/g, '0'); // replace spaces with 0's
	abcjs_str = abcjs_str.replace(/[\D]+/g, ''); // remove non-digits
	return abcjs_str.split('0'); // create array with all digits
}

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