var HPOMIRestService = WSUtil.extend({

  /**
   * Constructor
   * @param protocol HTTP or HTTPS
   * @param server name of the server that is hosting the webservices
   * @param port integer value representing the port the REST service is exposed on
   * @param rootPath Root Path for the REST Service
   * @param username login used for REST service
   * @param password String containing password for REST service
   */
  init: function(protocol, server, port, rootPath, username, password)
  {
    this._super();
    this.protocol = protocol;
    this.server = server;
    this.port = port;
    this.setRootPath(rootPath);
    this.username = username;
    this.password = password;
  },
  
  /**
   * Post request to root path
   * @param request String containing the body to post in the request
   * @param param to append to root path
   * @return HTTP Response formatted as a String
   */     
  post: function(request, param)
  {
    this.appendParameter(param);
    log.debug("        Preparing to send POST request: " + this.server + this.rootPath);
    var response = this.restSendReceive(this.protocol, this.server, this.port, this.rootPath, this.username, this.password, this.POST, request);
    return response;
  },
  
  /**
   * Get request to root path 
   * @param param to append to root path
   * @return HTTP Response formatted as a String
   */     
  get: function(param)
  {
    this.appendParameter(param);
    log.debug("        Preparing to send GET request: " + this.server + this.rootPath);
    var response = this.restSendReceive(this.protocol, this.server, this.port, this.rootPath, this.username, this.password, this.GET);
    return response;
  },
  
  /**
   * Set the root path for the REST request
   * @param root path URL of the REST service
   */
  setRootPath: function(rootPath)
  {
    var tmp = rootPath.startsWith("/") ? rootPath : "/" + rootPath;
    tmp = tmp.endsWith("/") ? tmp : tmp + "/";
    this.rootPath = tmp;
  },
  
  /**
   * Append a parameter to the current root path
   * @param param to append to root path
   */        
  appendParameter: function(param)
  {
    //Ensure the root path is formatted correctly, just in case someone sets root path
    //without using the setter
    this.setRootPath(this.rootPath);
    this.rootPath += param;
  }

});
