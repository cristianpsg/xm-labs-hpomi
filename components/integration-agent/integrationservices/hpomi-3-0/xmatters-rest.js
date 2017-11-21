// Functions to support REST API calls from the Integration Agent

WEB_SERVICE_URL = XMATTERS_FORM;	// The url that will be used as base for REST API operations such as "get events"

function apia_event(formObject) {

  // A workaround for 'form properties of type List rejecting empty values' issue
  for (var property in formObject.properties) {
    if (formObject.properties[property] === "") {
      formObject.properties[property] = null;
    }
  }
  
  // Set recipient
  formObject.recipients = new Array();
  
  var recipient = formObject.properties['assigned_user_login_name'];
  
  if ( recipient == null || recipient.length == 0) {
    recipient = formObject.properties['assigned_group_name'];
  }
  
  if (recipient != null) {
    formObject.recipients.push({'targetName' : recipient});  
    IALOG.info("Notification will be sent to " + JSON.stringify(formObject.recipients));
  } else {
    IALOG.info("Notification will be sent to a default recipient of the form");
  }

	return formObject;	
}

function xmatters_rest_send(apxml)
{
  ServiceAPI.getLogger().debug("Sending to xMatters via REB.");
  
  var priority = new String(apxml.getValue("priority"));
  var form_url = priority.equalsIgnoreCase("LOW") || priority.equalsIgnoreCase("LOWEST") ? XMATTERS_FYI_FORM : XMATTERS_FORM;
  
  // Required by IA 5.1.4
  apxml.setToken("agent_client_id", getAgentClientID());
  
  // Submit APXML
  var response = XMRESTAPI.submitApxml(form_url, apxml, DELETE_EXISTING_EVENTS ? getExistingEventsFilter(apxml.getValue('incident_id')) : null, { 'priority' : 'xm_priority' });
  
  if (response) {
    // if request was actually sent
    if (response.status == "202" ) {
      log.debug("xmatters_rest: SUCCESS");
    } else {
      log.info("xmatters_rest: FAILURE (" + response.status + ")");      
      XMRESTAPI.checkResponse( response );
    }
  }  
}

function xmatters_rest_delete(apxml) {
  ServiceAPI.getLogger().debug("Sending to xMatters via REB.");
  
  var incidentId = apxml.getValue('incident_id');
  IALOG.info("Event status is 'closed'. Terminating events associated with event {0}", incidentId); 
  if (incidentId != null) {
    var count = XMRESTAPI.deleteEvents( getExistingEventsFilter(incidentId) ); // deleteEvents will throw exception if something is wrong
    IALOG.info("{0}: Events terminated: {1}", incidentId, count);
  } else {
    throw "incident_id token is missing";       
  }
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getAgentClientID
 *
 * return agent_client_id of the integration
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getAgentClientID() {
	if (ServiceAPI.getConfiguration === undefined)
		return "applications|" + INTEGRATION_VERSION; 
	else
		return ServiceAPI.getConfiguration().getName(); 
}