/* eslint no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { PlotDataPoint } from './PlotData.js'

/////////////////////////////////////////////////////////////////////////
// Application should provide a custom implementation of LiveDataFeed
// to query real-time data from a custom data source.
/////////////////////////////////////////////////////////////////////////
export function LiveDataFeed( /*GlgComboChart*/ parent )
{
    this.Parent = parent;

    // Initialize datafeed as needed.
    this.Initialize();
}

//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.Initialize = function()
{
    // Place custom initialization code here.
}

//////////////////////////////////////////////////////////////////////////
// Cleanup to close any open data connections.
//////////////////////////////////////////////////////////////////////////   
LiveDataFeed.prototype.Cleanup = function()
{
   // Place custom cleanup code here.
}

//////////////////////////////////////////////////////////////////////////
// This method is invoked when the chart configuration changes. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ClearDataFeed = function()
{
   // Place custom code here.
}

//////////////////////////////////////////////////////////////////////////
// Query new data values. 
// tag_list:
//    An array of Objects {tag: tag}, indicating the tags of interest.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array containing
//    an array of objects with the following properties:
//    new_data[i].tag
//    new_data[i].value
//    new_data[i].time_stamp
//    new_data[i].value_valid
// user_data:
//    User data to be passed to the data_callback.
// 
// GLG LoadAsset function can be used to invoke the provided URL, and 
// upon completion, the specified data_callback will be invoked with 
// new_data formed from the URL response. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ReadData = function( tag_list, data_callback, user_data )
{
    /* Create a JSON object from the provided tag_list and pass it to
       the server to query real-time data. 
    */
    let tag_list_JSON = JSON.stringify( tag_list );

    // Build a custom URL as needed, passing tag_list_JSON.
    let data_url = "http://myserver/pathname?action=read&tags=" + tag_list_JSON;

    /* Issue a request to get new data. 
      
       GLG LoadAsset method can be used to issue an HTTP request of a 
       specified type, such as JSON. For example:
         GLG.LoadAsset( data_url, glg.GlgHTTPRequestResponseType.JSON, 
                        data_callback, user_data );

       data_callback will be invoked when the data has been received.
       The http response should return new_data array in JSON format as an
       array of objects of type DataRecord containing the following properties:
       {tag,data_array}, where data_array is an array of PlotDataPoint objects.

       If GLG LoadAsset API is not used to open a data url, the application 
       may use a custom method to query data, create new_data array and 
       invoke data_callback explicitly.
       For example: 
           new_data.push(new DataRecord(tag, data_array) );
           ...
           data_callback( new_data, user_data );

       Refer to DemoDataFeed.GetDemoData() for more details.
    */
}

/////////////////////////////////////////////////////////////////////// 
// Get historical data for the plot with a specified tag.
/////////////////////////////////////////////////////////////////////// 
LiveDataFeed.prototype.GetHistPlotData = /* DataRecord[] */
    function ( /*PlotInfo*/ plot_info, /*double*/ start_time, 
               /*double*/ end_time, /*callback*/ data_callback,
               /*user data*/ user_data)
{
    /* Place custom application code here to obtain historical
       data. Build data_array[] with PlotDataPoint objects and
       invoke data_callback.
    */

    /* EXAMPLE
    let data_array = [];
    for( let i=0; i<num_samples; ++i )
    {
       let value =
       let time_stamp =
       let value_valid = this.IsValid( plot_info.tag, value );

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
    function( /*String*/ tag_source, /*double*/ value )
{
    let result = true;

    /* Place custom application code here to validate the value of
       type double.
    */

    return result;
}
