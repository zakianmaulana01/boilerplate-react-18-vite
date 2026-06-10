//////////////////////////////////////////////////////////////////////////////
// GLG Viewer example
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// The library loads a GLG drawing and renders it on a web page, providing
// an API to animate the drawing with real-time data and handle user
// interaction with graphical objects in the drawing.
//
// The drawings are created using the GLG Graphics Builder, an interactive
// editor that allows to create graphical objects and define their dynamic
// behavior without any programming.
// 
// The viewer demonstrates how to:
// - animate a loaded drawing using tags defined in the drawing;
// - handle commands and custom events attached to objects in 
//   the GLG Builder;
// - handle message and alarm dialogs.
//
// This example is written with GLG Intermediate API. 
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint react/display-name: 0 */

import { GLG, IsUndefined, GetCurrTime, GetPreferredValue, ConfigureWindow,
         AppAlert, AppError, AppInfo, AppLog } from './Utils.js'
import { DemoDataFeed } from './DemoDataFeed.js'
import { LiveDataFeed } from './LiveDataFeed.js'
import { MessageDialogWidget } from './MessageDialog.js'
import { AlarmPage } from './GlgAlarms.js'
import { RTChartPage, FillChartHistory } from './GlgChart.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

// Default drawing name and title to be used on initial load.
const DEFAULT_DRAWING_NAME = "process_overview.g";
const DEFAULT_DRAWING_TITLE = "Process Overview";

/* If set to true, simulated demo data will be used for animation.
   Set to false to enable live application data.
*/
const RANDOM_DATA = true;

/* Set to true if ExtendedAPI is used for the project. It will allow to
   create PopupViewport on the fly withoutout a need to store it in
   each loaded drawing.
*/
const HAS_EXTENDED_API = true;

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

/* Page type table, is used to determine the type of a loaded page based
   on the PageType property of the drawing. May be extended by an application
   to add custom pages.
*/
const PageTypeTable = [
  "Default",
  "RealTimeChart",
  "TestCommands"
];
const DEFAULT_PAGE_TYPE = "Default";
const UNDEFINED_PAGE_TYPE = "Undefined";

/* A list of widget types of interest, based on the WidgetType property 
   of the object.
*/
const WidgetTypeTable = [
  "RTChart",
  "PopupMenu2"
];
const UNDEFINED_WIDGET_TYPE = "Undefined";
const DEFAULT_WIDGET_TYPE = "Default";

// A list of known command types, based on the CommandType property.
const CommandTypeTable = [
  "GoTo",
  "PopupDialog",
  "PopupMenu",
  "ClosePopupDialog",
  "ClosePopupMenu",
  "WriteValue",
  "WriteValueFromWidget"
];
const UNDEFINED_COMMAND_TYPE = "UndefinedCommand";
   
// A list of known popup dialog types, based on the DialogType property.
const DialogTypeTable = [
  "Popup",       /* Embedded popup dialog */
  "CustomDialog"
];
const UNDEFINED_DIALOG_TYPE = "UndefinedDialogType";
const DEFAULT_DIALOG_TYPE = "Popup";

// A list of known popup menu types, based on the MenuType property.
const PopupMenuTypeTable = [
  "PopupMenu",
  "CustomPopupMenu"
];
const UNDEFINED_MENU_TYPE = "UndefinedMenuType";
const DEFAULT_MENU_TYPE = "PopupMenu";

/* Popup viewport name stored in the drawing. If present, the viewport
   with this name will be used to display a popup menu or popup dialog 
   specified by the PopupMenu or PopupDialog command. The command may 
   override the popup name, using the command's resource
   MenuResource or DialogResource.
*/
const POPUP_VIEWPORT_NAME = "PopupViewport";

/* With the Intermediate API, the popup viewport is expected to be saved in the
   drawing. With the Extended API, the popup viewport may be added to the
   drawing on the fly at run-time, by loading the popup object from the GLG
   drawing file specified by POPUP_VIEWPORT_FILENAME.
*/
const POPUP_VIEWPORT_FILENAME = "popup_viewport.g";

/* Flag indicating how to supply a time stamp for a RealTime Chart that
   may be embedded into the loaded drawing: if set to 1, the application 
   will supply a time stamp explicitly. Otherwise, a time stamp will be 
   supplied automatically by chart using current time. 
*/
const SUPPLY_PLOT_TIME_STAMP = false;     /* boolean */

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
export function GlgViewer( glg_div_name, glg_path, is_standalone, is_mobile )
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
   this.Debug = DEBUG;    // Is passed to the sub-modules.
   
   // Use path to the drawings directory if supplied.
   this.GlgPath = glg_path;

   // Top level viewport of the loaded drawing (GlgObject).
   this.MainViewport = null;
   
   // Stores the name of the currently loaded drawing.
   this.LoadedDrawingName = null;

   /* This object is created in LoadDrawing() to store information about new 
      drawing load request and includes the following fields: 
      enabled, drawing_name and title.
   */
   this.DrawingLoadRequest = null;
   
   // DataFeed object used for animation.
   this.DataFeed = null;  

   // Stores an instance of RTChartPage.
   this.ChartPage = null;
   
   /* A template for the PopupViewport loaded as an asset.
      The template is loaded from a file defined by POPUP_VIEWPORT_FILENAME
      and initialized in LoadAssets if HAS_EXTENDED_API=true;  
   */
   this.PopupVPTemplate = null;
   
   /* A floating dialog used to display application messages. */
   this.MessageDialog = null;

   /* Alarms module. */
   this.AlarmPage = new AlarmPage( this );
   
   /* Flag to indicate all assets finished loading. This will ensure that 
      if LoadDrawing() is invoked from an external HTML button, drawing loading
      request will proceed only if all assets have already been loaded.
   */
   this.AssetsLoadedFlag = false;

   /* TouchDevice is set to true for a touch device if a touchstart event is 
      detected. Otherwise, it is set to false.
   */
   this.TouchDevice = false;

   // The type of the current page.
   this.PageType = null;   /* String */

   /* Update interval for the loaded drawing, may vary depending on the loaded 
      drawing (loaded GLG page).
   */
   this.UpdateInterval = UPDATE_INTERVAL;

   // Initial data query interval.
   this.TimerInterval = this.UpdateInterval;

   // Store active popup information.
   this.ActivePopup = null;   /* GlgActivePopup */

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
   this.WaitForPrefill = false;           /* boolean */
   this.NumPrefilledPlots = 0;            /* int */
    
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts the viewer by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgViewer.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   // Add event listener to detect a touch device.
   this.TouchEventListener = this.DetectTouchDevice.bind( this );
   document.addEventListener( "touchstart", this.TouchEventListener );
    
   // Add event listener to detect ESC key.
   this.KeydownEventListener = this.HandleKeyEvent.bind( this );
   document.addEventListener( "keydown", this.KeydownEventListener );

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
GlgViewer.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );

   this.Active = false;    // Ignore any pending updates and callbacks.

   this.DestroyDrawing();
   this.AlarmPage.DestroyAlarmDialog();
    
   if( this.DataFeed )
     this.DataFeed.Cleanup();              // Cleanup DataFeed.

    if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
   if( this.TouchEventListener )
     document.removeEventListener( "touchstart", this.TouchEventListener );
   if( this.KeydownEventListener )
     document.removeEventListener( "keydown", this.KeydownEventListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgViewer.prototype.LoadDrawing =
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
      this.ShowMessageDialog( "Invalid drawing filename.", false );
      return;
   }
   
   // Don't reload the drawing if it's already displayed.
   if( filename == this.LoadedDrawingName )
   {
      this.ShowMessageDialog( "This drawing is already displayed.", false );
      return;
   }

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
GlgViewer.prototype.GetFullName = function( /*String*/ drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}
   
//////////////////////////////////////////////////////////////////////////////
// Load Callback, invoked after a GLG drawing finished loading.
// 'drawing' parameter provides an obejct ID of the loaded GLG viewport.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LoadCB =
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
GlgViewer.prototype.StartGlgViewer = function( /*GlgObject*/ drawing )
{
   // Store loaded drawing.
   this.MainViewport = drawing;
   
   // Obtain PageType of the loaded drawing.
   this.PageType = GetPageType( this.MainViewport );
   
   // Initialize the page based on PageType.
   switch( this.PageType )
   {
    case "Default":
    case "TestCommands":
      this.SetupDefaultPage();
    break;
    case "RealTimeChart":
      this.ChartPage = new RTChartPage( this, this.MainViewport );
      this.ChartPage.Setup();
      break;
    default: return;   // An error was generated in GetPageType.
   }
   
   /* Obtain a list of tags in the loaded drawing and build TagRecords array
      to be used for animation.
   */
   this.QueryTags();
   
   // Flag to indicate first data query for the loaded page.
   this.FirstDataQuery = true;
   
   /* Start an update timer for real-time data and a separate timer
      to query alarm data.
   */  
   if( this.FirstDrawing )
   {
      this.FirstDrawing = false;
      this.GetData();
      
      /* Get alarm data and highlight the Alarms button if there are any 
         unacknowledged alarms.
      */
      this.AlarmPage.GetAlarmData();
   }
   
   // Display the drawing in a web page.
   this.MainViewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetupDefaultPage = function()
{
   this.UpdateInterval = UPDATE_INTERVAL;
   
   // Adjust the drawing for mobile devices if needed.
   this.AdjustForMobileDevices( this.MainViewport );
   
   // Initialization before hierarchy setup.
   this.InitBeforeH();
   
   // Setup object hierarchy in the drawing.
   this.MainViewport.SetupHierarchy();
   
   // Initialization after hierarchy setup.
   this.InitAfterH();
}

//////////////////////////////////////////////////////////////////////////////
// Destroy currently loaded drawing, if any.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DestroyDrawing = function()
{
   if( this.MainViewport == null )
     return;
   
   // Close active popup, if any, and unload the popup's drawing.
   this.CloseActivePopup();

   this.EraseMessageDialog();
   
   // Clear TagRecords array.
   this.TagRecords = null;
   
   // Perform page specific cleanup based on PageType.
   switch( this.PageType )
   {
    case "Default":
    case "TestCommands":
      break;
    case "RealTimeChart":
      this.ChartPage.Cleanup();
      this.ChartPage = null;
      break;
    default: return;
   }
   
   // Destroy loaded drawing.
   this.MainViewport.ResetHierarchy();
   this.MainViewport = null;
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
// Cancels any pending drawing load requests.
////////////////////////////////////////////////////////////////////////////// 
GlgViewer.prototype.AbortPendingLoadRequests = function()
{
   if( this.DrawingLoadRequest != null )
   {
      this.DrawingLoadRequest.enabled = false;
      this.DrawingLoadRequest = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitBeforeH = function()
{
   // Add event listeners.
   this.MainViewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                                  this.InputCallback.bind( this ) );
   this.MainViewport.AddListener( GLG.GlgCallbackType.TRACE_CB,
                                  this.TraceCallback.bind( this ) );
   this.MainViewport.AddListener( GLG.GlgCallbackType.HIERARCHY_CB,
                                  this.HierarchyCallback.bind( this ) );
   
   /* Set "ProcessMouse" for the loaded viewport to enable custom commands,
      custom events and tooltips.
   */
   this.MainViewport.SetDResource( "ProcessMouse", 
                                   ( GLG.GlgProcessMouseMask.MOUSE_CLICK | 
                                     GLG.GlgProcessMouseMask.MOUSE_OVER_TOOLTIP ) );
   
   // If the drawing contains popup viewport, make it initially invisible.
   let popup_vp = this.MainViewport.GetResourceObject( POPUP_VIEWPORT_NAME );
   if( popup_vp != null )
   {        
      // Reorder popup viewport to draw on top of other viewports.
      ReorderToFront( this.MainViewport, popup_vp );
      
      // Hide popup viewport.
      popup_vp.SetDResource( "Visibility", 0. );
   }
   
   // If the drawing contains QuitButton, make it invisible.
   if( this.MainViewport.HasResourceObject( "QuitButton" ) )
     this.MainViewport.SetDResource( "QuitButton/Visibility", 0 );
}

//////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitAfterH = function()
{
   // Place custom application code as needed.
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.QueryTags = function()
{
   // Build TagRecords array, a list of GLG tag records.
   this.TagRecords = CreateTagRecords( this.MainViewport );

   /* If a drawing contains a chart, ValueEntryPoint of each plot may have
      a tag to push data values using the common tag mechanism. 
      The time stamp for the corresponding TimeEntryPoint of the plot
      may be supplied either automatically by the chart 
      (SUPPLY_PLOT_TIME_STAMP=false), or the application may supply the
      time stamp explicitly for each data sample (SUPPLY_PLOT_TIME_STAMP=true).
      
      If SUPPLY_PLOT_TIME_STAMP=true, a tag record in TagRecords array should
      store TimeEntryPoint (plot_time_ep) of a plot with a corresponding 
      tag source, so that the application can supply a time stamp to the
      plot's data sample. 
      
      If not found, plot_time_ep=null.

      Each tag record also stores ValueEntryPoint and ValidEntryPoint for 
      a plot in a chart. 
   */
   if( SUPPLY_PLOT_TIME_STAMP )
     this.StoreTimeEntryPoints( this.MainViewport );
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AddDataFeed = function()
{
   if( RANDOM_DATA )
   {
      this.DataFeed = new DemoDataFeed( this );
      AppLog( "Using random DemoDataFeed." );
   }
   else
   {
      this.DataFeed = new LiveDataFeed( this );
      AppLog( "Using LiveDataFeed." );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Create and populate TagRecords array, with elements of type
// GlgTagRecord.
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
      let tag_comment = tag_obj.GetSResource( "TagComment" );
      
      // Skip undefined tags.
      if( IsUndefined( tag_source ) )
        continue;
      
      if( RANDOM_DATA )
      {
         /* For demo purposes only, skip tags that have:
            - TagName contains "Test";
            - TagSource contains "Test";
            - TagComment contains "Test".
            Such tags may be present in the objects allowing to test commands
            such as WriteValue or WriteValueFromWidget.
         */
         if( !IsUndefined( tag_name ) && tag_name.indexOf( "Test" ) >= 0 )
           continue;
         if( tag_source.indexOf( "Test" ) >= 0 )
           continue;
         if( !IsUndefined( tag_comment ) && 
             tag_comment.indexOf( "Test" ) >= 0 )
           continue;
      }
      
      // Obtain tag access type.
      let tag_access_type =
        Math.trunc( tag_obj.GetDResource( "TagAccessType" ) );
      
      switch( tag_access_type )
      {
       case GLG.GlgTagAccessType.OUTPUT_TAG:
         // Skip OUTPUT tags.
         continue;
         
       case GLG.GlgTagAccessType.INIT_ONLY_TAG:
       case GLG.GlgTagAccessType.INPUT_TAG:
       default: break;
      }
      
      // Add a valid tag record to the list. 
      let tag_record = new GlgTagRecord( data_type, tag_name, tag_source, 
                                         tag_obj, tag_access_type );
      
      /* Set if_changed flag to true, so that the new value will be pushed
         into the graphics only if the value has changed.
         The flag will be ignored if a tag is attached to a plot entry point
         in a real-time chart, so that the chart will scroll even if the
         value hasn't changed.
      */
      tag_record.if_changed = true;
      
      tag_record_array.push( tag_record );
   }
   
   Debug( "TagRecords array size: " + tag_record_array.length ); 
   
   if( tag_record_array.length == 0 )
     return null;
      
   return tag_record_array;
}

//////////////////////////////////////////////////////////////////////////////
// Obtains real-time data for all tags defined in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetData = function()
{
   if( !this.Active || this.DataFeed == null )
     return;
   
   /* If the loaded drawing doesn't have tags, get the timer going using 
      a shorter update interval.
   */
    if( this.TagRecords == null || this.WaitForPrefill )
   {
      setTimeout( ()=>this.GetData(), 30 );
      return;
   }
   
   this.DataStartTime = new Date().getTime();
   
   /* Obtain new real-time data values for all tags in the TagRecords and 
      invoke GetDataCB callback when done. Pass currently loaded drawing name
      to the callback.
   */
   this.DataFeed.ReadData( this.TagRecords,
                           /*callback*/ this.GetDataCB.bind( this ), 
                           /*user data*/ this.LoadedDrawingName );
}

//////////////////////////////////////////////////////////////////////////
// Data query callback. It is invoked by the DataFeed after the new data 
// are received from the server.
//////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetDataCB = function( new_data, drawing_name )
{
   if( !this.Active )
     return;
   
   /* Ignore new data if the drawing name has changed and a new drawing 
      has been loaded. Stop further queries for the old drawing and start 
      queries for the tag list of the new drawing.
   */ 
   if( drawing_name != this.LoadedDrawingName )
   {
      /* When a new drawing is loaded, restart the timer with a shorter
         time interval to fill the newly loaded drawing with data right away.
      */
      setTimeout( ()=>this.GetData(), 30 );   
      return;
   }

   /* Perform processing of new data using application specific 
      data format. The returned new_data is expected to be an array of
      objects with the following properties:
        { tag_source: tag_source, value: data_value, time_stamp: time_stamp }
   */ 
   new_data = this.DataFeed.ProcessRawData( new_data );
    
   /* Query new data even if the previous query failed (new_data is null),
      to continue data updates even if there were intermittent network errors.
   */
   if( USE_FIXED_TIMER_INTERVAL )  // Use fixed targeted UpdateInterval
   {
      // Push new data to the graphics.
      this.PushData( new_data );
      
      // Send new data query request.
      setTimeout( ()=>this.GetData(), this.UpdateInterval );
   }
   else   // Adjust TimerInterval to try obtain a targeted UpdateInterval
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
        /* Data query took longer than targeted UpdateInterval: process
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
GlgViewer.prototype.ProcessData = function( new_data )
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
// tag record in TagRecords array with a matching tag_source, store the
// new value in the found tag record, and push new value into graphics.
// new_data is an array of objects with the following properties:
//  { tag_source: tag_source, value: data_value, time_stamp: time_stamp }.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.PushData = function( new_data )
{
   if( new_data == null || new_data.length == 0 )
   {
      AppInfo( "No new data received." );
      return;
   }
   
   if( this.TagRecords == null )
     return;
   
   for( let i=0; i<new_data.length; ++i )
   {
      /* Find a tag record for the received tag data value based on its
         tag_source.
      */
      let tag_record = this.LookupTagRecords( new_data[i].tag_source );
      if( tag_record == null )
        continue;           // Tag record not found.
      
      /* Store new data in the found tag_record, using properties:
         value, time_stamp, value_valid. If data record verification
         fails, an error is generated in StoreTagData and this tag
         is omitted.
      */
      if( !this.StoreTagData( tag_record, new_data[i] ) )
           continue;
      
      // Push new data value into graphics.
      switch( tag_record.data_type )
      {
       case GLG.GlgDataType.D: // D-type tag
         this.MainViewport.SetDTag( tag_record.tag_source, tag_record.value, 
                                    tag_record.if_changed );
         
         /* Push a time stamp to the TimeEntryPoint of a plot in 
            a real-time chart, if found.
         */ 
         if( tag_record.plot_time_ep != null && 
             tag_record.time_stamp != null )
           tag_record.plot_time_ep.SetDResource( null, 
                                                 tag_record.time_stamp );
         
         if( tag_record.plot_valid_ep != null )
           tag_record.plot_valid_ep.SetDResource( null,
                                                  tag_record.value_valid ? 1. : 0. );
         
         break;
         
       case GLG.GlgDataType.S:
         this.MainViewport.SetSTag( tag_record.tag_source, tag_record.value, 
                                    tag_record.if_changed );
         break;
         
       default:     
       case GLG.GlgDataType.G:      // Not used in this example.
         break;
      }
   }
   
   // Refresh display.
   this.MainViewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Store new value, time stamp and the valid flag in the found tag_record.
// data_record is an object with the following properties:
// { tag_source: tag_source, value: data_value, time_stamp: time_stamp }.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StoreTagData = function( /*GlgTagRecord*/ tag_record,
                                             data_record )
{
    if( data_record.tag_source != tag_record.tag_source ||
        data_record.value == null )
   {
       AppError( "Invalid data received for tag = " + tag_record.tag_source );
       return false;
   }

   let tag_source = data_record.tag_source;
   let value = data_record.value;
    
   switch( tag_record.data_type )
   {
    case GLG.GlgDataType.D: // D-type tag
      let d_value = Number.parseFloat( value );
      if( Number.isNaN( d_value ) )
      {
         AppError( "Invalid value received for D-type tag: " +
                   "  tag=" + tag_source + " value=" + value );
         return false;
      }
      
      // Store new value in the tag_record as a float.
      tag_record.value = d_value;
      break;
      
    case GLG.GlgDataType.S: // S-type tag
      // Verify the received data value is of type 'string'.
      if( typeof value != 'string' )
      {
         AppError( "Invalid value received for S-type tag: " +
                   "  tag=" + tag_source + " value=" + value );
         return false;
      }
      
      // Store new value in the tag_record as a string.
      tag_record.value = value;
      break;
       
    case GLG.GlgDataType.G: // Unsupported in this demo.
      AppError( "Invalid data_type. Skipping tag = " + tag_source );
      return false;
   }

   // Store time stamp.
   tag_record.time_stamp = data_record.time_stamp;
   
   /* If the drawing contains a chart and tag_record contains entry point 
      plot_valid_ep, check if the incoming value is valid.
   */
   let value_valid = true;
   if( tag_record.plot_valid_ep != null )
     value_valid = 
       this.DataFeed.IsValid( tag_record.tag_source, tag_record.data_type,
                              tag_record.value );
   
   tag_record.value_valid = value_valid;

   return true;
} 

//////////////////////////////////////////////////////////////////////////////
// Handle user interaction with the buttons, as well as process custom
// actions attached to objects in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InputCallback = function( /*GlgObject*/ viewport,
                                              /*GlgObject*/ message_obj )
{
   if( !this.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );   /*String*/
   let format = message_obj.GetSResource( "Format" );   /*String*/
   let action = message_obj.GetSResource( "Action" );   /*String*/
   
   // Retrieve selected object ID from the message object.
   let selected_obj = message_obj.GetResourceObject( "Object" );
   
   // Handle custom commands attached to objects at design time.
   if( format == "Command" )
   {
      let action_obj = message_obj.GetResourceObject( "ActionObject" ); 
      this.ProcessObjectCommand( viewport, selected_obj, action_obj );
      viewport.Update();
   }
   
   // Handle custom events.
   else if( format == "CustomEvent" )
   {
      let event_label = message_obj.GetSResource( "EventLabel" );
      let action_data = null;
      
      if( event_label == null || event_label == "" )
        return;    // don't process events with empty EventLabel.
      
      let action_obj = message_obj.GetResourceObject( "ActionObject" ); 
      if( action_obj != null )
        action_data = action_obj.GetResourceObject( "ActionData" );
      
      /* Place custom code here to handle custom events as needed. */
      
      viewport.Update();
   }
   
   if( format == "Button" )
   {	 
      // Neither a push button or a toggle button.
      if( action !="Activate" && action != "ValueChanged" )
        return;
      
      if( action == "Activate" )  // Push button event.
      {
         // Place custom code here to handle push button events as needed.
      }
      else if( action == "ValueChanged" ) // Toggle button event.
      {
         let state = message_obj.GetDResource( "OnState" );
         
         // Place code here to handle events from a toggle button
         // and write a new value to a given tag_source.
         // this.DataFeed.WriteDValue( tag_source, state );
         
         if ( RANDOM_DATA && this.MainViewport.HasTagSource( "State" ) )
           this.DataFeed.WriteDValue( "State", state );
         else // Place custom code here
           ;
      }
      
      viewport.Update();  //format = "Button"
   }
   
   else if( format == "Timer" )   // Handles timer transformations.
     viewport.Update();
   
   // Window closing.
   else if( format == "Window" && action == "DeleteWindow" )
   {
      if( selected_obj == null )
        return;
      
      // If the closing window is an active popup dialog, close active popup. 
      if( this.ActivePopup != null &&
          selected_obj.Equals( this.ActivePopup.popup_vp ) )
      {
         this.ClosePopupDialog( this.ActivePopup.popup_type );
         viewport.Update();
      }
   }
   
   /* Update drawing when a subdrawing, a subwindow or an image loads a new
      drawing or a new image.
   */
   else if( format == "TemplateLoad" || format == "ImageLoad" )
     this.MainViewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Trace callback is used to process native events of interest.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.TraceCallback =
  function( /*GlgObject*/ viewport, /*GlgTaceData*/ trace_info )
{   
   if( !this.Active )
     return;

   let x, y; // Cursor position.
   let event_type = trace_info.event_type;
   
   switch( event_type )
   {
    case GLG.GlgEventType.MOUSE_PRESSED:
    case GLG.GlgEventType.MOUSE_MOVED:
      x = trace_info.mouse_x * this.CoordScale;
      y = trace_info.mouse_y * this.CoordScale;
      break;
      
    case GLG.GlgEventType.KEY_DOWN:
      /* Add custom code to handle various keys as needed when the
         input focus is in the GLG drawing.
      */
      let keyCode = trace_info.event.keyCode; /* int */
      break;

    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Hierarchy callback, added to the top level viewport and invoked when 
// when a new drawing is loaded into a Subwindow object. 
// For example, PopupDialog and PopupMenu viewports contain a Subwdinow 
// named DrawingArea where a popup drawing is loaded.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.HierarchyCallback =
  function( /*GlgObject*/ viewport, /*GlgHierarchyData*/ info_data )
{
   /* Process only Subwindow reference objects used to switch drawings,
      ignore Subdrawings.
   */
   if( info_data.reference_type != GLG.GlgReferenceType.SUBWINDOW_REF )
     return;

   let subwindow = info_data.object;       /* GlgObject */
   let drawing_vp = info_data.subobject;   /* GlgObject */   
    
   /* This callback is invoked multiple times: before hierarchy setup
      for the new drawing, after hierarchy setup, as well as the setup has
      finished and all transformed values are valid.
      Drawing initialization can be done here if needed.
   */
   switch( info_data.condition )
   {
    case GLG.GlgHierarchyCallbackType.BEFORE_SETUP_CB:
      if( drawing_vp == null )
      {
         AppAlert( "Drawing loading failed." ); 
         return;
      }
      
      /* Set "ProcessMouse" attribute for the loaded viewport, to process
         custom events and tooltips.
      */
      drawing_vp.SetDResource( "ProcessMouse",
                               ( GLG.GlgProcessMouseMask.MOUSE_CLICK | 
                                 GLG.GlgProcessMouseMask.MOUSE_OVER_TOOLTIP ) );
      
      /* Set "OwnsInputCB" attribute for the loaded viewport,
         so that Input callback is invoked with this viewport ID.
      */
      drawing_vp.SetDResource( "OwnsInputCB", 1.0 ); 
      break;
      
    case GLG.GlgHierarchyCallbackType.AFTER_SETUP_CB:
      /* Store the loaded drawing viewport in the ActivePopup, if any. */
      if( this.ActivePopup != null &&
          this.ActivePopup.subwindow.Equals( subwindow ) )
      {
         /* Use GetReference API method to obtain a GlgObject instance
            that can be stored in a global variable.
         */
         this.ActivePopup.drawing_vp = GLG.GetReference( drawing_vp );
      }
      break;

    case GLG.GlgHierarchyCallbackType.FINISHED_SETUP_CB:
      /* Finalize popup initialization. */
      if( this.ActivePopup != null &&
          this.ActivePopup.subwindow.Equals( subwindow ) )
      {
         this.FinalizeActivePopup();
      }
      break;
      
    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ProcessObjectCommand = function( /*GlgObject*/ command_vp, 
                                                     /*GlgObject*/ selected_obj,
                                                     /*GlgObject*/ action_obj )
{
   if( selected_obj == null || action_obj == null )
     return;
   
   // Retrieve Command object.
   let command_obj = action_obj.GetResourceObject( "Command" ); /*GlgObject*/
   if( command_obj == null )
     return;
   
   /* Retrieve EventLabel. Add custom application code to handle application
      specific event labels.
   */
   let event_label = action_obj.GetSResource( "EventLabel" ); /*String*/
   
   let command_type = GetCommandType( command_obj );
   switch( command_type )
   {
    case "PopupDialog":
      this.DisplayPopupDialog( command_vp, selected_obj, command_obj,
                               event_label );
      break;
    case "ClosePopupDialog":
      let dialog_type = GetDialogType( command_obj );
      this.ClosePopupDialog( dialog_type );
      break;
    case "PopupMenu":
      this.DisplayPopupMenu( command_vp, selected_obj, command_obj,
                             event_label );
      break;
    case "ClosePopupMenu":
      let menu_type = GetPopupMenuType( command_obj );
      this.ClosePopupMenu( menu_type );
      break;
    case "GoTo":
      this.GoTo( command_vp, selected_obj, command_obj );
      break;
    case "WriteValue":
      this.WriteValue( command_vp, selected_obj, command_obj );
      break;
    case "WriteValueFromWidget":
      this.WriteValueFromInputWidget( command_vp, selected_obj, command_obj );
      break;
    default: 
      AppAlert( "Command failed: Undefined CommandType." );
      break;
   }
}

//////////////////////////////////////////////////////////////////////   
// Process command "PopupDialog". The requested dialog is expected to be
// embedded into the currently loaded drawing.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayPopupDialog = function( /*GlgObject*/ command_vp, 
                                                   /*GlgObject*/ selected_obj, 
                                                   /*GlgObject*/ command_obj,
                                                   /*String*/ event_label )
{ 
   /* Obtain DialogType. This example handles dialogs embedded in the
      loaded drawing. The application may extend the code 
      to handle various application specific dialog types.
   */
   let dialog_type = GetDialogType( command_obj );
   
   // Close currently active popup dialog, if any.
   this.ClosePopupDialog( dialog_type );
   
   switch( dialog_type )
   {
    case "Popup":
      // Retrieve dialog name.
      let dialog_res = command_obj.GetSResource( "DialogResource" );
      
      /* If undefined, use default popup viewport name to load and display
         a popup dialog drawing specified by the command.
      */
      if( IsUndefined( dialog_res ) )
        dialog_res = POPUP_VIEWPORT_NAME;
      
      this.DisplayEmbeddedPopup( "Popup", dialog_res, selected_obj, command_obj,
                                 event_label );
      break;
      
    case "CustomDialog":
      // Add custom code here to handle custom dialog types.
      break;

    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////////
// This method may be extended to handle closing of different dialog types. 
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ClosePopupDialog = function( /*int*/ dialog_type )
{
   if( this.ActivePopup == null )
     return; // Nothing to do.
   
   /* Close currently active popup dialog. It clears the current popup
      and rebuilds TagRecords array.
   */
   this.CloseActivePopup();
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayPopupMenu = function( /*GlgObject*/ command_vp, 
                                                 /*GlgObject*/ selected_obj,
                                                 /*GlgObject*/ command_obj,
                                                 /*String*/    event_label )
{     
   /* Obtain MenuType. This example handles only one menu type, where the menu
      is embedded in the loaded drawing. The application may extend the code 
      to handle various application specific dialog types.
   */
   let menu_type = GetPopupMenuType( command_obj );
   
   // Close currently active popup menu, if any.
   this.ClosePopupMenu( menu_type );
   
   switch( menu_type )
   {
    case "PopupMenu":
      // Retrieve menu name.
      let menu_res = command_obj.GetSResource( "MenuResource" );
      
      /* If undefined, use default popup viewport name to load display
         a popup menu drawing specified by the command.
      */
      if( IsUndefined( menu_res ) )
        menu_res = POPUP_VIEWPORT_NAME;
      
      this.DisplayEmbeddedPopup( "PopupMenu", menu_res, selected_obj,
                                 command_obj, event_label );
      break;
      
    case "CustomMenu":
      // Add code here to handle custom popup meny type.
      break;

    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////////
// This method camn be extended to handle closing if different menu types.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ClosePopupMenu = function( /*int*/ menu_type )
{
   if( this.ActivePopup == null )
     return; // Nothing to do.
   
   /* Close currently active popup dialog. It clears the current popup
      and rebuilds TagRecords array.
   */
   this.CloseActivePopup();
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CloseActivePopup = function()
{
   if( this.ActivePopup == null )
     return;

   /* Reset ActivePopup object. This disables FinalizeActivePopup logic
      in the Hierarchy callback. Local variable is used to load empty 
      drawing below.
   */
   let active_popup = this.ActivePopup; /* GlgActivePopup */
   this.ActivePopup = null;
   
   switch( active_popup.popup_type )
   {
    case "Popup":      /* Embedded popup dialog */
    case "PopupMenu":
      // Destroy currently loaded popup drawing and load empty drawing.
      if( active_popup.subwindow != null )
        active_popup.subwindow.SetSResource( "SourcePath",
                                            "empty_drawing.g" );
    // Make popup invisible.
    active_popup.popup_vp.SetDResource( "Visibility", 0 );  
    active_popup.popup_vp.Update();
    break;
      
    case "CustomDialog":
      // Add custom code here to handle custom dialog.
      break;
      
    case "CustomMenu":
      // Add custom code here to handle custom menu types.
      break;

    default:
      AppAlert( "Popup closing failed." );
      break;
   }
   
   // Rebuild TagRecords array.
   this.QueryTags();
}

//////////////////////////////////////////////////////////////////////////////
// Process "GoTo" command. The command loads a new drawing specified
// by the DrawingFile parameter and replaces current drawing.
////////////////////////////////////////////////////////////////////// 
GlgViewer.prototype.GoTo = function( command_vp, selected_obj, command_obj )
{
   // Retrieve command parameters. 
   let drawing_file = command_obj.GetSResource( "DrawingFile" );
   let title = command_obj.GetSResource( "Title" );
   
   // If DrawingFile is not valid, abort the command.
   if( IsUndefined( drawing_file ) )
   {
      AppAlert( "GoTo Command failed: Invalid DrawingFile." );
      return;
   }

   // Load requested drawing, replacing current drawing.
   this.LoadDrawing( drawing_file, title );
}

//////////////////////////////////////////////////////////////////////    
// Process command "WriteValue". The command writes a new value specified
// by the Value parameter into the tag in the back-end system
// specified by the OutputTagHolder.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.WriteValue =
  function( command_vp, selected_obj, command_obj )
{
   // Retrieve tag source to write data to.
   let tag_source =  command_obj.GetSResource( "OutputTagHolder/TagSource" );
   
   // Validate.
   if( IsUndefined( tag_source ) )
   {
      AppAlert( "WriteValue Command failed: Invalid TagSource." );
      return;
   }
   
   // Retrieve the new value to be written to the specified output tag.
   let value = command_obj.GetDResource( "Value" );
   
   /* Place custom code here as needed, to validate the value specified
      in the command.
   */
   
   /* Write new value to the specified tag source. */
   this.DataFeed.WriteDValue( tag_source, value );
}

//////////////////////////////////////////////////////////////////////////////
// Process command "WriteValueFromWidget". The command allows writing
// a new value into the tag in the back-end system using an input
// widget, such as a toggle or a spinner.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.WriteValueFromInputWidget =
  function( command_vp, widget, command_obj )
{
   /* Retrieve input widget's resource name that stores the new value 
      when the user uses the input widget to change the value.
      For a spinner, the resource name is "Value"; for a toggle button, 
      it is "OnState".
   */
   let widget_value_res = command_obj.GetSResource( "ValueResource" );
   
   /* Obtain object ID of the input resource/tag object we read the 
      new value from.
   */
   let input_tag_obj = widget.GetResourceObject( widget_value_res );
   if( input_tag_obj == null )
     return;
   
   // Obtain object ID of the write tag object (output tag).
   let output_tag_obj = command_obj.GetResourceObject( "OutputTagHolder" ); 
   if( output_tag_obj == null )
     return;
   
   /* Obtain TagSource from the write tag. */
   let output_tag_source = output_tag_obj.GetSResource( "TagSource" );
   
   /* Validate. */
   if( IsUndefined( output_tag_source ) )
   {
      AppAlert( "Write Command failed: Invalid Output TagSource." );
      return;
   }
   
   // Retrieve new value from the input widget.
   let value = input_tag_obj.GetDResource( null );
   
   // Write the new value retrieved from the widget to the output tag.
   this.DataFeed.WriteDValue( output_tag_source, value );
}

//////////////////////////////////////////////////////////////////////////////
// Handle popups embedded in the loaded drawing.
// popup_name specifies the viewport name in the drawing to be used to
// display a popu menu ot popup dialog drawing specified by the command.
// 
// With the Intermediate API, a popup viewport is expected to be saved 
// in each drawing that supports popup commands. 
// With the Extended API, the popup viewport can be added to the
// drawing on the fly at run-time.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayEmbeddedPopup =
  function( /*int*/ popup_type, /*String*/ popup_name,
            /*GlgObject*/ selected_obj, /*GlgObject*/ command_obj,
            /*String*/ event_label )
{
   /* Retrieve DrawingFile from the command, which specifies the 
      GLG drawing to be displayed in the popup viewport.
   */
   let drawing_file = command_obj.GetSResource( "DrawingFile" );
   if( IsUndefined( drawing_file ) )
   {
      AppAlert( "Invalid DrawingFile, popup command failed." );
      return;
   }
   
   // Extract Title string from the command.
   let title = command_obj.GetSResource( "Title" );
   
   /* Extract  ParamS and ParamD parameters from the command, which may
      define extra custom data.
   */
   let paramS = command_obj.GetSResource( "ParamS" );
   let paramD = command_obj.GetDResource( "ParamD" );
   
   // Store information for the active popup.
   this.ActivePopup =
     this.CreateActivePopup( popup_type, popup_name, drawing_file,
                             selected_obj, title, paramS, paramD );    
   if( this.ActivePopup == null )
   {
      AppAlert( "Popup command failed." );
      return;
   }
   
   // Load GLG drawing into the popup viewport.
   this.ActivePopup.subwindow.SetSResource( "SourcePath", drawing_file );

   /* Set ShellType to make a popup dialog with a floating dialog shell, 
      or a popup menu with a non-floating viewport.
   */
   let shell_type;
   if( this.ActivePopup.popup_type == "Popup" )
   {
      this.ActivePopup.is_floating = true;
      shell_type = GLG.GlgShellType.DIALOG_SHELL;
   }
   else
   {
      this.ActivePopup.is_floating = false;
      shell_type = GLG.GlgShellType.NO_TOP_SHELL;
   }   
   /* Set ShellType only if it changed (if_changed=GlgTrue). */
   this.ActivePopup.popup_vp.SetDResourceIf( "ShellType", shell_type, true );
}

//////////////////////////////////////////////////////////////////////////////
// Finish popup initialization. This method is invoked in HierarchyCallback
// after hierarchy is set up for the loaded popup drawing.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinalizeActivePopup = function()
{ 
   if( this.ActivePopup == null || this.ActivePopup.drawing_vp == null ) 
   {
      AppAlert( "Popup command failed." );
      this.CloseActivePopup();
      return;
   }
   
   /* Initialize tags and other parameters in the popup based on the 
      selected object.
   */
   this.InitializePopup();
   
   // Adjust popup parameters for mobile devices as needed.
   this.AdjustForMobileDevices( this.ActivePopup.drawing_vp );
   
   /* Set popup viewport size, based on the size of the loaded popup drawing,
      and position it next to the selected object.
   */
   this.SetPopupSizeAndPosition();
   
   /* Rebuild TagRecords array, in case there are INPUT tags in the loaded 
      popup drawing.
   */
   this.QueryTags();
   
   /* Make the new popup visible. Update() call to refresh display will be 
      invoked in the InputCallback on TemplateLoad message generated 
      after the new drawing is loaded into a subwindow and is set up.
   */
   this.ActivePopup.popup_vp.SetDResource( "Visibility", 1 );
}

//////////////////////////////////////////////////////////////////////////////
// Create GlgActivePopup object and store information about the currently
// active popup.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CreateActivePopup =
  function( /*int*/ popup_type, /*String*/ popup_name, 
            /*String*/ drawing_file, /*GlgObject*/ selected_obj,
            /*String*/ title, /*String*/ paramS,
            /*double*/ paramD )           /* GlgActivePopup */
{
   if( this.MainViewport == null )
     return null;
   
   // Retrieve popup viewport, if any.
   let popup_vp = this.MainViewport.GetResourceObject( popup_name );
   
   if( popup_vp == null )
   {
      /* A popup viewport has a custom name different from default, but
         an object with this name is not found in the loaded drawing: 
         generate an error and return.
      */
      if( popup_name != POPUP_VIEWPORT_NAME )
      {
         AppAlert( "Can't find embedded dialog or menu " + popup_name );
         return null;
      }
      
      /* A popup viewport with a default name is not present in the loaded 
         drawing: add it on the fly from PopupVPTemplate. 
         Extended API is required to execute this functionality.
      */
      if( HAS_EXTENDED_API )
      {
         if( this.PopupVPTemplate == null )
         {
            AppAlert( "Null popup viewport template." );
            return null;
         }
         
         /* Create a new PopupViewport by making a copy of the popup 
            tempate, and add the popup viewport to the drawing.
         */
         popup_vp =
           this.PopupVPTemplate.CloneObject( GLG.GlgCloneType.STRONG_CLONE );
         this.MainViewport.AddObjectToBottom( popup_vp );
      }
      else
      {
         AppAlert( "Can't find popup viewport " + popup_name );
         return null;
      }
   }
   
   // Retrieve DrawingArea subwindow from the popup viewport.
   let subwindow = popup_vp.GetResourceObject( "DrawingArea" );
   if( subwindow == null ) 
   {
      AppAlert( "Can't find DrawingArea in the popup viewport." );
      return null;
   }
   
   // Create a new ActivePopup object.
   let active_popup = new GlgActivePopup( popup_type, popup_vp, drawing_file, 
                                          subwindow, selected_obj, title,
                                          paramS, paramD );
   return active_popup;
}

//////////////////////////////////////////////////////////////////////////////
// If there is a Chart object in the drawing, and a plot in the chart
// has a valid tag for the ValueEnterPoint, the tag record for that tag
// should store object IDs for the plot's TimeEntryPoint and ValidEntryPoint.
// It enables the application to push a time stamp and validity flag
// for each data point in a chart, if needed.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StoreTimeEntryPoints = function( /*GlgObject*/ viewport )
{
   if( this.TagRecords == null )
     return;
   
   // Obtain a list of all tags, including non-unique tag sources.
   let tag_list =    /* GlgObject */
     viewport.CreateTagList( /* List all tags */ false ); 
    
   if( tag_list == null )
     return;
   
   let size = tag_list.GetSize();
   if( size == 0 )
     return; /* no tags found */
   
   /* For each tag in the list, check if there is a chart object in the
      drawing that has a plot with a matching TagSource assigned to the 
      plot's ValueEntryPoint. If found, obtain plot's TimeEntryPoint, 
      ValidEntryPoint and ValueEntryPoint, and store their objects IDs 
      in the tag record with a matching tag_source. Process only tags
      of type INPUT_TAG.
   */
   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );   /* GlgObject */
      
      /* Check if the tag belongs to a chart's Entry Point.
         If yes, proceed with finding the PLOT object the tag belongs to.
         Otherwise, skip this tag object.
      */
      if( tag_obj.GetDResource( "AlwaysChanged" ) == 0 )
        continue;
      
      /* Retrieve TagSource and TagComment. In the demo, TagComment is
         not used, but the application may use it as needed.
      */
      let tag_comment = tag_obj.GetSResource( "TagComment" );   /* String */
      let tag_source = tag_obj.GetSResource( "TagSource" );     /* String */
      
      if( IsUndefined( tag_source ) )
        return;
      
      /* We are interested only in INPUT tags that are subject
         to periodic data updates.
      */
      let access_type = Math.trunc( tag_obj.GetDResource( "TagAccessType" ) );
      if( access_type != GLG.GlgTagAccessType.INPUT_TAG )
        continue;
      
      /* Find a plot object in a RealTimeChart (if any) with a matching 
         TagSource assigned for the plot's ValueEntryPoint.
         It is assumed that there is ONLY ONE plot in the drawing 
         with a given TagSource. 
      */
      let plot = FindMatchingPlot( tag_obj );   /* GlgObject */
      if( plot == null )
        continue;   /* There is no plot for this tag source. */
      
      this.StorePlotEntryPoints( plot, tag_source );
   }
}

//////////////////////////////////////////////////////////////////////////////
// For a given tag object, find a parent plot object (PLOT object type). 
// If found, return the plot object. It is assumed that there is ONLY ONE 
// plot in the drawing with a given TagSource. 
//////////////////////////////////////////////////////////////////////////////
function FindMatchingPlot( /*GlgObject*/ tag_obj )
{
   /* Traverse only if the tag is set up. It will not be set up
      a tag is connected to a subdrawing which has not been loaded yet.
      It is assumed that if a drawing contains a chart, the chart is
      not inside a subdrawing. Otherwise, a special handling would be
      required.
   */
   if( tag_obj.GetDResource( "HISetup" ) == 0 )
     return null;
   
   /* Search for a plot object type, which is a parent of the tag_obj
      (ValueEntryPoint).
   */
   let match_type = GLG.GlgObjectMatchType.OBJECT_TYPE_MATCH;
   let find_parents = true;
   let find_first_match = true;
   let search_inside = false;
   let search_drawable_only = false;
   let object_type = GLG.GlgObjectType.PLOT;
   // null parameters at the end: may be omitted.
   // let object_name = null;
   // let resource_name = null;
   // let object_id = null;
   // let custom_match = null;
   
   let rval =
     tag_obj.FindMatchingObjects( match_type, find_parents, find_first_match,
                                  search_inside, search_drawable_only,
                                  object_type
                                  /* omitting trailing null parameters */ );
   
   if( rval == null || rval.found_object == null )
     return null;
   else
     return rval.found_object;
}

//////////////////////////////////////////////////////////////////////////////
// Store object IDs for the plot's ValueEntryPoint, TimeEntryPoint and
// ValueEntryPoint in a tag record that has a specified tag_source.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StorePlotEntryPoints = function( /*GlgObject*/ plot,
                                                     /*String*/ tag_source )
{
   if( plot == null || IsUndefined( tag_source ) )
     return;
   
   // Find a tag record in TagRecordArray with a matching tag_source.
   let tag_record = this.LookupTagRecords( tag_source );
   if( tag_record == null ) /* shouldn't happen */
   {
      AppAlert( "No matching tag record, TimeEntryPoint not stored." ); 
      return;
   }
   
   // Found matching tag record, store plot's entry points in the tag record. 
   tag_record.plot_value_ep = plot.GetResourceObject( "ValueEntryPoint" );
   tag_record.plot_time_ep = plot.GetResourceObject( "TimeEntryPoint" );
   tag_record.plot_valid_ep = plot.GetResourceObject( "ValidEntryPoint" );
}

//////////////////////////////////////////////////////////////////////////////
// Find a tag record in TagRecords array with a tag source matching
// the specified tag_source.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LookupTagRecords = function( /*String*/ tag_source )
{
   for( let i=0; i<this.TagRecords.length; ++i )
   {
      if( this.TagRecords[i].tag_source == tag_source )
        return this.TagRecords[i];
   }
   
   return null; // not found.
}

//////////////////////////////////////////////////////////////////////////////
// Initialize ActivePopup based on the selected object.
// Perform special initialization logic based on the WidgetType property
// of the popup object, if any.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitializePopup = function()
{
   if( this.ActivePopup == null )
     return;   
   let active_popup = this.ActivePopup;

   // If title string is valid, display the title in the popup.
   if( !IsUndefined( active_popup.title ) )
   {
      if( active_popup.drawing_vp.HasResourceObject( "TitleString" ) )
        active_popup.drawing_vp.SetSResource( "TitleString",
                                              active_popup.title );
      
      if( active_popup.is_floating )
        active_popup.popup_vp.SetSResource( "ScreenName", active_popup.title );
   }
   
   /* Set extra parameters ParamS and ParamD in the loaded popup drawing
      if these parameters are specified by the popup command, and if
      ParamS and ParamD resources are present in the popup drawing.
      In this example, ParamS is used to specify YAxis label in the 
      popup chart (rtchart_popup.g).
   */
   if( !IsUndefined( active_popup.paramS ) && 
       active_popup.drawing_vp.HasResourceObject( "ParamS" ) )
     active_popup.drawing_vp.SetSResource( "ParamS", active_popup.paramS );
   
   if( active_popup.paramD != null && 
       active_popup.drawing_vp.HasResourceObject( "ParamD" ) )
     active_popup.drawing_vp.SetDResource( "ParamD", active_popup.paramD );
   
   /* Transfer tags from the selected object to the popup object,
      (unset_tags parameter = false).
   */
   active_popup.num_remapped_tags =
     TransferTags( this.MainViewport, active_popup.selected_obj,
                   active_popup.drawing_vp, false );                
   // Initialize active popup dialog based on WidgetType, if any.
   let widget_type = GetWidgetType( active_popup.drawing_vp ); /*String*/
   switch( widget_type )
   {
    case "RTChart":
      let chart = 
        active_popup.drawing_vp.GetResourceObject( "Chart" ); /*GlgObject*/
      
      if( chart != null )
        this.InitChartWidget( active_popup.selected_obj, chart );  
      else
        AppAlert( "Can't find Chart object, chart initialization failed." );
      break;
      
    case "PopupMenu2":
      // Add custom code here as needed.
      break;

    default:
      break;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Initilizes the chart widget, such as prefills chart's data buffer with
// historical data. The application can extend the code and use selected_obj 
// to perform additional initialization logic based on the selected object. 
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitChartWidget = function( /*GlgObject*/ selected_obj,
                                                /*GlgObject*/ chart )
{ 
   let PREFILL_CHART_POPUP = true;
   
   /* Obtain historical data for the number of seconds defined by the
      chart Span.
   */
   if( PREFILL_CHART_POPUP )
   {
      let prefill_span =  /* int */
        Math.trunc( chart.GetDResource( "XAxis/Span" ) );
      
      FillChartHistory( this, chart, prefill_span * 10 );
   } 
}

//////////////////////////////////////////////////////////////////////////////
// Transfer tag sources for tags with a matching TagName from the
// selected object to the specified viewport. Returns a total number of 
// remapped tags. If unset_tags=true, set tag sources to "unset".
//////////////////////////////////////////////////////////////////////////////
function TransferTags( /*GlgObject*/ main_viewport, /*GlgObject*/ selected_obj,
                       /*GlgObject*/ viewport, /*boolean*/ unset_tags ) /*int*/
{
   // Obtain a list of tags defined in the selected object.
   let tag_list = selected_obj.CreateTagList( /*List all tags*/ false );        
   if( tag_list == null )
     return;
   
   let size = tag_list.GetSize();
   if( size == 0 )
     return 0; /* no tags found */
   
   /* Traverse the tag list. For each tag, transfer the TagSource
      defined in the selected object to the tag in the loaded 
      popup drawing that has a matching TagName.
   */
   let tag_obj, tag_name, tag_source;
   let num_remapped_tags = 0;  /* int */
   let total_remapped = 0;     /* int */
   for( let i=0; i<size; ++i )
   {
      tag_obj = tag_list.GetElement( i );
      
      // Obtain TagName.
      tag_name = tag_obj.GetSResource( "TagName" );
      
      // Skip tags with undefined TagName.
      if( IsUndefined( tag_name ) )
        continue;
      
      // Obtain TagSource.
      tag_source = tag_obj.GetSResource( "TagSource" );
      
      // Skip tags with undefined TagSource.
      if( IsUndefined( tag_source ) )
        continue;
      
      /* Remap all tags with the specified tag name (tag_name)
         to use a new tag source (tag_source).
      */
      if( unset_tags )
        num_remapped_tags =
          RemapNamedTags( main_viewport, viewport, tag_name, "unset" );
      else
        num_remapped_tags =
          RemapNamedTags( main_viewport, viewport, tag_name, tag_source );
      
      total_remapped += num_remapped_tags;
   }
   
   return total_remapped;
}

//////////////////////////////////////////////////////////////////////
// Remap all object tags with the specified tag_name to use a new 
// tag_source. 
//////////////////////////////////////////////////////////////////////
function RemapNamedTags( /*GlgObject*/ main_viewport, /*GlgObject*/ glg_obj,
                         /*String*/ tag_name, /*String*/ tag_source )   /*int*/
{
   /* Obtain a list of tags with TagName attribute matching 
      the specified tag_name.
   */
   let tag_list = 
     glg_obj.GetTagObject( tag_name, /*by name*/ true, 
                           /*list all tags*/ false, 
                           /*multiple tags mode*/ false, 
                           GLG.GlgTagType.DATA_TAG );

   if( tag_list == null )
     return 0;
   
   let size = tag_list.GetSize();
   if( size == 0 )
     return 0;
   
   let tag_obj, access_type, data_type, d_value, s_value;
   for( let i=0; i<size; ++i )
   {
      tag_obj = tag_list.GetElement( i );
      
      /* If tag is INIT ONLY, initialize its value based on the current 
         data value for the given tag_source. Don't reassign TagSource 
         for this tag_obj, it is initialized only once and will not be 
         subject to periodic updates.
      */
      access_type = Math.trunc( tag_obj.GetDResource( "TagAccessType" ) );
      if( access_type == GLG.GlgTagAccessType.INIT_ONLY_TAG )
      {
         data_type = Math.trunc( tag_obj.GetDResource( "DataType" ) );
         switch( data_type )
         { 
          case GLG.GlgDataType.D:
            d_value = main_viewport.GetDTag( tag_source );
            tag_obj.SetDResource( null, d_value );
            break;
          case GLG.GlgDataType.S:
            s_value = main_viewport.GetSTag( tag_source );
            tag_obj.SetSResource( null, s_value );
            break;

          default:
            AppError( "Unsupported data type." );
            break;            
         }
      }
      else
        AssignTagSource( tag_obj, tag_source );
   }
   
   return size;
}

//////////////////////////////////////////////////////////////////////
// Assigns new TagSource to the given tag object.
//////////////////////////////////////////////////////////////////////
function AssignTagSource( /*GlgObject*/ tag_obj, /*String*/ new_tag_source )
{
   tag_obj.SetSResource( "TagSource", new_tag_source );
} 

//////////////////////////////////////////////////////////////////////////////
// Set popup viewport size, based on the size of the loaded popup drawing,
// and position the popup next to the selected object.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetPopupSizeAndPosition = function()
{
   let active_popup = this.ActivePopup;
   
   /* Retrieve preferred popup viewport width and height if they are defined 
      in the loaded popup drawing.
   */
   let popup_width = GetPreferredValue( active_popup.drawing_vp, "Width",
                                        active_popup.default_width );
   let popup_height = GetPreferredValue( active_popup.drawing_vp, "Height",
                                         active_popup.default_height );

   if( this.IsMobile && active_popup.popup_type == "Popup" )
   {
      // Adjust popup dialog width and height for mobile devices.
      popup_width *= 1.75;
      popup_height *= 1.75;

      /* Make sure popup dialog fits inside the drawing. */
      let glg_area = document.getElementById( this.GLG_div_name );
      let max_popup_width = 0.8 * glg_area.clientWidth * this.CoordScale;
      if( popup_width > max_popup_width )
      {
         let ratio = popup_width / popup_height;
         popup_width = max_popup_width;
         popup_height = popup_width / ratio;
      }
   }
   else   /* Popup menu or desktop browser zoom. */
   {
      popup_width *= this.CoordScale;
      popup_height *= this.CoordScale;
   }

   let x, y;                             /* double */
   let offset = 5.0 * this.CoordScale;        /* offset in pixels */
    
   // Obtain a parent viewport of the selected object.
   let selected_obj_vp =
     active_popup.selected_obj.GetParentViewport( true ); /* GlgObject */

   // Obtain a parent viewport of the popup viewport.
   let popup_parent_vp =
     active_popup.popup_vp.GetParentViewport( true );     /* GlgObject */
    
   // Obtain the object's bounding box in screen coordinates.
   let selected_obj_box = active_popup.selected_obj.GetBox();  /* GlgCube */
    
   let converted_box = /* GlgCube */
     GLG.CopyGlgCube( /*GlgCube*/ selected_obj_box );
    
   /* If active_popup.popup_vp is located in a different viewport from the
      viewport of the selected object, convert screen coordinates of the 
      selected object box from the viewport of the selected object to the 
      viewport that contains the popup.
   */
   if( !selected_obj_vp.Equals( popup_parent_vp ) )
   {
      GLG.TranslatePointOrigin( selected_obj_vp, popup_parent_vp, 
                                converted_box.p1 );
      GLG.TranslatePointOrigin( selected_obj_vp, popup_parent_vp, 
                                converted_box.p2 );
   }

   // Obtain width and height in pixels of the popup parent viewport.
   let popup_parent_width = popup_parent_vp.GetDResource( "Screen/Width" );
   let popup_parent_height = popup_parent_vp.GetDResource( "Screen/Height" );

   /* Set constants used to (approximately) compensate for the size of the
      dialog window decorations, to postion the popup dialog using the same
      offset regardless of the selected dialog position.
   */
   let border_width, titlebar_height;
   if( active_popup.is_floating )
   {
      border_width    = 1.;
      titlebar_height = 25. * this.CoordScale;
   }
   else
   {
      border_width = 0.;
      titlebar_height = 0.;
   }

   /* Position popup to the right of the selected object. */
   x = converted_box.p2.x + offset; 
   if( x + popup_width > popup_parent_width )
     /* Not enough space on the right: position to the left of the object. */
     x =  converted_box.p1.x - offset - popup_width - 2. * border_width;
   
   if( x < 0 || x + popup_width > popup_parent_width )
     /* Not enough space on either left or right: position in the center. */
     x = ( popup_parent_width - popup_width ) / 2.;
   
   /* Position the popup above the selected object. */
   y = converted_box.p1.y - offset - popup_height - titlebar_height;
   if( y < 0. ) 
     /* Not enough space above: position below the object. */
     y =  converted_box.p2.y + offset;
   
   if( y < 0 || y + popup_height > popup_parent_height )
     /* Not enough space either above or below: position in the center. */
     y = ( popup_parent_height - popup_height ) / 2.;
   
   ConfigureWindow( active_popup.popup_vp, x, y, popup_width, popup_height );
}

//////////////////////////////////////////////////////////////////////////////
// Move the object to the top of the object hierarchy inside a container.
//////////////////////////////////////////////////////////////////////////////
function ReorderToFront( /*GlgObject*/ container, /*GlgObject*/ glg_obj )
{
   // Get container size.
   let size = container.GetSize();
   if( size == 0 )
     return;
   
   // Get current index position.
   let obj_pos = container.GetIndex( glg_obj );
   
   // Bring the object to front.
   container.ReorderElement( obj_pos, size - 1 );
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetDrawingSize = function( next_size )
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
GlgViewer.prototype.SetCanvasResolution = function()
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
GlgViewer.prototype.AdjustForMobileDevices = function( /*GlgObject*/ glg_obj )
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
GlgViewer.prototype.LoadAssets = function( callback, user_data )
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

   /* Load a viewport object that will be used as a MessageDialog to display
      application messages.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( "message_dialog.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "message_dialog", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );

    
   /* Load a popup viewport object that will be used to display popup drawings
      for the PopupDialog or PopupMenu commands that may be attached to objects.
   */
   if( HAS_EXTENDED_API )
   {
      GLG.LoadWidgetFromURL( this.GetFullName( POPUP_VIEWPORT_FILENAME ), null,
                             this.AssetLoaded.bind( this ),
                             { name: "popup_viewport", callback: callback,
                               user_data: user_data },
                             /*abort test function*/ ()=>!this.Active );
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AssetLoaded = function( loaded_obj, data, path )
{
   if( !this.Active )
     return;
   
   if( data.name == "scrollbar_h" )
   {
      if( loaded_obj != null )
        loaded_obj.SetResourceObject( "$config/GlgHScrollbar", loaded_obj );
   }
   else if( data.name == "scrollbar_v" )
   {
      if( loaded_obj != null )
        loaded_obj.SetResourceObject( "$config/GlgVScrollbar", loaded_obj );
   }
   else if( data.name == "message_dialog" )
   {
      this.SetupMessageDialog( loaded_obj );
   }
   else if( data.name == "popup_viewport" )
   {
      if( loaded_obj != null )
      {
         this.PopupVPTemplate = loaded_obj;
         this.PopupVPTemplate.SetSResource( "Name", POPUP_VIEWPORT_NAME );
         this.PopupVPTemplate.SetDResource( "Visibility", 0. );
      }
   }
   else
     AppError( "Unexpected asset name" );
   
   ++this.NumLoadedAssets;
   
   // Invoke the callback after all assets have been loaded.
   if( this.NumLoadedAssets  == ( HAS_EXTENDED_API ? 4 : 3 ) )
   {      
      this.AssetsLoadedFlag = true;  // Signal that all assets finished loading.
      
      data.callback( data.user_data );
   }
}

/////////////////////////////////////////////////////////////////////////////
// Message dialog is used to display application messages.
///////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetupMessageDialog = function( dialog_vp )
{
   if( dialog_vp == null )
   {
      AppError( "Null dialog drawing, SetupMessageDialog failed." );
      return;
   }
   
   // Create MessageDialog object using dialog_vp as the dialog viewport. 
   this.MessageDialog = new MessageDialogWidget( this, dialog_vp );

   /* Initialize and setup the dialog as a top level dialog. */
   this.MessageDialog.SetupDialog();
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ShowMessageDialog = function( message, error )
{
   if( this.MessageDialog == null )
     return;

   this.MessageDialog.Show( message, error );
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.EraseMessageDialog = function()
{
   if( this.MessageDialog == null )
     return;

   this.MessageDialog.Erase();
}

//////////////////////////////////////////////////////////////////////////////
// HTML button click interface.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ShowAlarmDialog = function( title )
{
   this.AlarmPage.ShowAlarms( title );
}

//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CloseAlarmDialog = function()
{
   if( this.AlarmPage == null )
     return;

   this.AlarmPage.CloseAlarmDialog();
}
   
//////////////////////////////////////////////////////////////////////////////
// Status display: 
// Display the title of the currently displayed drawing, as well as
// the title of the drawing which is in the process of being loaded (if any).
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayStatus = function()
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

//////////////////////////////////////////////////////////////////////////
// Returns PageType string using PageTypeTable.
//////////////////////////////////////////////////////////////////////////
function GetPageType( /*GlgObject*/ drawing )  /* String */
{
   if( drawing == null )
     return null;

   let type_obj = drawing.GetResourceObject( "PageType" );   /* GlgObject */
   if( type_obj == null ) // PageType resource is not present.
     return DEFAULT_PAGE_TYPE;
    
   let type_str = type_obj.GetSResource( null );   /* String */

   let page_type =   /* String */
     LookupCustomTypes( PageTypeTable, type_str,
                        /*empty*/ DEFAULT_PAGE_TYPE,
                        /*unknown*/ DEFAULT_PAGE_TYPE );

   if( page_type == UNDEFINED_PAGE_TYPE )
   {
      AppError( "Invalid PageType." );
      page_type = DEFAULT_PAGE_TYPE;
   }   
   return page_type;
}

//////////////////////////////////////////////////////////////////////////
// Returns CommandType string using CommandTypeTable.
//////////////////////////////////////////////////////////////////////////
function GetCommandType( /*GlgObject*/ command_obj ) /* String */
{
   let command_type_str = command_obj.GetSResource( "CommandType" );
    
   let command_type = LookupCustomTypes( CommandTypeTable, command_type_str,
                                         /*empty*/ UNDEFINED_COMMAND_TYPE,
                                         /*unknown*/ UNDEFINED_COMMAND_TYPE );
   if( command_type == UNDEFINED_COMMAND_TYPE )
     AppError( "Invalid CommandType." );
   return command_type;   
}

//////////////////////////////////////////////////////////////////////////
// Returns PopupMenuType string using PopupMenuTypeTable.
//////////////////////////////////////////////////////////////////////////
function GetPopupMenuType( /*GlgObject*/ command_obj )
{
   let menu_type_str = command_obj.GetSResource( "MenuType" );
    
   let popup_type = LookupCustomTypes( PopupMenuTypeTable, menu_type_str,
                                       /*empty*/ DEFAULT_MENU_TYPE,
                                       /*unknown*/ UNDEFINED_MENU_TYPE );

   if( popup_type == UNDEFINED_MENU_TYPE )
     AppError( "Invalid PopupMenuType." );
   return popup_type;   
}

//////////////////////////////////////////////////////////////////////////
// Returns DialogType string using DialogTypeTable.
//////////////////////////////////////////////////////////////////////////
function GetDialogType( /*GlgObject*/ command_obj )
{
   let dialog_type_str = command_obj.GetSResource( "DialogType" );

   let dialog_type = LookupCustomTypes( DialogTypeTable, dialog_type_str,
                                        /*empty*/ DEFAULT_DIALOG_TYPE,
                                        /*unknown*/ UNDEFINED_DIALOG_TYPE );

   if( dialog_type == UNDEFINED_DIALOG_TYPE )
     AppError( "Invalid DialogType." );

   return dialog_type;
}

//////////////////////////////////////////////////////////////////////////
// Returns widget type as a string. If the object doesn't have WidgetType
// resource present, or if WidgetType is present but its value is
// empty or not of interest (not found in WidgetTypeTable), return
// "Default" as widget type. Otherwise, if the WidgetType resource value
// matches one of the widget types listed in WidgetTypeTable,
// return this widget type string as defined in the drawing.
//////////////////////////////////////////////////////////////////////////
function GetWidgetType( /*GlgObject*/ glg_obj ) /* String */
{
   if( glg_obj == null )
     return null;
         
   let widget_type_obj = glg_obj.GetResourceObject( "WidgetType" );
   if( widget_type_obj == null )
     return DEFAULT_WIDGET_TYPE;
   
   let widget_type_str = widget_type_obj.GetSResource( null );  /* String */

   // Handle unknown widget types as default.
   return LookupCustomTypes( WidgetTypeTable, widget_type_str,
                             /*empty*/ DEFAULT_WIDGET_TYPE,
                             /*unknown*/ DEFAULT_WIDGET_TYPE );
}

//////////////////////////////////////////////////////////////////////////
// Utility function to check if string matches to one of the strings
// defined in a provided table.
//////////////////////////////////////////////////////////////////////////
function LookupCustomTypes( table, type_str, empty_type, undefined_type )
{
   if( type_str == null || type_str.length == 0 )
     return empty_type;

   let size = table.length;
   for( let i=0; i<size; ++i )
   {
      if( type_str == table[i] )
        return table[i];
   }
    
   return undefined_type;
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
GlgViewer.prototype.AdjustTimerInterval = function()
{
   if( this.FirstDataQuery )
   {
      this.FirstDataQuery = false;

      // Set TimerInterval to the UpdateInterval of the loaded page.
      this.TimerInterval = this.UpdateInterval;
      return;
   }
   
   /* If updates and data queries are fast compared to the UpdateInterval, 
      a simple timer with a fixed UpdateInterval can be used, as shown in 
      the case of USE_FIXED_TIMER_INTERVAL=true, and the logic below 
      would not be necessary.
      
      However, if a timer with a fixed interval is started before rendering 
      is completed by PushData(), it may overload the browser and cause 
      sluggish response if rendering takes longer than the requested 
      UpdateInterval. If a timer with a fixed interval is started after 
      PushData() is called, the actual update interval will be slower than 
      the requested interval if either rendering or data query takes longer.
      
      The logic below uses a dynamic timeout that attempts to maintain the 
      requested UpdateInterval regardless of the fluctuations in the duration 
      of the data requests and drawing updates.
      
      The data query is asynchronous. If the data query takes a long time, 
      we want to issue the next data query right away, so that the new data 
      are loaded while the drawing is being updated with the data we received. 
      If data queries and drawing updates are fast, we want to use a timeout 
      that would ensure a requested UpdateInterval. 
      
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
   
   if( elapsed_time < this.UpdateInterval )
   {
      /* Data request + update was too fast, increase timer interval.
         Increase gradually using CHANGE_COEFF to avoid rapid jumps on a 
         single fast iteration that might have little data to update.
      */
      this.TimerInterval +=
        ( this.UpdateInterval - elapsed_time ) * CHANGE_COEFF;
   }
   else if( elapsed_time > this.UpdateInterval )
   {
      // The data query took longer, decrease timer interval if possible.
      let delta = elapsed_time - this.UpdateInterval;
       
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
   // else : elapsed_time == this.UpdateInterval, no change.
}

//////////////////////////////////////////////////////////////////////////
// Detect a touch device if it hasn't been detected yet.
//////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DetectTouchDevice = function()
{
   if( !this.TouchDevice && this.MainViewport != null ) 
   {
      this.TouchDevice = true;
      
      /* For touch devices, disable mouse button check and Ctrl key check 
         for Commands and Custom MouseClick events.
      */
      this.MainViewport.SetDResource( "$config/GlgDisableMouseButtonCheck", 1 );
      this.MainViewport.SetDResource( "$config/GlgDisableControlKeyCheck", 1 );
      
      // Remove touch listener once a touch device has been detected.
      document.removeEventListener( "touchstart", this.TouchEventListener );
      this.TouchEventListener = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
// "keydown" event listener added to the document to handle key down events.
// In this example, ESC key closes active popup dialog and Alarm dialog,
// if any.
//////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.HandleKeyEvent = function( event )
{
   if( event.key == "Escape" )      // ESC key
   {
      // Close active popup if any.
      this.CloseActivePopup();
      
      // Close Alarm dialog if any.
      this.CloseAlarmDialog();

      // Close message dialog if displayed.
      this.EraseMessageDialog();
   }
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
   
   /* Object IDs for ValueEntryPoint, TimeEntryPoint and ValidEntryPoint
      for a plot in a RealTimeChart, if any. These objects will be valid if:
      - SUPPLY_PLOT_TIME_STAMP=true,
      - the drawing contains a chart,
      - the chart's plot has a valid TagSource assigned to its 
      ValueEntryPoint.
   */
   this.plot_value_ep = null;     /* GlgObject* /
                                     this.plot_time_ep = null;      /* GlgObject */
   this.plot_valid_ep= null;      /* GlgObject */
   
   // The value type is double for data_type=D, or String for data_type=S.
   this.value = null;         
   
   this.time_stamp = null;        /* double */
   this.value_valid = false;      /* boolean */
   
   /* if_changed flag will be set to false if there is a chart in the drawing
      with a matching TagSource. Otherwise, it will be set to true for
      performance optimization to push a new value to the graphics only
      if the value has changed.
   */
   this.if_changed = false;
}

//////////////////////////////////////////////////////////////////////////
function GlgActivePopup( /*int*/ popup_type, /*GlgObject*/ popup_vp,
                         /*String*/ drawing_file, /*GlgObject*/ subwindow,
                         /*GlgObject*/ selected_obj, /*String*/ title,
                         /*String*/ paramS, /*double*/ paramD )
{
   this.popup_type = popup_type;              /* int */
   this.popup_vp = popup_vp;                  /* GlgObject */  
   this.drawing_file = drawing_file;          /* String */
   this.subwindow = subwindow;                /* GlgObject */
   this.selected_obj = selected_obj;          /* GlgObject */
   this.title = title;                        /* String */
   this.paramS = paramS;                      /* String */
   this.paramD = paramD;                      /* double */
   
   this.drawing_vp = null;                    /* GlgObject */
   this.num_remapped_tags = 0;                /* int */
   this.width = 300;                          /* Default popup width */
   this.height = 300;                         /* Default popup height */
   this.is_floating = false;                  /* boolean */
}
