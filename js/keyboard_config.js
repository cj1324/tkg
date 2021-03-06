var _keyboard_config = {};

function initKeyboardConfig(name) {
	var result = parseKeyboardName(name);
	var main = result["main"];
	var variant = result["variant"];
	if (main.match(/^kimera.*/)) {
		$('#kbd-cfg').show();
		$('#kbd-cfg-container').show();
		initKeyboardConfigPopover(main, variant);
		_keyboard_config = loadKeyboardConfig(main, variant);
		afterLoadKeyboardConfig(main, variant);
		window.lang.run();
	}
	else {
		$('#kbd-cfg').hide();
		$('#kbd-cfg-container').hide();
	}
}

function loadKeyboardConfig(main, variant) {
	var config = {};
	var name = "";
	if (variant) {
		name = main + "-" + variant + "-config.json";
	}
	else {
		name = main + "-config.json";
	}
	$.ajaxSetup({ async: false, cache: false });
	$.getJSON("keyboard/" + name.toLowerCase(), function(json) {
		config = json;
	}).fail(function(d, textStatus, error) {
		console.error("getJSON failed, status: " + textStatus + ", error: "+error)
	});
	$.ajaxSetup({ async: true });
	return config;
}

function initKeyboardConfigPopover(main, variant) {
	$('#kbd-cfg-btn').popover('destroy').popover({
		animation: false,
		html: true,
		placement: 'bottom',
		trigger: 'manual',
		content: function() {
			return $('#' + main.toLowerCase() + '-config').html();
		},
		container: '#kbd-cfg-container'
	}).unbind('click').click(function() {
		$(this).popover('toggle');
	}).on('shown.bs.popover', function() {
		initKeyboardConfigPanel(main, variant);
	});
}

function afterLoadKeyboardConfig(main, variant) {
	if (main.match(/^kimera.*/)) {
		tkg.init({
			"matrix_rows": _keyboard_config["matrix_rows"],
			"matrix_cols": _keyboard_config["matrix_cols"]
		});
		_keyboard_config["matrix_map_state"] = tkg.parseMatrixMapLayer(_keyboard_config["matrix_map_raw"], (variant == "two_headed"));
		_keyboard_config["matrix_map"] = tkg.getMatrixMap();
		_keyboard_config["physical_rows"] = tkg.parseRowCount(_keyboard_config["matrix_map_raw"]);
		kimeraConfigUpdate(true);
	}
}

function initKeyboardConfigPanel(main, variant) {
	if (main.match(/^kimera.*/)) {
		// row col mapping
		var $row_input = $('#kbd-cfg-container #kimera-row-val');
		var $col_input = $('#kbd-cfg-container #kimera-col-val');
		if ("row_mapping" in _keyboard_config) {
			if ("row_mapping_input" in _keyboard_config) {
			}
			else {
				_keyboard_config["row_mapping_input"] = _keyboard_config["row_mapping"];
			}
			$row_input.val(_keyboard_config["row_mapping_input"].join(','));
			$row_input.data('last', $row_input.val());
		}
		if ("col_mapping" in _keyboard_config) {
			if ("col_mapping_input" in _keyboard_config) {
			}
			else {
				_keyboard_config["col_mapping_input"] = _keyboard_config["col_mapping"];
			}
			$col_input.val(_keyboard_config["col_mapping_input"].join(','));
			$col_input.data('last', $col_input.val());
		}
		$row_input.data('role', 'tagsinput').tagsinput({
			tagClass: function(item) {
				if (_.contains($row_input.data('valid_pins'), parseInt(item))) {
					return 'label label-primary';
				}
				else {
					return 'label label-danger';
				}
			},
			typeahead: {
				source: function(query) {
					return $row_input.data('available_pins');
				}
			},
		});
		$row_input.change(function() {
			kimeraRowColMappingChange(variant);
		});
		$col_input.data('role', 'tagsinput').tagsinput({
			tagClass: function(item) {
				if (_.contains($col_input.data('valid_pins'), parseInt(item))) {
					return 'label label-primary';
				}
				else {
					return 'label label-danger';
				}
			},
			typeahead: {
				source: function(query) {
					return $col_input.data('available_pins');
				}
			},
		});
		$col_input.change(function() {
			kimeraRowColMappingChange(variant);
		});
		$($row_input.tagsinput('input')).attr('lang', $row_input.attr('lang')).blur(function() {
			var val = $row_input.val();
			var last = $row_input.data('last') || '';
			if (val != last) {
				$row_input.data('last', val);
				$row_input.trigger('change');
			}
		});
		$($col_input.tagsinput('input')).attr('lang', $col_input.attr('lang')).blur(function() {
			var val = $col_input.val();
			var last = $col_input.data('last') || '';
			if (val != last) {
				$col_input.data('last', val);
				$col_input.trigger('change');
			}
		});

		// row col clear
		var $row_clear = $('#kbd-cfg-container #kimera-row-clear');
		var $col_clear = $('#kbd-cfg-container #kimera-col-clear');
		$row_clear.click(function () {
			$row_input.tagsinput('removeAll');
			$row_input.data('last', '');
			kimeraRowColMappingChange(variant);
		});
		$col_clear.click(function () {
			$col_input.tagsinput('removeAll');
			$col_input.data('last', '');
			kimeraRowColMappingChange(variant);
		});

		// matrix mapping
		var $matrix_textarea = $("#kbd-cfg-container #kimera-matrix-val");
		$matrix_textarea.val(_keyboard_config["matrix_map_raw"]);
		$matrix_textarea.data('last', $matrix_textarea.val());
		$matrix_textarea.on('blur_custom', function() {
			var $matrix_textarea = $("#kbd-cfg-container #kimera-matrix-val");
			var raw = $matrix_textarea.val();
			var last = $matrix_textarea.data('last') || "";
			if (last != raw) {
				$matrix_textarea.data('last', raw);
				kimeraMatrixMappingChange(variant);
			}
		});

		kimeraRowColMappingChange(variant);
		kimeraMatrixMappingRefresh();
	}
}

function kimeraRowColMappingChange(variant) {
	var $row_input = $('#kbd-cfg-container #kimera-row-val');
	var $col_input = $('#kbd-cfg-container #kimera-col-val');
	var row_val = $row_input.val();
	var col_val = $col_input.val();
	var row_input_pins = [];
	var col_input_pins = [];
	if (row_val) {
		row_input_pins = _.map(row_val.split(','), function(e) {
			return parseInt(e);
		});
	}
	if (col_val) {
		col_input_pins = _.map(col_val.split(','), function(e) {
			return parseInt(e);
		});
	}

	var conflict_pins = _.intersection(row_input_pins, col_input_pins);
	var valid_pins = [];
	var available_pins = [];
	var row_pins = [];
	var col_pins = [];
	var pin_count = _keyboard_config["pin_count"] | 0;
	for (var i = 0; i < pin_count; i++) {
		valid_pins.push(i + 1);
	}
	valid_pins = _.difference(valid_pins, conflict_pins);
	row_valid_pins = _.intersection(row_input_pins, valid_pins);
	col_valid_pins = _.intersection(col_input_pins, valid_pins);
	available_pins = _.difference(valid_pins, row_valid_pins, col_valid_pins);
	_keyboard_config["row_mapping_input"] = row_input_pins;
	_keyboard_config["col_mapping_input"] = col_input_pins;
	_keyboard_config["row_mapping"] = row_valid_pins;
	_keyboard_config["col_mapping"] = col_valid_pins;
	_keyboard_config["matrix_rows"] = _keyboard_config["row_mapping"].length;
	console.log(variant);
	if (variant == "two_headed") {
		_keyboard_config["matrix_cols"] = parseInt((_keyboard_config["col_mapping"].length + 1) / 2);
	}
	else {
		_keyboard_config["matrix_cols"] = _keyboard_config["col_mapping"].length;
	}
	console.log(_keyboard_config["matrix_cols"]);
	kimeraConfigUpdate(true);
	kimeraMatrixMappingChange(variant);

	$row_input.data('valid_pins', valid_pins);
	$col_input.data('valid_pins', valid_pins);
	$row_input.data('available_pins', available_pins);
	$col_input.data('available_pins', available_pins);
	if ($row_input.data('role') == 'tagsinput') {
		$row_input.tagsinput('refresh');
	}
	if ($col_input.data('role') == 'tagsinput') {
		$col_input.tagsinput('refresh');
	}
	if (!row_valid_pins.length || !col_valid_pins.length) {
		$('#kimera-error').show();
	}
	else {
		$('#kimera-error').hide();
	}
}

function kimeraMatrixMappingChange(variant) {
	var $matrix_textarea = $("#kbd-cfg-container #kimera-matrix-val");
	var raw = $matrix_textarea.val();
	_keyboard_config["matrix_map_state"] = tkg.parseMatrixMapLayer(raw, (variant == "two_headed"));
	_keyboard_config["matrix_map"] = tkg.getMatrixMap();
	_keyboard_config["physical_rows"] = tkg.parseRowCount(raw);
	kimeraMatrixMappingRefresh();
	kimeraConfigUpdate(true);
	updateLayers();
}

function kimeraMatrixMappingRefresh() {
	var $matrix_textarea = $("#kbd-cfg-container #kimera-matrix-val");
	var raw = $matrix_textarea.val();
	var state = _keyboard_config["matrix_map_state"];

	var $div = $matrix_textarea.parent();
	// clear validation states
	var class_names = [ "has-success", "has-warning", "has-error" ];
	for (var i in class_names) {
		var class_name = class_names[i];
		if ($div.hasClass(class_name)) {
			$div.removeClass(class_name);
		}
	}
	// set validation state
	if (raw != "") {
		switch (state) {
			case tkg.NONE:
				$div.addClass("has-success");
				break;
			case tkg.WARNING:
				$div.addClass("has-warning");
				break;
			case tkg.ERROR:
				$div.addClass("has-error");
				break;
		}
	}

	// set data for popover
	$matrix_textarea.data('error', tkg.getMatrixMapError());
	$matrix_textarea.data('warning', tkg.getMatrixMapWarning());
	$matrix_textarea.data('info', tkg.getMatrixMapInfo());
	kimeraSetupMatrixMappingPopover();
}

function kimeraSetupMatrixMappingPopover() {
	var $matrix_textarea = $("#kbd-cfg-container #kimera-matrix-val");
	var has_popover = false;
	var error = $matrix_textarea.data('error');
	var warning = $matrix_textarea.data('warning');
	var info = $matrix_textarea.data('info');
	var top_prop = [ "top", "side_print" ];
	var bottom_prop = [ "bottom", "side_print_secondary" ];
	var $content = $('<div>');

	if (error && !_.isEmpty(error)) {
		$content.append(appendLayerError(error, top_prop[0], bottom_prop[0]));
		has_popover = true;
	}
	if (warning && !_.isEmpty(warning)) {
		$content.append(appendLayerWarning(warning, top_prop[0], bottom_prop[0]));
		has_popover = true;
	}
	if (info && !_.isEmpty(info)) {
		$content.append(appendLayerInfo(info, top_prop[0], bottom_prop[0]));
		has_popover = true;
	}

	$matrix_textarea.popover('destroy');
	$matrix_textarea.nextAll().remove();
	if (has_popover) {
		// setup popover
		$matrix_textarea.popover({
			animation: false,
			html: true,
			trigger: 'focus',
			content: $content.html(),
			container: '#layer-info-container',
		});

		$matrix_textarea.on('shown.bs.popover', function() {
			var $popover = $('#layer-info-container .popover');
			adjustPopoverPosition($popover);

			// setup tooltip of keys
			$('#layer-info-container .popover').find('li.key').tooltip('destroy').tooltip({
				trigger: 'hover',
				placement: 'bottom',
				html: true,
				delay: { show: 500, hide: 100 },
				container: '#key-info-container',
			});
			window.lang.run();
		});
	}
}

function kimeraConfigUpdate(init) {
	_keyboard["matrix_rows"] = _keyboard_config["matrix_rows"];
	_keyboard["matrix_cols"] = _keyboard_config["matrix_cols"];
	_keyboard["matrix_size"] = _keyboard_config["matrix_size"];
	_keyboard["physical_rows"] = _keyboard_config["physical_rows"];
	_keyboard["matrix_map"] = _keyboard_config["matrix_map"];
	_keyboard["additional"][0]["data"] = kimeraMakeConfigData();
	if (init) {
		tkg.init({
			"max_layers": _keyboard["max_layers"],
			"matrix_rows": _keyboard_config["matrix_rows"],
			"matrix_cols": _keyboard_config["matrix_cols"],
			"matrix_map": _keyboard_config["matrix_map"]
		});
	}
}

function kimeraMakeConfigData() {
	var data = [];
	var row_mapping = _keyboard_config["row_mapping"];
	var col_mapping = _keyboard_config["col_mapping"];
	var row_count = row_mapping.length;
	var col_count = col_mapping.length;

	data.push(row_count, col_count);
	for (var i = 0; i < row_count; i++) {
		if (row_mapping[i]) {
			data.push(row_mapping[i] - 1);
		}
		else {
			data.push(parseInt('0xFF', 16));
		}
	}
	for (var i = 0; i < col_count; i++) {
		if (col_mapping[i]) {
			data.push(col_mapping[i] - 1);
		}
		else {
			data.push(parseInt('0xFF', 16));
		}
	}

	return data;
}
