var HPOMIRequest = BaseClass.extend({

  NS: "http://www.hp.com/2009/software/opr/data_model",
  XSI_NS: "http://www.w3.org/2001/XMLSchema-instance",
  XS_NS: "http://www.w3.org/2001/XMLSchema",
  
  /**
   * Constructor
   */
  init: function()
  {
    this.eventChangeRequest = new XML();
    this.annotationPropertyChange = new XML();
    this.stateChange = new XML();
    this.severityPropertyChange = new XML();
    this.event = new XML();
                  
    eventChangeRequest = <event_change xmlns={this.NS}>
                        <event_ref>
                          <target_id/>
                        </event_ref>
                        <changed_properties/>
                      </event_change>;
                      
    annotationPropertyChange = <annotation_property_change xmlns={this.NS} xmlns:xsi={this.XSI_NS} xmlns:xs={this.XS_NS}>
                            <property_name>annotation</property_name>
                            <current_value xsi:type="xs:string"/>
                            <change_operation>insert</change_operation>
                           </annotation_property_change>;
                           
    stateChange = <state_change xmlns={this.NS} xmlns:xsi={this.XSI_NS} xmlns:xs={this.XS_NS}>
                <property_name>state</property_name>
                <current_value xsi:type="xs:string"/>
              </state_change>;
              
    severityPropertyChange = <severity_property_change xmlns={this.NS} xmlns:xsi={this.XSI_NS} xmlns:xs={this.XS_NS}>
                           <property_name>severity</property_name>
                           <current_value xsi:type="xs:string"/>
                         </severity_property_change>;
    
    // Not used in the out of the box integration, but adding here if
    // needed in the field. 
    asnGrpChange = <group_property_change xmlns={this.NS} xmlns:xsi={this.XSI_NS} xmlns:xs={this.XS_NS}>
                <property_name>assigned_group_name</property_name>
                <current_group_name xsi:type="xs:string"/>
              </group_property_change>;
              
    userChange = <user_property_change xmlns={this.NS} xmlns:xsi={this.XSI_NS} xmlns:xs={this.XS_NS}>
                <property_name>assigned_user</property_name>
                <current_user_name xsi:type="xs:string"/>
              </user_property_change>;
              
    event = <event xmlns={this.NS}>
              <id/>
            </event>;

  },

  // The following functions return copies of the XML fragments so that the base templates are never modified  
  getEventChangeRequest: function()
  {
    return eventChangeRequest.copy(); 
  },
  
  getAnnotationPropertyChange: function()
  {
    return annotationPropertyChange.copy();
  },
  
  getStateChange: function()
  {
    return stateChange.copy();
  },  
  
  getSeverityPropertyChange: function()
  {
    return severityPropertyChange.copy();
  },
  
  getasnGrpChange: function()
  {
    return asnGrpChange.copy();
  },
  
  getUserChange: function()
  {
    return userChange.copy();
  }, 
  
  getEvent: function()
  {
    return event.copy();
  },
  
  // Get Event Change Request. Set the target_id. Return request to caller.
  makeEventChangeRequest: function(eventId)
  {
     default xml namespace = this.NS;
     var eventChange = this.getEventChangeRequest();
     eventChange.event_ref.target_id += eventId;
     return eventChange;  
  },
  
  // Get annotation fragment.  Set new current_value.  Return fragment.
  makeAnnotationElement: function(annotation)
  {
     default xml namespace = this.NS;
     // Create the namespace here so the 'this' keyword does not collide with the E4X syntax of setting the attribute value.
     var attrNs = new Namespace(this.XSI_NS);
     
     var annChange = this.getAnnotationPropertyChange();
     annChange.current_value += annotation;
     // Set the XMLSchema type value here, because setting the value of the element does not preserve the type attribute.
     annChange.current_value.@attrNs::type += "xs:string";
     return annChange; 
  },
  
  // Get state change fragment.  Set new current_value.  Return fragment.
  makeStateElement: function(state)
  {
     default xml namespace = this.NS;
     var attrNs = new Namespace(this.XSI_NS);
     
     var stateChange = this.getStateChange();
     stateChange.current_value += state;
     stateChange.current_value.@attrNs::type += "xs:string";
     return stateChange;  
  },
  
  // Get severity change fragment.  Set new current_value.  Return fragment.
  makeSeverityElement: function(severity)
  {
     default xml namespace = this.NS;
     var attrNs = new Namespace(this.XSI_NS);;
     
     var sevPropChange = this.getSeverityPropertyChange();
     sevPropChange.current_value += severity;
     sevPropChange.current_value.@attrNs::type += "xs:string";
     return sevPropChange;  
  },
  
  // Get user change fragment.  Set new current_value.  Return fragment.
  makeUserElement: function( user )
  {
     default xml namespace = this.NS;
     var attrNs = new Namespace(this.XSI_NS);
     
     var userChange = this.getUserChange();
     userChange.current_user_name += user;
     userChange.current_user_name.@attrNs::type += "xs:string";
     return userChange;  
  },
  
  // Get assignment group change fragment.  Set new current_value.  Return fragment.
  makeAsnGrpElement: function( group )
  {
     default xml namespace = this.NS;
     var attrNs = new Namespace(this.XSI_NS);
     
     var asnGrpChange = this.getasnGrpChange();
     asnGrpChange.current_group_name += group;
     asnGrpChange.current_group_name.@attrNs::type += "xs:string";
     return asnGrpChange;  
  },
  
  // Get simple event doc.  Set the id element.  Return to caller.
  makeEventDoc: function(eventId)
  {
     default xml namespace = this.NS;
     var event = this.getEvent();
     event.id += eventId;
     return event;  
  }, 

  // Add a child fragment to the eventChange.change_properties node
  addChangeProperty: function(eventChange, child)
  {
    default xml namespace = this.NS;
    eventChange.changed_properties.appendChild(child);
    
    return eventChange;
  },
  
  convertOprEventToAPXML: function(event)
  {
    default xml namespace = this.NS;
  
    var apxml = ServiceAPI.createAPXML();
    apxml.setMethod("ADD");
    apxml.setSubclass("action");
    apxml.setToken(APXMLMessage.APIA_PROCESS_GROUP, event.id);
    apxml.setToken("incident_id", event.id);
    apxml.setToken("sequence_number", event.sequence_number);
    apxml.setToken("title", event.title);
	apxml.setToken("description", event.description);
    apxml.setToken("drilldown_url", event.drilldown_url);
    apxml.setToken("state", event.state);
    apxml.setToken("severity", event.severity);
    apxml.setToken("priority", event.priority);
    apxml.setToken("category", event.category);
    apxml.setToken("subcategory", event.subcategory);
	apxml.setToken("application", event.application);
    apxml.setToken("duplicate_count", event.duplicate_count);
    apxml.setToken("received_on_ci_downtime", event.received_on_ci_downtime);
    apxml.setToken("time_created", event.time_created);
    apxml.setToken("time_received", event.time_received);
    apxml.setToken("time_state_changed", event.time_state_changed);
    apxml.setToken("assigned_user_login_name", event.assigned_user.login_name);
    apxml.setToken("assigned_user_user_name", event.assigned_user.user_name);
    apxml.setToken("assigned_group_name", event.assigned_group.name);
    apxml.setToken("related_ci_hint", event.related_ci_hints.hint);
    apxml.setToken("related_ci_target_id", event.related_ci.target_id);
    apxml.setToken("related_ci_target_type", event.related_ci.target_type);
    apxml.setToken("related_ci_configuration_item_id", event.related_ci.configuration_item.id);
    apxml.setToken("related_ci_configuration_item_type", event.related_ci.configuration_item.type);
    apxml.setToken("related_ci_configuration_item_name", event.related_ci.configuration_item.name);
    apxml.setToken("related_ci_configuration_item_label", event.related_ci.configuration_item.display_label);
    apxml.setToken("source_ci_hint", event.source_ci_hints.hint);
    apxml.setToken("source_ci_target_id", event.source_ci.target_id);
    apxml.setToken("source_ci_target_type", event.source_ci.target_type);
    apxml.setToken("source_ci_configuration_item_id", event.source_ci.configuration_item.id);
    apxml.setToken("source_ci_configuration_item_type", event.source_ci.configuration_item.type);
    apxml.setToken("source_ci_configuration_item_name", event.source_ci.configuration_item.name);
    apxml.setToken("source_ci_configuration_item_label", event.source_ci.configuration_item.display_label);
    apxml.setToken("node_hints_hint", event.node_hints.hint);
    apxml.setToken("node_hints_dns_name", event.node_hints.node.dns_name);
    apxml.setToken("node_ref_targed_id", event.node_ref.target_id);
    apxml.setToken("node_ref_targed_type", event.node_ref.target_type);
    apxml.setToken("node_ref_node_id", event.node_ref.node.id);
    apxml.setToken("node_ref_node_type", event.node_ref.node.type);
    apxml.setToken("node_ref_node_name", event.node_ref.node.name);
    apxml.setToken("node_ref_node_label", event.node_ref.node.display_label);
    apxml.setToken("ci_resolution_info_hint_count", event.ci_resolution_info.hint_count);
    apxml.setToken("ci_resolution_info_matched_hint_count", event.ci_resolution_info.matched_hint_count);
    apxml.setToken("ci_resolution_info_quality_metric", event.ci_resolution_info.quality_metric);
    apxml.setToken("ci_resolution_info_status", event.ci_resolution_info.status);
    apxml.setToken("originating_server_dns_name", event.originating_server.dns_name);
    apxml.setToken("originating_server_ip_address", event.originating_server.ip_address);
    apxml.setToken("sending_server_dns_name", event.sending_server.dns_name);
    apxml.setToken("sending_server_ip_address", event.sending_server.ip_address);
    apxml.setToken("eti_hint", event.eti_hint);
    apxml.setToken("control_transferred", event.control_transferred);

    // add custom tokens
    //apxml.setToken("custom_token", event.custom_token);
    
    return apxml;  
  } 
                         
});