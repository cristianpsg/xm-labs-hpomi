// This is a replacement file for compatibility with integrations written for IA 5.1.5
importClass(Packages.com.alarmpoint.integrationagent.security.EncryptionUtils);

XMIO = {};

(function(){
	
    XMIO.RESPONSE_SUCCESS = "200";
    XMIO.RESPONSE_DATA_VALIDATION_ERROR = "400";
  
    XMIO.decryptFile = function(passwordFile) {
		try
		{
			var encryptionUtils = new EncryptionUtils();
			var file = new File(passwordFile);
			return encryptionUtils.decrypt(file);
		}
		catch (e)
		{
			return "";
		}	
	};
	
	XMIO.readinput = function(input) {
		var javaIoPkg = new JavaImporter(java.io);
		with(javaIoPkg) {
			var rd = new BufferedReader(new InputStreamReader(input));
	
			// get the response body
			var line = "";
			var content = "";
			while ((line = rd.readLine()) != null) 
			{
				content += line;
			}
			rd.close();
			return content;	
		}
	};

	XMIO.post = function(jsonStr, url, initiator, password) {
		var javaPkgs = new JavaImporter(
				org.apache.http.client.methods
    );
    
    with (javaPkgs) {
      return XMIO.sendReceive(new HttpPost(url), initiator, password, jsonStr);
    }
  }
  
	XMIO.put = function(jsonStr, url, initiator, password) {
		var javaPkgs = new JavaImporter(
				org.apache.http.client.methods
    );
    
    with (javaPkgs) {
      return XMIO.sendReceive(new HttpPut(url), initiator, password, jsonStr);
    }
  }

	XMIO.get = function(url, initiator, password) {
		var javaPkgs = new JavaImporter(
				org.apache.http.client.methods
    );
    
    with (javaPkgs) {
      return XMIO.sendReceive(new HttpGet(url), initiator, password, null);
    }
  }
  
	XMIO.sendReceive = function(request, initiator, password, jsonStr) {
		var javaPkgs = new JavaImporter(
				org.apache.http.client,
				org.apache.http.client.methods,
				org.apache.http.auth,
				org.apache.http.impl,
				org.apache.http.impl.auth,
				org.apache.http.impl.client,
				org.apache.http.impl.cookie,
				org.apache.http.params,
				org.apache.http.protocol,
				org.apache.http.entity,
				com.alarmpoint.integrationagent.exceptions.retriable
		);
		
		with (javaPkgs) {
		    var xmHttpRequest = new DefaultHttpClient();
		    xmHttpRequest.getParams().setParameter("content-encoding", "charset=UTF-8");
		    
		    IALOG.info("Sending request to: " + request.getURI() + (jsonStr == null ? "" : " with payload: " + jsonStr) + ", user: " + initiator);
		
        if (jsonStr != null) {
  		    var entity = new StringEntity(jsonStr);
	  	    entity.setContentType("application/json");
		      request.setEntity(entity);
		    }
        
		    // setup the credentials for the HTTP request
		    var creds = new UsernamePasswordCredentials(initiator, password);
		    request.addHeader(BasicScheme.authenticate(creds,"US-ASCII",false));
		    
		    // send the HTTP Post
        var startTime = +new Date();
		    var xmHttpResponse = xmHttpRequest.execute(request);        
		    var responseStatus = xmHttpResponse.getStatusLine().getStatusCode();
		    var responseBody = XMIO.readinput(xmHttpResponse.getEntity().getContent());
		    IALOG.info("xMatters response in " + ((+new Date()) - startTime) + " ms with code: " + responseStatus + (!!responseBody ? (" and payload: " + responseBody) : ""));
		    
		    // If the service is unavailable retry
		    if (responseStatus == 503) {
		    	var retryDelay = 60000 // default wait 1 minute if rate limited.
		    	var retryAfterHeaders = xmHttpResponse.getHeaders("Retry-After");
		    	IALOG.error("header length: " + retryAfterHeaders.length);
		    	if (retryAfterHeaders.length) {
		    		if (retryAfterHeaders.length > 1) {
		    			IALOG.warn("Expecting 1 Retry-After response header. Found: " + retryAfterHeaders.length);
		    		}
		    		var rahv = retryAfterHeaders[0].getValue();
		    		var retry;
		    		try {
		    			// rfc2616 section 14.37 header Retry-After
		    			// http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
		    			// The value of this field can be an integer number of seconds (in decimal) after the time of the response.
		    			retry = java.lang.Float.parseFloat(rahv);
		    			retry = retry * 1000;
		    			retryDelay = retry;
		    		} catch (e) {
		    			IALOG.debug("Trying to parse date caught exception: " + e);
		    			if (e.javaException instanceof java.lang.NumberFormatException) {
		    				try {
		    					// The value of this field can be an HTTP-date.
		    					var currentTime = new Date().toUTCString();
		    					retry = DateUtils.parseDate(rahv).getTime();
		    					retryDelay = retry - currentTime;
		    				} catch (ie) {
		    					// We failed to parse just use the default retry delay
				    			IALOG.warn("Trying to parse date caught exception: " + ie);
		    				}
		    			}
		    		}
		    	}
		    	// Note: The retry number includes the original attempt. So the default of 3 is the original + 2 retries.
			    throw new RetriableException(null, 3, retryDelay);
			}

      var response = new Object();

      response.status = responseStatus;
      response.body = responseBody;

      return response;
		}
	};
})();

