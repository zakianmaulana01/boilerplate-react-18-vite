/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined, GetCurrTime, AppError, AppLog } from './Utils.js'
import { AlarmRecord } from './GlgAlarms.js'
import * as Data from './DataStructures.js'

/////////////////////////////////////////////////////////////////////////
// DemoDataFeed provides simulated data for demo, as well as for testing
// with no LiveDataFeed. In an application, data will be coming from
// LiveDataFeed.
//////////////////////////////////////////////////////////////////////////

let DemoAlarmSPData = {

   /* Temperature, units: C */
    /*ID*/ "TE-E1": new AlarmSPInfo( "TE-E1", /*low*/ 0., /*high*/ 100.,
                                    /*low_sp*/ 15., /*high_sp*/ 90.,
                                    /*has_low_sp*/ true, /*has_high_sp*/ true ),
   "EOT-1": new AlarmSPInfo( "EOT-1", 0., 100., null, 90., false, true ),
   "WT-B1": new AlarmSPInfo( "WT-B1", 0., 100., 20., 80., true, true ),
   "WT-B2": new AlarmSPInfo( "WT-B2", 0., 100., 20., 80., true, true ),
   "WT-B3": new AlarmSPInfo( "WT-B3", 0., 100., 20., 80., true, true ),
   "WT-W1": new AlarmSPInfo( "WT-W1", 0., 100., 20., 80., true, true ),
   "WT-E1": new AlarmSPInfo( "WT-E1", 0., 100., 20., 80., true, true ),
   "WT-E2": new AlarmSPInfo( "WT-E2", 0., 100., 20., 80., true, true ),
   "WT-F4": new AlarmSPInfo( "WT-F4", 0., 100., 20., 80., true, true ),

   /* Pressure, units: bar */
   "PE-E1": new AlarmSPInfo( "PE-E1", 0., 50., 5., 45., true, true ),
   "THP-1": new AlarmSPInfo( "THP-1", 0., 50., 5., 45., true, true ),
   "BAP-1": new AlarmSPInfo( "BAP-1", 0., 50., 5., 45., true, true ),
   "SP-B1": new AlarmSPInfo( "SP-B1", 0., 50., 5., 45., true, true ),
   "WP-B1": new AlarmSPInfo( "WP-B1", 0., 50., 5., 45., true, true ),

   /* Level, units: % */
   "FL-E1": new AlarmSPInfo( "FL-E1", 0., 50., 10., null, true, false ),
   "LO-E1": new AlarmSPInfo( "LO-E1", 0., 100., 20., 80., true, true ),
   "WL-B1": new AlarmSPInfo( "WL-B1", 0., 100., 20., 80., true, true ),

   /* Flow, units: kg/h */
   "SF-B1": new AlarmSPInfo( "SF-B1", 0., 100., 20., null, true, false )
};

/* Set to true to use demo data file in JSON format.
   Set to false to generate demo data in memory.
*/
let USE_DEMO_DATA_FILE = false;

/* Demo data file to be used for testing custom JSON format.
   DemoDataFeed.ProcessRawData() provides an example of processing a
   custom data format used in this json file.
*/
let DEMO_DATA_FILE_JSON = "DemoDataFile.json"; 

//////////////////////////////////////////////////////////////////////////
export function DemoDataFeed( glg_viewer )
{
   this.Viewer = glg_viewer;
   
   // Initialize datafeed as needed.
   this.Initialize();
   
   // Used to generate simulated demo data.
   this.counter = 0;
   
   this.FIRST_ALARM_RAISE_THRESHOLD = 0.6;
   this.ALARM_RAISE_THRESHOLD = 0.8;
   
   this.OLD_ACK_ALARM_AGE = 15;
   this.OLD_NON_ACK_ALARM_AGE = 30;
   this.NUM_SIMULATED_ALARMS = 30;
   
   // Keeps a list of active alarms for simulation.
   this.ActiveAlarmList = [];     /* AlarmRecord[] */
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
// Obtain user Role based on login credentials.
// Returns ADMINISTRATOR_ROLE for users with Administrative
// privileges, and USER_ROLE for a non-administrator.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetUserRole = function() /* int */
{
   /* For demo, use Administrator Role that enables the user to to control
      the process from GUI. The application should provide a custom
      implementation of LiveDataFeed.GetUserRole() to return the role
      index based on user login credentials.
   */
   //return Data.USER_ROLE;   
   return Data.ADMINISTRATOR_ROLE;
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.VerifyPassword =
  function( /*int*/ user_role, /*String*/ pwd, data_callback )
{
    /* DEMO ONLY - passwords are hard-coded here. 
       In a real application, the password is sent to the server and verified
       on the server.
    */
    let is_valid = false;
    if( user_role == Data.USER_ROLE ||
        ( user_role == Data.ADMINISTRATOR_ROLE && pwd === "administrator" ) )
        is_valid = true;
 
    data_callback( is_valid );
}

//////////////////////////////////////////////////////////////////////////
// Query new data values. 
// tag_list:
//    An array of objects with the following properties:
//      tag_source - tag source as stored in the drawing, 
//      data_type  - tag data type, for example GLG.GlgDataType.D,
//                   GLG.GlgDataType.S, GLG.GlgDataType.G.
//    The tag_list can be passed to the server to indicate which tags to obtain 
//    new data values for.
// data_callback:
//    The callback function to be invoked when the data query is finished.
//    The callback should be invoked with the new_data array containing
//    an array of objects of type GlgDataRecord with the following properties:
//    { tag_source, data_type, value, time_stamp, value_valid }.
// user_data:
//    User data to be passed to the data_callback.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.RequestData =
  function( /*GlgTagRecord[]*/ tag_list, /*callback*/ data_callback,
            user_data )
{
   if( USE_DEMO_DATA_FILE )
   {
      /* Get data from a URL (file is used for demo).
         The file is expected to be found in the directory of all .g files.
      */
      let filepath = this.Viewer.GetFullName( DEMO_DATA_FILE_JSON );
      let data_file_url = new URL( filepath, window.location.href );

      GLG.LoadAsset( data_file_url.toString(), 
                     GLG.GlgHTTPRequestResponseType.JSON, 
                     data_callback, user_data );
   }
   else
   {
      /* Create a JSON object from tag_list to be sent to the server, using
         only the following properties: "tag_source", "data_type".
         For demo purposes, the new data values are generated in memory 
         in JSON format. 
      */
      let tag_list_JSON =
        JSON.stringify( tag_list, [ "tag_source", "data_type" ] );
      
      //  Generate random data values in memory.
      this.GetDemoData( tag_list_JSON, data_callback, user_data  );
   }
}

////////////////////////////////////////////////////////////////////////////
// Request plot data samples for all tag sources in plot_tag_list.
// This function is invoked on a timer to request real-time data for periodic
// data updates (historical=false), as well as to prefill chart's plots
// with historical data (historical=true).
//
// Parameters:
//  plot_tag_list
//     String[] array with a list of plots tags to request the data for.
//  start_time, end_time
//     Requested time interval (epoch time in sec) for the data samples.
//  max_num_samples
//     maximum number of returned data samples per plot. May be used to
//     limit the maximum number of data samples to be queried.
//  historical
//     If set to false, the function is invoked on a timer to handle periodic
//     data updates. If set to true, it is invoked to prefill chart's plots
//     with historical data.
//  data_callback
//     This callback should be invoked by the application when the data are
//     received.
//  user_data
//     Custom user data to be passed to data_callback.
//
//  new_data are generated as PlotDataPoint[] 
////////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.RequestPlotData =
    function( /*String[]*/ plot_tag_list, /*double*/ start_time,
            /*double*/ end_time, /*int*/ max_num_samples,
            /*boolean*/ historical,
            /*callback*/ data_callback, user_data )   /*boolean*/
{
   /* Create a JSON object from plot_tag_list to be sent to the server:
      let tag_list_JSON = JSON.stringify( plot_tag_list );
      For demo purposes, the new data values are generated in memory 
      in JSON format. In real-time data mode, the application would build 
      a http request to be sent to the back-end to get chart data.
   */
    
   let new_data = [];
   let num_tags = plot_tag_list.length;
   for( let i=0; i<num_tags; ++i )
   {
      /* Generate simulated data for demo. data_callback is invoked at the end
         after generating data for all plots.
         Use JSON format to imitate a scenario in a real application
         where data are returned in JSON format.
      */
      let data_array_JSON =  /* PlotDataPoint[] in JSON format */
        this.GetPlotDemoData( plot_tag_list[i], start_time, end_time,
                              max_num_samples, historical );

      if( data_array_JSON == null )
      {
         AppError( "Failed to receive plot data for tag=" + plot_tag_list[i] );
         continue;
      }

      let data_array = JSON.parse( data_array_JSON );
      let num_samples = data_array.length;
      for( let j=0; j<num_samples; ++j )
        new_data.push( data_array[j] );
   }
    
   // Invoke data callback with data array for all plots.
   data_callback( new_data, user_data );    
   return true;
}

////////////////////////////////////////////////////////////////////////////
// Process raw data based on their custom format.
// Create and return new_data[] array as a list of GlgDataRecord objects.
//
// If simulated data are used, this function is used only if
// USE_DEMO_DATA_FILE_JSON=true, to show an example how to process custom
// data format. An application can provide a custom implementation
// of this function in LiveDataFeed.
////////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ProcessRawData =
  function ( raw_data )             /* GlgDataRecord[] */
{
   /* If demo data file is not used, no processing is needed -- 
      Data are already generated by GetDemoData as GlgDataRecord[].
   */
   if( !USE_DEMO_DATA_FILE || raw_data == null )
     return raw_data;
 
   let tag_ids = Object.keys( raw_data );
   let num_items = tag_ids.length;
   if( num_items == 0 )
      return null;

   let new_data = [];  /* GlgDataRecord[] */
   let
     tag_source,
     value,
     time_stamp,
     value_valid;
  
   for( let i=0; i<num_items; ++i )
   {
      let id = tag_ids[i];
      let elem = raw_data[id];

      time_stamp =
        ( elem.time_stamp != null ? elem.time_stamp : GetCurrTime() );
      value_valid =
        ( elem.value_valid != null ? elem.value_valid : true );
      
      if( elem.value != null )
      {
         tag_source = "Value_" + id;
         value = elem.value;
         new_data.push( new Data.GlgDataRecord( tag_source,
                                                /*unknown data_type*/ null,
                                                value, time_stamp, value_valid ) );
      }
      
      if( elem.status != null )
      {
         tag_source = "Status_" + id;
         value = elem.status;
         new_data.push( new Data.GlgDataRecord( tag_source,
                                                /*unknown data_type*/ null,
                                                value, time_stamp, value_valid ) );
      }

      if( elem.state != null )
      {
         tag_source = "State_" + id;
         value = elem.state;
         new_data.push( new Data.GlgDataRecord( tag_source,
                                                /*unknown data_type*/ null,
                                                value, time_stamp, value_valid ) );
         
      }
   }

   return new_data;
}

////////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ProcessRawChartData = /* PlotDataPoint[] */
    function( raw_chart_data )
{
   /* Simulated data are already generated in the expected format as
      PlotdataPoint[] -- no extra processing is needed. 
   */
   return raw_chart_data;
}

//////////////////////////////////////////////////////////////////////////
// Write numerical value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.WriteDValue =
  function ( /*String*/ tag_source, /*double*/ value )
{
   if( IsUndefined( tag_source ) )
     return;
   
   // DEMO only: Set value for a specified tag in the drawing.
   let viewport = this.Viewer.MainViewport;
   viewport.SetDTag( tag_source, value );
   viewport.Update();

   /* DEMO only: store adjusted values for alarm setpoints in DemoAlarmSPData
      for future use.
   */
   if( tag_source.startsWith( "LowSP_" ) ||
       tag_source.startsWith( "HighSP_" ) )
   {
      this.StoreAlarmSP( tag_source, value );
   }
}

//////////////////////////////////////////////////////////////////////////
// DEMO only: store adjusted values for alarm setpoints in DemoAlarmSPData.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.StoreAlarmSP = 
  function ( /*String*/ tag_source, /*double*/ value )
{
   if( !tag_source.startsWith( "LowSP_" ) &&
       !tag_source.startsWith( "HighSP_" ) )
     return;
       
   let str_array = tag_source.split( "_" );
   let data_id = str_array[ 1 ];
   if( IsUndefined( data_id ) )
       return;
       
   let alarm_sp_info = DemoAlarmSPData[ data_id ];
   
   if( alarm_sp_info != null )
   {
      if( tag_source.startsWith( "LowSP_" ) )
        alarm_sp_info.low_sp = value;
      else if( tag_source.startsWith( "HighSP_" ) )
        alarm_sp_info.high_sp = value;
   }
}
      
//////////////////////////////////////////////////////////////////////////
// Write string value into the provided database tag. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.WriteSValue = 
  function ( /*String*/ tag_source, /*String*/ value )
{
   if( IsUndefined( tag_source ) )
     return;
   
   // DEMO only: Set value for a specified tag in the currently loaded drawing.
   let viewport = this.Viewer.MainViewport;
   viewport.SetSTag( tag_source, value );
   viewport.Update();
}
   
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.ACKAlarm = function( /*String*/ tag_source ) /*boolean*/
{
   /* Simulate alarm ACK in the demo mode. In a real application, 
      LiveDataFeed will send alarm ACK to the process data server.
   */
   
   let num_alarms = this.ActiveAlarmList.length;   /* int */ 
   
   // Find the alarm in the active alarm list and reset it's ACK flag.
   for( let i=0; i<num_alarms; ++i )
   {
      let alarm = this.ActiveAlarmList[i];   /* AlarmRecord */
      if( alarm.tag_source == tag_source )
      {
         alarm.ack = true;
         AppLog( "Acknowledging alarm: " + tag_source );
         return true;
      }
   }
   return false;
} 

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetAlarms = function( alarm_callback, user_data )
{
   if( !this.Viewer.Active )
     return;

   /* Simulate alarms. */
   
   let alarm;   /* AlarmRecord */
    
   /* Ages alarms and removes old alarms from the list for continuous
      simulation.
   */
   this.AgeAlarms( this.ActiveAlarmList );
   let num_active_alarms = this.ActiveAlarmList.length;   /* int */
   
   let alarm_raise_threshold =    /* double */
   ( num_active_alarms == 0 ?
     this.FIRST_ALARM_RAISE_THRESHOLD : this.ALARM_RAISE_THRESHOLD );
   
   // Add new simulated alarm (conditionally).
   if( num_active_alarms < this.NUM_SIMULATED_ALARMS &&          
       GLG.Rand( 0.0, 1.0 ) > alarm_raise_threshold )
   {
      alarm = this.GetAlarmData(); 
      this.ActiveAlarmList.push( alarm );
      num_active_alarms = this.ActiveAlarmList.length;
   }
   
   let alarm_list = null;
   if( num_active_alarms > 0 )
   {
      // Create a new list of alarms to be returned.
      alarm_list = [];   /* AlarmRecord[] */
      
      /* For simulating alarms in the demo, populate the list with alarms 
         from ActiveAlarmList.
      */
      for( let i=0; i<num_active_alarms; ++i )
      {
         alarm = this.ActiveAlarmList[i];
         alarm_list.push( alarm );
      }
   }
   
   // Invoke the callback with new alarm list.
   alarm_callback( alarm_list );
} 

//////////////////////////////////////////////////////////////////////////
// Check if the value is valid for a specified tag_source.
// The value must be a double. For demo purposes, the function returns true. 
// The application should provide a custom  implementation of this method 
// in LiveDataFeed.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.IsValid = /* boolean */ 
  function( /*String*/ tag_source, /*int*/ data_type, value )
{
   let result = false;
   switch( data_type )
   {
    case GLG.GlgDataType.D: 
      result = true;
      break;
    default:
      break;
   } 
   
   return result;
}

//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetAlarmSPInfo =
  function( /*data id*/ data_id, data_callback, user_data )
{
   if( data_id == null )
     return;

   /* Get entry for a given data_id in DemoAlarmSPData using data_id as
      property name.
   */
   let alarm_sp_info = DemoAlarmSPData[ data_id ];    /* AlarmSPInfo */

   if( alarm_sp_info === undefined ) /* entry doesn't exist */
   {
      /* Add a new entry for data_id using random data
         (using data_id as property name of DemoAlarmSPData object. 
      */
      alarm_sp_info = new AlarmSPInfo( data_id, 0., 100., 10., 90.,
                                       true, true );
      DemoAlarmSPData[ data_id ] = alarm_sp_info;
   }
   
   // Invoke the callback with new_data.
   data_callback( alarm_sp_info, user_data );
}

const MAX_COUNTER = 100000;     /* Constant used for simulating data. */

//////////////////////////////////////////////////////////////////////////
// Generate simulated demo data for all tags listed in tag_list_JSON.
// Simulates the http response the application will create
// using custom http request for data acquisition.
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetDemoData = 
  function( tag_list_JSON, data_callback, user_data )
{
   let tag_list = JSON.parse( tag_list_JSON );
   let new_data = [];
   let 
     value,
     time_stamp;
   
   for( let i=0; i<tag_list.length; ++i )
   {
      /* DEMO: don't push new data to certain tags, based on PageType. */
      switch( this.Viewer.PageType )
      {
       case "Aeration":
       case "Circuit":
         if( tag_list[i].tag_source.includes( "Status" ) ||
             tag_list[i].tag_source.includes( "Min" )    ||
             tag_list[i].tag_source.includes( "Max" )    ||
             tag_list[i].tag_source.includes( "Low" )    || 
             tag_list[i].tag_source.includes( "High" )   ||
             tag_list[i].tag_source.includes( "RPM" )    ||
             tag_list[i].tag_source.includes( "Speed" ) )
           continue;  // Omit tag
           break;
       
       default:
         if( tag_list[i].tag_source.includes( "State" )  ||
             tag_list[i].tag_source.includes( "Status" ) ||
             tag_list[i].tag_source.includes( "Min" )    ||
             tag_list[i].tag_source.includes( "Max" )    ||
             tag_list[i].tag_source.includes( "Low" )    || 
             tag_list[i].tag_source.includes( "High" )   ||
             tag_list[i].tag_source.includes( "RPM" ) )
           continue;  // Omit tag
         break;
      }

      switch( tag_list[i].data_type )
      {
       case GLG.GlgDataType.D:
         // Obtain new numerical data value for a specified tag_source.
         value = this.GetDemoValue( tag_list[i].tag_source, false );
         break;
       case GLG.GlgDataType.S:
         // Obtain new string value for a specified tag_source.
         value = this.GetDemoString( tag_list[i].tag_source );
         break;
       default: AppError( "Unsupported data type." ); break;
      }
      
      if( this.Viewer.SupplyPlotTimeStamp )
        // Supply time stamp explicitly to the chart, if any.
        time_stamp = GetCurrTime();
      else
        // Chart will automatically supply time stamp using current time.
        time_stamp = null;

      /* Add new element to the new_data array.    
         In demo mode, value_valid = true. The application may supply
         this flag as needed.
      */
      new_data.push( new Data.GlgDataRecord( tag_list[i].tag_source,
                                             GLG.GlgDataType.D,
                                             value, time_stamp,
                                             /*value_valid*/ true ) );
   }

   // Invoke the callback with new_data.
   data_callback( new_data, user_data );
}

//////////////////////////////////////////////////////////////////////////
// Generate a simulated numerical data value. 
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetDemoValue =    /* double */
  function( /*String*/ tag_source, /*boolean*/ historical_mode )
{
   let  /* double */
     center,
     amplitude,
     period,
     low,
     high;
    
   switch( this.Viewer.PageType )
   {
    case "Aeration":
      if( tag_source.includes( "Speed" ) )
        return GLG.Rand( 300.0, 1500.0 );
      else
        return GLG.Rand( 0.0, 10.0 );
      
    case "Circuit":
      if( tag_source.endsWith( "State" ) )
        return GLG.Rand( 0.0, 1.3 );
      else
        return GLG.Rand( 0.0, 1000.0 );
      
    default:
    case "Default":  // Default page type.
      if( tag_source.toLowerCase().includes( "fuel" ) )
      {
         low = 0.;
         high = 500.;
         period = 1000.0;
         amplitude = 80.;
         center = 350.;
      }
      else if( tag_source.toLowerCase().includes( "temp" ) )
      {
         low = 0.;
         high = 90.;
         period = 1000.0;
         amplitude = 25.;
         center = 50.;
      }
      else if( tag_source.includes( "Volt" ) )
      {
         low = 0.;
         high = 500.;
         period = 300.0;
         amplitude = 40.0;
         center = 380.0;
      }
      else if( tag_source.includes( "Amp" ) )
      {
         low = 0.;
         high = 50.;
         period = 1000.0;
         amplitude = 15.0;
         center = 30.0;
      }
      /* Pressure variables */
      else if( tag_source.includes( "PE" ) || tag_source.includes( "THP" ) ||
               tag_source.includes( "BAP" ) )
      {
         low = 5.;
         high = 45.;

         if( tag_source.includes( "PE" ) )
         {
            period = 1000.0;
            amplitude = 12.0;
            center = 30.0;
         }
         else if( tag_source.includes( "THP" ) )
         {
            period = 800.0;
            amplitude = 10.0;
            center = 25.0;
         }
         else if( tag_source.includes( "BAP" ) )
         {
            period = 1200.0;
            amplitude = 15.0;
            center = 30.0;
         }
      }
      /* Temperature variables */
      else if( tag_source.includes( "TE" ) || tag_source.includes( "EOT" ) ||
               tag_source.includes( "Cool" ) || tag_source.includes( "Heat" ) )
      {
         low = 10.;
         high = 90.;

         if( tag_source.includes( "TE" ) )
         {
            period = 700.0;
            amplitude = 25.0;
            center = 60.0;
         }
         else if( tag_source.includes( "EOT" ) )
         {
            period = 800.0;
            amplitude = 15.0;
            center = 40.0;
         }
         else if( tag_source.includes( "Cool" ) )
         {
            period = 600.0;
            amplitude = 20.0;
            center = 60.0;
         }
         else if( tag_source.includes( "Heat" ) )
         {
            period = 750.0;
            amplitude = 15.0;
            center = 50.0;
         }
      }
      else if( tag_source.includes( "FL" ) ) // Fuel, Gal
      {
         low = 0.;
         high = 50.;
         period = 1000.0;
         amplitude = 20.;
         center = 30.;
      }
      else   // All other tags
      {
         low = 0.;
         high = 100;
         period = 500.0;
         amplitude = ( high - low ) / 2.0;
         center = low + amplitude;
      }
                  
      if( historical_mode )
        // Historical data, data were saved once per second.
        this.counter += 10;
      else
        ++this.counter; 
      break;
   }
   
   let alpha = 2.0 * Math.PI * this.counter / period;
   let value = center +
       amplitude * Math.sin( alpha ) * Math.sin( alpha / 30.0 );

   this.counter = this.counter % MAX_COUNTER;
    
   return value;
}
   
/////////////////////////////////////////////////////////////////////// 
DemoDataFeed.prototype.GetDemoString =    /* String */
  function( /*String*/ tag_source )
{
   return "DEMO";
}
   
/////////////////////////////////////////////////////////////////////// 
// Ages alarms and removes old alarms from the list for continuous
// simulation.
///////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.AgeAlarms = function( /* AlarmRecord[] */ alarm_list )
{
   let num_alarms = alarm_list.length;
   for( let i=0; i<num_alarms; ++i )
   {
      let alarm = alarm_list[i];    /* AlarmRecord */
      ++alarm.age;
      
       if( ( alarm.ack && alarm.age > this.OLD_ACK_ALARM_AGE ) ||
           ( !alarm.ack && alarm.age > this.OLD_NON_ACK_ALARM_AGE ) )
      {
         this.RemoveArrayElement( alarm_list, alarm );
         return;
      }
   }
}

////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.RemoveArrayElement = function( array, data )
{
   for( let i=0; i<array.length; ++i )
     if( array[i] == data )
     {
        array.splice( i, 1 );
        return;
     }
}  
   
//////////////////////////////////////////////////////////////////////////
DemoDataFeed.prototype.GetAlarmData = function()   /* AlarmRecord */
{
   /* Simulate alarms for the demo. In a real application, LiveDataSource
      will query the list of alarms from the process data server.
   */
   
   let alarm_status = Math.trunc( GLG.Rand( 1.0, 3.99 ) );   /* int */
   
   let ch = ( 'A' + Math.trunc( GLG.Rand( 0.0, 26.9 ) ) );   /* String */
   let alarm_source = ch + Math.trunc( GLG.Rand( 100.0, 999.0 ) ); /* String */
   
   let description;          /* String */
   let string_value = null;  /* String  */
   let double_value = 0.0;   /* double */
   let random_message;       /* int */
   
   if( alarm_status < 3 )
   {
      random_message = ( GLG.Rand( 0.0, 10.0 ) < 5.0 ? 0 : 1 );
      
      switch( random_message )
      {
       default:
       case 0:
         description = "Tank #% low";
         double_value = GLG.Rand( 100.0, 150.0 ); 
         break;
         
       case 1: 
         description = "Tank #% high";
         double_value = GLG.Rand( 600.0, 900.0 ); 
         break;
      }
   }
   else
   {
      random_message = Math.trunc( GLG.Rand( 0.0, 2.99 ) );
      switch( random_message )
      {
       default:
       case 0: description = "Breaker #%"; string_value = "TRIPPED"; break;
       case 1: description = "Fuse #%"; string_value = "BLOWN"; break;
       case 2: description = "Tank #%"; string_value = "OVERFLOW"; break;
      }
   }
   
   let random_number = Math.trunc( GLG.Rand( 1.0, 100.0 ) );   /* int */
   description = GLG.CreateIndexedName( description, random_number );
   
   let alarm_time = GetCurrTime();   /* double */
   
   let alarm = new AlarmRecord();
   alarm.time = alarm_time;
   alarm.tag_source = alarm_source;
   alarm.description = description;
   alarm.string_value = string_value;
   alarm.double_value = double_value;
   alarm.status = alarm_status;
   alarm.ack = false;
   return alarm;
}

/////////////////////////////////////////////////////////////////////// 
// Get historical data for the plot with a specified tag.
/////////////////////////////////////////////////////////////////////// 
DemoDataFeed.prototype.GetPlotDemoData = /* PlotDataPoint[] */
  function ( /*String*/ tag_source, /*double*/ start_time, 
             /*double*/ end_time, /*int*/ max_num_samples,
             /*boolean*/ historical )
{
   /* In a real application, the number of data points to be queried
      is determined by the start and end time. For the demo, return
      the requested max number of points.
   */
   if( max_num_samples < 1 )
     max_num_samples = 1;
   let num_samples = max_num_samples;   /* int */
   
   let interval = ( end_time - start_time ) / max_num_samples;   /* double */
   
   let data_array = [];   /* PlotDataPoint[] */
   for( let i=0; i<num_samples; ++i )
   {
      /* Optimization: For multiple data points with the same tag source, 
         store the first tag source of the series. Subsequent points might 
         have a null tag source to avoid repetition and minimize the size 
         of the transmitted data.
      */
      let data_tag = ( i==0 ? tag_source : null );

      // Non-optimized: store tag_source for each data point.
      //let data_tag = tag_source;
              
      /* Generate demo data. */
      let time_stamp = start_time + interval * i;
      if( time_stamp > end_time )
        break;
      
      let value = this.GetDemoValue( tag_source, historical );
      let value_valid = true;

      let data_point =
         new Data.PlotDataPoint( value, time_stamp, value_valid, data_tag );

      data_array.push( data_point );
   }

   let data_array_JSON = JSON.stringify( data_array );
   return data_array_JSON;
}

//////////////////////////////////////////////////////////////////////////
function AlarmSPInfo( id, low, high, low_sp, high_sp,
                             has_low_sp, has_high_sp )
{
    this.id = id;                    /* String: data point id */
    this.low = low;                  /* double: data range Low (MinValue) */
    this.high = high;                /* double: data range High (MaxValue) */
    this.low_sp = low_sp;            /* double: Alarm Setpoint Low */
    this.high_sp = high_sp;          /* double: Alarm Setpoint High */
    this.has_low_sp = has_low_sp;    /* boolean: true if the alarm has 
                                        LowSP; false otherwise. */
    this.has_high_sp = has_high_sp;  /* boolean: true if the alarm has 
                                        HighSP; false otherwise. */
}
