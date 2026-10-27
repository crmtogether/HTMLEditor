/*
	CRM Together HTML Editor - image tools

	Images in the editor are stored inline as base64 data URLs, so every byte ends up in the database.
	This module:
	 - opens an image dialog when an image is inserted, pasted or dropped (crop, rotate, resize,
	   brightness, contrast, format and quality) and re-encodes the image before it is inserted
	 - adds an "Edit image" button to the image popover so existing images can be shrunk later
	 - automatically shrinks large data: images that arrive as pasted HTML (bypassing the dialog)
	 - shows a size meter under the editor with a warning and a maximum size

	Usage (see editor.asp):
		var tools = CTImageTools.create($editorEl, settings);
		summernote callbacks.onImageUpload -> tools.handleFiles(files)
		summernote buttons -> tools.buttons()
		after summernote init -> tools.start()
		on summernote.change -> tools.contentChanged(contents)
*/
var CTImageTools = (function () {

	var MB = 1024 * 1024;

	function formatBytes(n) {
		if (n >= MB) return (n / MB).toFixed(2) + ' MB';
		if (n >= 1024) return Math.round(n / 1024) + ' KB';
		return n + ' B';
	}

	// approximate size a file takes once stored as a data URL
	function dataUrlLengthForFile(file) {
		return Math.ceil(file.size / 3) * 4 + ('data:' + file.type + ';base64,').length;
	}

	function debounce(fn, ms) {
		var t;
		return function () {
			var args = arguments, self = this;
			clearTimeout(t);
			t = setTimeout(function () { fn.apply(self, args); }, ms);
		};
	}

	function loadImage(src) {
		return new Promise(function (resolve, reject) {
			var img = new Image();
			img.onload = function () { resolve(img); };
			img.onerror = function () { reject(new Error('This image could not be read. The format may not be supported by the browser (e.g. HEIC).')); };
			img.src = src;
		});
	}

	var canvasFilterSupported = (function () {
		try { return typeof document.createElement('canvas').getContext('2d').filter === 'string'; } catch (e) { return false; }
	})();

	// manual brightness/contrast for browsers without ctx.filter (matches the CSS filter maths)
	function applyFilterPixels(ctx, w, h, brightness, contrast) {
		var b = 1 + brightness / 100, c = 1 + contrast / 100;
		var data = ctx.getImageData(0, 0, w, h);
		var d = data.data;
		for (var i = 0; i < d.length; i += 4) {
			for (var k = 0; k < 3; k++) {
				var v = d[i + k] * b;
				d[i + k] = (v - 128) * c + 128;
			}
		}
		ctx.putImageData(data, 0, 0);
	}

	function hasTransparency(img) {
		var w = Math.min(img.naturalWidth, 200), h = Math.min(img.naturalHeight, 200);
		var c = document.createElement('canvas');
		c.width = w; c.height = h;
		var ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0, w, h);
		try {
			var d = ctx.getImageData(0, 0, w, h).data;
			for (var i = 3; i < d.length; i += 4) {
				if (d[i] < 255) return true;
			}
		} catch (e) { }
		return false;
	}

	var dialogHtml =
		'<div class="modal ct-imgtools" tabindex="-1" role="dialog">' +
		'<div class="modal-dialog modal-lg"><div class="modal-content">' +
		'<div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button>' +
		'<h4 class="modal-title">Image tools</h4></div>' +
		'<div class="modal-body"><div class="row">' +
			'<div class="col-sm-7">' +
				'<div class="ct-stage"><canvas class="ct-preview"></canvas></div>' +
				'<div class="ct-stage-tools">' +
					'<div class="btn-group btn-group-sm">' +
						'<button type="button" class="btn btn-default ct-rotl" title="Rotate left">&#8634;</button>' +
						'<button type="button" class="btn btn-default ct-rotr" title="Rotate right">&#8635;</button>' +
					'</div> ' +
					'<button type="button" class="btn btn-default btn-sm ct-clearcrop">Clear crop</button> ' +
					'<button type="button" class="btn btn-default btn-sm ct-reset">Reset all</button>' +
					'<span class="ct-hint">Drag on the image to crop</span>' +
				'</div>' +
			'</div>' +
			'<div class="col-sm-5">' +
				'<div class="form-group form-group-sm"><label>Width <span class="ct-dims"></span></label>' +
					'<div class="ct-inline"><input type="range" class="ct-width-range"><input type="number" class="form-control input-sm ct-width"> px</div></div>' +
				'<div class="form-group form-group-sm"><label>Brightness <span class="ct-val ct-brightness-val"></span></label>' +
					'<input type="range" class="ct-brightness" min="-100" max="100" value="0"></div>' +
				'<div class="form-group form-group-sm"><label>Contrast <span class="ct-val ct-contrast-val"></span></label>' +
					'<input type="range" class="ct-contrast" min="-100" max="100" value="0"></div>' +
				'<div class="form-group form-group-sm"><label>Format</label>' +
					'<select class="form-control input-sm ct-format">' +
						'<option value="auto">Auto (smallest)</option><option value="jpeg">JPEG (photos)</option>' +
						'<option value="png">PNG (screenshots, transparency)</option><option value="webp">WebP (smallest, not for email)</option>' +
					'</select></div>' +
				'<div class="form-group form-group-sm ct-quality-group"><label>Quality <span class="ct-val ct-quality-val"></span></label>' +
					'<input type="range" class="ct-quality" min="30" max="100" value="80"></div>' +
				'<div class="ct-stats"></div>' +
			'</div>' +
		'</div></div>' +
		'<div class="modal-footer">' +
			'<span class="ct-warning"></span>' +
			'<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>' +
			'<button type="button" class="btn btn-default ct-original">Insert original</button>' +
			'<button type="button" class="btn btn-primary ct-apply">Insert</button>' +
		'</div>' +
		'</div></div></div>';

	function create($editor, settings) {
		var maxBytes = settings.maxSizeMB * MB;
		var warnBytes = settings.warnSizeMB * MB;
		var currentLength = 0;
		var checkedImages = new WeakSet(); // images autoCompress has already looked at

		/* ---------- size meter ---------- */

		var $meter = $('<div class="ct-meter"><div class="ct-meter-bar"><div class="ct-meter-fill"></div></div>' +
			'<div class="ct-meter-text"></div><div class="ct-meter-note"></div></div>');

		function updateMeter(contents) {
			if (contents == null) contents = $editor.summernote('code');
			currentLength = contents.length;
			var images = (contents.match(/<img\b/gi) || []).length;
			var pct = Math.min(100, currentLength / maxBytes * 100);
			var state = currentLength > maxBytes ? 'over' : (currentLength > warnBytes ? 'warn' : 'ok');
			$meter.attr('data-state', state);
			$meter.find('.ct-meter-fill').css('width', pct + '%');
			var text = 'Size ' + formatBytes(currentLength) + ' of ' + settings.maxSizeMB + ' MB max';
			if (images) text += ' (' + images + ' image' + (images == 1 ? '' : 's') + ')';
			if (state == 'over') text += ' - over the limit. Click an image and use Edit image to shrink it, or remove it.';
			else if (state == 'warn') text += ' - getting large. Consider shrinking images.';
			$meter.find('.ct-meter-text').text(text);
		}

		function note(msg) {
			var $n = $meter.find('.ct-meter-note').text(msg).show();
			clearTimeout($n.data('t'));
			$n.data('t', setTimeout(function () { $n.fadeOut(); }, 6000));
		}

		/* ---------- encoding ---------- */

		// state: img, rot (0/90/180/270), crop {x,y,w,h} normalised to the rotated image or null,
		// width (output px), brightness, contrast (-100..100), format, quality (30..100)
		function rotatedSize(st) {
			var w = st.img.naturalWidth, h = st.img.naturalHeight;
			return st.rot % 180 ? { w: h, h: w } : { w: w, h: h };
		}

		function cropPx(st) {
			var rs = rotatedSize(st);
			var c = st.crop || { x: 0, y: 0, w: 1, h: 1 };
			return {
				x: Math.round(c.x * rs.w), y: Math.round(c.y * rs.h),
				w: Math.max(1, Math.round(c.w * rs.w)), h: Math.max(1, Math.round(c.h * rs.h))
			};
		}

		// draws the image rotated, scaled by s, with its rotated top-left at the current origin
		function drawRotated(ctx, st, s) {
			var w = st.img.naturalWidth * s, h = st.img.naturalHeight * s;
			if (st.rot == 90) { ctx.translate(h, 0); ctx.rotate(Math.PI / 2); }
			else if (st.rot == 180) { ctx.translate(w, h); ctx.rotate(Math.PI); }
			else if (st.rot == 270) { ctx.translate(0, w); ctx.rotate(-Math.PI / 2); }
			ctx.drawImage(st.img, 0, 0, w, h);
		}

		function filterString(st) {
			return 'brightness(' + (100 + st.brightness) + '%) contrast(' + (100 + st.contrast) + '%)';
		}
		function hasFilter(st) { return st.brightness != 0 || st.contrast != 0; }

		function renderCanvas(st, opaque) {
			var c = cropPx(st);
			var outW = Math.max(1, Math.min(Math.round(st.width), c.w));
			var outH = Math.max(1, Math.round(c.h * outW / c.w));
			var s = outW / c.w;
			var canvas = document.createElement('canvas');
			canvas.width = outW; canvas.height = outH;
			var ctx = canvas.getContext('2d');
			if (opaque) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, outW, outH); }
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';
			if (hasFilter(st) && canvasFilterSupported) ctx.filter = filterString(st);
			ctx.save();
			ctx.translate(-c.x * s, -c.y * s);
			drawRotated(ctx, st, s);
			ctx.restore();
			if (hasFilter(st) && !canvasFilterSupported) applyFilterPixels(ctx, outW, outH, st.brightness, st.contrast);
			return canvas;
		}

		// returns {url, format, width, height}; throws SecurityError for cross-origin images
		function encode(st) {
			var q = st.quality / 100;
			var fmt = st.format;
			if (fmt == 'auto') fmt = st.transparent ? 'png' : null;
			if (fmt) {
				var cv = renderCanvas(st, fmt == 'jpeg');
				var url = cv.toDataURL('image/' + fmt, q);
				// browsers without webp encoding fall back to png
				return { url: url, format: url.substring(11, url.indexOf(';')), width: cv.width, height: cv.height };
			}
			// auto: try both, prefer lossless png if it is not much bigger
			var jpg = renderCanvas(st, true).toDataURL('image/jpeg', q);
			var pcv = renderCanvas(st, false);
			var png = pcv.toDataURL('image/png');
			var usePng = png.length <= jpg.length * 1.1;
			return { url: usePng ? png : jpg, format: usePng ? 'png' : 'jpeg', width: pcv.width, height: pcv.height };
		}

		function newState(img, transparent) {
			return {
				img: img, transparent: transparent, rot: 0, crop: null,
				width: Math.min(img.naturalWidth, settings.imageMaxWidth),
				brightness: 0, contrast: 0,
				format: settings.imageFormat, quality: Math.round(settings.imageQuality * 100)
			};
		}

		/* ---------- dialog ---------- */

		var $dlg = null;

		// opts: {src, originalLength, filename, isGif, editing (img element)}
		// resolves with {url} to use, {original:true}, or null when cancelled
		function openDialog(img, opts) {
			return new Promise(function (resolve) {
				if (!$dlg) $dlg = $(dialogHtml).appendTo(document.body);
				var st = newState(img, hasTransparency(img));
				var result = null, lastEncoded = null;
				var canvas = $dlg.find('.ct-preview')[0];
				var base = null, view = null; // preview of the rotated image and its placement

				$dlg.find('.modal-title').text(opts.editing ? 'Edit image' : 'Insert image' + (opts.filename ? ' - ' + opts.filename : ''));
				$dlg.find('.ct-original').toggle(!opts.editing);
				$dlg.find('.ct-apply').text(opts.editing ? 'Apply' : 'Insert');

				function buildBase() {
					var rs = rotatedSize(st);
					var stage = $dlg.find('.ct-stage');
					var maxW = stage.width() || 480, maxH = 320;
					var scale = Math.min(maxW / rs.w, maxH / rs.h, 1);
					var dpr = window.devicePixelRatio || 1;
					var w = Math.max(1, Math.round(rs.w * scale)), h = Math.max(1, Math.round(rs.h * scale));
					base = document.createElement('canvas');
					base.width = Math.round(w * dpr); base.height = Math.round(h * dpr);
					var bctx = base.getContext('2d');
					bctx.imageSmoothingQuality = 'high';
					drawRotated(bctx, st, scale * dpr);
					canvas.width = base.width; canvas.height = base.height;
					canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
					view = { w: w, h: h, dpr: dpr };
				}

				function drawPreview() {
					var ctx = canvas.getContext('2d');
					var W = canvas.width, H = canvas.height;
					ctx.clearRect(0, 0, W, H);
					ctx.save();
					if (hasFilter(st) && canvasFilterSupported) ctx.filter = filterString(st);
					ctx.drawImage(base, 0, 0);
					ctx.restore();
					if (hasFilter(st) && !canvasFilterSupported) applyFilterPixels(ctx, W, H, st.brightness, st.contrast);
					if (st.crop) {
						var x = st.crop.x * W, y = st.crop.y * H, w = st.crop.w * W, h = st.crop.h * H;
						ctx.fillStyle = 'rgba(0,0,0,0.55)';
						ctx.fillRect(0, 0, W, y);
						ctx.fillRect(0, y + h, W, H - y - h);
						ctx.fillRect(0, y, x, h);
						ctx.fillRect(x + w, y, W - x - w, h);
						ctx.strokeStyle = '#fff';
						ctx.lineWidth = view.dpr;
						ctx.setLineDash([6 * view.dpr, 4 * view.dpr]);
						ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
					}
				}

				function syncControls() {
					var c = cropPx(st);
					if (st.width > c.w) st.width = c.w;
					$dlg.find('.ct-width-range').attr({ min: Math.min(16, c.w), max: c.w }).val(st.width);
					$dlg.find('.ct-width').attr({ min: 1, max: c.w }).val(Math.round(st.width));
					$dlg.find('.ct-dims').text('(' + Math.round(st.width) + ' x ' + Math.round(c.h * st.width / c.w) + ', cropped size ' + c.w + ' x ' + c.h + ')');
					$dlg.find('.ct-brightness').val(st.brightness);
					$dlg.find('.ct-brightness-val').text(st.brightness > 0 ? '+' + st.brightness : st.brightness);
					$dlg.find('.ct-contrast').val(st.contrast);
					$dlg.find('.ct-contrast-val').text(st.contrast > 0 ? '+' + st.contrast : st.contrast);
					$dlg.find('.ct-format').val(st.format);
					$dlg.find('.ct-quality').val(st.quality);
					$dlg.find('.ct-quality-val').text(st.quality + '%');
					$dlg.find('.ct-quality-group').toggleClass('ct-disabled', st.format == 'png');
				}

				var updateStats = debounce(function () {
					var $stats = $dlg.find('.ct-stats'), $warn = $dlg.find('.ct-warning');
					try {
						lastEncoded = encode(st);
					} catch (e) {
						lastEncoded = null;
						$stats.html('');
						$warn.text('This image is hosted on another site and cannot be edited here.');
						$dlg.find('.ct-apply').prop('disabled', true);
						return;
					}
					var newLen = lastEncoded.url.length;
					var oldLen = opts.originalLength;
					var fieldAfter = currentLength + newLen - (opts.editing ? oldLen : 0);
					var saving = oldLen ? Math.round((1 - newLen / oldLen) * 100) : 0;
					var html =
						'<div class="ct-muted">Sizes are as stored in the field (base64 is about a third bigger than the file)</div>' +
						'<div><b>Original:</b> ' + img.naturalWidth + ' x ' + img.naturalHeight + ', ' + formatBytes(oldLen) + '</div>' +
						'<div><b>New:</b> ' + lastEncoded.width + ' x ' + lastEncoded.height + ' ' + lastEncoded.format.toUpperCase() + ', ' + formatBytes(newLen) +
						(saving > 0 ? ' <span class="ct-good">(' + saving + '% smaller)</span>' : (saving < 0 ? ' <span class="ct-bad">(' + (-saving) + '% bigger)</span>' : '')) + '</div>' +
						'<div><b>Field after ' + (opts.editing ? 'change' : 'insert') + ':</b> ' + formatBytes(fieldAfter) + ' of ' + settings.maxSizeMB + ' MB</div>';
					if (opts.isGif) html += '<div class="ct-bad">GIF animation will be lost.</div>';
					$stats.html(html);
					var over = fieldAfter > maxBytes;
					var originalOver = currentLength + oldLen > maxBytes;
					$warn.text(over ? 'Too big: this would take the field over the ' + settings.maxSizeMB + ' MB limit. Reduce the width or quality, or crop.' :
						(fieldAfter > warnBytes ? 'Warning: the field will be over ' + settings.warnSizeMB + ' MB.' : ''));
					$warn.toggleClass('ct-bad', over);
					$dlg.find('.ct-apply').prop('disabled', over);
					$dlg.find('.ct-original').prop('disabled', originalOver);
				}, 150);

				function refresh(rebuild) {
					if (rebuild) buildBase();
					syncControls();
					drawPreview();
					updateStats();
				}

				/* crop by dragging on the preview; drag inside an existing crop to move it */
				var drag = null;
				function pos(e) {
					var r = canvas.getBoundingClientRect();
					return {
						x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
						y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
					};
				}
				$(canvas).off('.ct').on('pointerdown.ct', function (e) {
					var p = pos(e.originalEvent);
					var c = st.crop;
					if (c && p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h)
						drag = { mode: 'move', start: p, orig: $.extend({}, c) };
					else
						drag = { mode: 'new', start: p };
					canvas.setPointerCapture(e.originalEvent.pointerId);
					e.preventDefault();
				}).on('pointermove.ct', function (e) {
					var p = pos(e.originalEvent);
					if (!drag) {
						var c = st.crop;
						canvas.style.cursor = (c && p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) ? 'move' : 'crosshair';
						return;
					}
					if (drag.mode == 'move') {
						var o = drag.orig;
						st.crop = {
							x: Math.min(1 - o.w, Math.max(0, o.x + p.x - drag.start.x)),
							y: Math.min(1 - o.h, Math.max(0, o.y + p.y - drag.start.y)), w: o.w, h: o.h
						};
					} else {
						st.crop = {
							x: Math.min(p.x, drag.start.x), y: Math.min(p.y, drag.start.y),
							w: Math.abs(p.x - drag.start.x), h: Math.abs(p.y - drag.start.y)
						};
					}
					drawPreview();
				}).on('pointerup.ct pointercancel.ct', function () {
					if (!drag) return;
					drag = null;
					// a click or tiny drag clears the crop
					if (st.crop && (st.crop.w * view.w < 8 || st.crop.h * view.h < 8)) st.crop = null;
					st.width = Math.min(settings.imageMaxWidth, cropPx(st).w);
					refresh(false);
				});

				$dlg.off('.ct')
					.on('click.ct', '.ct-rotl, .ct-rotr', function () {
						st.rot = (st.rot + ($(this).hasClass('ct-rotr') ? 90 : 270)) % 360;
						st.crop = null;
						st.width = Math.min(settings.imageMaxWidth, rotatedSize(st).w);
						refresh(true);
					})
					.on('click.ct', '.ct-clearcrop', function () {
						st.crop = null;
						st.width = Math.min(settings.imageMaxWidth, rotatedSize(st).w);
						refresh(false);
					})
					.on('click.ct', '.ct-reset', function () {
						st = newState(img, st.transparent);
						refresh(true);
					})
					.on('input.ct', '.ct-width-range', function () {
						st.width = parseInt($(this).val(), 10);
						syncControls(); updateStats();
					})
					.on('change.ct', '.ct-width', function () {
						var v = parseInt($(this).val(), 10);
						if (v > 0) { st.width = Math.min(v, cropPx(st).w); }
						syncControls(); updateStats();
					})
					.on('input.ct', '.ct-brightness, .ct-contrast', function () {
						st.brightness = parseInt($dlg.find('.ct-brightness').val(), 10);
						st.contrast = parseInt($dlg.find('.ct-contrast').val(), 10);
						syncControls(); drawPreview(); updateStats();
					})
					.on('change.ct', '.ct-format', function () {
						st.format = $(this).val();
						syncControls(); updateStats();
					})
					.on('input.ct', '.ct-quality', function () {
						st.quality = parseInt($(this).val(), 10);
						syncControls(); updateStats();
					})
					.on('click.ct', '.ct-apply', function () {
						if (!lastEncoded) return;
						result = { url: lastEncoded.url };
						$dlg.modal('hide');
					})
					.on('click.ct', '.ct-original', function () {
						result = { original: true };
						$dlg.modal('hide');
					})
					.one('shown.bs.modal', function () { refresh(true); })
					.one('hidden.bs.modal', function () {
						restoreFrame();
						resolve(result);
					});

				$dlg.find('.ct-warning').text('');
				$dlg.find('.ct-stats').html('');
				growFrame();
				$dlg.modal({ backdrop: 'static' });
			});
		}

		/* the editor lives in an iframe sized to fit it; make sure the dialog fits and is visible */
		function growFrame() {
			try {
				var f = window.frameElement;
				if (!f) return;
				if (window.innerHeight < 640) f.style.height = '640px';
				var r = f.getBoundingClientRect();
				if (r.top < 0 || r.top > window.parent.innerHeight - 200) f.scrollIntoView({ block: 'start' });
			} catch (e) { }
		}
		function restoreFrame() {
			fitFrame();
		}
		function fitFrame() {
			try {
				var f = window.frameElement;
				if (f) f.style.height = (document.body.scrollHeight + 10) + 'px';
			} catch (e) { }
		}

		/* ---------- entry points ---------- */

		var queue = Promise.resolve();

		function handleFiles(files) {
			$.each(files, function (i, file) {
				queue = queue.then(function () { return handleFile(file); }).catch(function (e) { alert(e.message || e); });
			});
		}

		function insertUrl(url, filename) {
			$editor.summernote('editor.restoreRange');
			return $editor.summernote('editor.insertImage', url, filename);
		}

		function handleFile(file) {
			if (!/^image\//.test(file.type)) return Promise.reject(new Error(file.name + ' is not an image.'));
			var originalLength = dataUrlLengthForFile(file);
			var objectUrl = URL.createObjectURL(file);
			var readOriginal = function () {
				return new Promise(function (resolve, reject) {
					var reader = new FileReader();
					reader.onload = function () { resolve(reader.result); };
					reader.onerror = function () { reject(new Error('Could not read ' + file.name)); };
					reader.readAsDataURL(file);
				});
			};
			return loadImage(objectUrl).then(function (img) {
				if (!settings.imageEditorOnInsert) {
					// no dialog: shrink with the defaults, keep the original if that is smaller
					var enc = encode(newState(img, hasTransparency(img)));
					var useOriginal = file.type == 'image/gif' || enc.url.length >= originalLength;
					return (useOriginal ? readOriginal() : Promise.resolve(enc.url)).then(function (url) {
						if (currentLength + url.length > maxBytes) {
							alert('This image (' + formatBytes(url.length) + ') would take the field over the ' + settings.maxSizeMB + ' MB limit.');
							return;
						}
						return insertUrl(url, file.name);
					});
				}
				return openDialog(img, { originalLength: originalLength, filename: file.name, isGif: file.type == 'image/gif' }).then(function (res) {
					if (!res) return;
					if (res.original) return readOriginal().then(function (url) { return insertUrl(url, file.name); });
					return insertUrl(res.url, file.name);
				});
			}).then(function () {
				URL.revokeObjectURL(objectUrl);
			}, function (e) {
				URL.revokeObjectURL(objectUrl);
				throw e;
			});
		}

		function editImage(imgEl) {
			var src = imgEl.getAttribute('src') || '';
			loadImage(src).then(function (img) {
				return openDialog(img, { originalLength: src.length, editing: imgEl, isGif: /^data:image\/gif/.test(src) });
			}).then(function (res) {
				if (!res || !res.url) return;
				replaceSrc(imgEl, res.url);
			}).catch(function (e) { alert(e.message || e); });
		}

		function replaceSrc(imgEl, url) {
			$editor.summernote('editor.beforeCommand');
			checkedImages.add(imgEl);
			// crop/rotate can change the aspect ratio, so let the height follow the width
			$(imgEl).attr('src', url).removeAttr('height').css('height', '');
			$editor.summernote('editor.afterCommand');
		}

		// images pasted as HTML (from Word, web pages, other CRM records) never go through
		// onImageUpload, so shrink any large data: images we find with the default settings
		var autoCompress = debounce(function () {
			if (!settings.autoCompressPastedKB) return;
			var limit = settings.autoCompressPastedKB * 1024;
			$editor.next('.note-editor').find('.note-editable img').each(function () {
				var el = this;
				if (checkedImages.has(el)) return;
				checkedImages.add(el);
				var src = el.getAttribute('src') || '';
				if (src.length < limit || !/^data:image\/(png|jpe?g|webp|bmp)/i.test(src)) return;
				loadImage(src).then(function (img) {
					var enc = encode(newState(img, hasTransparency(img)));
					if (enc.url.length < src.length * 0.9) {
						replaceSrc(el, enc.url);
						note('Large pasted image shrunk from ' + formatBytes(src.length) + ' to ' + formatBytes(enc.url.length) + '.');
					}
				}).catch(function () { });
			});
		}, 500);

		function contentChanged(contents) {
			updateMeter(contents);
			autoCompress();
		}

		function buttons() {
			function sizeButton(label, value) {
				return function (context) {
					return context.ui.button({
						contents: '<span class="note-fontsize-10">' + label + '</span>',
						tooltip: 'Display at ' + label,
						click: function () { context.invoke('editor.resize', value); }
					}).render();
				};
			}
			return {
				imageSize100: sizeButton('100%', '1'),
				imageSize75: sizeButton('75%', '0.75'),
				imageSize50: sizeButton('50%', '0.5'),
				imageSize25: sizeButton('25%', '0.25'),
				imageSize10: sizeButton('10%', '0.1'),
				ctEditImage: function (context) {
					return context.ui.button({
						contents: '<i class="note-icon-pencil"></i> Edit image',
						tooltip: 'Crop, rotate, resize, brightness/contrast and file size',
						click: function () {
							var target = context.invoke('editor.restoreTarget');
							context.invoke('imagePopover.hide');
							if (target) editImage(target);
						}
					}).render();
				}
			};
		}

		// call once summernote has been initialised
		function start() {
			var $noteEditor = $editor.next('.note-editor');
			$noteEditor.after($meter);
			// only shrink images added from now on; existing ones are left alone unless edited
			$noteEditor.find('.note-editable img').each(function () { checkedImages.add(this); });
			updateMeter();
			setTimeout(fitFrame, 0);
		}

		return {
			start: start,
			handleFiles: handleFiles,
			contentChanged: contentChanged,
			buttons: buttons,
			fitFrame: fitFrame
		};
	}

	return { create: create };
})();
