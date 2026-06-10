//////////////////////////////////////////////////////////////////////////////
// GLG SimpleViewer example
//
// The example is written in pure HTML5 and JavaScript using GLG Standard API.
// The example source code uses the GLG Toolkit JavaScript Library 
// supplied by the included Glg*.js and GlgToolkit*.js files.
//
// The library loads a GLG drawing and renders it on a web page, providing
// an API to animate the drawing with real-time data and handle user
// interaction with graphical objects in the drawing.
//
// The drawings are created using the GLG Graphics Builder, an interactive
// editor that allows to create graphical objects and define their dynamic
// behavior without any programming.
//
// The viewer demonstrates how to animate a loaded drawing using tags 
// defined in the drawing.
//
// This example is written with GLG Standard API. 
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint react/display-name: 0 */

import { GLG, IsUndefined, AppAlert, AppError, AppLog } from './Utils.js'
import { DemoDataFeed } from './DemoDataFeed.js'
import { LiveDataFeed } from './LiveDataFeed.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;
const DEBUG_DATA = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

// Default drawing name and title to be used on initial load.
const DEFAULT_DRAWING_NAME = "tags_example.g";
const DEFAULT_DRAWING_TITLE = "Process Overview";

/* If set to true, simulated demo data will be used for animation.
   Set to false to enable live application data.
*/
const RANDOM_DATA = true;

/* If set to false, TimerInterval used for updates will be adjused to obtain
   a targeted UPDATE_INTERVAL. Otherwise, a fixed timer interval is used for 
   updates.
*/
const USE_FIXED_TIMER_INTERVAL = true;
const DEBUG_TIME_INTERVAL = false;

// Parameters used for adjusting variable time interval.
const UPDATE_INTERVAL = 100;     // Targeted data query interval, msec.
const MIN_IDLE_INTERVAL = 30;    // msec
const WAIT_INTERVAL = 30;        // msec
const CHANGE_COEFF = 1/3;        // Rate of time interval adjustment.

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the viewer.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgSimpleViewer( glg_div_name, glg_path,
                                 is_standalone, is_mobile )
{
   Debug( "New script for " + glg_div_name + ": "  +
          Object.getPrototypeOf( this ).constructor.name +
          " glg_path: " + glg_path );

   if( DEBUG_GLG_ERRORS )   
     GLG.ThrowExceptionOnError( true, true, true );
   else
     GLG.ThrowExceptionOnError( false, false, false );

   this.GLG_div_name = glg_div_name;
   this.IsMobile = is_mobile;
   this.Standalone = is_standalone;    

   this.RandomData = RANDOM_DATA;
   
   // Use path to the drawings directory if supplied.
   this.GlgPath = glg_path;

   // Top level viewport of the loaded drawing (GlgObject).
   this.Viewport = null;

   // Stores the name of the currently loaded drawing.
   this.LoadedDrawingName = null;

   /* This object is created in LoadDrawing() to store information about new 
      drawing load request and includes the following fields: 
      enabled, drawing_name and title.
   */
   this.DrawingLoadRequest = null;
   
   // DataFeed object used for animation.
   this.DataFeed = null;  

   /* Flag to indicate all assets finished loading. This will ensure that 
      if LoadDrawing() is invoked from an external HTML button, drawing loading
      request will proceed only if all assets have already been loaded.
   */
   this.AssetsLoadedFlag = false;

   this.TimerInterval = UPDATE_INTERVAL;   // Initial data query interval.
   
   // Dynamically created array of tag records of type GlgTagRecord.
   this.TagRecords = null;    /* GlgTagRecord[] */

   // Title variables used for status display.
   this.LoadingTitle = null;       // Title of a drawing being loaded.
   this.DisplayedTitle = null;     // Title of currently displayed drawing.

   // Start time for the data query, gets set in GetData().
   this.DataStartTime = 0;                /* double */

   this.UpdateDuration = 0;               /* double */
   this.FirstDrawing = true;              /* boolean */
   this.FirstDataQuery = true;            /* boolean */
   this.WaitForUpdate = false;            /* boolean */
   
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts the viewer by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgSimpleViewer.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load misc. assets such as GLG scrollbars. When assets are loaded, 
      LoadDrawing callback is invoked to load a specified GLG drawing.
   */
   this.LoadAssets( ()=>this.LoadDrawing( DEFAULT_DRAWING_NAME,
                                          DEFAULT_DRAWING_TITLE ), null );

   // Add DataFeed object used to animate the drawing with real-time data.
   this.AddDataFeed();
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgSimpleViewer.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );

   this.Active = false;    // Ignore any pending updates and callbacks.

   this.DestroyDrawing();
   
   if( this.DataFeed )
     this.DataFeed.Cleanup();              // Cleanup DataFeed.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgSimpleViewer.prototype.LoadDrawing =
  function( /*String*/ filename, /*String*/ title )
{
   Debug( "LoadDrawing for: " + this.GLG_div_name + " drawing: " + filename );

   if( !this.Active )
     return;

   /* Prevent drawing loading request from a button from proceeding until 
      all assets finished loading.
   */
   if( !this.AssetsLoadedFlag )
     return;

   if( filename == null )
   {
      AppError( "Invalid drawing filename." );
      return;
   }

   // Don't reload the drawing if it's already displayed.
   if( filename == this.LoadedDrawingName )
     return;

   // New drawing was requested, cancel any pending drawing load requests.
   this.AbortPendingLoadRequests();    

   /* Create a new load request used to pass information to the load callback.
      Store it in the instance to be able to abort the request if needed.
      DrawingLoadRequest fields: 
      - "enabled" is used to cancel the current load request if loading
         of another drawing was requested while the current request has not 
         been finished yet. This may happen if the user clicks on a button to 
         load one drawing and then clicks on another button to load another 
         drawing before the first drawing finished loading.
      - "drawing_name" stores the drawing filename.
      - "title" stores the title.
   */
   this.DrawingLoadRequest =
     { enabled: true, drawing_name: filename, drawing_title: title };

   /* Store title of the new drawing load request. It will be displayed in
      the status display.
   */
   this.LoadingTitle = title;
    
   // Display status info about the new drawing load request.
   this.DisplayStatus();

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( filename ), null,
                          this.LoadCB.bind( this ),
                          /*user data*/ this.DrawingLoadRequest,
                          /*abort test function*/ AbortLoad );
}

////////////////////////////////////////////////////////////////////////////// 
GlgSimpleViewer.prototype.GetFullName = function( /*String*/ filename )
{
   if( this.GlgPath == null )
     return filename;

   return this.GlgPath + "/" + filename;
}

//////////////////////////////////////////////////////////////////////////////
// Load Callback, invoked after a GLG drawing finished loading.
// 'drawing' parameter provides an obejct ID of the loaded GLG viewport.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.LoadCB =
    function( /*GlgObject*/ drawing, /*Object*/ user_data, /*String*/ path )
{
   Debug( "LoadCB for: " + this.GLG_div_name );

   if( !this.Active )
     return;

   let load_request = user_data;
   
   if( !load_request.enabled )
     /* This load request was aborted by requesting to load another drawing 
        before this load request has finished.
     */
     return;

   if( !document.getElementById( this.GLG_div_name ) )
   {
      Debug( "Can't find " + this.GLG_div_name +
             " div: it may have been removed from the document." );
      return;
   }
   
   // Reset: we are done with this request.
   this.DrawingLoadRequest = null;
   
   if( drawing == null )
   {
      /* Stay on the previously loaded page, display status info and 
         generate an error.
      */
      AppAlert( "Drawing loading failed: " + this.LoadingTitle );
      this.LoadingTitle = null;
      this.DisplayStatus();
      return;
   }
   
   // Disable spinning loader.   
   RemoveElement( this.GLG_div_name, "loader_container" );
   
   // Destroy currently loaded drawing, if any.
   this.DestroyDrawing();
   
   // Store drawing name of the currently loaded drawing.
   this.LoadedDrawingName = load_request.drawing_name;
   
   // Define the element in the HTML page where to display the drawing.
   drawing.SetParentElement( this.GLG_div_name );
   
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );
   
   // Update status info.
   this.LoadingTitle = null;
   this.DisplayedTitle = load_request.drawing_title;
   this.DisplayStatus();

   this.StartGlgViewer( drawing );
}
   
////////////////////////////////////////////////////////////////////////////// 
// Cancels any pending drawing load requests.
////////////////////////////////////////////////////////////////////////////// 
GlgSimpleViewer.prototype.AbortPendingLoadRequests = function()
{
   if( this.DrawingLoadRequest != null )
   {
      this.DrawingLoadRequest.enabled = false;
      this.DrawingLoadRequest = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.StartGlgViewer = function( /*GlgObject*/ drawing )
{
   // Store loaded drawing.
   this.Viewport = drawing;

   // Adjust the drawing for mobile devices if needed.
   this.AdjustForMobileDevices( this.Viewport );
    
   // Initialization before hierarchy setup.
   this.InitBeforeH();

   // Setup object hierarchy in the drawing.
   this.Viewport.SetupHierarchy();

   // Initialization after hierarchy setup.
   this.InitAfterH();

   // Start an update timer for real-time data.
   if( this.FirstDrawing )
   {
      this.FirstDrawing = false;
      this.GetData();
   }

   // Display the drawing in a web page.
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Destroy currently loaded drawing, if any.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.DestroyDrawing = function()
{
   if( this.Viewport == null )
     return;
    
   // Clear TagRecords array.
   this.TagRecords = null;

   this.Viewport.ResetHierarchy();
   this.Viewport = null;
}

//////////////////////////////////////////////////////////////////////////////
// This function is invoked after the drawing's raw data has been downloaded
// and before loading the drawing from raw data. If the function returns true,
// loading the drawing from raw data is aborted.
//////////////////////////////////////////////////////////////////////////////
function AbortLoad( load_request )   /* boolean */
{
   // Return true to abort if the load request was cancelled.
   return !load_request.enabled;
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.InitBeforeH = function()
{
   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );
    
   // If the drawing contains a QuitButton, make it invisible.
   if( this.Viewport.HasResourceObject( "QuitButton" ) )
     this.Viewport.SetDResource( "QuitButton/Visibility", 0 );
}

//////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.InitAfterH = function()
{
   // Build TagRecords array, a list of GLG tag records.
   this.TagRecords = CreateTagRecords( this.Viewport );
}

//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.AddDataFeed = function()
{
   if( RANDOM_DATA )
   {
      this.DataFeed = new DemoDataFeed( GLG, this );
      AppLog( "Using random DemoDataFeed." );
   }
   else
   {
      this.DataFeed = new LiveDataFeed( GLG, this );
      AppLog( "Using LiveDataFeed." );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Create and populate TagRecords array. Each item has the following
// properties: tag_obj, data_type, tag_name, tag_source.
//////////////////////////////////////////////////////////////////////////////
function CreateTagRecords( viewport )
{
   /* Retrieve a tag list from the drawing. Include tags with unique
      tag sources.
   */
   let tag_list = viewport.CreateTagList( /*unique tag sources*/ true );
   if( tag_list == null )
     return null;  // no tags found.
    
   let size = tag_list.GetSize();
   if( size == 0 )
     return null; // no tags found 
    
   /* Create an array of tag records by traversing the tag list and retrieving 
      information from each tag object in the list.
   */
   let tag_record_array = [];
   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );
      let tag_source = tag_obj.GetSResource( "TagSource" );
      let tag_name = tag_obj.GetSResource( "TagName" );
      let data_type = Math.trunc( tag_obj.GetDResource( "DataType" ) );
      // let tag_comment = tag_obj.GetSResource( "TagComment" );

      // Skip undefined tags.
      if( IsUndefined( tag_source ) )
        continue;
        
      let tag_access_type =
        Math.trunc( tag_obj.GetDResource( "TagAccessType" ) );
        
      // Handle special tags according to their tag access type.
      switch( tag_access_type )
      {
       case GLG.GlgTagAccessType.OUTPUT_TAG: continue;   // Skip OUTPUT tags.

       default:
       case GLG.GlgTagAccessType.INIT_ONLY_TAG:
       case GLG.GlgTagAccessType.INPUT_TAG:
         break;
      }
        
      // Add a valid tag record to the list.
      let tag_record = new GlgTagRecord( data_type, tag_name, tag_source, 
                                         tag_obj, tag_access_type );
      tag_record_array.push( tag_record );
   }

   Debug( "TagRecords array size: " + tag_record_array.length ); 

   if( tag_record_array.length == 0 )
     return null;
    
   return tag_record_array;
}

//////////////////////////////////////////////////////////////////////////////
// Obtain real-time data for all tags defined in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.GetData = function()
{
   if( !this.Active || this.DataFeed == null )
     return;
    
   /* If the loaded drawing doesn't have tags, get the timer going using 
      a shorter update interval.
   */
   if( this.TagRecords == null )
   {
      setTimeout( ()=>this.GetData(), 30 );
      return;
   }
   
   this.DataStartTime = new Date().getTime();

   /* Obtain new real-time data values for all tags in the TagRecords
      and invoke GetDataCB callback when done. Pass currently loaded
      drawing name to the callback.
   */
   this.DataFeed.ReadData( this.TagRecords,
                           /*callback*/ this.GetDataCB.bind( this ), 
                           /*user data*/ this.LoadedDrawingName );
}

   //////////////////////////////////////////////////////////////////////////
// Data query callback. It is invoked by the DataFeed after the new data 
// are received from the server.
//////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.GetDataCB = function( new_data, drawing_name )
{
   if( !this.Active )
     return;
   
   /* Ignore new data if the drawing name has changed and a new drawing 
      has been loaded. This will stop further queries for the old drawing.
      The queries for the new drawing were started in StartGlgViewer
      when the new drawing has been loaded.
   */ 
   if( drawing_name != this.LoadedDrawingName )
   {
      /* When a new drawing is loaded, restart the timer with a shorter
         time interval to fill the newly loaded drawing with data right away.
      */
      setTimeout( ()=>this.GetData(), 30 );
      return;
   }

   /* Perform processing of new data based on the application specific 
      data format, if needed. The returned new_data is expected to be an object 
      with elements as (key,value) pair, where key=tag_source and value
      is the tag's value. Example: DemoDataFile.json.
   */ 
   new_data = this.DataFeed.ProcessRawData( new_data );
    
   /* Query new data even if the previous query failed (new_data is null),
      to continue data updates even if there were intermittent network errors.
   */
   if( USE_FIXED_TIMER_INTERVAL )  // Use fixed targeted UPDATE_INTERVAL.
   {
      // Push new data to the graphics.
      this.PushData( new_data );
      
      // Send new data query request.
      setTimeout( this.GetData.bind( this ), UPDATE_INTERVAL );
   }
   else   // Adjust TimerInterval to try obtain a targeted UPDATE_INTERVAL.
   {
      /* If next data is received and GetDataCB is invoked before updates have
         finished, set a timer to wait for the updates to finish before 
         sending new data query request. 
      */
      if( this.WaitForUpdate )
      {
         setTimeout( ()=>this.GetDataCB( new_data, drawing_name ),
                     WAIT_INTERVAL );
         return;
      }
      
      // If data query finished before the update, wait for update to finish.
      this.WaitForUpdate = true;
      
      this.AdjustTimerInterval();
      
      if( DEBUG_TIME_INTERVAL )
        AppLog( "   Adjusted time interval=" +
                Math.trunc( this.TimerInterval ) );
      
      /* Send new data query request right away to get new data asynchronously
         while the current data is being pushed to the graphics, without 
         waiting for the rendering to finish.
      */
      this.GetData();
      
      if( this.TimerInterval == 0 )
        /* Data query took longer than targeted UPDATE_INTERVAL: process
           with no delay.
        */
        this.ProcessData( new_data );
      else
        // Delay next iteration to maintain requested update rate.
        setTimeout( ()=>this.ProcessData( new_data ), this.TimerInterval );
   }
}

//////////////////////////////////////////////////////////////////////////
// Is used only if USE_FIXED_TIMER_INTERVAL = false.
//////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.ProcessData = function( new_data )
{
   if( !this.Active )
     return;

   let update_start_time = new Date().getTime();
   
   // Push new data to the graphics.
   this.PushData( new_data );
   
   let update_finish_time = new Date().getTime();
   
   this.UpdateDuration = update_finish_time - update_start_time;
   this.WaitForUpdate = false;   // Update finished.
}

//////////////////////////////////////////////////////////////////////////////
// Push new data into graphics. For each tag in new_data array, find a
// tag record in TagRecords array with a matching tag_source, store
// the new value in the found tag record, and push new value into graphics.  
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.PushData = function( new_data )
{
   if( new_data == null || new_data.length == 0 )
   {
      AppError( "No new data received." );
      return;
   }

   if( this.TagRecords == null )
     return;

   let data_tag_list = Object.keys( new_data );
    
   for( let i=0; i<data_tag_list.length; ++i )
   {
    /* Store a new value in the tag record with a matching tag source,
         if found.
      */
        
      /* Find a tag record for the received tag data value based on its
         tag_source.
      */
      let data_tag_source = data_tag_list[i];
      let data_value = new_data[data_tag_source];
      
      let tag_record = this.LookupTagRecords( data_tag_source );
      if( tag_record == null )
        continue;           // Tag record not found.

      // Push new data value into graphics.
      switch( tag_record.data_type )
      {
       case GLG.GlgDataType.D: // D-type tag
         /* For performance optimization, pass 'true' for the if_changed flag,
            so that the graphics is updated only if the value has changed.
            if_changed flag is ignored for a real-time chart, so that the chart
            scrolls even if the value is the same.
         */
         let d_value = Number.parseFloat( data_value );
         if( Number.isNaN( d_value ) )
         {
            AppError( "Invalid value received for D-type tag: " +
                      "  tag=" + data_tag_source + " value=" + data_value );
            continue;
         }

         // Store new value in the tag_record as a float.
         tag_record.value = d_value;

         // Push the new value to graphics for a D-type tag.
         this.Viewport.SetDTag( tag_record.tag_source, tag_record.value, 
                                /*if_changed*/ true );

         if( DEBUG_DATA )
           AppLog( "  Pushing D-value: tag = " + data_tag_source +
                   " d_value = " + d_value ); 
         break;
                
       case GLG.GlgDataType.S:
         // Check that the received data_value is of type 'string'.
         if( typeof data_value != 'string' )
         {
            AppError( "Invalid value received for S-type tag: " +
                      "  tag=" + data_tag_source + " value=" + data_value );
            continue;
         }

         // Store new value in the tag_record as a string.
         tag_record.value = data_value;
         
         // Push the new value to graphics. Pass 'true" for the if_changed flag.
         this.Viewport.SetSTag( tag_record.tag_source, tag_record.value, 
                                /*if_changed*/ true );

         if( DEBUG_DATA )
           AppLog( "  Pushing S-value: tag = " + data_tag_source +
                   " s_value = " + data_value ); 
         break;
             
       case GLG.GlgDataType.G:      // Not used in this example.
         break;

       default:
         AppError( "Invalid data type." );
         break;
      }
   }

   // Refresh display.
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Find a tag record in TagRecords array with a tag source matching
// the specified tag_source.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.LookupTagRecords = function( tag_source )
{
   for( let i=0; i<this.TagRecords.length; ++i )
   {
      if( this.TagRecords[i].tag_source == tag_source )
        return this.TagRecords[i];
   }

   return null; // not found.
}

//////////////////////////////////////////////////////////////////////////////
// Handle user interaction with the buttons, as well as process custom
// actions attached to objects in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );
    
   if( format == "Button" )
   {	 
      /* Neither a push button or a toggle button. */
      if( action != "Activate" && action != "ValueChanged" )
        return;
        
      if( action == "Activate" )  // Push button event.
      {
         if( origin == "StartButton" )
         {
            if ( RANDOM_DATA && this.Viewport.HasTagSource( "State" ) )
              this.DataFeed.WriteDValue( "State", 1.0 );
            else
              // Place custom code here as needed.
              ;
         }
         else if( origin == "StopButton" )
         {
            if ( RANDOM_DATA && this.Viewport.HasTagSource( "State" ) )
              this.DataFeed.WriteDValue( "State", 0.0 );
            else
              // Place custom code here as needed.
              ; 
         }
      }
      else if( action == "ValueChanged" ) // Toggle button event.
      {
         let state = message_obj.GetDResource( "OnState" );
            
         // Place code here to handle events from a toggle button
         // and write a new value to a given tag_source.
         // this.DataFeed.WriteDValue( tag_source, state );
            
         if ( RANDOM_DATA && this.Viewport.HasTagSource( "State" ) )
           this.DataFeed.WriteDValue( "State", state );
         else // Place custom code here
           ;
      }
        
      this.Viewport.Update();
   }
   
   else if( format == "Timer" )     // Handles timer transformations.
       this.Viewport.Update();
   
   else if( format == "ImageLoad" )  
     this.Viewport.Update();        // Handles images.
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 800 / 590;
    
   const MIN_WIDTH = 500;
   const MAX_WIDTH = 900;
   const SCROLLBAR_WIDTH = 15;

   let span = document.body.clientWidth - SCROLLBAR_WIDTH;    

   if( this.SizeIndex == undefined )   // First time: initialize.
   {
      this.SizeIndex = 0;

      if( this.IsMobile )
      {
         /* Mobile devices use fixed device-width: disable Change Drawing Size 
            button. If it's not standalone, it is handled outside of this 
            script.
         */
         if( this.Standalone )
           RemoveElement( null, this.GLG_div_name + "_change_size" );
      }
      else   /* Desktop */
      {      
         const small_sizes  = [ 1, 1.5,  2.,   2.5 ];
         const medium_sizes = [ 1, 0.75, 1.25, 1.5 ];
         const large_sizes  = [ 1, 0.6,  1.25, 1.5 ];
         
         if( span < 600 )
           this.SetDrawingSize.size_array = small_sizes;
         else if( span < 800 )
           this.SetDrawingSize.size_array = medium_sizes;
         else
           this.SetDrawingSize.size_array = large_sizes;
         
         this.SetDrawingSize.num_sizes = this.SetDrawingSize.size_array.length;
         
         /* Handle browser zooming. */
         this.ResizeListener = ()=>this.SetDrawingSize( false );
         window.addEventListener( "resize", this.ResizeListener );
      }
   }
   else if( next_size )
   {
      ++this.SizeIndex;
      this.SizeIndex %= this.SetDrawingSize.num_sizes;
   }
    
   let drawing_area = document.getElementById( this.GLG_div_name );
   if( this.IsMobile )
   {
      /* Mobile devices use constant device-width, adjust only the height 
         of the drawing to keep the aspect ratio.
      */
      drawing_area.style.height =
        "" + Math.trunc( drawing_area.clientWidth / ASPECT_RATIO ) + "px";
   }
   else   /* Desktop */
   {
      let start_width;
      if( span < MIN_WIDTH )
        start_width = MIN_WIDTH;
      else if( span > MAX_WIDTH )
        start_width = MAX_WIDTH;
      else
        start_width = span;

      let size_coeff = this.SetDrawingSize.size_array[ this.SizeIndex ];
      let width = Math.trunc( Math.max( start_width * size_coeff, MIN_WIDTH ) );
      drawing_area.style.width = "" + width + "px";
      drawing_area.style.height = 
        "" + Math.trunc( width / ASPECT_RATIO ) + "px";
   }

   // Adjust canvas resolution for mobile devices and browser zoom state.
   if( !next_size )
     this.SetCanvasResolution();
}

//////////////////////////////////////////////////////////////////////////////
// Increases canvas resolution for mobile devices with HiDPI displays and for
// browser zooming. Sets CoordScale global variable.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.SetCanvasResolution = function()
{
   let TextScale, PixelOffsetScale, ScreenCoordScale, NativeWidgetTextScale;

   if( this.IsMobile )
   {
      /* CoordScale parameter defines canvas coordinate scaling.
         Values greater than 1 increase canvas resolution and result in 
         sharper rendering. On mobile devices with devicePixelRatio > 1,
         the value of devicePixelRatio may be used for very crisp rendering
         with very thin lines. For pixel ration greater than 2, limit 
         CoordScale to 2 to draw thicker lines.

         CanvasScale > 1 makes text smaller. The TextScale parameter defines
         the text scaling factor used to increase text size.

         The ScreenCoordScale parameter specifies a scaling factor for fixed
         scale viewports that use screen coordinates. If the size of the fixed
         scale viewport (such as a height of a toolbar) is controlled by a pixel
         offset transformation, ScreenCoordScale may be set to the same value as
         PixelOffsetScale to scale the content of the viewport proportionally
         to its height increase.

         The NativeWidgetTextScale parameter defines the scaling factor that is
         used to scale down text in native widgets (such as native buttons, 
         toggles, etc.) to match the scale of the drawing.
      */
      if( window.devicePixelRatio > 2. )
        this.CoordScale = 2.;
      else
        this.CoordScale = window.devicePixelRatio;

      TextScale = 1.5;
      PixelOffsetScale = TextScale;
      ScreenCoordScale = PixelOffsetScale;
      NativeWidgetTextScale = 0.6;
   }
   else   // Desktop
   {
      /* Change canvas resolution to match browser zoom state. */
      this.CoordScale = window.devicePixelRatio;      
      TextScale = window.devicePixelRatio;
      PixelOffsetScale = window.devicePixelRatio;
      ScreenCoordScale = window.devicePixelRatio;
      NativeWidgetTextScale = 1.;    // Don't change native text size.
   }

   GLG.SetCanvasScale( this.CoordScale, TextScale, NativeWidgetTextScale,
                       PixelOffsetScale, ScreenCoordScale );
}

//////////////////////////////////////////////////////////////////////////
function RemoveElement( parent_id, child_id )
{
   let element;
   if( parent_id == null )
     // No parent was provided: remove from document.
     element = document.getElementById( child_id );
   else
   {
      // Parent ID was provided: remove from parent.
      let parent = document.getElementById( parent_id );
      if( parent == null )
        return;
      element = parent.querySelector( "#" + child_id );
   }
   
   if( element != null )
     element.parentNode.removeChild( element );
}

//////////////////////////////////////////////////////////////////////////
// Adjust GLG object geometry for mobile devices if needed, using
// special properties defined in the object.
//////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.AdjustForMobileDevices =
  function( /*GlgObject*/ glg_obj )
{
   if( !this.IsMobile )
     return;   // Desktop, no adjustments needed.
   
   // Add any adjustments here.
}

//////////////////////////////////////////////////////////////////////////////
// Loads any assets required by the application and invokes the specified
// callback when done.
// Alternatively, the application drawing can be loaded as an asset here
// as well, so that it starts loading without waiting for the other assets 
// to finish loading.
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.LoadAssets = function( callback, user_data )
{
   Debug( "LoadAssets for: " + this.GLG_div_name );
   
   /* Define an internal variable to keep the number of loaded assets. */
   this.NumLoadedAssets = 0;

   /* HTML5 doesn't provide a scrollbar input element (only a range input 
      html element is available). This application needs to load GLG scrollbars
      used for integrated chart scrolling. For each loaded scrollbar, the 
      AssetLoaded callback is invoked with the supplied data array parameter.
   */    
   GLG.LoadWidgetFromURL( this.GetFullName( "scrollbar_h.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_h", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );
   GLG.LoadWidgetFromURL( this.GetFullName( "scrollbar_v.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_v", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );
}

//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.AssetLoaded =
  function( /*GlgObject*/ glg_object, /*Object*/ data, /*String*/ path )
{
   if( !this.Active )
     return;

   if( data.name == "scrollbar_h" )
   {
      if( glg_object != null )
        glg_object.SetResourceObject( "$config/GlgHScrollbar", glg_object );
   }
   else if( data.name == "scrollbar_v" )
   {
      if( glg_object != null )
        glg_object.SetResourceObject( "$config/GlgVScrollbar", glg_object );
   }
   else
     AppError( "Unexpected asset name" );

   ++this.NumLoadedAssets;

   // Invoke the callback after all assets have been loaded.
   if( this.NumLoadedAssets  == 2 )
   {      
      this.AssetsLoadedFlag = true;  // Signal that all assets finished loading.
      
      data.callback( data.user_data );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Status display: 
// Display the title of the currently displayed drawing, as well as
// the title of the drawing which is in the process of being loaded (if any).
//////////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.DisplayStatus = function()
{
   let message;
   
   if( this.DisplayedTitle == null && this.LoadingTitle == null )
     message = "<br>";
   else
   {
      if( this.DisplayedTitle )
        message = "Displayed: <b>" + this.DisplayedTitle + "</b>";
      
      if( this.LoadingTitle )
      {
         if( this.DisplayedTitle )
           // Add spaces after the displayed drawing title.
           message += "&nbsp;&nbsp;&nbsp;&nbsp;";   
         else
           message = "";
         
         message += "Loading: <b>" + this.LoadingTitle + "</b>";
      }
   }

   let status_div_name = this.GLG_div_name + "_status_div";
   let status_element = document.getElementById( status_div_name );
   if( status_element )
     status_element.innerHTML = message;
   else
     Debug( "Can't find " + status_div_name +
            " div: it may have been removed from the document." );
}

//////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     AppLog( message );
}

//////////////////////////////////////////////////////////////////////////
// Used only if USE_FIXED_TIMER_INTERVAL = false.
//////////////////////////////////////////////////////////////////////////
GlgSimpleViewer.prototype.AdjustTimerInterval = function()
{
   if( this.FirstDataQuery )
   {
      this.FirstDataQuery = false;

      // Restore TimerInterval in case it has been adjusted.
      this.TimerInterval = UPDATE_INTERVAL;
      return;
   }

   /* If updates and data queries are fast compared to the UPDATE_INTERVAL, 
      a simple timer with a fixed UPDATE_INTERVAL can be used, as shown in 
      the case of USE_FIXED_TIMER_INTERVAL=true, and the logic below 
      would not be necessary.

      However, if a timer with a fixed interval is started before rendering 
      is completed by PushData(), it may overload the browser and cause 
      sluggish response if rendering takes longer than the requested 
      UPDATE_INTERVAL. If a timer with a fixed interval is started after 
      PushData() is called, the actual update interval will be slower than 
      the requested interval if either rendering or data query takes longer.

      The logic below uses a dynamic timeout that attempts to maintain the 
      requested UPDATE_INTERVAL regardless of the fluctuations in the duration 
      of the data requests and drawing updates.
       
      The data query is asynchronous. If the data query takes a long time, 
      we want to issue the next data query right away, so that the new data 
      are loaded while the drawing is being updated with the data we received. 
      If data queries and drawing updates are fast, we want to use a timeout 
      that would ensure a requested UPDATE_INTERVAL. 
       
      To determine an appropriate timeout value, we would need to know how 
      long it took to query data, and how long it took to update the drawing.
      If the drawing rendering (refresh) by PushData() takes a long time, 
      there is no way to determine the time it took to load data, since the 
      GetDataCB data callback is delayed until the rendering is complete. 

      The code below uses iterative approach to dynamically adjust to the 
      fluctuations of the time required to render/refresh graphics and the time
      of each data query.
   */
   let current_time = new Date().getTime();
    
   let elapsed_time = current_time - this.DataStartTime;
   let idle_time    = elapsed_time - this.UpdateDuration;
    
   if( DEBUG_TIME_INTERVAL )
     AppLog( "Elapsed time=" + elapsed_time + 
             " update duration=" + this.UpdateDuration + 
             " idle time= " + idle_time );

   if( idle_time < MIN_IDLE_INTERVAL )
   {
      /* Rendering was too slow (idle time too small): increase timer interval
         to let the browser handle UI events.
      */
      this.TimerInterval += ( MIN_IDLE_INTERVAL - idle_time );
      if( DEBUG_TIME_INTERVAL )
        AppLog( "  Adding " +  ( MIN_IDLE_INTERVAL - idle_time ) );
      return;
   }

   if( elapsed_time < UPDATE_INTERVAL )
   {
      /* Data request + update was too fast, increase timer interval.
         Increase gradually using CHANGE_COEFF to avoid rapid jumps on a 
         single fast iteration that might have little data to update.
      */
      this.TimerInterval += ( UPDATE_INTERVAL - elapsed_time ) * CHANGE_COEFF;
   }
   else if( elapsed_time > UPDATE_INTERVAL )
   {
      // The data query took longer, decrease timer interval if possible.
      let delta = elapsed_time - UPDATE_INTERVAL;
        
      /* Can't adjust by more than max_allowed: need to maintain 
         MIN_IDLE_INTERVAL.
      */
      let max_allowed = idle_time - MIN_IDLE_INTERVAL;
        
      if( delta > max_allowed )
        delta = max_allowed;
        
      /* Decrease gradually using CHANGE_COEFF to avoid rapid jumps on a 
         single delayed data request.
      */
      this.TimerInterval -= delta * CHANGE_COEFF;
        
      if( this.TimerInterval < 0 )
        this.TimerInterval = 0;  // Data request is slow, use no delay.
   }
   // else : elapsed_time == UPDATE_INTERVAL, no change.
}
   
//////////////////////////////////////////////////////////////////////////
// GlgTagRecord object is used to store information for a given GLG tag. 
// It can be extended by the application as needed.
//////////////////////////////////////////////////////////////////////////
function GlgTagRecord( /*int*/ data_type, /*String*/ tag_name,
                       /*String*/ tag_source, /*GlgObject*/ tag_obj,
                       /*int*/ tag_access_type )
{
   this.data_type = data_type;              /* int */
   this.tag_name = tag_name;                /* String */
   this.tag_source = tag_source;            /* String */
   this.tag_obj = tag_obj;                  /* GlgObject */
   this.tag_access_type = tag_access_type;  /* int */ 

   /* The value type is double for data_type=D, or String for data_type=S.
      The value will be assigned when the tag data is received.
   */
   this.value = null;         
}
