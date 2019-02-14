importPackage(java.lang);
importPackage(java.util);
importPackage(java.io);
importPackage(java.text);
importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLMessage);
importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLMessageImpl);
importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLToken);
importClass(Packages.com.alarmpoint.integrationagent.security.EncryptionUtils);
importClass(Packages.com.thoughtworks.xstream.XStream);
importClass(Packages.com.thoughtworks.xstream.converters.reflection.PureJavaReflectionProvider);

importClass(Packages.org.apache.commons.httpclient.Header);
importClass(Packages.org.apache.commons.httpclient.HttpVersion);
importClass(Packages.org.mule.providers.http.HttpResponse);

var xStream = new XStream(new PureJavaReflectionProvider())

var INTEGRATION_VERSION = "hpomi-3-0";

load("integrationservices/" + INTEGRATION_VERSION + "/lib/javascript/core/baseclass.js");
load("integrationservices/" + INTEGRATION_VERSION + "/lib/javascript/core/logger.js");
load("integrationservices/" + INTEGRATION_VERSION + "/lib/javascript/webservices/wsutil.js");
load("integrationservices/" + INTEGRATION_VERSION + "/lib/javascript/xmatters/xmattersws.js");

load("integrationservices/" + INTEGRATION_VERSION + "/configuration.js");
load("integrationservices/" + INTEGRATION_VERSION + "/hpomi-callbacks.js");
load("integrationservices/" + INTEGRATION_VERSION + "/hpomi-request.js");
load("integrationservices/" + INTEGRATION_VERSION + "/hpomi-rest.js");
load("integrationservices/" + INTEGRATION_VERSION + "/xmatters-rest.js");

// xM REST API support
load("lib/integrationservices/javascript/log.js");
load("lib/integrationservices/javascript/xmutil.js");
load("lib/integrationservices/javascript/apxml.js");
load("lib/integrationservices/javascript/xmio.js");

if (typeof createEventTemplate === "function") {
  // Load xM REST API overrides for IA 5.1.4
  load("integrationservices/" + INTEGRATION_VERSION + "/apxml.js");
  load("integrationservices/" + INTEGRATION_VERSION + "/xmio.js");
} else {
  // IA 5.1.5+ is detected
}

// REST API Helper class
load("integrationservices/" + INTEGRATION_VERSION + "/xmrestapi.js");

var exceptionString = "JavaException: ";

var log = new Logger();
var preamble = "[" + INTEGRATION_VERSION + "] ";

var notePrefix = "[xMatters] - "; // The Prefix which is added to the note comments e.g. "[xMatters] "

var OMI_PASSWORD = XMIO.decryptFile(OMI_PASSWORD_FILE);
var INITIATOR_PASSWORD = XMIO.decryptFile(INITIATOR_PASSWORD_FILE);

/**
 * This is the injection point to xMatters from OMi Integration Connected Server
 *
 * This method will parse the OMi request and generate an APXML Message to be
 * sent to xMatters via the ServiceAPI.
 *
 * Modify the apxml object to add tokens injected to xMatters.
 */
function apia_http( httpRequestProperties, httpResponse )
{
    log.debug("Received a request from HP OMi with httpRequestProperties: " + httpRequestProperties);
    var httpRequest = httpRequestProperties.getProperty("http.request");

    var body = httpRequestProperties.getProperty("REQUEST_BODY") +"";
    // log.debug( "Body: " + body );

    var payload = new XML( new WSUtil().formatStringForE4X( body ) );

    // Create handler for understanding the OMi request.
    var omiRequest = new HPOMIRequest();

    // Opr Event Change objects only contain what fields have changed.  Get the entire details of the Event to send to xMatters.
    if(httpRequest.contains("/event_change/"))
    {
      var eventId = httpRequest.substring(httpRequest.lastIndexOf("/") + 1);
      log.debug("Handling an event_change request for eventID: " + eventId);

      // query OMi for the entire event record
      var restService = new HPOMIRestService(OMI_PROTOCOL, OMI_SERVER, OMI_PORT, OMI_REST_SYNC_EVENT_ROOTPATH, OMI_USER, OMI_PASSWORD);
      try {
        log.debug("Requesting event details from HP OMi Rest web service for eventId: " + eventId);
        var response = new XML( new WSUtil().formatStringForE4X( restService.get(eventId)+"" ) );
        log.debug("    Rest web service request was successful for eventId: " + eventId);
        //  if uncommented, the following logdebug statement will add a great deal of bulk to the IA Log
        // log.debug("Received the following event details from HP OMi: " + response.toXMLString());
        // Overwrite the Opr Event Change object with the more detailed Opr Event object
        payload = response;
      } catch (e) {
        // Handle Forbidden error
        if (("" + e).indexOf("com.alarmpoint.integrationagent.http.HttpClientWrapperException: Operation failed. Reason: Forbidden") >=0) {
          // just OK the request:
          var responseDoc = omiRequest.makeEventChangeRequest(eventId);
          log.warn("Could not retrieve the event " + eventId + " details due to exception " + e);
          httpResponse.setBodyString(responseDoc);
          httpResponse.setHeader(new Header("Content-Type", httpRequestProperties.getProperty("Content-Type")));
          log.debug("Status of response sent to OMi: " + httpResponse.getStatusLine());
          log.debug("Body of response sent to OMi: " + responseDoc);

          return httpResponse;
        }
        throw e;
      }
    }

    // response should be an OMi Opr Event Object
    var apxml = omiRequest.convertOprEventToAPXML(payload);

    // call REST function to inject event into xMatters REB forms
    if (apxml.getValue("state") == "closed") {
      xmatters_rest_delete(apxml);
    } else {
      xmatters_rest_send(apxml);
    }

    // Build Response to OMi.  At a minimum the response must be either an Opr Event object or an OprEventChange object
    log.debug("Preparing to send a response to OMi...");
    var responseDoc;
    if(httpRequest.contains("/event_change/"))
    {
      responseDoc = omiRequest.makeEventChangeRequest(apxml.getValue("incident_id"));
    }
    else
    {
      responseDoc = omiRequest.makeEventDoc(apxml.getValue("incident_id"));
    }
    httpResponse.setBodyString(responseDoc);
    httpResponse.setHeader(new Header("Content-Type", httpRequestProperties.getProperty("Content-Type")));
    log.debug("Status of response sent to OMi: " + httpResponse.getStatusLine());
    log.debug("Body of response sent to OMi: " + responseDoc);

    return httpResponse;
}

/**
 * This is the main method for handling APXML messages sent to the
 * Integration Service by APClient.  The messages may be requests to perform
 * local activity, or they may be requests to make submissions to AlarmPoint.
 * <p>
 * Any APXMLMessage object that this method returns will be sent to xMatters
 * via the Integration Service's outbound queues.
 */
function apia_input(apxml)
{
  // Forward APXML to xMatters.
  return apxml;
}

function apia_response(apxml) {
	IALOG.info("Event.js: Entering apia_response...");
	IALOG.debug("\tapxml is: \n {0}", apxml );
    var apxmlAsObj = APXML.toResponseJs(apxml);
    var obj = apia_callback(apxmlAsObj);
}

/*
  Called when response object has been received from the form
*/
function apia_callback(msg) {

  var str = "Received message from xMatters:";
  str += "\nIncident: " + msg.incident_id;
  str += "\nEvent ID: " + msg.eventidentifier;
  str += "\nCallback type: " + msg.xmatters_callback_type;

  IALOG.debug(str);

  try {
    switch (msg.xmatters_callback_type) {
      case "response":
        handleResponse(msg);
        break;

      case "status":
        handleEventStatus(msg);
        break;

      case "deliveryStatus":
        handleDeliveryStatus(msg);
        break;

    }
  } catch (e) {
    log.error("apia_callback(" + msg.eventidentifier + ", " + msg.xmatters_callback_type + "): caught Exception - name: [" +
      e.name + "], message [" + e.message + "]:\n" + JSON.stringify(msg, null, 2));
    // do not rethrow errors anymore, per INTA-5170
  }
}

/**
 * handles annotations sent from the Callout APS script
 */
function handleCalloutAnnotate( apxml )
{
  log.debug( "      Preparing to send annotation to OMi based on APS from xMatters...");
  var messageText = apxml.getValue("message");
  var incidentId = apxml.getValue("incident_id");

  if(!ANNOTATE_DELIVERY)
  {
    log.warn("      ANNOTATE_DELIVERY flag is FALSE, so the following message will not be annotated to OMi event: [" + incidentId + "] " + messageText);
    return;
  }

  log.debug("      Preparing OMi REST web service annotation request for incidentId [" + incidentId +"]");

  try
  {
    var omiRequest = new HPOMIRequest();
    var eventChange = omiRequest.makeEventChangeRequest(incidentId);
    eventChange = omiRequest.addChangeProperty(eventChange, omiRequest.makeAnnotationElement(notePrefix + messageText));

    var restService = new HPOMIRestService(OMI_PROTOCOL, OMI_SERVER, OMI_PORT, OMI_REST_SYNC_EVENT_CHANGE_ROOTPATH, OMI_USER, OMI_PASSWORD);
    var result = restService.post(eventChange, incidentId);
    log.debug("            Received the following response from OMi REST web service: " + result);
  }
  catch (e)
  {
    log.error("Caught exception processing callout annotate for [" + incidentId + "] Exception:" + e);
    throw e;
  }
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getExistingEventsFilter
 * @param incidentId ID of the incident ticket
 *
 * return a Javascript object that contains the event filter parameters
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getExistingEventsFilter(incidentId) {
  return { status : "ACTIVE", properties : { 'incident_id#en' : incidentId } }
}
