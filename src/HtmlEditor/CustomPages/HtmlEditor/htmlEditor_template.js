console.log("Loading htmlEditor");
var editorHeight = 600;

var editors = [!HTMLFIELDS];

//var editors = ['case_ct_problemnote_html','case_ct_solutionnote_html','soln_ct_solutiondetails_html'];
var editorReadOnly = false;
var currentURL = new URL(window.location.href);
var u="";
$(document).ready(function () {	
	console.log("Loading htmlEditor doc ready");
	editorReadOnly = $("#Button_Save").length == 0;		
	console.log("Loading htmlEditor editorReadOnly:"+editorReadOnly);
	for (var i =0; i<editors.length;i++) {
		editorCRMFieldName = editors[i].htmlfield;
		editorCRMFieldNameText= editors[i].textfield;
		console.log("Loading htmlEditor:"+editorCRMFieldName);
		$el = $("#_Data" + editorCRMFieldName); 
		console.log("Loading htmlEditor length:"+$el.length);
		var _edloaded=false;
		if ($el.length > 0) {
			_edloaded=true;
			$el.hide();		
			$appendTo = $("#_Capt" +editorCRMFieldName).parent().parent();
			try{
			  u = crm.url('/HtmlEditor/editor.asp') + '&editorCRMFieldName='+editorCRMFieldName+'&editorReadOnly=' + editorReadOnly+"&editorCRMFieldNameText="+editorCRMFieldNameText;
			}catch(e){
			  u = '/customer365/HtmlEditor/editor2.asp?' + 'editorCRMFieldName='+editorCRMFieldName+'&editorReadOnly=' + editorReadOnly+"&editorCRMFieldNameText="+editorCRMFieldNameText;				
			}
			console.log("Loading url:"+u);
			if (editorReadOnly) { //we are in view mode	        
				$el = $("#_Data" + editorCRMFieldName).hide();
				$el.hide();
			}
			
			$('<tr><td colspan=4><iframe id="editor_'+editorCRMFieldName+'" src="'+currentURL.origin + '' + u + '" height="' +
				(editorHeight + 40) + '" width="100%" style="border:none;"></iframe></td></tr>').insertAfter($appendTo);
		}
		$el = $("#" + editorCRMFieldName); 
		if ((!_edloaded)&&($el.length > 0)) {
			_edloaded=true;
			$el.hide();		
			$appendTo = $("#_Capt" +editorCRMFieldName).parent().parent();
			try{
			  u = crm.url('/HtmlEditor/editor.asp') + '&editorCRMFieldName='+editorCRMFieldName+'&editorReadOnly=' + editorReadOnly+"&editorCRMFieldNameText="+editorCRMFieldNameText;
			}catch(e){
			  u = '/customer365/HtmlEditor/editor2.asp?' + 'editorCRMFieldName='+editorCRMFieldName+'&editorReadOnly=' + editorReadOnly+"&editorCRMFieldNameText="+editorCRMFieldNameText;				
			}
			console.log("Loading url:"+u);
			if (editorReadOnly) { //we are in view mode	        
				$el = $("#_Data" + editorCRMFieldName).hide();
				$el.hide();
			}
			
			$('<tr><td colspan=4><iframe id="editor_'+editorCRMFieldName+'" src="'+currentURL.origin + '' + u + '" height="' +
				(editorHeight + 40) + '" width="100%" style="border:none;"></iframe></td></tr>').insertAfter($appendTo);
		}
		
	}	

	setTimeout(function() { fixupiframes(); }, 4000);
	
});

function fixupiframes(){	
	for (var ii =0; ii<editors.length;ii++) {
		editorCRMFieldName = editors[ii].htmlfield;
		var iFrame = document.getElementById("editor_"+editorCRMFieldName );
		if (iFrame!=null){
		  var res=resizeIFrameToFitContent( iFrame );
		}
	}
}

function resizeIFrameToFitContent( iFrame ) {
	console.log('resizeIFrameToFitContent');
    iFrame.width  = iFrame.contentWindow.document.body.scrollWidth;
    iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
}

