CALLBACKS = ANNOTATE_DELIVERY ? ["status", "deliveryStatus", "response"] : ["status", "response"]; 

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * handleEventStatus
 *
 * The main routine for handling event status messages from xMatters
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */
function handleEventStatus(msg)
{
  switch (msg.status) {
  
    case "active":     // event created 
      addAnnotationToEvent( getIncidentID(msg), notePrefix + "Event " + msg.eventidentifier + " successfully created in xMatters" );
      break;
      
    case "terminated": // time expired 
      addAnnotationToEvent( getIncidentID(msg), notePrefix + "Event " + msg.eventidentifier + " terminated" );
      break;
      
    case "terminated_external": // terminated by user
      var incidentId = getIncidentID(msg);

      if (msg.username !== INITIATOR_USER_ID) {
        addAnnotationToEvent( incidentId, notePrefix + "Event " + msg.eventidentifier + " manually terminated from within xMatters" 
          /* + " by user [" + msg.username + "]" */ );
      } else {
        // Ignore the events created and terminated by this integration and not the actual user
        log.info("handleEventStatus - incidentId [" + incidentId + "] event terminated by the user that initiated the event. Ignored.");
      }
      break;      
  }
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * handleDeliveryStatus
 *
 * The main routine for handling delivery status messages from xMatters
 *
 * If an message is delivered successfully, a comment is added to the event quoting the user and device that was targeted
 * If an message delivery fails, a comment is added to the worklog of the Remedy Incident ticket quoting the user and device that was targeted
 * ---------------------------------------------------------------------------------------------------------------------
 */
function handleDeliveryStatus(msg)
{
  if ( ANNOTATE_DELIVERY && msg.deliverystatus ) {
    switch (String(msg.deliverystatus).toLowerCase()) {
    
      case "delivered":
        addAnnotationToEvent( getIncidentID(msg), notePrefix + "Notification delivered successfully to " + msg.recipient + " | " + msg.device);
        break;
        
      case "failed": 
        addAnnotationToEvent( getIncidentID(msg), notePrefix + "Unable to deliver notification to " + msg.recipient + " | " + msg.device);
        break;
    }
  }
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * handleResponse
 *
 * The main routine for handling user responses
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */
function handleResponse(msg)
{
  log.debug("Enter - handleResponse");

  var addResponseAnnotations = true;

  var responder = msg.recipient;
  var device = msg.device;
  
  log.info("handleResponse - Event ID " + msg.eventidentifier + ", response [" + msg.response + "], responder [" + responder + "], device [" + device + "]");

  var incidentId = getIncidentID( msg );
  var annotation = "null".equals(msg.annotation) ? null : msg.annotation;

  log.info("handleResponse - Event ID " + msg.eventidentifier + ", incidentId [" + incidentId + "], annotation [" + annotation + "]");

  var responseAction = msg.response;
  var responder = msg.recipient;
  
  log.debug("      Preparing OMi REST web service request for response action [" + responseAction +"]");
  // Get the handler for creating an OMi Event Change Request
  var omiRequest = new HPOMIRequest();

  // Create the request body setting the id of the event to be updated
  var eventChange = omiRequest.makeEventChangeRequest(incidentId);
  
  if ( responseAction.equalsIgnoreCase( "annotate" ) )
  {
    // Add annotation text to the Event Change Request.
    log.debug("        Annotation is: " + annotation);
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(annotation));
  }
  else if ( responseAction.equalsIgnoreCase( "work on" ) )
  {
    // Add annotation text and new state to the Event Change Request.
    var stateChangeMsg = notePrefix + "State of event changed to 'in progress' by " + responder;
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement( stateChangeMsg ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeStateElement( "in_progress" ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeUserElement( responder ) );   
  }
  else if ( responseAction.equalsIgnoreCase( "ignore" ) )
  {
    // Add ignore text to the Event Change Request.
    var ignoreMsg = notePrefix + "Event ignored by '" + responder;
    log.debug("        Annotation is: " + ignoreMsg);
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(ignoreMsg));    
  }
  else if ( responseAction.equalsIgnoreCase( "resolve" ) )
  {
    // Add annotation text and new state to the Event Change Request.
    var stateChangeMsg = notePrefix + "State of event changed to 'resolved' by " + responder;
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement( stateChangeMsg ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeStateElement( "resolved" ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeUserElement( responder ) );   
  }    
  else if ( responseAction.equalsIgnoreCase( "open" ) ||
            responseAction.equalsIgnoreCase( "in_progress" ) ||
            responseAction.equalsIgnoreCase( "resolved" ) ||
            responseAction.equalsIgnoreCase( "closed" ) )
  {
    // Add annotation text and new state to the Event Change Request.
    var stateChangeMsg = notePrefix + "State of event changed to '" + responseAction + "' by " + responder;
    if(annotation != null && annotation != "" && annotation != undefined)
    {
      eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(annotation));
    }
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement( stateChangeMsg ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeStateElement( responseAction ) );
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeUserElement( responder ) );
    
  }
  else if ( responseAction.equalsIgnoreCase( "critical" ) ||
            responseAction.equalsIgnoreCase( "major" ) ||
            responseAction.equalsIgnoreCase( "minor" ) ||
            responseAction.equalsIgnoreCase( "warning" ) ||
            responseAction.equalsIgnoreCase( "normal" ) )
  {            
    // Add annotation text and new severity to the Event Change Request.
    var sevChangeMsg = notePrefix + "Severity of event changed to '" + responseAction + "' by " + responder;
    if(annotation != null && annotation != "" && annotation != undefined)
    {
      eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(annotation));
    }            
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(sevChangeMsg));
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeSeverityElement(responseAction));
  }
  else
  {
    throw "Unknown responseAction: " + responseAction;    
  }
  
  sendChangeEventToOMi(eventChange, incidentId);
}

function addAnnotationToEvent(incidentId, annotation) {
  // Get the handler for creating an OMi Event Change Request
  var omiRequest = new HPOMIRequest();

  // Create the request body setting the id of the event to be updated
  var eventChange = omiRequest.makeEventChangeRequest(incidentId);

  eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(annotation));

  sendChangeEventToOMi(eventChange, incidentId);
}

function sendChangeEventToOMi(eventChange, incidentId) {
  // Send the update to OMi
  var restService = new HPOMIRestService(OMI_PROTOCOL, OMI_SERVER, OMI_PORT, OMI_REST_SYNC_EVENT_CHANGE_ROOTPATH, OMI_USER, OMI_PASSWORD);        
  log.debug("      About to send request to OMi REST web service..." );
  var result = restService.post(eventChange, incidentId);
  log.debug("      Received the following response from OMi REST web service: " + result);
}

function getIncidentID( msg ) {
  if (msg !== null && typeof msg !== 'undefined' && msg.additionalTokens !== null && typeof msg.additionalTokens !== 'undefined') {
    var incidentId = msg.additionalTokens.incident_id;
    if (incidentId !== null && typeof incidentId !== 'undefined') {
      return incidentId;
    }
  }
  throw { name: "DataException", message: "Property that identifies the incident is not found in event callback data of type " + msg.xmatters_callback_type + " for event ID " + msg.eventidentifier 
    + ".Make sure 'Include in Callbacks' is set in the form's layout for a property incident_id"};  
}