/////////////////////////////////////////////////////////////////////////
// Application should provide a custom implementation of LiveDataFeed
// to query real-time data from a custom data source.
/////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

// Global handle to the GLG Toolkit library.
let GLG = null;

/////////////////////////////////////////////////////////////////////////
export function LiveDataFeed( glg_handle, glg_viewer )
{
   GLG = glg_handle;
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
//    The callback should be invoked with the new_data array containing
//    an array of elements as a (key, value) pair, where key=tag_source.
// user_data:
//    User data to be passed to the data_callback.
// 
// GLG LoadAsset function can be used to invoke the provided URL, and 
// upon completion, the specified data_callback will be invoked with 
// new_data formed from the URL response. 
//////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ReadData = function( tag_list, data_callback, user_data )
{
   /* Create a JSON object from the provided tag_list using only the 
      tag_source property. It will be passed to the server to query real-time
      data for the tags of interest.
   */
   let tag_list_JSON = JSON.stringify( tag_list, [ "tag_source" ] );

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

      The received data should contain new_data JSON object containing a list
      of elements as {key,value}, where key=tag_source, and element value 
      is a data value for that tag. 
      Refer to the DemoDataFile.json for an example.
   */
}

////////////////////////////////////////////////////////////////////////////
// If needed, process raw data based on a custom data format and 
// return new_data as a list of {key,value} pairs.
// Example: DemoDataFile.json.
////////////////////////////////////////////////////////////////////////////
LiveDataFeed.prototype.ProcessRawData =
  function ( raw_data )             /* a list of { "tag_source": value } */
{
   /* If raw_data is provided in a format expected by 
      GlgSimpleViewer.PushData(), return raw_data as is. 
      Otherwise, process the data and return a new list as as list of 
      {key,value}, where key=tag_source.
      Example: DemoDataFeed.GetDemoData().
   */

    /**** Example:
    let new_data = {};
    let tag_source, value;
    for( let i=0; i<num_raw_data_elem; ++i )
    {
       tag_source = ... 
       value = ...
    
      // Add new element to the new_data list, using key=tag_source. 
      new_data[tag_source] = value;
   }
   return new_data;
   ****/
    
   return raw_data;
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
LiveDataFeed.prototype.WriteSValue = function ( tag_source, value )
{
   if( this.Viewer.IsUndefined( tag_source ) )
     return;
   
   // Place code here to write a string value to the specified tag.
}
