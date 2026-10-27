# HTMLEditor
Add in the ability to make a multiline text field a WYSIWYG editable field in Sage CRM. 
We use https://summernote.org/ to implement the editor. 

The code in the 

	src

folder.


We ship the component with it "HTMLEditor.zip".
-To create your own Sage CRM component zip up the contents of the src folder. 

To install then import via Sage CRM's Component Manager. 
This creates 2 folders in your CustomPages folder called

	HTMLEditor
	CRMTogetherOS

When installed a new menu item is created in the 

	Administration

area of Sage CRM called
  
	CRM Together OS
  
	OS=Open Source

Within this there is a tab called 

	HTML Editor
  
Click this and add in your fields you wish to make use the WYSIWYG editor. Note that you should have created a new mutli-line text field to be used as the WYSIWYG field. 
For example create a field on cases called
	case_ct_problemnote_html
and add this to the 
	CaseDetailBox 
screen. This screen should also have the 
	case_problemnote
field on it. 

The in the editor set the JSON to be

	[
	{
	"htmlfield":"case_ct_problemnote_html",
	"textfield":"case_problemnote"
	}
	]
	  
Save this (click update) and this the creates a file in the 

    WWWRoot\js\custom\htmlEditor.js
	
which searches for these fields and applys the screen update. 

If you have historical records then the following SQL can be used to update the new html fields. 

	update cases
	set 
	case_ct_problemnote_html=case_problemnote
	where case_ct_problemnote_html is null

	update cases
	set 
	case_ct_solutionnote_html=case_solutionnote
	where case_ct_solutionnote_html is null
	  
Known issues:

Firefox seems to paste images twice into the editor. The work-around is to delete one of the images. 

	Update - fixed july 2020  

21 July 22 - updated code to resize the iframe and remove the blank space

27 Oct 26 - image tools, size limits and library updates

Images are stored inline (base64) in the field, so large photos made very large records.

- Inserting, pasting or dropping an image now opens an image dialog: crop (drag on the image), rotate, width, brightness, contrast, format (Auto/JPEG/PNG/WebP) and quality, with a live "original vs new size" readout. By default images are shrunk to 1600px wide at 80% quality.
- Click an image in the editor and use "Edit image" to shrink/crop an image that is already there.
- Images pasted as HTML (e.g. from Word or a web page) that are bigger than 300 KB are shrunk automatically.
- A size meter under the editor shows the field size against the maximum. It goes amber over the warning size and red over the maximum, and images that would take the field over the maximum can't be inserted.
- The 100%/75%/50%/25%/10% image size buttons now show (they were missing before).
- Summernote 0.8.18 -> 0.9.1, jQuery 3.3.1 -> 3.7.1, Bootstrap 3.3.5 -> 3.4.1 (security fixes).
- editor.asp no longer writes query string values straight into script.

Defaults (in editor.asp):

	maxSizeMB: 7               images that would take the field over this are refused
	warnSizeMB: 5              the meter turns amber over this
	imageEditorOnInsert: true  false = shrink with the defaults without showing the dialog
	imageMaxWidth: 1600        default width images are shrunk to
	imageQuality: 0.8          default JPEG/WebP quality
	imageFormat: "auto"        auto | jpeg | png | webp (WebP is smallest but may not show in some email clients)
	autoCompressPastedKB: 300  0 = don't shrink images pasted as HTML

Any of these can be set per field in the admin JSON, e.g.

	[
	{
	"htmlfield":"case_ct_problemnote_html",
	"textfield":"case_problemnote",
	"maxSizeMB":7,
	"warnSizeMB":5
	}
	]

