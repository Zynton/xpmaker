function updateXP() {
	var title = $('#title_input').val();
	var bpm = $('#bpm_input').val();

	var notes_str = $('#notes_input').val();
	var notes = notes_str.split(/[ ]+/);

	var rhythms_str = $('#rhythms_input').val();
	rhythms_str = rhythms_str.replace(/\D/g, ' ');
	var rhythms = rhythms_str.split(/[ ]+/);
	rhythms.splice(0, 2);

	var xp = xp_mix_and_match(notes, rhythms);
	console.log(xp);
	//var xp_abcjs, ts = create_abcjs_xp(xp);

	//var xp_input = $('#xp_input');
	//xp_input.val(xp_abcjs);
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