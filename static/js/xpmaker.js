function updateFields(currentField) {
	updateXP();
	if (currentField == "notes") {
		updateNotes();
	} else if (currentField == "rhythms") {
		updateRhythms();
	};
	
};

function updateNotes() {
	var input_n = $('#notes_input').val();
	input_n = input_n.replace(/[-,;:\/\']+/g, ' '); // Replace separators with space
	input_n = removeTrailingSpace(input_n); // Remove trailing spaces

	var n_str = "L: 1\n"; // Make new string
	n_str += input_n;

	$('#notes_translated').val(n_str); // Put new string in a hidden textarea
	// Update the svg score
	notes_editor = new ABCJS.Editor("notes_translated", { canvas_id: "notes_canvas", midi_id:"rhythm_midi", warnings_id:"warnings" });
};

function updateRhythms() {
	var input_r = $('#rhythms_input').val();
	input_r = input_r.replace(/[-,;:\/\']+/g, ' '); // Replace separators with space
	input_r = removeTrailingSpace(input_r); // Remove trailing spaces

	var r_str = input_r.replace(/^|\D+/g, ' B/').slice(1); // Add "B/" before each number

	// Get time signature
	var length = 0;
	var input_l = input_r.split(' ');
	for (var i = 0; i < input_l.length; i++) {
		r = input_l[i];
		length += parse_rhythm(r);
	};
	var ts = length_to_time_signature(length)
	ts = divide_ts(ts);

	var matrix = abcjs_str_to_full_matrix(r_str, ts); // MUST always come before adjust_beams (depends on the spaces)
	console.log(matrix);
	r_str = adjust_beams(r_str);
	r_str = make_bars_fit(ts, r_str);
	r_str = auto_line_break(r_str, matrix, 2);

	r_str = "L: 1\nK: perc stafflines=1\nM:" + ts[0] + '/' + ts[1] + '\n' + r_str;

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

	var matrix = abcjs_str_to_full_matrix(abcjs_str, time_signature); // MUST always come before adjust_beams (depends on the spaces)
	abcjs_str = auto_line_break(abcjs_str, matrix, 4);

	abcjs_str = make_bars_fit(time_signature, abcjs_str);
	abcjs_str = adjust_beams(abcjs_str);

	return [abcjs_str, time_signature];
};

function auto_line_break(abcjs_str, matrix, n) {
	var indexes = get_each_nth_bars(n, matrix);
	for (var i = 0; i < indexes.length; i++) {
		var position = getPosition(abcjs_str, ' ', indexes[i]);
		abcjs_str = abcjs_str.substr(0, position) + '\n' + abcjs_str.substr(position + 1, abcjs_str.length);
	};
	return abcjs_str;
};

function get_each_nth_bars(n, matrix) {
	var indexes = [];
	for (var i = 0; i < matrix[0].length; i++) {
		if (matrix[3][i] % (n+1) == 0 && matrix[4][i] == 1) {
			indexes.push(i);
		};
	};
	console.log(indexes);
	return indexes;
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
	var feel = 4
	if (ts[0] % 4 != 0 && ts[0] % 3 != 0 || ts[0] == ts[1]) {
		return ts;
	} else if (ts[0] % 3 == 0) {
		feel = 3;
	} else if (ts[0] % 4 == 0) {
		feel = 4;
	};
	var num = ts[0] / (ts[0] / feel);
	var new_ts = [num, ts[1]];
	return new_ts;
};

function make_bars_fit(ts, abcjs_str) {
	var rhythms = rhythm_from_abcjs(abcjs_str); // make list of rhythms out of the string
	current_bar = 0;
	for (var i = 0; i < rhythms.length - 1; i++) { // - 1 to avoid getting a bar line at the end
		current_bar +=  rhythm_to_length(rhythms[i], ts[1]); // convert rhythm to make sense with ts den
		if (current_bar >= ts[0]) {
			var j = getPosition(abcjs_str, ' ', i+1); // find the position of the note in the string
			abcjs_str = abcjs_str.substring(0, j) + '|' + abcjs_str.substring(j, abcjs_str.length); // add bar line
			current_bar -= ts[0]; // reset length
		};
	};
	return abcjs_str;
};

function adjust_beams(abcjs_str) {
	var rhythms = rhythm_from_abcjs(abcjs_str); // make list of rhythms out of the string
	abcjs_str = abcjs_str.replace(/[ ]+/g, '0');
	current_beat = 0;
	var new_str = abcjs_str;
	for (var i = 0; i < rhythms.length; i++) {
		r_length = rhythm_to_length(rhythms[i]); // convert rhythm to make sense with ts den
		current_beat += r_length;
		if (current_beat <= 1 && i > 0 && current_beat > r_length) {
			j = getPosition(abcjs_str, '0', i);
			new_str = new_str.substr(0,j) + '%' + new_str.substr(j+1,new_str.length);
		};
		if (current_beat >= 1) {
			current_beat = 0; // reset length
		};
	};
	new_str = new_str.replace(/[0]+/g, ' ');
	new_str = new_str.replace(/[%]+/g, '');
	return new_str;
};

function rhythm_to_length(rhythm_str, ts_den) {
	if (ts_den === undefined) {
        ts_den = 4;
    };
    return ts_den / parseInt(rhythm_str);
}

function abcjs_str_to_matrix(abcjs_str) {
	var notes = notes_from_abcjs(abcjs_str);
	var rhythms = rhythm_from_abcjs(abcjs_str);
	return [notes, rhythms];
};

// Bar number is 1-indexed!
// Beat number is 1-indexed too!
function abcjs_str_to_full_matrix(abcjs_str, ts) {
	var notes = notes_from_abcjs(abcjs_str);
	var rhythms = rhythm_from_abcjs(abcjs_str);
	var bar_nrs = [];
	var beat_nrs = [];

	var length = 0;
	var bar_nr = 1;
	var beat_nr = 0;
	for (var i = 0; i < rhythms.length; i++) {
		beat_nrs.push(beat_nr + 1);
		bar_nrs.push(bar_nr);
		beat_nr += rhythm_to_length(rhythms[i], ts[1]);
		if (beat_nr >= ts[0]) {
			beat_nr -= ts[0];
			bar_nr++;
		};
	};

	return [notes, rhythms, ts, bar_nrs, beat_nrs]
};

// Give current beat in bar (1, 2, 3, 4 but also 3.5)
// or current bar number (1, 2, 3, 4)
function get_nr(option, abcjs_str, index, ts) {
	if (ts === undefined) {
        ts = [4,4];
    };
    if (option === undefined) {
    	option = "beat";
    };

	var matrix = abcjs_str_to_matrix(abcjs_str);
	var rhythms = matrix[1];

	var length = 0;
	var bar_nr = 0;
	for (var i = 0; i < index; i++) {
		length += rhythm_to_length(rhythms[i], ts[1]);
		if (length >= ts[0]) {
			length -= ts[0];
			bar_nr++;
		};
	};
	if (option == "beat") {
		return length;
	} else if (option == "bar") {
		return bar_nr;
	};
};

function getPosition(string, subString, index) {
	return string.split(subString, index).join(subString).length;
};

function rhythm_from_abcjs(abcjs_str) {
	abcjs_str = removeTrailingSpace(abcjs_str);
	abcjs_str = abcjs_str.replace(/[ ]+/g, '0'); // replace spaces with 0's
	abcjs_str = abcjs_str.replace(/[\D]+/g, ''); // remove non-digits
	return abcjs_str.split('0'); // create array with all digits
};

function notes_from_abcjs(abcjs_str) {
	abcjs_str = removeTrailingSpace(abcjs_str); // clean up
	abcjs_str = abcjs_str.replace(/[^A-GZ-z]+/g, '0'); // remove non-notes
	if (abcjs_str[0] == '0') {
		abcjs_str = abcjs_str.substr(1, abcjs_str.length);
	}; // clean up
	if (abcjs_str[abcjs_str.length-1] == '0') {
		abcjs_str = abcjs_str.substr(0, abcjs_str.length-1);
	};
	return abcjs_str.split('0'); // create array with all notes
};

function parse_rhythm(rhythm_str) {
	tuplet_re = /.*:(\d+)$/;

	if (rhythm_str == '3') rhythm_str = '4.';
	if (rhythm_str == '6' || rhythm_str == '7') rhythm_str = '8.';
	if (rhythm_str == '11') rhythm_str = '16.';
	
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