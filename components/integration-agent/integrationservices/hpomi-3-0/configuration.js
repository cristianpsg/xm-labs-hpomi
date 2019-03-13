/**
 * This file defines configuration variables for the OMi Integration Service JS
 */

// URL to OMi
var OMI_SERVER = "localhost";

// Protocol for OMi connectivity
var OMI_PROTOCOL = "http";

// Port to OMi
var OMI_PORT = 80;

// The REST path for the OMi system.
var OMI_REST_SYNC_EVENT_ROOTPATH = "/opr-gateway/rest/9.10/synchronization/event/";
var OMI_REST_SYNC_EVENT_CHANGE_ROOTPATH = "/opr-gateway/rest/9.10/synchronization/event_change/";

// OMi User to make web service calls with
var OMI_USER = "xMatters";

// Password for the OMi User
var OMI_PASSWORD_FILE = "conf/hpomi30.pwd";

// The business script in xMatters used to present and handle responses for this integration.
var DEDUPLICATION_FILTER_NAME = "hpomi-3-0";

// Update HP OMi events with xMatters notification delivery status.
var ANNOTATE_DELIVERY = true;

// Send event to xMatters and delete any existing events with that incident/event id.
var DELETE_EXISTING_EVENTS = false;

// ----------------------------------------------------------------------------------------------------
// These values determine the xMatters Communication Plan forms that are used to inject events into xMatters
// ----------------------------------------------------------------------------------------------------
var XMATTERS_FORM = "<Web Service URL of HPOMi form>";
var XMATTERS_FYI_FORM = "<Web Service URL of HPOMi-fyi form>";

var INITIATOR = "hpomi";
var INITIATOR_PASSWORD_FILE = "conf/.initiatorpasswd";
var INITIATOR_USER_ID = INITIATOR;

// ----------------------------------------------------------------------------------------------------
// The following constants should not need to be changed for production deployment
// ----------------------------------------------------------------------------------------------------

// For development, set to false to use _authCompanyName=COMPANY_NAME query parameter in xMatters REST requests
var USE_COMPANY_NAME_HOST_PREFIX = true;

var REAPI_COMPANY_NAME_QUERY_PARAM = "_authCompanyName";
var REAPI_COMPANY_NAME = "<COMPANY_NAME>";
