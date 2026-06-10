/////////////////////////////////////////////////////////////////////////
// DemoDataFeed provides simulated data for demo, as well as for testing 
// with no LiveDataFeed.
// In an application, data will be coming from LiveDataFeed.
//////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import * as Utils from './Utils.js'

/* Set to true to use demo data file in JSON format.
   Set to false to generate demo data in memory.
*/
let USE_DEMO_DATA_FILE = false;

// Demo data file to be used for testing JSON format for tags_example.g.
let DEMO_DATA_FILE_JSON = "DemoDataFile.json"; 

// Global handle to the GLG Toolkit library.
let GLG = null;

//////////////////////////////////////////////////////////////////////////
export function DemoDataFeed( glg_handle, glg_viewer )
{
   GLG = glg_handle;
   this.Viewer = glg_viewer;
    
   // Initialize datafeed as needed.
   this.Initialize();
   
   // Used to generate simulated demo data.
   this.counter = 0;
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.Initialize = function()
{
   // Do nothing for the simulated data. For the live data,
   // provide a custom implementation of this method in LiveDataFeed.
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.Cleanup = function()
{
   // Do nothing for the simulated data. For the live data,
   // provide a custom implementation of this method in LiveDataFeed.
}

//////////////////////////////////////////////////////////////////////////
// Query new data values. 
// Parameters:
// tag_list:
//    An array of strings representing tag sources in the drawing, 
//    can be passed to the server to indicate which tags to obtain 
//    new data values for.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array containing
//    an array of elements as a (key, value) pair, where key=tag_source.
// user_data:
//    User data to be passed to the data_callback.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ReadData = function( tag_list, data_callback, user_data )
{
   if( USE_DEMO_DATA_FILE )
   {
      // Get data from a URL (file is used for demo).

      let base = window.location.href;
      let filepath = this.Viewer.GetFullName( DEMO_DATA_FILE_JSON );

      let data_file_url = new URL( filepath, base );
      GLG.LoadAsset( data_file_url.toString(), 
                     GLG.GlgHTTPRequestResponseType.JSON, 
                     data_callback, user_data );
   }
   else
   {
      /* Create a JSON object from tag_list to be sent to the server.
         For demo purposes, the new data values are generated in
         memory in JSON format.
      */
      let tag_list_JSON = JSON.stringify( tag_list, [ "tag_source" ] );
        
      //  Generate random data values in memory.
      this.GetDemoData( tag_list_JSON, data_callback, user_data  );
   }
}

////////////////////////////////////////////////////////////////////////////
// If needed, process raw data based on a custom data format and 
// return new_data as a list of {key,value} pairs.
// Example: DemoDataFile.json.
////////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ProcessRawData =
  function ( raw_data )             /* a list of { "tag_source": value } */
{
   /* No processing is needed for simulated data -- raw_data is already 
      generated in the expected format by GetDemoData.
   */
   return raw_data;
}

//////////////////////////////////////////////////////////////////////////
// Write numerical value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.WriteDValue = function ( tag_source, value )
{
   if( Utils.IsUndefined( tag_source ) )
     return;

   // DEMO only: Set value for a specified tag in the currently loaded drawing.
   this.Viewer.Viewport.SetDTag( tag_source, value );
}

//////////////////////////////////////////////////////////////////////////
// Write string value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.WriteSValue = function ( tag_source, value )
{
   if( Utils.IsUndefined( tag_source ) )
     return;

   // DEMO only: Set value for a specified tag in the currently loaded drawing.
   this.Viewer.Viewport.SetSTag( tag_source, value );
}

//////////////////////////////////////////////////////////////////////////
// Generate simulated demo data for all tags listed in tag_list_JSON.
// Simulates the http response the application will create
// using custom http request for data acquisition.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetDemoData = 
  function( tag_list_JSON, data_callback, user_data )
{
   let tag_list = JSON.parse( tag_list_JSON );
   let new_data = {};
   let tag_source, value;

   for( let i=0; i<tag_list.length; ++i )
   {
      tag_source = tag_list[i].tag_source;
      
      // DEMO only: don't push new data to tags with TagSource="State". 
      if( tag_source == "State" )
        continue;

      // Obtain new data value for a specified tag_source.
      value = this.GetDemoValue( tag_source );
    
      // Add new element to the new_data array, using key=tag_source. 
      new_data[tag_source] = value;
   }

   // Invoke the callback with new_data.
   data_callback( new_data, user_data );
}

//////////////////////////////////////////////////////////////////////////
// Generate a simulated numerical data value. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetDemoValue = function( tag_source )
{
   let low = 0.0;
   let high = 100.0;
   let period = 500;
   let half_amplitude = ( high - low ) / 2.0;
   let center = low + half_amplitude;
   let alpha = 2.0 * Math.PI * this.counter / period;
   
   let value = center +
               half_amplitude * Math.sin( alpha ) * Math.sin( alpha / 30.0 );
   
   this.counter++;
   return value;
}

