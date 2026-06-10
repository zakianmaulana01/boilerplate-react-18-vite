/* eslint no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined } from './Utils.js'
import { AlarmRecord } from './GlgAlarms.js'
import * as Data from './DataStructures.js'

/////////////////////////////////////////////////////////////////////////
// Application should provide a custom implementation of LiveDataFeed
// to query real-time data from a custom data source.
/////////////////////////////////////////////////////////////////////////

export function LiveDataFeed( glg_viewer )
{
   this.Viewer = glg_viewer;

   // Initialize datafeed as needed.
   this.Initialize();
}

//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.Initialize = function()
{
   // Place custom initialization code here.
}

//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.Cleanup = function()
{
   // Place custom cleanup code here.
}

//////////////////////////////////////////////////////////////////////////
// Obtain user Role based on login credentials.
// Returns:
//  - ADMINISTRATOR_ROLE to allow Control of the process from the GUI,
//    including adjusting values, open/close a valve or a pump, etc.
//  - USER_ROLE to disable equipment control from the GUI.
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.GetUserRole = function() /* int */
{
   // Place custom application code here to obtain user Role. 
   // return Data.USER_ROLE;
   return Data.ADMINISTRATOR_ROLE;
}

//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.VerifyPassword =
  function( /*int*/ user_role, /*String*/ pwd, data_callback )
{
   /* let is_valid = ...
      data_callback( is_valid );
   */
}

//////////////////////////////////////////////////////////////////////////
// Query new data values. 
// Parameters:
// tag_list:
//    An array of objects with the following properties:
//      tag_source - tag source as stored in the drawing, 
//      data_type  - tag data type, for example GLG.GlgDataType.D,
//                   GLG.GlgDataType.S, GLG.GlgDataType.G.
//    The tag_list can be passed to the server to indicate which tags to obtain 
//    new data values for.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array received from
//    the back-end.
// user_data:
//    To be passed to data_callback.
// Example:
//    data_callback( new_data, user_data );
//
// GLG LoadAsset function can be used to invoke the provided URL, and 
// upon completion, the specified data_callback will be invoked with 
// new_data formed from the URL response.
//
// LiveDataFeed.ProcessRawData() function should be implemented to process
// the data supplied in a custom format and generate new data array as
// Data.GlgDataRecord[], which is expected by GlgViewer.PushData().
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.RequestData =
    function( tag_list, data_callback, user_data )
{
   /* Create a JSON object from tag_list to be sent to the server, using
      only the following properties: "tag_source", "data_type".
      For demo purposes, the new data values are generated in memory 
      in JSON format. 
   */
   let tag_list_JSON =
     JSON.stringify( tag_list, [ "tag_source", "data_type" ] );

   // Build a custom URL as needed, passing tag_list_JSON.
   let data_url = "http://myserver/pathname?action=read&tags=" + tag_list_JSON;

   /* Issue http request to get new data. 
       
      GLG LoadAsset method can be used to issue an HTTP request of a 
      specified type, such as JSON. For example:

        GLG.LoadAsset( data_url, glg.GlgHTTPRequestResponseType.JSON, 
                       data_callback, user_data );

      data_callback will be invoked when the data has been received.
      The http response should return new_data array in JSON format.

      LiveDataFeed.ProcessRawData() needs to be implemented to process
      received data using application specific data format as needed.

      If GLG LoadAsset API is not used to open a data url, the application 
      may use a custom method to query data, create new_data array and invoke
      data_callback explicitly.
      For example:

          new_data.push( new Data.GlgDataRecord( tag_source, value, 
                                            time_stamp, value_valid ) );
          ...
          data_callback( new_data, user_data );

      Refer to DemoDataFeed.GetDemoData() for more details.
   */
}

////////////////////////////////////////////////////////////////////////////
// Process raw data based on a custom data format and return new data array
// as GlgDataRecord[], as it is expected by GlgViewer.PushData() which
// pushes new data to graphics.
////////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ProcessRawData =
  function ( raw_data )             /* Data.GlgDataRecord[] */
{
   /* Provide a custom implementation to massage raw data based on
      a custom application-specific format. 
      Refer to DemoDataFeed.ProcessRawData() and DemoDataFile.json
      for an example of handling custom data format.
   */

    let new_data = [];  /* Data.GlgDataRecord[] */
    /*** Example 
    let
      tag_source,
      value,
      time_stamp,
      value_valid,
      data_type;

    for( let i=0; i<num_raw_data_items; ++i )
    {
       // Extract element properties from raw_data[i]
       tag_source = ...
       value = ...
       time_stamp = ..
       value_valid = true;  -- use default, unless supplied by raw_data
       data_type = null;    -- can use unknown data type, it will be
                              automatically handled by GlgViewer.PushData().
       new_data.push(
            new Data.GlgDataRecord( tag_source, data_type
                                    value, time_stamp, value_valid ) );
      }    
     ****/

    return new_data;
}

////////////////////////////////////////////////////////////////////////////
// Return all data samples in the specified time interval (historical mode).
// The max_num_samples parameter may be used to limit the maximum
// number of data samples to be queried.
////////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.RequestPlotData =
  function( /*String[]*/ plot_tag_list,
            /*double*/ start_time, /*double*/ end_time,
            /*int*/ max_num_samples, /*boolean*/ historical,
            /*callback*/ data_callback, user_data )   /*boolean*/
{
   let tag_list_JSON = JSON.stringify( plot_tag_list );

   /***
   // Build a custom URL, passing needed arguments.
   let data_url = "http://myserver/pathname?action=chart_data&tags=" +
       tag_list_JSON + "&start_time=" + start_time + "&end_time=" + end_time +
       "&historical=" + historical;
    
   if( max_samples > 0 )
     data_url += ("&max_samples=" + max_samples);

   Open data_url and invoke data_callback when the data are received:

   data_callback( new_data, user_data). 

   new_data is expected to be PlotDataPoint[] array. If the data are 
   returned from the server in a different format, implement 
   LiveDataFeed.ProcessRawChartData to return PlotDataPoint[] array.
   Data types are defined in DataStructures.js.
   ***/

   return true;
}

////////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ProcessRawChartData = /* PlotDataPoint[] */
    function( raw_chart_data )
{
   /* If the application receives chart data in a format different from
      PlotDataPoint[], add code to process raw_chart_data and return 
      PlotdataPoint[] array. 
   */
   return raw_chart_data;
}

//////////////////////////////////////////////////////////////////////////
// Write numerical value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.WriteDValue =
  function ( /*String*/ tag_source, /*double*/ value )
{
   if( IsUndefined( tag_source ) )
     return;
   
   /* Example:

      let tag_JSON = JSON.stringify( { tag_source: tag_source, value: value } );
      let data_url = "http://myserver/pathname?action=write&tag=" + tag_JSON;
       
      // Place code here to issue http request.
    */
}

//////////////////////////////////////////////////////////////////////////
// Write string value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.WriteSValue =
  function ( /*String*/ tag_source, /*String*/ value )
{
   if( IsUndefined( tag_source ) )
     return;

   // Place code here to write a string value to the specified tag.
}

//////////////////////////////////////////////////////////////////////////
// Place custom code here to build alarm_list, each item is an AlarmRecord.
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.GetAlarms = function( alarm_callback, user_data )
{
   // Create a new list of alarms to be returned.
   let alarm_list = [];   /* AlarmRecord[] */
    
   /*
   let num_active_alarms = .. 
   for( let i=0; i<num_active_alarms; ++i )
   {
      let alarm = new AlarmRecord();
      alarm.time = alarm_time;
      alarm.tag_source = 
      alarm.description = 
      alarm.string_value = 
      alarm.double_value = 
      alarm.status = 
      alarm.ack = false;
      alarm_list.push( alarm );
   }
   */    

   // Invoke the callback with new alrm list.
   alarm_callback( alarm_list );
} 

//////////////////////////////////////////////////////////////////////////
// Plcae custom code to process alarm acknowledgement for a specified
// tag source.
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ACKAlarm = function( /*String*/ tag_source ) /*boolean*/
{
   let result = false;
   
   // Write a new value to the back end system to acknowledge an alarm.
   // result = 
   
   return result;
}

///////////////////////////////////////////////////////////////////////
// Get alarm setpoints for a specified data point id from the back-end.
// Invoke user provided data_callback with AlarmSPInfo object.
///////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.GetAlarmSPInfo =
  function( /*data id*/ data_id, data_callback, user_data )
{
   if( data_id == null )
     return;

   /* Place custom code here to obtain alarm setpoints. */
   
   /*
   let alarm_sp_info = ...
    
   // Invoke the callback with new_data.
   data_callback( alarm_sp_info, user_data );
   */
}

/////////////////////////////////////////////////////////////////////// 
// Get historical data for one plot with a specified tag source.
/////////////////////////////////////////////////////////////////////// 
LiveDataFeed.prototype.GetPlotData = /* PlotDataPoint[] */
  function ( /*String*/ tag_source, /*double*/ start_time, 
             /*double*/ end_time, /*int*/ max_num_samples,
             /*boolean*/ historical,
             /*callback*/ data_callback, /*user data*/ user_data)
{
   /* Place custom application code here to obtain historical
      data. Build data_array[] with PlotDataPoint objects and
      invoke data_callback.
   */
   
   /* EXAMPLE
   let data_array = [];
   for( let i=0; i<num_samples; ++i )
   {
      let value = ...
      let time_stamp = ...
      let value_valid = ...
      let data_point = new Data.PlotDataPoint( value, time_stamp, value_valid );
      data_array.push( data_point );
   }
   data_callback( data_array, user_data );
   */
}

//////////////////////////////////////////////////////////////////////////
// Check if the value is valid for a specified tag_source.
// The value must be a double.
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.IsValid = /* boolean */ 
  function( /*String*/ tag_source, /*int*/ data_type, value )
{
   let result = false;
   switch( data_type )
   {
    case GLG.GlgDataType.D: 
      result = true;
      break;
    default: break;
   } 
   
   return result;
}
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.IsValid = /* boolean */ 
  function( /*String*/ tag_source, /*int*/ data_type, value )
{
   let result = false;
   switch( data_type )
   {
    case GLG.GlgDataType.D: 
      /* Place custom application code here to validate the value of
         type double.
      */
      result = true;
      break;
      
    default: break;
   } 

   return result;
}

