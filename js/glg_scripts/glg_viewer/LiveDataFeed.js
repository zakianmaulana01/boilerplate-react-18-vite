/* eslint no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG } from './Utils.js'
import { PlotDataPoint } from './PlotData.js'
import { AlarmRecord } from './GlgAlarms.js'

/////////////////////////////////////////////////////////////////////////
// Application should provide a custom implementation of LiveDataFeed
// to query real-time data from a custom data source.
/////////////////////////////////////////////////////////////////////////

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
// Query new data values. 
// Parameters:
// tag_list:
//    An array of GlgTagRecord objects containing information about all
//    data tags in the drawing. The tag_source field of each tag defines
//    the data source variable and will be passed to the server to indicate
//    which tags to obtain new data values for.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array received from
//    the back-end.
// user_data:
//    User data to be passed to the data_callback.
// 
// GLG LoadAsset function can be used to invoke the provided URL, and 
// upon completion, the specified data_callback will be invoked with 
// new_data formed from the URL response.
//
// LiveDataFeed.ProcessRawData() function should be implemented to process
// the data supplied in a custom format and generate new data array as
// an array of objects with the following properties:
// {tag_source:, value:, time_stamp}.
/////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ReadData = function( tag_list, data_callback, user_data )
{
   /* Create a JSON object from the provided tag_list using only the following
      properties: tag_source, data_type.
      It will be passed to the server to query real-time data for the tags 
      of interest.
   */
   let tag_list_JSON =
   JSON.stringify( tag_list, [ "tag_source", "data_type" ] );

   // Build a custom URL as needed, passing tag_list_JSON.
   let data_url = "http://myserver/pathname?action=read&tags=" + tag_list_JSON;

   /* Issue http request to get new data. 
      GLG LoadAsset method can be used to issue the request of a 
      specified type and invoke data_callback when the data has been received,
      for example:

        GLG.LoadAsset( data_url, glg.GlgHTTPRequestResponseType.JSON, 
                       data_callback, user_data );

      If LoadAsset is not used, the application should issue an HTTP request
      and invoke data_callback with the received data and user_data.

      The received data should contain new_data JSON object containing an array 
      of objects with the following properties:
      { tag_source, value, time_stamp }. 

      If a custom data format is used, LiveDataFeed.ProcessRawData() needs 
      to be implemented to process received data using application specific 
      data format.
   */
}

////////////////////////////////////////////////////////////////////////////
// Process raw data based on a custom data format and return new data array
// as GlgDataRecord[], as it is expected by GlgViewer.PushData() which
// pushes new data to graphics.
////////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ProcessRawData =
  function ( raw_data )             /* [ {tag_source, value, time_stamp} ] */
{
   /* Provide a custom implementation to massage raw data based on
      a custom application-specific format. 
      Refer to DemoDataFeed.ProcessRawData() and DemoDataFile.json
      for an example of handling custom data format.
   */

    let new_data = [];  /* [ {tag_source, value, time_stamp} ] */
    
    /*** Example 
    let
      tag_source,
      value,
      time_stamp;
   
    for( let i=0; i<num_raw_data_items; ++i )
    {
       // Extract element properties from raw_data[i]
       tag_source = ...
       value = ...
       time_stamp = ..

       new_data.push( { tag_source: tag_source, value: value,
                        time_stamp: time_stamp } );
     }    
     ****/

    return new_data;
}

//////////////////////////////////////////////////////////////////////////
// Write numerical value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.WriteDValue = 
  function ( /*String*/ tag_source, /*double*/ value )
{
   if( this.Viewer.IsUndefined( tag_source ) )
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
   if( this.Viewer.IsUndefined( tag_source ) )
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
LiveDataFeed.prototype.ACKAlarm = /*boolean*/
  function( /*String*/ tag_source )
{
   let result = false;

   // Write a new value to the back end system to acknowledge an alarm.
   // result = 
   
   return result;
} 

/////////////////////////////////////////////////////////////////////// 
// Get historical data for the plot with a specified tag.
/////////////////////////////////////////////////////////////////////// 
LiveDataFeed.prototype.GetPlotData = /* PlotDataPoint[] */
  function( /*String*/ tag_source, /*double*/ start_time, 
            /*double*/ end_time, /*int*/ max_num_samples,
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

         let data_point = new PlotDataPoint( value, time_stamp, value_valid );
         data_array.push( data_point );
      }

      data_callback( data_array, user_data );
   */
}

//////////////////////////////////////////////////////////////////////////
// If the incoming value is used in a chart's plot, check if the value
// is valid for this datasample. If the function returns false, 
// the plot will have a hole for this datasample (plot's ValidEntryPoint=0).
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.IsValid = /* bool */ 
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
