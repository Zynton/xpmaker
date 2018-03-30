/**
* @todo Add support for tuplets.
* @todo Add support for b and # and 4. instead of _ and ^ and 3 on user input.
*/

(function() {

	$(document).ready(function() {
		init();
	});


	function init() {
		updateFields('notes');
		updateFields('rhythms');

		$(window).resize(function() {
			updateFields('notes');
			updateFields('rhythms');
		});
	};


	// USER INPUT TRANSFORMATION //
	// ========================= //


	/**
	* @description Check if the key pressed is a digit (or space or backspace).
	* @param {Object} e - A keypress event.
	* @returns {boolean} True if the key pressed is a digit, a space or a backspace.
	*/
	function key_pressed_is_digit(e) {
		var charval = String.fromCharCode(e.keyCode);
		// Backspace KB code is 8
		// Space KB code is 32
		if (isNaN(charval) && e.which > 46) {
			e.preventDefault();
		};
		return true;
	}


	/**
	* @description Update hidden textareas of the chosen input, its corresponding canvas
	* and the generated loop with values from user input in the DOM.
	* @param {string} currentField - The hidden div to update: 'notes' or 'rhythms'.
	*/
	function updateFields(currentField) {
		var notes_str = $('#notes_input').val();
		var rhythms_str = $('#rhythms_input').val();
		var title = $('#title_input').val();
		var bpm = $('#bpm_input').val();

		if (currentField == "notes") {
			updateNotes(notes_str, 'notes_translated');
		} else if (currentField == "rhythms") {
			updateRhythms(rhythms_str, 'rhythms_translated');
		};

		updateXP(notes_str, rhythms_str, title, bpm, "xp_input");
	};


	/**
	* @description Update the generated loop string and its corresponding canvas.
	* @param {string} notes_str - The user's raw notes input.
	* @param {string} rhythms_str - The user's raw rhythms input.
	* @param {string} title - The user's raw title input.
	* @param {string} bpm - The user's raw tempo input.
	* @param {string} out_id - The id of the output textarea (ex.: 'xp_out').
	*/
	function updateXP(notes_str, rhythms_str, title, bpm, out_id) {
		// Avoid processing empty strings
		if (notes_str === '' || notes_str === undefined || notes_str.match(/^[ ]+$/) ||
			rhythms_str === '' || rhythms_str === undefined || rhythms_str.match(/^[ ]+$/)) {
			xp_abc = '';
		} else {
			// Make array of notes out of input
			notes_str = clean_input_str(notes_str);
			var notes_a = notes_str.split(/[ ]+/);

			// Make array of rhythms out of input
			rhythms_str = clean_input_str(rhythms_str);
			var rhythms_a = rhythms_str.split(/[\D]+/);

			// Generate the loop
			var xp_abc = make_xp_abc(notes_a, rhythms_a);
			var ts = r_to_ts(rhythms_a);

			// Format the loop
			var bars_to_break = 4;
			if (ts[0] >= 13) bars_to_break = 2;
			xp_abc = format_abc_str(xp_abc, ts, bars_to_break);
			xp_abc = add_intro_to_abc_str(title, bpm, xp_abc, ts);
		};

		// Update loop textarea
		var xp_textarea = $('#' + out_id);
		xp_textarea.val(xp_abc);

		// Update loop canvas
		var xp_editor = update_editor(out_id, "xp_canvas", "xp_midi", "xp_midi_dl", $(window).width());
	};


	/**
	* @description Update the hidden notes input textarea and its corresponding canvas.
	* @param {string} notes_str - The user's raw notes input.
	* @param {string} out_id - The id of the output textarea (ex.: 'xp_out').
	*/
	function updateNotes(notes_str, out_id) {
		// Avoid processing an empty string
		if (notes_str === '' || notes_str === undefined || notes_str.match(/^[ ]+$/)) {
			notes_str = '';
		} else {
			// Add line breaks every 4 notes
			notes_str = clean_input_str(notes_str);
			notes_str = line_break_every_n_notes(notes_str, 4);

			// Add intro info to the string
			// (makes notes appear as halves)
			notes_str = "L: 1/2\n" + notes_str;
		};

		// Update hidden notes textarea
		$('#' + out_id).val(notes_str);

		// Update notes canvas
		var notes_editor = update_editor(out_id, "notes_canvas", "notes_midi", "notes_midi_dl", 350);
	};


	/**
	* @description Update the hidden rhythm input textarea and its corresponding canvas.
	* @param {string} notes_str - The user's raw notes input.
	* @param {string} rhythms_str - The user's raw rhythms input.
	* @param {string} out_id - The id of the output textarea (ex.: 'xp_out').
	*/
	function updateRhythms(rhythms_str, out_id) {
		var abc_str = '';
		// Avoid processing an empty string
		if (rhythms_str === '' || rhythms_str === undefined || rhythms_str.match(/^[ ]+$/)) {
			abc_str = ' ';
		} else {
			// Make array of rhythms out of input
			rhythms_str = clean_input_str(rhythms_str);
			var rhythms_a = rhythms_str.split(' ');
			rhythms_a = remove_wrong_rhythms(rhythms_a);
			rhythms_str = rhythms_a.join(' ');

			// Generate the abc string
			var ts = r_to_ts(rhythms_a);
			var abc_str = input_r_to_abc_str(rhythms_str, ts, 4);
		};

		// Update hidden rhythms textarea
		$('#' + out_id).val(abc_str);

		// Update rhythms canvas
		var notes_editor = update_editor(out_id, "rhythm_canvas", "rhythm_midi", "rhythm_midi_dl", 350);
	};


	// HELPERS


	/**
	* @description Remove all illegal values from an array of rhythm strings made from user input.
	* @param {array} r_arr - An array of rhythm strings (ex.: ['4', '8']).
	* @returns {array} The transformed rhythms array.
	*/
	function remove_wrong_rhythms(r_arr) {
		var l = r_arr.length;
		for (var i = 0; i < l; i++) {
			// If the rhythm is not made of digits, remove it.
			if (r_arr[i].match(/\d/)) {
			} else {
				r_arr.splice(i, 1);
				i -= 1; // The next index on the array is now i.
				l = r_arr.length;
			};
		};
		return r_arr;
	};


	/**
	* @description Check if a number (decimal or integer) is a power of 2.
	* @param {number} n - The number to check.
	* @returns {boolean} True if n is a power of 2.
	*/
	function is_power_of_two(n) {
		return Math.log2(n) % 1 == 0 ? true: false;
	};


	// TIME SIGNATURE CALCULATIONS //
	// =========================== //


	/**
	* @description Get a time signature from rhythms.
	* @param {array} rhythms_array - The rhythms to convert (ex.: ['4', '8', '8']).
	* @returns {array} A time signature to fit the rhythm in a readable way (ex.: [2, 4]).
	*/
	function r_to_ts(rhythms_array) {
		var length = r_arr_to_length(rhythms_array);
		var ts = length_to_ts(length)
		ts = divide_ts(ts);
		return ts;
	};


	/**
	* @description Get the length (in beats) of an array of rhythms.
	* @param {array} rhythms_array - The rhythms to measure (ex.: ['4', '4', '8']).
	* @returns {number} The length (in beats) of the rhythms (ex.: 2.5).
	*/
	function r_arr_to_length(rhythms_array) {
		var length = 0;
		for (var i = 0; i < rhythms_array.length; i++) {
			r = rhythms_array[i];
			length += r_str_to_length(r, 4);
		};
		return length;
	};


	/**
	* @description Get the length (in beats) of a rhythm (number).
	* @param {string} rhythm - The rhythm to measure (ex.: '4').
	* @param {number} ts_den - The denominator of the time signature (ex.: 4).
	* @returns {number} The length (in beats) of the rhythm (ex.: 1).
	*/
	function r_to_length(rhythm, ts_den) {
		if (ts_den === undefined) {
			ts_den = 4;
		};
		r_str = '' + rhythm; // Cast to string
		var length = r_str_to_length(r_str, ts_den);
		return length;
	};


	/**
	* @description Get the length (in beats) of a rhythm (string).
	* @param {number} rhythm - The rhythm to measure (ex.: '4').
	* @param {number} ts_den - The denominator of the time signature (ex.: 4).
	* @returns {number} The length (in beats) of the rhythm (ex.: 1).
	*/
	function r_str_to_length(rhythm_str, ts_den) {
		tuplet_re = /.*:(\d+)$/;

		if (rhythm_str == '0') {
			return 0;
		}

		// Test if dotted note
		// If so, rhythm_value is the nearest higher integer
		// that is a power of two and the length is
		// that times 2/3.
		var rhythm_value = parseInt(rhythm_str);
		if (is_power_of_two(rhythm_value) == false) {
			while (is_power_of_two(rhythm_value) == false) {
				rhythm_value += 1;
			};
			var rhythm_float = rhythm_value * 2/3;
		} else {
			var rhythm_float = parseFloat(rhythm_str);
		};

		var length_in_beats = ts_den / rhythm_float;
		return length_in_beats;
	};


	/**
	* @description Get the rhythm string corresponding to the length (in beats) of a rhythm.
	* @param {number} length - The length (in beats) (ex.: '1').
	* @param {number} ts_den - The denominator of the time signature (ex.: 4).
	* @returns {string} The rhythm string corresponding to the length (in beats) of a rhythm (ex.: '4').
	*/
	function length_to_r_str(length, ts_den) {
		var rhythm_float = ts_den / length;

		// Test if dotted note
		// If so, length is the nearest lower
		// integer that isn't a power of two
		if (is_power_of_two(length) == false) {
			length = length * 2/3;
			rhythm_float = ts_den / length;
			rhythm_float = parseInt(rhythm_float);
			while (is_power_of_two(rhythm_float) && rhythm_float > 0) {
				rhythm_float -= 1;
			};
		};

		var rhythm_str = '' + rhythm_float;

		return rhythm_str;
	};


	/**
	* @description Get the best fitting time signature for a certain length (in beats).
	* @param {number} length - The length (in beats) (ex.: '1.5').
	* @returns {array} The best fitting time signature (ex.: [3, 8]).
	*/
	function length_to_ts(length) {
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


	/**
	* @description Optimize a time signature by making it into a subdivision of itself (ternary or binary).
	* @param {array} ts - The time signature to optimize (ex.: [8, 4]).
	* @returns {array} The optimized time signature (ex.: [4, 4]).
	*/
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

		// Avoid 3/8, 2/8, 1/8:
		if (num <= 3 && ts[1] == 8) {
			// Avoid weird stuff with the 3/8 and 2/8 escaping below, in case the origin is 3/8 already.
			if (ts[0] <= 3 && ts[1] == 8) { // TODO: replace with if (ts[0] == num) ?
				return ts;
			};
			// Whatever we divided our original num by to get 3 or 2
			// has to be our lowest common denominator that isn't 3 or 2
			num = ts[0] / num;
		};

		var new_ts = [num, ts[1]];
		return new_ts;
	};


	// STRING MANIPULATIONS //
	// ==================== //


	/**
	* @description Make a full abcjs string for a noteless rhythm.
	* @param {string} input_r - An input rhythm string (ex.: '4 8 8 4').
	* @param {array} ts - A time signature (ex.: [3, 4]).
	* @param {number} n_bars_break - The number of bars after which to add a line break (ex.: 4).
	* @returns {string} A complete abcjs string ready to use (ex.: 'L: 1\nK: perc stafflines=1\nM:3/4\nB/4 B/8B/8 B/4').
	*/
	function input_r_to_abc_str(input_r, ts, n_bars_break) {
		var n_str = input_r_to_n_str(input_r);
		abc_str = format_abc_str(n_str, ts, n_bars_break); // Take care of beams, barlines & line breaks
		abc_str = "L: 1\nK: perc stafflines=1\nM:" + ts[0] + '/' + ts[1] + '\n' + abc_str;
		return abc_str;
	};


	/**
	* @description Make a full abcjs string from an abcjs valid string with notes (but no extra info).
	* @param {string} n_str - An abcjs valid string with notes (but no extra info) (ex.: 'B/4 B/8 B/8 B/4').
	* @param {array} ts - A time signature (ex.: [3, 4]).
	* @param {number} n_bars_break - The number of bars after which to add a line break (ex.: 4).
	* @returns {string} A complete abcjs string ready to use (ex.: 'L: 1\nK: perc stafflines=1\nM:3/4\nB/4 B/8B/8 B/4').
	*/
	function format_abc_str(n_str, ts, n_bars_break) {
		// The order of operations here is crucial!
		// TODO: check if it actually still is

		// if time signature is not valid, return an empty string
		if (ts[0] === NaN) {
			return '';
		};
		var matrix = abc_str_to_matrix(n_str, ts);
		var abc_str = add_ties(n_str, matrix);
		abc_str = add_barlines(abc_str, ts);
		abc_str = line_break_every_n_barlines(abc_str, n_bars_break);
		abc_str = adjust_beams(abc_str, ts);
		return abc_str;
	};


	/**
	* @description Modify the notes in an abcjs string to allow them to tie over beats whenever necessary.
	* @param {string} n_str - An abcjs valid string with notes (but no extra info) (ex.: 'B/4 B/8 B/8 B/4').
	* @param {array} matrix - A matrix array: [notes, rhythms, ts, bar_nrs, beat_nrs]
	* (ex.: [['B','B','B','B'],['4','8','8','4'],[3,4],[1,1,1,1],[1,2,2.5,3]]).
	* @returns {string} The transformed abcjs string.
	*/
	function add_ties(n_str, matrix) {
		var current_length = 0;
		var ts = matrix[2];
		var bar_length = ts[0] * (4 / ts[1]);

		for (var i = 0; i < matrix[1].length; i++) {
			n_str = n_str.replace(/[ ]+/g, ' '); // clean up: no multiple spaces
			var note_name = matrix[0][i];
			var rhythm_str = matrix[1][i];

			var note_length = r_to_length(rhythm_str);
			var available_time = 1;

			// Set current length to the fraction of the beat indicated by the matrix
			// matrix[4][i] gives the number of the beat we're on
			// - 1 because it was 0-indexed
			// * (4 / ts[1]): 4/4 will give 1 2 3 4 whereas 3/8 will give 1 2 3.
			// as we need 1 2 3 4 in one case and 0.5 1 1.5 in the other, we make that extra calculation.
			// % 1: we're only interested in the place *within* the beat, not the number of the beat
			// so we need only take the decimal place.
			current_length = ((matrix[4][i] - 1) * (4 / ts[1])) % 1;

			// Get how much length is still available in the bar for the note to unfold.
			// It's the amount of 'beats' (8ths or 4ths, whatever) minus the number of
			// beats passed, adjusted to the qn via ts[1].
			var left_in_bar = (ts[0] - (matrix[4][i] - 1)) * (4 / ts[1]);

			// TODO: Clean up where possible.
			// TODO: If we're somewhere within the first, third or fifth beat (etc.),
			// the note can be longer that 1 beat (eases reading).

			// If the note is on the first beat and it's not longer
			// than the bar, then let it be.
			if (note_length > 1 && matrix[4][i] == 1) {
				if (bar_length >= note_length) {
					available_time = note_length;
				} else { // if it IS longer than the bar, limit to the closest lower pair number
					if (Math.ceil(bar_length) % 2 == 0) {
						available_time = Math.floor(bar_length);
					} else {
						available_time = Math.floor(bar_length) - 1;
					};
				};
			};
			if (note_length > left_in_bar) {
				available_time = left_in_bar;
			};
			if (current_length + note_length > available_time) { // If we go beyond the available time, we split the note.
				var replacement_str = make_replacement_str('', note_name + '/' + rhythm_str, current_length % 1, note_length, available_time);
				replacement_str = replacement_str.replace(/(- )/g, '-`'); // temporarily remove space between tied notes so as not to confuse things

				// Insert the new note and rhythm in the string
				var position = getPosition(n_str, ' ', i);
				var old_str = note_rhythm_to_abc(note_name, rhythm_str);
				n_str = n_str.substr(0, position) + ' ' + replacement_str + ' ' + n_str.substr(position + old_str.length + 1, n_str.length);
				n_str = removeTrailingSpace(n_str); // clean up
			};
		};

		n_str = n_str.replace(/`/g, ' '); // revert ` back to spaces.

		return n_str;
	};


	/**
	* @description Recursive helper function to add_ties. Create the string that will replace
	* the string with the note that needs dividing.
	* @param {string} str_sofar - The string that has so far been generating.
	* @param {string} str_to_transform - The string that is left to transform.
	* @param {number} current_length - The current length in the beat.
	* @param {number} note_length - The length of the note that is being modified.
	* @param {number} available_time - The available time for the note that is being modified to develop without being split.
	* @returns {string} The modified string.
	*/
	function make_replacement_str(str_sofar, str_to_transform, current_length, note_length, available_time) {
		// Base case:
		if (current_length + note_length <= available_time || note_length == 0) {
			str_sofar = str_sofar.replace(/^(-)/, '');
			var replacement_str = str_sofar + '-' + str_to_transform;
			return replacement_str.replace(/-/g, '- ');
		} else { // Recursive case:
			// Get note name
			var note_name = str_to_transform.replace(/[^A-GZ-z`]/g, '');

			// Get length of the split note
			var first_note_length = available_time - current_length;
			var second_note_length = note_length - first_note_length;

			// Translate into a rhythm string
			var first_note_r_str = length_to_r_str(first_note_length, 4);
			var second_note_r_str = length_to_r_str(second_note_length, 4);

			// Create the string that should replace the original note in the abc_str
			str_sofar += '-' + note_name + '/' + first_note_r_str;
			str_to_transform = note_name + '/' + second_note_r_str;

			// Reset stuff
			current_length = 0;
			available_time = 1;

			return make_replacement_str(str_sofar, str_to_transform, current_length, second_note_length, available_time);
		};
	};


	/**
	* @description Make a minimal abcjs string from a rhythm input string.
	* @param {number} input_r - An input rhythm string (ex.: '4 8 16').
	* @returns {string} An abcjs valid string with notes (ex.: 'B/4 B/8 B/16').
	*/
	function input_r_to_n_str(input_r) {
		var n_str = input_r.replace(/^|\D+/g, ' B/').slice(1); // Add "B/" before each number
		return n_str;
	};


	/**
	* @description Add an intro text to an abc_str with its title, time signature and tempo.
	* @param {string} title - The title string.
	* @param {string} bpm - The tempo string.
	* @param {string} xp_abc - The loop (XP) string.
	* @param {array} ts - The time signature (ex.: [4,4]).
	* @returns {string} A complete abcjs string (with extra info).
	*/
	function add_intro_to_abc_str(title, bpm, xp_abc, ts) {
		var abc_intro = "";
		if (title !== undefined && title !== "") {
			abc_intro += "T: " + title + "\n";
		};
		abc_intro += "L: 1\n";
		if (bpm !== undefined && bpm !== "") {
			abc_intro += "Q: 1/4=" + bpm + "\n";
		};
		abc_intro += "M: " + ts[0] + "/" + ts[1] + "\n";

		var abc_str = abc_intro + "||: " + xp_abc + ":||";
		return abc_str;
	};


	// HELPERS //

	/**
	* @description Clean up a string by replacing all separators with spaces and removing all trailing spaces.
	* @param {string} str - The string to clean.
	* @returns {string} The clean string.
	*/
	function clean_input_str(str) {
		str = str.replace(/[-,;:\']+/g, ' '); // Replace separators with space
		str = removeTrailingSpace(str); // Remove trailing spaces
		return str;
	};


	/**
	* @description Remove trailing spaces from a string.
	* @param {string} str - The string to clean.
	* @returns {string} The clean string.
	*/
	function removeTrailingSpace(str) {
		return str.replace(/^\s+|\s+$/g, ''); // Remove trailing spaces
	};


	/**
	* @description Get the position (index) of the beginning of the nth occurrence of a substring within a string.
	* @param {string} string - The string in which to search.
	* @param {string} subString - The substring to find.
	* @param {number} n - The 1-indexed nth occurrence of the substring to find.
	* @returns {number} The index of the nth occurrence of the substring within in the string.
	*/
	function getPosition(string, subString, n) {
		return string.split(subString, n).join(subString).length;
	};


	/**
	* @description Make an abc-formatted string from a single note string and a single rhythm string.
	* @param {string} note_str - The single note string (ex.: 'A').
	* @param {string} rhythm_str - The single rhythm string (ex.: '4').
	* @returns {number} An abc-formatted string (ex.: 'A/4').
	* @todo Convert dotted notes and triplets.
	*/
	function note_rhythm_to_abc(note_str, rhythm_str) {
		return note_str + '/' + rhythm_str
	};


	// XP GENERATION //
	// ============= //


	/**
	* @description Generate an XP loop as a abc-formatted string.
	* @param {array} notes_a - An array of notes (ex.: ['C', 'd']).
	* @param {array} rhythms_a - An array of rhythms (ex.: ['4', '8', '16']).
	* @returns {string} An abc-formatted string (ex.: "C/4 d/8 C/16 d/4 C/8 d/16").
	*/
	function make_xp_abc(notes_a, rhythms_a) {
		var xp_a = xp_mix_and_match(notes_a, rhythms_a);
		var xp_abc = xp_to_abc(xp_a);
		return xp_abc;
	};


	/**
	* @description Distribute notes and rhythms to each other to generate an XP as an array of arrays of strings.
	* @param {array} notes_a - An array of notes (ex.: ['C', 'd']).
	* @param {array} rhythms_a - An array of rhythms (ex.: ['4', '8', '16']).
	* @returns {string} An array of [note, rhythm] pairs representing the new loop
	* (ex.: [ ['C', '4'], ['d', '8'], ['C', '16'], ['d', '4'], ['C', '8'], ['d', '16'] ]).
	*/
	function xp_mix_and_match(notes_a, rhythms_a) {
		var note = [notes_a[0], rhythms_a[0]];
		var xp = [note];
		var notes_i = 0;
		var rhythms_i = 0;
		while(true) {
			notes_i = (notes_i + 1) % notes_a.length;
			rhythms_i = (rhythms_i + 1) % rhythms_a.length;
			note = [notes_a[notes_i], rhythms_a[rhythms_i]];
			if (notes_i == 0 && rhythms_i == 0) {
				break;
			};
			xp.push(note);
		};
		return xp;
	};


	/**
	* @description Create an abc-formatted string from an XP loop array.
	* @param {array} xp - An XP loop array as generated by xp_mix_and_match() (ex.: [ ['C','4'],['C','8'] ]).
	* @returns {string} An abc-formatted string representing the XP loop.
	*/
	function xp_to_abc(xp) {
		var abc_str = "";
		for (var i = 0; i < xp.length; i++) {
			evt = xp[i];
			note_rhythm = note_rhythm_to_abc(evt[0], evt[1]);

			abc_str += note_rhythm + " ";
		};

		return abc_str;
	};


	// BAR MANIPULATIONS //
	// ================= //


	/**
	* @description DEPRECATED IN FAVOR OF line_break_every_n_barlines().
	* Add line breaks into an abc_str, after each nth bar.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @param {array} matrix - A matrix array: [notes, rhythms, ts, bar_nrs, beat_nrs]
	* (ex.: [['B','B','B','B'],['4','8','8','4'],[3,4],[1,1,1,1],[1,2,2.5,3]]).
	* @param {number} n - The number of bars after which to add a line break (ex.: 4).
	* @returns {string} An updated abc-formatted string with line breaks.
	*/
	function line_break_every_n_bars(abc_str, matrix, n) {
		var indexes = get_each_nth_bars(n, matrix);
		for (var i = 0; i < indexes.length; i++) {
			var position = getPosition(abc_str, ' ', indexes[i]);
			abc_str = abc_str.substr(0, position) + ' \n' + abc_str.substr(position + 1, abc_str.length);
		};
		return abc_str;
	};


	/**
	* @description Add line breaks into an abc_str, after each nth barline.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @param {number} n - The number of barlines after which to add a line break (ex.: 4).
	* @returns {string} An updated abc-formatted string with line breaks.
	*/
	function line_break_every_n_barlines(abc_str, n) {
		for (var i = n; i < abc_str.replace(/[^|]/g, '').length; i += n) {
			var position = getPosition(abc_str, '|', i);
			abc_str = abc_str.substr(0, position + 1) + ' \n' + abc_str.substr(position + 2, abc_str.length);
		};
		return abc_str;
	};


	/**
	* @description Add line breaks into an abc_str, after each nth note.
	* @param {string} notes_str - An abc-formatted string with no intro text.
	* @param {number} n - The number of notes after which to add a line break.
	* @returns {string} An updated abc-formatted string with line breaks.
	*/
	function line_break_every_n_notes(notes_str, n) {
		var notes_a = notes_str.split(/[ ]+/);

		if (notes_a.length >= n) {
			var new_str = notes_str;

			for (var i = n; i < notes_a.length; i += n) {
				var position = getPosition(notes_str, ' ', i);
				new_str = new_str.substr(0, position) + '`' + new_str.substr(position + 1, new_str.length);
			};

			notes_str = new_str.replace(/[`]+/g, '\n');
		};

		return notes_str;
	};


	/**
	* @description Add barlines into an abc_str, at the appropriate places depending on its time signature.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @param {array} ts - The time signature (ex.: [4,4]).
	* @returns {string} An updated abc-formatted string with barline.
	*/
	function add_barlines(abc_str, ts) {
		var rhythms = rhythm_from_abc(abc_str); // make list of rhythms out of the string
		current_bar = 0;
		for (var i = 0; i < rhythms.length - 1; i++) { // - 1 to avoid getting a bar line at the end
			var safe_str = escape_spaces(abc_str);
			current_bar += r_to_length(rhythms[i], ts[1]); // convert rhythm to make sense with ts den
			if (current_bar >= ts[0]) {
				var j = getPosition(safe_str, '`', i + 1); // find the position of the note in the string
				abc_str = abc_str.substring(0, j) + '|' + abc_str.substring(j, abc_str.length); // add bar line
				current_bar -= ts[0]; // reset length
			};
		};
		return abc_str;
	};


	/**
	* @description Adjust beams to span each beat in an abc-formatted string.
	* @param {string} abc_str - An abc-formatted string with no intro text (ex.: "C/4 d/8 E/16 E/16 C/4").
	* @param {array} ts - The time signature (ex.: [4,4]).
	* @returns {string} An updated abc-formatted string with adjusted beams spanning each beat (ex.: "C/4 d/8E/16E/16 C/4").
	*/
	function adjust_beams(abc_str, ts) {
		var rhythms = rhythm_from_abc(abc_str); // make list of rhythms out of the string
		var safe_str = abc_str.replace(/[ ]+/g, '`');

		current_beat = 0;
		for (var i = 0; i < rhythms.length; i++) {
			r_length = r_to_length(rhythms[i]); // convert rhythm to make sense with ts den
			// if the beat isn't complete, tie the beams (beat is complete when number is an integer)
			if (current_beat % 1 != 0) {
				if (i > 0) {
					var j = getPosition(safe_str, '`', i);
					abc_str = abc_str.substr(0,j) + '%' + abc_str.substr(j+1,abc_str.length);
				};
			};
			current_beat += r_length;
			// If we reach the end of the bar, reset current_beat
			if (current_beat >= ts[0] * (4 / ts[1])) {
				current_beat = 0;
			};
		};
		abc_str = abc_str.replace(/[%]+/g, '');
		return abc_str;
	};


	// HELPERS


	/**
	* @description Get the indexes of the beginning of every multiple of nth bar of a matrix array.
	* (ex.: if the matrix contains 4 bars and n=2, this will return [1,3]).
	* @param {number} n - The number of bars (ex.: 2)
	* @param {array} matrix - A matrix array: [notes, rhythms, ts, bar_nrs, beat_nrs]
	* (ex.: [['B','B','B','B'],['4','8','8','4'],[3,4],[1,1,1,1],[1,2,2.5,3]]).
	* @returns {array} An array of indexes.
	*/
	function get_each_nth_bars(n, matrix) {
		var indexes = [];
		for (var i = 0; i < matrix[0].length; i++) {
			if (matrix[3][i] % (n+1) == 0 && matrix[4][i] == 1) {
				indexes.push(i);
			};
		};
		return indexes;
	};


	/**
	* @description Create an array containing the index of the last note of each bar in a matrix array.
	* @param {array} matrix - A matrix array: [notes, rhythms, ts, bar_nrs, beat_nrs]
	* (ex.: [['B','B','B','B'],['4','8','8','4'],[3,4],[1,1,1,1],[1,2,2.5,3]]).
	* @returns {array} An array of indexes.
	*/
	function get_last_of_bar(matrix) {
		var indexes = [];
		for (var i = 0; i < matrix[0].length; i++) {
			// if we're on the first beat, take the note just before's index
			// (unless it's the very first beat of the melody).
			if (matrix[4][i] == 1) {
				if ( i - 1 >= 0) {
					indexes.push(i-1);
				};
			};
		};
		// Add the very last note's index
		indexes.push(matrix[0].length - 1);
		return indexes;
	};


	// PARSING //
	// ======= //


	/**
	* @description Create a "matrix" array containing information about a loop matrix.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @param {array} ts - A time signature (ex.: [4,4]).
	* @returns {array} A "matrix" array of aligned values: [notes, rhythms, ts, bar_nrs, beat_nrs]
	* (ex.: [['B','B','B','B'],['4','8','8','4'],[3,4],[1,1,1,1],[1,2,2.5,3]]).
	* /!\ Bar and beat numbers are 1-indexed for consistency with music theory.
	*/
	function abc_str_to_matrix(abc_str, ts) {
		var notes = notes_from_abc(abc_str);
		var rhythms = rhythm_from_abc(abc_str);
		var bar_nrs = [];
		var beat_nrs = [];

		var length = 0;
		var bar_nr = 1;
		var beat_nr = 0;
		for (var i = 0; i < rhythms.length; i++) {
			beat_nrs.push(beat_nr + 1);
			bar_nrs.push(bar_nr);
			beat_nr += r_to_length(rhythms[i], ts[1]);
			if (beat_nr >= ts[0]) {
				beat_nr -= ts[0];
				bar_nr++;
			};
		};

		return [notes, rhythms, ts, bar_nrs, beat_nrs]
	};


	// HELPERS


	/**
	* @description Find the bar number or the place within it, of the nth (0-indexed) note in an abc-formatted string.
	* @param {string} option - What we want to get the number of: "bar" or "beat".
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @param {number} index - The index of the note to lookup.
	* @param {array} ts - A time signature (ex.: [4,4]).
	* @returns {number} The current place in the current bar (ex.: 1, 2, 3, 3.5) if option == "beat".
	* The current bar number (ex.: 1, 2, 3, 4) if option == "bar".
	*/
	function get_nr(option, abc_str, index, ts) {
		if (ts === undefined) {
			ts = [4,4];
		};
		if (option === undefined) {
			option = "beat";
		};

		var matrix = abc_str_to_matrix(abc_str, ts);
		var rhythms = matrix[1];

		var length = 0;
		var bar_nr = 0;
		for (var i = 0; i < index; i++) {
			length += r_to_length(rhythms[i], ts[1]);
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


	/**
	* @description Extract the rhythm strings from an abc-formatted string.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @returns {array} An array of rhythm strings (ex.: ['4', '8', '16']).
	*/
	function rhythm_from_abc(abc_str) {
		abc_str = removeTrailingSpace(abc_str);
		abc_str = escape_spaces(abc_str);
		abc_str = abc_str.replace(/[^\d`]+/g, ''); // remove everything but digits and '`' signs.
		var rhythms_a = abc_str.split(/[`]+/g);
		return rhythms_a;
	};


	/**
	* @description Escape spaces in a string by replacing them with `'s.
	* @param {string} str - An abc-formatted string with no intro text.
	* @returns {string} The updated string.
	*/
	function escape_spaces(str) {
		str = str.replace(/[ ]+/g, '`'); // replace spaces with `'s
		return str;
	};


	/**
	* @description Extract the note strings from an abc-formatted string.
	* @param {string} abc_str - An abc-formatted string with no intro text.
	* @returns {array} An array of note strings (ex.: ['C', 'd', 'E']).
	*/
	function notes_from_abc(abc_str) {
		abc_str = removeTrailingSpace(abc_str); // clean up
		abc_str = abc_str.replace(/[^A-GZ-z]+/g, '`'); // remove non-notes
		if (abc_str[0] == '`') {
			abc_str = abc_str.substr(1, abc_str.length);
		};
		// clean up
		if (abc_str[abc_str.length-1] == '0') {
			abc_str = abc_str.substr(0, abc_str.length-1);
		};
		var notes_a = abc_str.split('`');
		return notes_a;
	};


	// DISPLAY //
	// ======= //


	/**
	* @description Update the canvas.
	* @param {string} textarea_id - The id of the editor textarea.
	* @param {string} canvas_id - The id of the canvas to update.
	* @param {string} midi_id - The id of the div containing the midi embed.
	* @param {string} midi_dl_id - The id of the div containing the midi download link.
	* @param {number} width - The width of the canvas.
	* @returns {Object} A new ABCJS.Editor object, thereby updating the canvas.
	*/
	function update_editor(textarea_id, canvas_id, midi_id, midi_dl_id, width) {
		return new ABCJS.Editor(textarea_id, { canvas_id: canvas_id,
											   midi_id: midi_id,
											   midi_download_id: midi_dl_id,
											   midi_options: {
												  generateDownload:"true",
												  downloadLabel:"Download %T.mid"
											   },
											   warnings_id: "warnings",
											   render_options: get_canvas_renderoptions(canvas_id, width),
											   parser_params: {},
											   generate_midi: true,
											   generate_warnings: false
											   });
	};


	/**
	* @description Create render options for the canvas.
	* @param {string} canvas_id - The id of the canvas.
	* @param {number} window_width - The width of the window.
	* @returns {Object} The render_options for the canvas to scale.
	*/
	function get_canvas_renderoptions(canvas_id, window_width) {
		var factor = window_width > 600 ? (window_width > 993 ? .7 : .85) : .9; // dependent on css rules... (no good!)

		var staff_width = (window_width * factor) - 80; // TODO: remove dependence on view
		var bar_width = staff_width / 4;
		var scale = 1.0;

		var area_left = staff_width - bar_width;
		scale = scale * area_left / staff_width;

		return {staffwidth: staff_width, scale: scale};
	};


	function toggle_xp_input_display() {
		var xp_input = $('#xp_input');
		xp_input.toggle();
		xp_input.focus();
	};

})();
