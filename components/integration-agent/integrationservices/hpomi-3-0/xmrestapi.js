XMRESTAPI = {};

(function(){

  XMRESTAPI.RESPONSE_SUCCESS = "200";
  XMRESTAPI.RESPONSE_DATA_VALIDATION_ERROR = "400";

  // private functions

	function getEventFilterAsString(filter) {
    var text = "";

    propertyNames  = [];
    propertyValues = [];

    for (var property in filter) {
      var value = filter[property];

      if (property == "properties") {
        var properties = "";
        for (var p in value) {
          propertyNames.push(  encodeURIComponent( p ) );
          propertyValues.push( encodeURIComponent( value[p] ) );
          //properties += p + "=" + String(value[p]);
        }

        value = "propertyName=" + propertyNames.join(",") + "&" + "propertyValue=" + propertyValues.join(",");
        //value = encodeURIComponent(properties);
      } else {
        value = property + "=" + String(value);

      }

      if (value != null) {
        if (text != "") text += "&";
        text += value;
      }
    }

    return text;
	}

  // public functions

	XMRESTAPI.getEvents = function(eventFilter) {
    IALOG.debug("XM REST API: getEvents for " + eventFilter);
    var parameters = getEventFilterAsString(eventFilter);

    //var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("forms")) + "events?" + parameters;
    var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("integration")) + "xm/1/events?"  + parameters;


    var response = XMIO.get(url, INITIATOR, INITIATOR_PASSWORD);
    IALOG.debug("XM REST API: getEvents received " + response.status + " " + response.body);

    //XMRESTAPI.checkResponse( response );

    return JSON.parse(response.body);
  };

	XMRESTAPI.setEventStatus = function(eventFilter, status) {
    IALOG.debug("XM REST API: setEventStatus for " + eventFilter + " to " + status);
    var count = 0;

    var events = XMRESTAPI.getEvents( eventFilter );

    for (var i = 0; i < events.total; i++) {
      // var event = events.records[i];
      var event = events.data[i];
      IALOG.debug("XM REST API: setEventStatus for " + event.links.self + " to " + status);

      //var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("/reapi")) + event.href;
      var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("/api")) + '/api/xm/1/events';

      var response = XMIO.post(JSON.stringify({ 'status': status, 'id': event.id }), url, INITIATOR, INITIATOR_PASSWORD);
      IALOG.debug("XM REST API: setEventStatus received " + response.status + " " + response.body);

      //XMRESTAPI.checkResponse( response, {status : 409} ); // ignore conflict errors

      count++;
    }

    IALOG.info("XM REST API: setEventStatus events " + status + ": " + count);
    return count;
  };

	XMRESTAPI.deleteEvents = function(eventFilter) {
    IALOG.debug("XM REST API: deleteEvents for " + eventFilter);
    return XMRESTAPI.setEventStatus(eventFilter, "TERMINATED");
  };

  // Submit Apxml
  XMRESTAPI.submitApxml = function(url, apxml, existingEventsFilter, newKeys, deduplicationFilter) {
    var deduplicationFilterName = DEDUPLICATION_FILTER_NAME;

    if ( deduplicationFilter !== undefined ) {
      deduplicationFilterName = deduplicationFilter;
    }
    IALOG.debug("XM REST API: Deduplication settings: parameter passed=" + deduplicationFilter + ", value used=" + deduplicationFilterName);

    if ( deduplicationFilterName != null) {
	    if (XMUtil.deduplicator.isDuplicate(apxml)) {
	        // Discard message, adding a warning note to the log
	        XMUtil.deduplicate(apxml);
	        return;
	    }

    }

    if (existingEventsFilter != null) {
      XMRESTAPI.deleteEvents( existingEventsFilter );
    }

	  var eventObj = (typeof createEventTemplate === "function") /* IA 5.1.4 */ ? createEventTemplate(apxml) : XMUtil.createEventTemplate();
    var apxmlAsObj = APXML.toEventJs(apxml, eventObj, newKeys);
    var obj = apia_event( apxmlAsObj );
    var json = JSON.stringify(obj);

    if (IALOG.isDebugEnabled()) {
      IALOG.debug("XM REST API: Post to " + url + " " + json);
    }

	var xmResponse = XMIO.post(json, url, INITIATOR, INITIATOR_PASSWORD);
    XMUtil.deduplicator.incrementCount(apxml);
	return xmResponse;
  }

  // Utility methods
  XMRESTAPI.checkResponse = function(response, ignoreError) {

    if ( response.status !== undefined && 200 >= response.status && response.status < 300 ) {
      // Ignore status?
      if (ignoreError && ignoreError['status'] != null && ignoreError['status'] == response.status) {
        IALOG.debug("XM REST API: checkResponse status " + response.status + " will be treated as success");
        return response;
      }
      var error;
      try {
        var body = JSON.parse(response.body);

        if (ignoreError && ignoreError['type'] != null && ignoreError['type'] == body.type) {
          IALOG.debug("XM REST API: checkResponse error type " + response.status + " will be treated as success");
          return response;
        }
        error = body.message;
      } catch (e) {
        error = "xMatters server returned status " + response.status;
      }
      throw error;
    }

    return response;
  };

  XMRESTAPI.getFormURL = function(webServiceURL, form) {

    if (form.startsWith("http"))
      return form;

    var triggers = webServiceURL.indexOf("/triggers");
    if (triggers >= 0) {
      // 'form' parameter is treated as form UID e.g. https://<xM server>/reapi/2015-01-01/forms/<formUID>/triggers
      return webServiceURL.substring(0, webServiceURL.lastIndexOf('/', triggers-1)) + "/" + form + "/triggers";
    }

    IALOG.warn("XM REST API:: Unrecognized WEB_SERVICE_URL format. getFormURL will use " + webServiceURL + " 'as is'.");

    return webServiceURL;
  };
})();
