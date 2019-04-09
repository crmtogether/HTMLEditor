<%

	function getTableDetail(tableName, fieldName)
	{
	  var res="-1";
    var q=CRM.CreateQueryObj("select * from custom_tables where bord_name='"+tableName+"'");
    q.SelectSQL();
    while (!q.EOF)
    {
      res=q(fieldName);
      q.NextRecord();
    }
    return res;
  }

  function getWorkflow(workflowName)
	{
	  var res="-1";
    var q=CRM.CreateQueryObj("select * from workflow where Work_Description='"+workflowName+"'");
    q.SelectSQL();
    while (!q.EOF)
    {
      res=q("work_workflowid");
      q.NextRecord();
    }
    return res;
  }

  function getWorkflowStateId(workflowName, stateName)
	{
	  var workflowid=getWorkflow(workflowName);
	  var res="-1";
    var q=CRM.CreateQueryObj("SELECT wkst_stateid, wkst_name FROM WorkflowState WHERE WkSt_WorkflowId = " + workflowid+" and wkst_name='"+stateName+"'");
    q.SelectSQL();
    while (!q.EOF)
    {
      res=q("WkSt_StateId");
      q.NextRecord();
    }
    return res;
  }
  
  function getCurrentStateId(WkIn_WorkflowId, WkIn_CurrentEntityId, WkIn_CurrentRecordId)
  {
	  var res="-1";
    var q=CRM.CreateQueryObj(" select * from WorkflowInstance where WkIn_WorkflowId="+WkIn_WorkflowId+
          " and WkIn_CurrentEntityId="+    WkIn_CurrentEntityId+
          " and WkIn_CurrentRecordId="+WkIn_CurrentRecordId);
    q.SelectSQL();
    while (!q.EOF)
    {
      res=q("WkIn_CurrentStateId");
      q.NextRecord();
    }
    return res;                    
  }
  
  function ChangeState(WkIn_WorkflowId, tableId, WkIn_CurrentRecordId, NewStateId)
  {
  	var wfi = CRM.FindRecord("workflowinstance", "WkIn_WorkflowId=" +WkIn_WorkflowId + 
        " and WkIn_CurrentEntityId=" + tableId + " and WkIn_CurrentRecordId=" + WkIn_CurrentRecordId);
	  if (!wfi.eof) 
    {
        wfi.wkin_currentstateid = NewStateId;
	  }else{
    		var wfi = CRM.CreateRecord('workflowinstance');
    		wfi.wkin_workflowid = WkIn_WorkflowId;
    		wfi.wkin_currententityid = tableId;
    		wfi.wkin_currentrecordid = WkIn_CurrentRecordId;
    		wfi.wkin_currentstateid = NewStateId;    
    }
    wfi.SaveChanges();
    
  }
  
  function getOppo(oppoid)
  {
    var rec=CRM.FindRecord("opportunity","oppo_opportunityid="+oppoid)
    return rec;
  }
  function createProgress(oppoid, note)
  {
     var rec=getOppo(oppoid);
     var op=CRM.CreateRecord("OpportunityProgress");
     op("oppo_opportunityId")=oppoid;
     op("oppo_PrimaryPersonId")=rec("oppo_PrimaryPersonId");
     op("Oppo_Description")=rec("Oppo_Description");
     op("Oppo_Product")=rec("Oppo_Product");
     op("oppo_stage")=rec("oppo_stage");
     op("oppo_status")=rec("oppo_status");
     op("oppo_assigneduserid")=rec("oppo_assigneduserid");
     op("oppo_progressnote")=note;
     op.SaveChanges();   
  }
   
Array.prototype.exists = function(o) {
for(var i = 0; i < this.length; i++)
   if(this[i] === o)
     return true;
return false;
}

%>