<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CRM Together Rich Html Editor</title>
    <link href="Scripts/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
    <script src="Scripts/jquery/jquery-3.3.1.min.js"></script>
    <script src="Scripts/bootstrap/3.3.5/js/bootstrap.min.js"></script>
    <link href = "Scripts/summernote/summernote.css" rel="stylesheet">
    <script src = "Scripts/summernote/summernote.js"></script>
</head>
<body>

    <div id="editor"></div>

    <script>
		var editorCRMFieldName = '<%=Request.QueryString("editorCRMFieldName")%>';
		var editorReadOnly = <%=Request.QueryString("editorReadOnly")%>;
		var editorCRMFieldNameText = '<%=Request.QueryString("editorCRMFieldNameText")%>';
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
			
				$editorEl.summernote({
				popatmouse: false,
					height: parentWindow.editorHeight,				
					popover: {
						image: [
							['imagesize', ['imageSize100', 'imageSize75','imageSize50', 'imageSize25','imageSize10',]],
							['float', ['floatLeft', 'floatRight', 'floatNone', 'floatCenter']],
							['remove', ['removeMedia']]
						]
					}
				}).on('summernote.change', function(we, contents, $editable) {
					//contents=contents.replace(/&/g, "&ampx_x;");
					//contents=contents.replace(/\n/g, "<br>");
					contents=escape(contents);
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
			}//end if editor readonly

	});
    </script>
</body>
</html>