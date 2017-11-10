
# HP BSM Operations Manager i (OMi) 10
With the xMatters and HP OMi integration, the appropriate technician can be notified directly via voice, email, SMS or pager. Information about the failure will be presented to the recipient and decisions can be made in real-time.

Once a response is submitted using the recipient’s device, xMatters will update the HP OMi event in real-time. The benefit is that this process is immediate – significantly faster than the time required for staff to notice the failures or malfunctions, determine who is on call, and manually notify the right person. In addition, the ability to take simple actions on the event from any device gives the event resolver a quick way to deal with many issues and communicate to other team members the current state of the event.

During the process, every notification, response, and action is logged in xMatters. In addition, xMatters automatically annotates the original event with status information.

The xMatters product features a self-service web user interface to allow accurate assignment of responsible personnel for each job. xMatters also includes a Subscription panel that allows both managed and self-subscription to HP OMi events. 

<kbd>
  <img src="https://github.com/xmatters/xMatters-Labs/raw/master/media/disclaimer.png">
</kbd>

# Pre-Requisites
* xMatters account - If you don't have one, [get one](https://www.xmatters.com)!
* xMatters integration agent 5.1.8 - Download and documentation [here](https://support.xmatters.com/hc/en-us/articles/201463419-Integration-Agent-for-xMatters-5-x-xMatters-On-Demand). **NOTE** The agent must be on a separate box from OMi!! 
* HP OMi (Tested with OMi 10)


# Files
* [xM_HP_OMi_3_0_1.zip](xM_HP_OMi_3_0_1.zip) - Zip file containing all necessary files: Comm Plan and Integration Agent files.
* [xm-hp-omi-v30.pdf](xm-hp-omi-v30.pdf) - Documentation pdf for all installation steps. 

# How it works
A connected server is configured in OMi and pointed to the Integration Agent. **NOTE** The agent must be on a separate box from OMi!! The OMi will give an "Invalid DNS" error when trying to configure the connected server. Events that pass the Event Filter in OMi are sent to the agent which then queries for more details from OMi. The request is then sent to the Integration Builder, which creates the event. Notification recipients can respond and these responses are sent back to the IA for updates to the source event in OMi. 

# Installation
For installation details, see the [xm-hp-omi-v30.pdf](xm-hp-omi-v30.pdf) file. Note that in section 2.1.5, the `XMATTERS_FORM` and `XMATTERS_FYI_FORM` variables should point to the `Inbound to the HPOMi form` and `Inbound to the HPOMi form` Inbound Integration script respectively. 

# Testing
Trigger an event in OMi that will make it through the event filter. This will generate an event in xMatters and notify the user in the `assigned_user_login_name` field, or if that is not populated, will notify the group in the `assigned_group_name` field. 

# Troubleshooting

If events are not making it to users:

1. Check the Integration Agent log `IAHOME/log/AlarmPoint.txt` to make sure OMi is actually attempting to send the event to the agent. 
2. Check the activity stream for the `Inbound to the HPOMi form` (or `Inbound to the HPOMi-fyi form`) inbound integration service and check for errors. 
3. Check the event log for any errors

If responses are not effecting changes in OMi:

1. Check the Integration Agent log `IAHOME/log/AlarmPoint.txt` for any errors.
