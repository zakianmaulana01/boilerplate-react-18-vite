/////////////////////////////////////////////////////////////////////////
// DemoDataFeed provides simulated data for demo.
// In an application, data will be coming from LiveDataFeed.
//////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { AppLog } from './Utils.js'
import { PlotDataPoint, DataRecord } from './PlotData.js'

/* If SUPPLY_TIME_STAMP=true, BATCH_DATA_PROCESSING may be set to true
   to push data samples in packets.
*/
const BATCH_DATA_PROCESSING = false;
const PACKET_SIZE = 10;

//////////////////////////////////////////////////////////////////////////
export function DemoDataFeed( /*GlgComboChart*/ parent )
{
   this.Parent = parent;
   
   // Initialize datafeed as needed.
   this.Initialize();
   
   // Used to generate simulated demo data.
   this.counters = null;   /* long[] */
   this.chart_index = 0;
   
   this.packet_size = 1;                  /* int */
   if( BATCH_DATA_PROCESSING )
   {
      if( this.Parent.SupplyTimeStamp )
        this.packet_size = PACKET_SIZE;
      else
        AppLog( "Resetting BATCH_DATA_PROCESSING due to SUPPLY_TIME_STAMP=false" );
   }
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.Initialize = function()
{
   // Do nothing for the simulated data. For the live data,
   // provide a custom implementation of this method in LiveDataFeed.
}

//////////////////////////////////////////////////////////////////////////
// Cleanup to close any open data connections.
//////////////////////////////////////////////////////////////////////////   
DemoDataFeed.prototype.Cleanup = function()
{
   // Do nothing for the simulated data. For the live data,
   // provide a custom implementation of this method in LiveDataFeed.
}

//////////////////////////////////////////////////////////////////////////
// This method is invoked when the chart configuration changes. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ClearDataFeed = function()
{
   this.counters = null;
   this.chart_index = 0;
}
     
//////////////////////////////////////////////////////////////////////////
// Query new data values. 
// tag_list:
//    An array of Objects {tag: tag}, indicating the tags of interest.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array containing
//    an array of objects of type DataRecord.
// user_data:
//    User data to be passed to the data_callback.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ReadData = function( tag_list, data_callback, user_data )
{
   /* Create a JSON object from tag_list to be sent to the server.
      For demo purposes, the new data values are generated in
      memory in JSON format.
   */
   let tag_list_JSON = JSON.stringify( tag_list );
   
   //  Generate random data values in memory.
   this.GetDemoData( tag_list_JSON, data_callback, user_data );
}

//////////////////////////////////////////////////////////////////////////
// Check if the value is valid for this datasample. The value must be a double. 
// For demo purposes, the function always returns true. 
// The application should provide a custom  implementation of this method 
// in LiveDataFeed. If the function returns false, the plot's ValidEntryPoint 
// will be 0 and the plot will have a hole for this datasample.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.IsValid = /* bool */
  function( /*String*/ tag, /*double*/ value )
{
   return true;
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
   let new_data = [];    /* DataRecord[] */
   let
     value,
     time_stamp;
    
   for( let i=0; i<tag_list.length; ++i )
   {
      let data_array = [];
      for( let sample_num = 0; sample_num < this.packet_size; ++sample_num )
      {
         /* Generate demo data for each data sample. */
         value = this.GetDemoValue( tag_list[i].tag, /*realtime mode*/ false );
         
         if( this.Parent.SupplyTimeStamp )
           // Supply time stamp explicitly.
           time_stamp = this.GetTimeStamp( sample_num );
         else
           // Chart will automatically supply time stamp using current time.
           time_stamp = null;
          
         let value_valid = this.IsValid( tag_list[i].tag, value );
         
         let data_point = new PlotDataPoint( value, time_stamp, value_valid );
         data_array.push( data_point );
      }

      this.chart_index = i;
       
      // Add new data record for this tag to the new_data array.
      new_data.push( new DataRecord( tag_list[i].tag, data_array ) );
   }
    
   // Invoke the callback with new_data.
   data_callback( new_data, user_data );
}

/////////////////////////////////////////////////////////////////////// 
// Get historical data for the plot with a specified tag.
/////////////////////////////////////////////////////////////////////// 
DemoDataFeed.prototype.GetHistPlotData = /* DataRecord[] */
  function( /*PlotInfo*/ plot_info, /*double*/ start_time,
            /*double*/ end_time, /*callback*/ data_callback,
            /*user data*/ user_data )
{
   /* Demo: generate pre-fill demo data with the reduced frequency.
      In an application, data will be queried from a real data source, 
      returning an array of data points.
   */
   let dt = this.Parent.GetSampleInterval();  /* double */

   let data_array = [];   /* PlotDataPoint[] */        
   for( let time_stamp = start_time;
        time_stamp < end_time; time_stamp += dt )
   {
      /* Generate demo data. */
      let value = this.GetDemoValue( plot_info.tag, /*historical*/ true );
      
      let data_point = new PlotDataPoint( value, time_stamp, /*valid*/ true );
      data_array.push( data_point );
   }

   ++this.chart_index;
   
   // All charts are prefilled - reset chart_index.
   if( this.chart_index >= this.Parent.NumCharts )
     this.chart_index = 0;
   
   /* Invoke data callback, passing data_array containing obtained historical
      data samples for a given tag.
   */
   data_callback( data_array, user_data );
}

//////////////////////////////////////////////////////////////////////////
// Generate a simulated numerical data value based on the variable name
// defined by tag_source.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetDemoValue =    /* double */
  function( /*String*/ tag, /*bool*/ historical_mode )
{
   let  /* double */
      period = 100.0,
      low = 0.0,
      high = 100.0;

   if( this.counters == null )
   {
      this.counters = new Array( this.Parent.NumCharts ).fill( 0 ); /* long[] */
      this.chart_index = 0;
   }
   
   if( tag.search( "Volt" ) >= 0 )
   {
      low = 0.;
      high = 500.;
      period = 300.0;
   }
   else if( tag.search( "Amp" ) >= 0 )
   {
      low = 0.;
      high = 50.;
      period = 500.0;
   }
   else if( tag.search( "Pressure" ) >= 0 )
   {
      low = 0.;
      high = 100.;
      period = 200.0;
   }
   else if( tag.search( "Temperature" ) >= 0 )
   {
      low = 0.;
      high = 100.;
      period = 300.0;
   }
   else if( tag.search( "RPM" ) >= 0 )
   {
      low = 0.;
      high = 3000.;
      period = 500.0;
   }
   else if( tag.search( "Fuel" ) >= 0 )
   {
      low = 0.;
      high = 100.;
      period = 200.0;
   }
   else
   {
      low = 0.;
      high = 100.;
      period = 100.0;
   }
   
   let half_amplitude = ( high - low ) / 2.0;
   let center = low + half_amplitude;
   let alpha = 2.0 * Math.PI * this.counters[this.chart_index] / period;
   let value = center + half_amplitude *
     Math.sin( alpha ) * Math.sin( alpha / 30.0 + 0.7 * Math.PI );
    
   if( historical_mode )
     this.counters[this.chart_index] += this.packet_size;
   else
     ++this.counters[this.chart_index];
    
   return value;
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetTimeStamp =  /* double */
  function( /*int*/ sample_num )
{
   if( this.packet_size == 1 )
     return this.Parent.CurrentTime;
   
   /* Demo only: Generate a demo time stamp in batch data processing mode. 
      A real application will provide a real time stamp for each data sample.
   */      
   let last_time_stamp = this.Parent.LastTime;  /* double */
   let curr_time = this.Parent.CurrentTime;     /* double */
   
   let interval =  /* double */
     ( curr_time - last_time_stamp ) / this.packet_size; 
   let time_stamp =  /* double */ 
     last_time_stamp + interval * ( sample_num + 1 );
      
   return time_stamp;
}
