<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CRM Together Rich Html Editor</title>
    <link href="Scripts/bootstrap/3.4.1/css/bootstrap.min.css" rel="stylesheet">
    <script src="Scripts/jQuery/jquery-3.7.1.min.js"></script>
    <script src="Scripts/bootstrap/3.4.1/js/bootstrap.min.js"></script>
    <link href = "Scripts/summernote/summernote.css" rel="stylesheet">
    <script src = "Scripts/summernote/summernote.js"></script>
    <link href = "imageTools.css" rel="stylesheet">
    <script src = "imageTools.js"></script>
</head>
<body>

    <div id="editor"></div>
    <div id="editorParams" style="display:none"
        data-field="<%=Server.HTMLEncode(Request.QueryString("editorCRMFieldName"))%>"
        data-readonly="<%=Server.HTMLEncode(Request.QueryString("editorReadOnly"))%>"
        data-textfield="<%=Server.HTMLEncode(Request.QueryString("editorCRMFieldNameText"))%>"></div>

    <script>
		/*
		Defaults for the image tools and size limits. Override them for all editors by adding
			var htmlEditorSettings = { "maxSizeMB": 10 };
		to WWWRoot\js\custom\htmlEditor.js, or per field in the admin JSON, e.g.
			{ "htmlfield":"case_ct_problemnote_html", "textfield":"case_problemnote", "maxSizeMB":7, "warnSizeMB":5 }
		*/
		var editorSettingsDefaults = {
			maxSizeMB: 7,              // images that would take the field over this are refused; the meter goes red
			warnSizeMB: 5,             // the meter goes amber over this
			imageEditorOnInsert: true, // show the image tools when an image is inserted, pasted or dropped
			imageMaxWidth: 1600,       // default width (px) images are shrunk to
			imageQuality: 0.8,         // default JPEG/WebP quality (0.3 - 1)
			imageFormat: 'auto',       // auto | jpeg | png | webp
			autoCompressPastedKB: 300  // images pasted as HTML bigger than this are shrunk automatically (0 = off)
		};

		// query string values are only allowed to be field names / true / false
		function editorParam(name) {
			var v = $('#editorParams').attr('data-' + name) || '';
			return /^\w*$/.test(v) ? v : '';
		}
		var editorCRMFieldName = editorParam('field');
		var editorReadOnly = editorParam('readonly') == 'true';
		var editorCRMFieldNameText = editorParam('textfield');

		function getEditorSettings() {
			var settings = $.extend({}, editorSettingsDefaults);
			try {
				if (parent.htmlEditorSettings) $.extend(settings, parent.htmlEditorSettings);
				$.each(parent.editors || [], function (i, ed) {
					if (ed.htmlfield == editorCRMFieldName) $.extend(settings, ed);
				});
			} catch (e) { }
			return settings;
		}

		if (editorCRMFieldNameText!="")  //hide the field
	    {
			$("#_Capt"+editorCRMFieldNameText,parent.document).hide();
			$("#_Data"+editorCRMFieldNameText,parent.document).hide();
			$("#"+editorCRMFieldNameText,parent.document).hide();
	    }
		$(document).ready(function () {
			var parentWindow = window.parent;
			var editorDefaultValue = $('#_Data'+editorCRMFieldName,parent.document).text();
			editorDefaultValue=unescape(editorDefaultValue);
			//editorDefaultValue=editorDefaultValue.replace(/&ampx_x;/g, "&");
			//editorDefaultValue=editorDefaultValue.replace(/&x_x;/g, "&");
			// plain text (e.g. copied from the text field) needs its line breaks converted; HTML already has
			// its own, and converting newlines inside it adds extra breaks every time the record is edited
			if (!/<\/?[a-z][^>]*>/i.test(editorDefaultValue))
				editorDefaultValue=editorDefaultValue.replace(/\n/g, "<br>");
			//alert(editorDefaultValue);
			var $editorEl = $('#editor');

			if (editorDefaultValue)
				$editorEl.html(editorDefaultValue);
			if (editorReadOnly) {
				$editorEl.summernote({
					toolbar: []
				});
				$editorEl.summernote('disable');
			} else {
				var imageTools = CTImageTools.create($editorEl, getEditorSettings());

				$editorEl.summernote({
				popatmouse: false,
					height: parentWindow.editorHeight,
					buttons: imageTools.buttons(),
					popover: {
						image: [
							['edit', ['ctEditImage']],
							['imagesize', ['imageSize100', 'imageSize75','imageSize50', 'imageSize25','imageSize10']],
							['float', ['floatLeft', 'floatRight', 'floatNone']],
							['remove', ['removeMedia']]
						]
					},
					callbacks: {
						onImageUpload: function(files) {
							imageTools.handleFiles(files);
						}
					}
				}).on('summernote.change', function(we, contents, $editable) {
					imageTools.contentChanged(contents);
					//contents=contents.replace(/&/g, "&ampx_x;");
					//contents=contents.replace(/\n/g, "<br>");
					//contents=escape(contents);
					var _code=$('#editor').summernote("code").replace(/<\/p>/gi, "\n").replace(/<br\/?>/gi, "\n").replace(/<\/?[^>]+(>|$)/g, "");
					_code=_code.replace(/&nbsp;/gi, " ");
					//var plainText = $($('#editor').summernote("code")).text();
					try{
					   parentWindow.crm.fields(editorCRMFieldName).val(contents);
					   if (editorCRMFieldNameText!="")
					   {
						 parentWindow.crm.fields(editorCRMFieldNameText).val(_code);
					   }
					}catch(ee){
					   $("#"+editorCRMFieldName,parent.document).val(contents);
					   if (editorCRMFieldNameText!="")
					   {
					     $("#"+editorCRMFieldNameText,parent.document).val(_code);
					   }
					}
				});
				imageTools.start();
			}//end if editor readonly

	});
    </script>
</body>
</html>
