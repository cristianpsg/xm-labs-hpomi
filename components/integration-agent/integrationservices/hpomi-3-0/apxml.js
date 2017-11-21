APXML = {};

(function(){

	var reservedApxmlTokens = ["agent_application_id",
	                           "agent_client_id",
	                           "apia_password",
	                           "apia_priority",
	                           "apia_process_group",
	                           "apia_source",
	                           "xmpassword"];
	
	var apxmlPkgs = new JavaImporter(
			java.util,
			com.alarmpoint.integrationagent.util,
			com.thoughtworks.xstream,
			com.thoughtworks.xstream.converters.reflection.PureJavaReflectionProvider
			);
	with(apxmlPkgs) {
		var xstream = new XStream(new PureJavaReflectionProvider());
	}
	
	// private functions
 
	// The purpose of this function is to ease the quoting rules on parameters to APClient.bin for strings.
	// Basically, '"something with spaces"' or "\"something with spaces\"" aren't very nice.
	// This allows the user to do this: 'something with spaces' or "something with spaces".
	var booleanTest = /^('|")(true|false)(\1)$/i,
	    listOrObjTest = /^\[.+\]$|^\{.+\}$/,
	    quotedTest = /^".+"$/;
	function guessParameterType(parameter) {
		
		// First convert whatever we get into a js string.
		var result = String(parameter);
		
		// We assume the parameter true or false to be a string. To treat them as booleans if must get them quoted.
		// This is done because it is assumed more users want true and false to be treated as strings.
		var booleanResult = booleanTest.exec(parameter);
		if (booleanResult) {
			return booleanResult[2].toLowerCase();
		}
		
		// Check if we have a list or object.
		var listOrObjResult = listOrObjTest.exec(parameter);
		if (listOrObjResult) {
			return listOrObjResult[0];
		}
		
		// The user might have quoted it because they knew what they wanted. Trust them.
		var quotedResult = quotedTest.exec(parameter);
		if (quotedResult) {
			return quotedResult[0];
		}
		
		// Let's guess its a simple string, add quotes and be done with it.
		return JSON.stringify(result);
	}
	
	function getEventProperties(evProps) {
		var addTokensLinkedHashMap;
		IALOG.debug("Attempting to extract event properties: " + evProps);
		with (apxmlPkgs) {
			// deserialize the additional tokens
			if (evProps != null && evProps != "") {
				addTokensLinkedHashMap = xstream.fromXML(evProps);
			} else {
				addTokensLinkedHashMap = new HashMap();
			}

			var obj = {},
				keyIterator = addTokensLinkedHashMap.keySet().iterator();
			while (keyIterator.hasNext()) {
				var key = keyIterator.next();
				obj[key] = String(addTokensLinkedHashMap.get(key));
			}
			return obj;
		}
	}
	
	// Convert each apxmlToken to a json string, then use JSON.parse to convert the string to an js object.
	function apxmlTokenToJs(apxmlToken) {
		var key = String(apxmlToken.getKey()).toLowerCase(),
			obj;
		
		if (key === 'additionaltokens') {
			obj = {};
			obj.additionalTokens = getEventProperties(apxmlToken.getValue());
		} else {
			var value = guessParameterType(apxmlToken.getValue());
			var str = "{\"" + key + "\":" + value + "}";
			try {
				IALOG.debug("Attempting to parse JSON: " + str);
				obj = JSON.parse(str);
			}
			catch (e) {
				IALOG.error("Exception caught trying to parse JSON: " + str);
				throw e;
			}
		}
		
		return obj;
	}
	
	// public functions
	APXML.toString = function(apxml) {
		var string = "", 
		    tokenIterator = apxml.getTokens(); 
		while (tokenIterator.hasNext()) { 
		    var token = tokenIterator.next(); 
		    string += "(" + token.getKey() + ", " + token.getValue() + ")"; 
		} 
		return string; 
	};
	
	APXML.dedup = function(apxml, filter) {
		with(apxmlPkgs) {
			var recentlyReceived = EventDeduplicator.getInstance().recentOccurrenceCount(apxml, filter);
			if (recentlyReceived <= 1)
			{
				return false;
			}
			return true;
		}
	};
	
	APXML.toEventJs = function(apxml, event, newKeys) {
		event.properties = {};
		
		// Allow a client to send a map that indicates which apxml tokens represent top level event elements.
		var	keys = {
				'conferences': 'xmconferences',
				'priority'   : 'xmpriority',
				'recipients' : 'recipients',
				'responses'  : 'xmresponses'
			};
		
		if (typeof newKeys === 'object') {
			for (var k in newKeys) {
				keys[k] = newKeys[k];
			}
		}
		
		for (var itr = apxml.getTokens(); itr.hasNext(); ) {
			var apxmlToken = itr.next(),
				apxmlTokenAsJs = apxmlTokenToJs(apxmlToken);

			// This for loop obscures what is going on here.
			// apxmlTokenAsJs will only have a single item in the map.
			// A for loop is used to get the key since it isn't known.
			apxmlTokenLoop:
			for (var key in apxmlTokenAsJs) {
				// Before we check the client provided map there are some special case tokens
				// these tokens are used as top level keys rather than as properties.
				switch (key) {
					case keys['conferences']:
						event.conferences = apxmlTokenAsJs[keys['conferences']];
					    continue apxmlTokenLoop;
					case keys['priority']:
						event.priority = apxmlTokenAsJs[keys['priority']];
					    continue apxmlTokenLoop;
					case keys['recipients']:
						event.recipients = apxmlTokenAsJs[keys['recipients']];
					    continue apxmlTokenLoop;
					case keys['responses']:
						event.responses = apxmlTokenAsJs[keys['responses']];
					    continue apxmlTokenLoop;
				}

				// Don't add internal apxml tokens to event object.
				for (var i in reservedApxmlTokens) {
					if (key === reservedApxmlTokens[i]) continue apxmlTokenLoop;
				}
				event.properties[key] = apxmlTokenAsJs[key];
			}
		}
		
		IALOG.info("APXML (" + apxml.getMethod() +"):\n" + apxml + "\n\nconverted to js:\n" + JSON.stringify(event));
		return event;
	};
	
	APXML.toResponseJs = function(apxml) {
		var response = {};
		for (var itr = apxml.getTokens(); itr.hasNext(); ) {
			var apxmlToken = itr.next(),
				apxmlTokenAsJs = apxmlTokenToJs(apxmlToken);

			for (var key in apxmlTokenAsJs) {
				response[key] = apxmlTokenAsJs[key];
			}
		}
		
		IALOG.info("APXML (" + apxml.getMethod() +"):\n" + apxml + "\n\nconverted to js:\n" + JSON.stringify(response));
		return response;
	};
})();
