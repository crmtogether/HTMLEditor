/*

Screen Objects that have been added or updated

*/

ObjectName='CRMTogetherOS';
ObjectType='TabGroup';
EntityName='system';
var CObjId10869 = AddScreenObject();

/*

Add in admin menu

*/

var TabsId11081 = AddCustom_Tabs(0,0,11,'Admin','CRM Together OS','customfile','CRMTogetherOS/admin.asp','','waves.gif',0,'',false,0);

var TabsId11082 = AddCustom_Tabs(0,0,1,'CRMTogetherOS','Home','customfile','CRMTogetherOS/admin.asp','','',0,'',false,0);

var TabsId11083 = AddCustom_Tabs(0,0,2,'CRMTogetherOS','HTML Editor','customfile','HTMLEditor/admin.asp','','',0,'',false,0);

//copy files
var CRMTogetherOS="CRMTogetherOS";
CreateNewDir(GetDLLDir() + '\\CustomPages\\' + CRMTogetherOS);
CopyASPTo(CRMTogetherOS+'\\admin.asp','\\CustomPages\\'+CRMTogetherOS+'\\admin.asp');
CopyASPTo(CRMTogetherOS+'\\sagecrm.js','\\CustomPages\\'+CRMTogetherOS+'\\sagecrm.js');
CopyASPTo(CRMTogetherOS+'\\sagecrmnolang.js','\\CustomPages\\'+CRMTogetherOS+'\\sagecrmnolang.js');
CopyASPTo(CRMTogetherOS+'\\workflow.js','\\CustomPages\\'+CRMTogetherOS+'\\workflow.js');

var HtmlEditor="HtmlEditor";
CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts');
CopyASPTo(HtmlEditor+'\\admin.asp','\\CustomPages\\'+HtmlEditor+'\\admin.asp');
CopyASPTo(HtmlEditor+'\\editor.asp','\\CustomPages\\'+HtmlEditor+'\\editor.asp');
CopyASPTo(HtmlEditor+'\\htmlEditor_template.js','\\CustomPages\\'+HtmlEditor+'\\htmlEditor_template.js');
CopyASPTo(HtmlEditor+'\\sagecrm.js','\\CustomPages\\'+HtmlEditor+'\\sagecrm.js');
CopyASPTo(HtmlEditor+'\\sagecrmnolang.js','\\CustomPages\\'+HtmlEditor+'\\sagecrmnolang.js');


CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\bootstrap');
CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\bootstrap\\3.3.5');
CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\css');
CopyASPTo(HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\css\\bootstrap.min.css','\\CustomPages\\'+HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\css\\bootstrap.min.css');

CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\js');
CopyASPTo(HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\js\\bootstrap.min.js','\\CustomPages\\'+HtmlEditor+'\\Scripts\\bootstrap\\3.3.5\\js\\bootstrap.min.js');

CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\jQuery');
CopyASPTo(HtmlEditor+'\\Scripts\\jQuery\\jquery-3.3.1.min.js','\\CustomPages\\'+HtmlEditor+'\\Scripts\\jQuery\\jquery-3.3.1.min.js');

CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\summernote');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\summernote.css','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\summernote.css');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\summernote.js','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\summernote.js');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\summernote.css','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\summernote.css');

CreateNewDir(GetDLLDir() + '\\CustomPages\\' + HtmlEditor+'\\Scripts\\summernote\\font');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\font\\summernote.eot','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\font\\summernote.eot');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\font\\summernote.ttf','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\font\\summernote.ttf');
CopyASPTo(HtmlEditor+'\\Scripts\\summernote\\font\\summernote.woff','\\CustomPages\\'+HtmlEditor+'\\Scripts\\summernote\\font\\summernote.woff');


