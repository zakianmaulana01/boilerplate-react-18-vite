////////////////////////////////////////////////////////////////////////////////
// GLG SCADA Viewer example
//
// The demo is written in pure HTML5 and JavaScript and provides an example
// of a generic GLG web-based viewer application. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// Refer to README.txt file for details on the Viewer functionality.
// This example is can be used with either the GLG Extended API or the
// GLG Intermediate API.
////////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0, default-case: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined, GetCurrTime, GetPreferredValue, ConfigureWindow,
         SetButtonState, ZoomToMode, AppAlert, AppError, AppInfo, AppLog }
         from './Utils.js'
import { DemoDataFeed } from './DemoDataFeed.js'
import { LiveDataFeed } from './LiveDataFeed.js'
import { MessageDialogWidget } from './MessageDialog.js'
import { AlarmPage } from './GlgAlarms.js'
import { ChartWidget } from './ChartWidget.js'
import { UserRoleWidget } from './UserRoleWidget.js'
import * as Data from './DataStructures.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

// Default drawing name and title to be used on initial load.
const DEFAULT_DRAWING_NAME = "main_layout_tabs.g"; 
const DEFAULT_DRAWING_TITLE = "Plant Monitoring and Control";

/* If set to true, simulated demo data will be used for animation.
   Set to false to enable live application data.
*/
const RANDOM_DATA = true;

/* Flag indicating how to supply a time stamp for a RealTime Chart that may be
   embedded into the loaded drawing: if set to 1, the application will supply
   a time stamp explicitly. Otherwise, a time stamp will be supplied 
   automatically by chart using current time. 
*/
const SUPPLY_PLOT_TIME_STAMP = true;  /* boolean */

/* Set to true if ExtendedAPI is used for the project. It will allow to create
   PopupViewport on the fly without a need to store it in each loaded drawing.
*/
const HAS_EXTENDED_API = true;

/* If set to false, TimerInterval used for data updates will be adjusted to 
   maintain a targeted DataUpdateInterval. Otherwise, a fixed timer interval 
   is used for updates.
*/
const USE_FIXED_TIMER_INTERVAL = true;
const DEBUG_TIME_INTERVAL = false;

const DEFAULT_UPDATE_INTERVAL = 100;      /* Targeted data query interval, 
                                             msec.*/
const DEFAULT_CHART_UPDATE_INTERVAL = 30; /* Update interval for charts with 
                                             MultiSampleUpdate, msec. */

// Parameters used for adjusting variable time interval.
const MIN_IDLE_INTERVAL = 30;    // msec
const WAIT_INTERVAL = 30;        // msec
const CHANGE_COEFF = 1/3;        // Rate of time interval adjustment.

const MAX_NUM_SAMPLES = 5;          /* Maximum number of data points per each 
                                       update operation for charts with
                                       MultiSampleUpdate. */

const TAB_MENU_NAME = "TabMenu";    /* Object name of the tab menu, 
                                       if present on the page. */
const NO_SCREEN = -1;               /* Used for a menu to show no selection. */

/* Page type table, is used to determine the type of a loaded page based
   on the PageType property of the drawing. May be extended by an application
   to add custom pages.
*/
const PageTypeTable = [
  "Default",
  "Configuration",
  "MainLayout",
  /* SCADA pages */
  "Aeration",
  "Circuit",
  "TestCommands",
  "TestPage"
];
const DEFAULT_PAGE_TYPE = "Default";
const UNDEFINED_PAGE_TYPE = "Undefined";

/* A list of widget types of interest, based on the WidgetType property 
   of the object.
*/
let WidgetTypeTable = [
   "RTChart",
   "RTChartScroll",
   "PopupMenu2",
   "PopupMenu3",
   "EditAnalogValue",
   "EditDigitalValue",
   "ConfigAlarms",
   "EditSetpoints",
   "EditAlarmSP",
   "ValueSpinner",
   "ValueInput",
   "UserRole",
   "PasswordInput",
   "HelpInfo",
   "TabMenu",
   "Menu",
   "GoToButton"
];
const UNDEFINED_WIDGET_TYPE = "Undefined";
const DEFAULT_WIDGET_TYPE = "Default";

// A list of known command types, based on the CommandType property.
const CommandTypeTable = [
   "GoTo",
   "GoBack",
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
    "Popup",   /* Embedded popup dialog */
    "ViewerDialog",
    "CustomDialog",
    "NativeDialog"
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

/* Filename containing help information to be displayed in a popup when 
   the user clicks on a Help button, if present in the loaded drawing.
*/
const DEFAULT_HELP_INFO_FILE = "HELP_MAIN_LAYOUT.txt";

/* Popup viewport name stored in the drawing. If present, the viewport
   with this name will be used to display a popup menu or popup dialog 
   specified by the PopupMenu or PopupDialog command. The command may 
   override the popup name, using the command's resource
   MenuResource or DialogResource.
*/
const POPUP_VIEWPORT_NAME = "PopupViewport";

/* With the Intermediate API, the popup viewport is expected to be saved in the
   drawing. With the Extended API (HAS_EXTENDED_API=true), the popup viewport 
   may be added to the drawing on the fly at run-time, by loading the popup 
   object from the GLG drawing file specified by POPUP_VIEWPORT_FILENAME.
*/
const POPUP_VIEWPORT_FILENAME = "popup_viewport.g";

const ALARM_BUTTON_NAME = "AlarmButton";

////////////////////////////////////////////////////////////////////////////////
// Creates an instance of the viewer.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
////////////////////////////////////////////////////////////////////////////////
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

   // Store constants passed to sub-modules.
   this.RandomData = RANDOM_DATA;
   this.Debug = DEBUG;
   this.SupplyPlotTimeStamp = SUPPLY_PLOT_TIME_STAMP;
   
   // Use path to the drawings directory if supplied.
   this.GlgPath = glg_path;

   this.LoadedDrawingName = null;   /* Stores the name of the currently loaded
                                       top level drawing. */
   this.DrawingLoadRequest = null;  /* This object is created in LoadDrawing()
                                       to store information about new drawing
                                       load request. Includes the following
                                       fields: enabled, drawing_name, title. */
   this.HelpInfoRequest = null;     /* This object is created in GetHelpStr()
                                       to store information about new help file
                                       load request. */
   this.GoToLoadRequest = null;     /* This object is created in GoTo() when
                                       GoTo command is processed and a new
                                       drawing is loaded into a subwindow within
                                       the current HMI page. */
   this.PageType = null;            /* String: The type of the current page. */

   this.UserRole = Data.USER_ROLE;  /* Int: Set dynamically based on the login 
                                       information via GetUserRole(). */
   this.DataFeed = null;            /* Object: used for animation, created as 
                                       DemoDataFeed if RANDOM_DATA=true, 
                                       or LiveDataFeed if RANDOM_DATA=false. */
   this.MainViewport = null;        /* GlgObject: Top level viewport of the 
                                       loaded drawing. */
   this.ChartList = [];             /* ChartWidget[]: A list of chart widgets 
                                       in the loaded page (if any). */
   this.PlotTagList = null;         /* String[]: A list tag sources in all 
                                       charts with MultiSampleUpdate flag. */
   this.RebuildPlotTagList = false;  /* boolean: Flag indicating if PlotTagList
                                       array needs to be rebuilt. It will be
                                       set to true when a new chart widget is 
                                       added to or deleted. */
   this.ZoomVP = null;              /* A viewport to be zoomed or panned when 
                                       using Zoom/Pan controls. */
   this.AssetsLoadedFlag = false;   /* Flag to indicate all assets finished 
                                       loading. This will ensure that if 
                                       LoadDrawing() is invoked from an external
                                       HTML button, drawing loading request will
                                       proceed only if all assets have already
                                       been loaded.
                                    */
   this.TouchDevice = false;        /* Set to true for a touch device, if a 
                                       touchstart event is detected. Otherwise, 
                                       it is set to false. */
   this.PopupVPTemplate = null;     /* GlgObject: A template for the 
                                       PopupViewport loaded as an asset.
                                       The template is loaded from a file
                                       defined by POPUP_VIEWPORT_FILENAME and 
                                       initialized in LoadAssets. */
   this.MessageDialog = null;       /* A floating dialog added on the fly
                                       to display application messages. */

   this.AlarmPage = new AlarmPage( this );  /* Alarms module. */

   this.LoadingTitle = null;        /* Title of a drawing being loaded; it is
                                       used for status display. */

   /* The following variables is used for navigating to the previous drawing
      usig the Back button.
   */
   this.TopDrawingName = null;      /* The filename of the top-level drawing 
                                       currently loaded in the viewer.
                                       It is the same as LoadedDrawingName.
                                    */
   this.TopTitle = null;            /* The title of the top-level drawing. */
   this.PreviousTopTitle = null;    /* The previous top title. */
   this.PreviousTopDrawingName = null;  /* The filename of previous top-level 
                                           drawing used for the Back button
                                           navigation. */
   this.CurrentDrawingName = null;  /* The filename of the drawing displayed in 
                                       GoToSubwindow, if any. */
   this.CurrentDrawingTitle = null; /* The title of the of the drawing displayed
                                       in GoToSubwindow, if any. */
   this.PreviousDrawingName = null; /* The filename of the previous drawing 
                                       displayed in GoToSubwindow used for the 
                                       Back button navigation. */
   this.PreviousDrawingTitle = null; /* The drawing title of the previous 
                                       drawing displayed in GoToSubwindow. */
   this.CurrentDestination = null;   /* The current destination of the GoTo 
                                        command. */
   this.PreviousDestination = null;  /* The previous destination of the GoTo 
                                        command. */

   this.StartDragging = false;      /* boolean: Set to true when the user starts
                                       ZoomTo operation. */
   this.PlotPoint = new Data.PlotDataPoint(); /* Global plot point is used to
                                                 avoid excessive garbage 
                                                 collection when pushing chart
                                                 data via PushPlotPoint().
                                              */
   /* Data Update interval for the loaded drawing, may vary depending on the 
      loaded drawing (loaded GLG page). 
   */
   this.DataUpdateInterval = DEFAULT_UPDATE_INTERVAL;

   /* Update interval for chart widgets with MultiSampleUpdate property > 0. */
   this.ChartUpdateInterval = DEFAULT_CHART_UPDATE_INTERVAL;
    
   /* Timer interval used for the data update timer may be adjusted if
      USE_FIXED_TIMER_INTERVAL=false, trying to maintain a targeted
      DataUpdateInterval. 
   */
   this.TimerInterval = this.DataUpdateInterval;

   this.UpdatesEnabled = false;       /* Flag to start/stop animation. */

   this.ViewerStarted = false;      /* Flag to indicate the viewer is ready, and
                                       all subdrawings are loaded (if any). 
                                       It is set on the initial viewer load. */
   this.IsReady = false;            /* Flag to indicate the viewer is set up and
                                       ready for data updates. It is set after
                                       loading every new page. */
   this.WaitForPrefill = 0;         /* A counter used to temporarily suspend tag
                                       data updates while waiting for a 
                                       tag-based chart (MultiSampleUpdate=false)
                                       to prefill.
                                    */
   this.GoToSubwindow = null;       /* GlgObject: Subwindow object specified by
                                       the Destination resource of the GoTo 
                                       command. */
   this.TabMenu = null;             /* A tab menu object named "TabMenu" with
                                       WidgetType="TabMenu". The menu has an 
                                       integrated GoTo command and is used to
                                       navigate between drawings in the 
                                       GoToSubwindow. */
   this.ActivePopup = null;         /* GlgActivePopup: Store active popup 
                                       information. */
   this.TagRecords = null;          /* GlgTagRecord[]: Dynamically created array
                                       of tag records. */
   this.WriteDataRecords = null;    /* GlgDataRecord[]: Stores accumulated 
                                       values adjusted by the operator. */
   this.RecordsValidated = false;   /* Set to true when all write data records
                                       have been validated. */
   this.GlgAlarmButton = null;      /* GlgObject id of the alarm button named 
                                       ALARM_BUTTON_NAME, if present in the 
                                       loaded drawing. */
   this.DataStartTime = 0;          /* double: Start time (sec) for the data 
                                       query, gets set in GetData().
                                       Used to adjust data query interval if
                                       USE_FIXED_TIMER_INTERVAL=false. */
   this.ChartLastUpdateTime = 0;    /* double: Time of the last update in 
                                       seconds, used to update data for charts
                                       with MultiSampleUpdate flag. */
   this.UpdateDuration = 0;         /* double */
   this.FirstDrawing = true;        /* boolean */
   this.FirstDataQuery = true;      /* boolean */
   this.WaitForUpdate = false;      /* boolean */

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////////
// Script entry point: Starts the viewer by loading its drawing.
////////////////////////////////////////////////////////////////////////////////
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

   // Create DataFeed object used to animate the drawing with real-time data.
   this.CreateDataFeed();

   /* Obtain UserRole based on user login credentials. 
      DemoDataFeed.GetUserRole() is used for demo. The application should
      provide a custom implementation of LiveDataFeed.GetUserRole() to obtain 
      the client user role.
   */
   this.UserRole = this.DataFeed.GetUserRole();

   let setup_func = this.SetupWidgetCB.bind( this );
   GLG.SetCustomSetupHandler( GLG.CreateCustomSetupHandler( setup_func ) );
}

////////////////////////////////////////////////////////////////////////////////
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );

   this.Active = false;    // Ignore any pending updates and callbacks.

   this.DestroyDrawing();
   this.AlarmPage.DestroyAlarmDialog();

   if( this.DataFeed )
     this.DataFeed.Cleanup();              // Cleanup DataFeed.

   this.AbortPendingLoadRequests();
   this.AbortPendingGoToLoadRequests();
   this.AbortPendingHelpInfoRequests();
   
   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
   if( this.TouchEventListener )
     document.removeEventListener( "touchstart", this.TouchEventListener );
   if( this.KeydownEventListener )
     document.removeEventListener( "keydown", this.KeydownEventListener );
}

////////////////////////////////////////////////////////////////////////////////
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LoadDrawing =
  function( /*String*/ filename, /*String*/ title, /*boolean*/ goto )
{
   Debug( "LoadDrawing for: " + this.GLG_div_name + " drawing: " + filename );
   
   if( !this.Active )
     return;

   /* Prevent drawing loading request from a button from proceeding until 
      all assets finished loading.
   */
   if( !this.AssetsLoadedFlag )
     return;
   
   /* rtchart_page.g drawing has four charts. On mobile devices with smaller
      screens, use rtchart_page_ext.g drawing with only two charts.
   */
   if( this.IsMobile && filename == "rtchart_page.g" )
     filename = "rtchart_page_ext.g";

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
      - "drawing_name" - the drawing filename.
      - "title" - the title.
      - "goto" - the value of the goto parameter.
   */
   this.DrawingLoadRequest =
     { enabled: true, drawing_name: filename, drawing_title: title,
       goto: goto };

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

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetFullName = function( /*String*/ filename )
{
   if( this.GlgPath == null )
     return filename;

   return this.GlgPath + "/" + filename;
}

////////////////////////////////////////////////////////////////////////////////
// Load Callback, invoked after a GLG drawing finished loading.
// 'drawing' parameter provides an object ID of the loaded GLG viewport.
////////////////////////////////////////////////////////////////////////////////
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
      /* Stay on the previously loaded page, display status info and generate
         an error.
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

   // Store loaded drawing.
   this.MainViewport = drawing;
      
   // Store drawing name of the currently loaded drawing.
   this.LoadedDrawingName = load_request.drawing_name;

   /* If the drawing loading was not triggered by the GoTo command inside a 
      GLG page, such as clicking on the html button, clear previously saved
      Back information.
   */
   if( !load_request.goto )
     this.ClearBackInfo();
   
   /* Store information to be used by a Back button (if present on the page),
      to navigate between GLG drawings. Also sets drawing file as new 
      TopDrawingName.
   */
   this.StoreBackInfo( load_request.drawing_name, load_request.drawing_title,
                       "/" );
   
   // Define the element in the HTML page where to display the drawing.
   drawing.SetParentElement( this.GLG_div_name );

   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );
   
   // Update status info.
   this.LoadingTitle = null;
   this.DisplayStatus();

   this.StartGlgViewer();
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StartGlgViewer = function()
{
   if( this.MainViewport == null )
     return;

   if( this.FirstDrawing )
     // Select all text in text fields on focus.
     this.MainViewport.SetDResource( "$config/GlgSelectAllOnFocus", 1. );
    
   /* Reset the flags. They will be set to true in FinalizeViewer()
      when the drawing finished loading all subdrawings (if any) and the
      viewer has been initialized.
   */
   this.ViewerStarted = false;
         
   // Obtain PageType of the loaded top level drawing.
   this.PageType = GetPageType( this.MainViewport );

   this.AddListeners();

   // Setup object hierarchy in the drawing.
   this.MainViewport.SetupHierarchy();

   /* Start an update timer for real-time data and a separate timer
      to query alarm data.
   */  
   if( this.FirstDrawing )
   {
      this.FirstDrawing = false;
      this.GetData();
      this.GetChartData();
      
      /* Get alarm data and highlight the Alarms button if there are any 
         unacknowledged alarms.
      */
      this.AlarmPage.GetAlarmData();
   }
    
   // Display the drawing in a web page.
   this.MainViewport.Update();
}

////////////////////////////////////////////////////////////////////////////////
// Hierarchy callback, added to the top level viewport and invoked when a new
// drawing is loaded into a Subwindow object. 
// For example, PopupDialog and PopupMenu viewports contain a subwindow named
// DrawingArea where a popup drawing is loaded.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.HierarchyCallback =
  function( /*GlgObject*/ viewport, /*GlgHierarchyData*/ info_data )
{
   let object = info_data.object;          /* GlgObject */

   switch( info_data.object_type )
   {
      /* Handle top level viewports the Hierarchy callback is attached to.
         info_data.object is the viewport of the callback.
      */
    case GLG.GlgObjectType.VIEWPORT:
      this.ViewerHierarchyCB( viewport, info_data );
      return;
      
    case GLG.GlgObjectType.REFERENCE:
      /* Process only Subwindow reference objects used to switch drawings,
         ignore subdrawings.
      */
      if( info_data.reference_type != GLG.GlgReferenceType.SUBWINDOW_REF )
        return;

      let subwindow = object;              /* GlgObject */
      let instance = info_data.subobject;  /* GlgObject */
      
      if( instance == null )
      {
         AppError( "Drawing loading failed." );
         return;
      }
      
      // Common logic for all subwindows.
      if( info_data.condition == GLG.GlgHierarchyCallbackType.BEFORE_INSTANCE_SETUP_CB )
        // Set ProcessMouse and OwnsInputCB attributes of the drawing viewport.
        InitDrawingInput( instance );

      /* If the drawing is loaded into the ActivePopup.subwindow, 
         let ActivePopup handle it.
      */
      if( this.ActivePopup != null &&
          this.ActivePopup.subwindow.Equals( subwindow ) )
      {
         this.ActivePopupHierarchyCB( viewport, info_data );
      }
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// This method invoked to handle hierarchy events from the viewer's top
// viewport.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ViewerHierarchyCB =
  function( /*GlgObject*/ viewport, /*GlgHierarchyData*/ info_data )
{
   switch( info_data.condition )
   {
    case GLG.GlgHierarchyCallbackType.BEFORE_OBJECT_SETUP_CB:
      this.InitBeforeH();
      break;

      /* All initialization has to be performed in FinishSetup to be able
         to handle subwindows and subdrawings that may be present in the 
         drawing and will be loaded asynchronously.
      */
    case GLG.GlgHierarchyCallbackType.AFTER_SETUP_CB:
      break;

    case GLG.GlgHierarchyCallbackType.FINISHED_SETUP_CB:
      this.FinishSetup();
      break;

    case GLG.GlgHierarchyCallbackType.BEFORE_RESET_CB:
      break;

    case GLG.GlgHierarchyCallbackType.AFTER_RESET_CB:
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitBeforeH = function()
{
   /* Set "ProcessMouse" for the loaded viewport to enable custom commands,
      custom events and tooltips.
   */
   this.MainViewport.SetDResource( "ProcessMouse", 
                                   ( GLG.GlgProcessMouseMask.MOUSE_CLICK |
                                     GLG.GlgProcessMouseMask.MOUSE_OVER_SELECTION |
                                     GLG.GlgProcessMouseMask.MOUSE_OVER_TOOLTIP ) );

   /* Store an object ID of the viewport named TabMenu containing tabs 
      used to switch between drawings, if present in the drawing.
   */
   this.TabMenu = this.MainViewport.GetResourceObject( TAB_MENU_NAME );
   
   // If the drawing contains popup viewport, make it initially invisible.
   let popup_vp = this.MainViewport.GetResourceObject( POPUP_VIEWPORT_NAME );
   if( popup_vp != null )
   {        
      // Reorder popup viewport to draw on top of other viewports.
      ReorderToFront( this.MainViewport, popup_vp );
        
      // Hide popup viewport.
      popup_vp.SetDResource( "Visibility", 0. );
   }

   // If the drawing contains a QuitButton, make it invisible.
   if( this.MainViewport.HasResourceObject( "QuitButton" ) )
     this.MainViewport.SetDResource( "QuitButton/Visibility", 0 );

   /* Initialize RoleIndicator, if present in the loaded drawing, 
      based on userRole variable.
      It can be done either by the resource name RoleIndicator/RoleIndex,
      or by using a tag with TagName=RoleIndex.
   */
   UpdateRoleIndicator( this.MainViewport, this.UserRole );
    
   /* Decrease tab menu size on mobile devices. */
   if( this.TabMenu && this.IsMobile )
   {
      this.TabMenu.SetDResource( "TabSize", 70 );  /* Decrease tab size */
      this.TabMenu.SetDResource( "Pan", 0 );       /* Disable scrollbars */
   }

   // Initialize loaded HMI Page based on PageType.
   this.InitPageBeforeH( this.MainViewport );
}

////////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup has finished.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinishSetup = function()
{
   /* If the drawing supports switching pages in its subwindow, load and
      display initial drawing.
   */
   this.DisplayInitialDrawing();

   /* Finalize viewer initialization. GLG.GetPendingInstances() returns a
      number of subdrawings that are in the process of being loaded.
      If the current drawing has no subdrawings, finalize drawing 
      initialization right away. Otherwise, finalize initialization 
      in InputCallback (format=TemplateLoad) after all subdrawings 
      finished loading.
   */
   if( GLG.GetPendingInstances() == 0 )
     this.FinalizeViewer();
}

////////////////////////////////////////////////////////////////////////////////
// This method invoked to handle hierarchy events from ActivePopup.subwindow.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ActivePopupHierarchyCB =
  function( /*GlgObject*/ viewport, /*GlgHierarchyData*/ info_data )
{
   let instance = info_data.subobject;
   if( instance == null )
   {
      AppError( "ActivePopup: drawing loading failed." ); 
      return;
   }

   /* Initialize a new viewport loaded into the subwindow before and after
      setup.
   */
   switch( info_data.condition )
   {
    case GLG.GlgHierarchyCallbackType.BEFORE_INSTANCE_SETUP_CB:
      /* Handle ActivePopup drawing loaded into the ActivePopup.subwindow.
         Store the loaded drawing viewport in the ActivePopup, if any, 
         and initialize active popup.
      */
      this.ActivePopup.drawing_vp = GLG.GetReference( instance );
      this.ActivePopupInitBeforeH();
      break;

      /* All initialization has to be performed in FinishSetup to be able
         to handle subwindows and subdrawings that may be present in the 
         popup and will be loaded asynchronously.
      */
    case GLG.GlgHierarchyCallbackType.AFTER_SETUP_CB:
      break;

    case GLG.GlgHierarchyCallbackType.FINISHED_SETUP_CB:
      this.ActivePopupFinishSetup();
      break;

    case GLG.GlgHierarchyCallbackType.BEFORE_RESET_CB:
      break;

    case GLG.GlgHierarchyCallbackType.AFTER_RESET_CB:
      break;
   }
}      

////////////////////////////////////////////////////////////////////////////////
// Set ProcessMouse and OwnsInputCB attributes of the drawing viewport.
////////////////////////////////////////////////////////////////////////////////
function InitDrawingInput( /*GlgObject*/ viewport )
{
   /* Set the ProcessMouse attribute of the viewport to process custom events 
      and tooltips.
   */
   viewport.SetDResource( "ProcessMouse",
                          ( GLG.GlgProcessMouseMask.MOUSE_CLICK |
                            GLG.GlgProcessMouseMask.MOUSE_OVER_SELECTION |
                            GLG.GlgProcessMouseMask.MOUSE_OVER_TOOLTIP ) );
      
   /* Set the OwnsInputCB attribute of the loaded viewport, so that the 
      Input callback is invoked with this viewport's ID.
   */
   viewport.SetDResource( "OwnsInputCB", 1.0 );
}

////////////////////////////////////////////////////////////////////////////////
// For drawings that have a subwindow used to switch drawing, display the 
// initial drawing in the subwindow. Either a tab menu or a set of buttons 
// may be used to switch drawings in the subwindow. For a tab menu, the
// menu's InitDrawingIndex resource defines the which drawing to load on
// initial appearance. If a set of buttons is used, the button named
// FirstButton defines the initial drawing to be displayed.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayInitialDrawing = function()
{
   /* Try the tab menu first, if any. */
   if( this.TabMenu != null )
   {
      let initial_index = this.TabMenu.GetDResource( "InitDrawingIndex" );

      /* Load a sub-page drawing corresponding to the initial index.
         Imitate a click on the first tab by sending a message to the button.
         It will trigger Input callback and execute GoTo command attached to 
         the menu, as if the user clicked on this tab.
      */
      let res_name = GLG.CreateIndexedName( "Button%/Handler", initial_index );
      this.TabMenu.SendMessageToObject( res_name, "Set",
                                        null, null, null, null );
      return;
   }

   /* If the page contains individual GoTo buttons used to navigate between 
      sub-pages, send a message to the button named "FirstButton", if any,
      to execute the button's GoTo command to initialize the page.
   */
   let goto_button = this.MainViewport.GetResourceObject( "FirstButton" );
   if( goto_button )
     goto_button.SendMessageToObject( "Handler", "Activate",
                                      null, null, null, null );
}

////////////////////////////////////////////////////////////////////////////////
// All subdrawings are loaded (if any) and the viewer is ready.
// Finalize viewer setup.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinalizeViewer = function()
{
   if( this.MainViewport == null )
     return;

   this.ViewerStarted = true;
   
   // Finalize initialization of the loaded drawing (top level viewport). 
   this.FinalizePageLoad( this.MainViewport );

   /* Flag to indicate first data query for the loaded top level drawing
      (MainViewport).
   */
   this.FirstDataQuery = true;
}

////////////////////////////////////////////////////////////////////////////////
// All subdrawings are loaded (if any) and the viewport is ready to finish
// its initialization.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinalizePageLoad = function( /*GlgObject*/ viewport )
{
   if( viewport == null )
     return;

   // Print PageType of the loaded drawing.
   Debug( "FinalizePageLoad: PageType = " + GetPageType( viewport ) );

   // Initialize loaded page after hierarchy setup.
   this.InitPageAfterSetup( viewport );
   
   /* Assign ZoomVP, a viewport to be zoomed or panned when using
      Zoom/Pan controls.
   */
   this.ZoomVP = GetZoomVP( viewport );

   this.ShowZoomControls( this.ZoomVP != null );
   
   /* Store an object of the AlarmButton, if present on the page. */
   this.GlgAlarmButton =
     this.MainViewport.GetResourceObject( ALARM_BUTTON_NAME );
   
   /* Obtain a list of tags in the loaded drawing and build TagRecords array
      to be used for animation.
   */
   this.QueryTags();

   // Flag to indicate the viewer is ready to receive data updates.
   this.IsReady = true;
      
   // Initialize ChartLastUpdateTime to the current time.
   this.ChartLastUpdateTime = GetCurrTime();

   /* Enable animation: set UpdatesEnabled=true and update PlayButton toggle,
      if present on a current page.
   */
   this.ResumeUpdates( /*update PlayButton*/ true );
   
   this.GoToSubwindow = null;
}

////////////////////////////////////////////////////////////////////////////////
// Message dialog is used to display application messages.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetupMessageDialog = function( /*GlgObject*/ dialog_vp )
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

////////////////////////////////////////////////////////////////////////////////
function UpdateRoleIndicator( /*GlgObject*/ viewport, /*int*/ user_role )
{
   if( viewport == null )
     return;

   if( viewport.HasResourceObject( "RoleIndicatior/RoleIndex" ) )
     viewport.SetDResource( "RoleIndicator/RoleIndex", user_role );
   else
   {
      let tag_list =
        viewport.GetTagObject( "RoleIndex", /*by TagName*/ true,
                               false, false, GLG.GlgTagType.DATA_TAG );
      if( tag_list == null )
        return;

      let size = tag_list.GetSize();
      for( let i=0; i<size; ++i )
      {
         let tag_obj = tag_list.GetElement( i );
          
         // Set tag with TagName=RoleIndex.
         tag_obj.SetDResource( null,
                               user_role == Data.ADMINISTRATOR_ROLE ?
                               1.0 : 0.0 );
      }
   }
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ChangeUserRole = function( /*int*/ new_role )
{
   this.UserRole = new_role;
   UpdateRoleIndicator( this.MainViewport, this.UserRole );
   this.MainViewport.Update();
}

////////////////////////////////////////////////////////////////////////////////
// Returns filename to be used as a HelpInfoFile for the HelpInfo
// widget. Obtained using one of the following:
// a) paramS stored in ActivePopup, if any. 
//    In this case, ParamS is assigned in the drawing as HelpInfoFile
//    public property of the Help button, and it would be stored as
//    ActivePopup.paramS when the user clicks on a Help button and
//    PopupDialog command gets processed.
// b) Widget's HelpInfoFile resource, as defined in the drawing, if any.
// c) Default help filename defined by DEFAULT_HELP_INFO_FILE.
//
GlgViewer.prototype.GetHelpInfoFile =
  function( /*GlgObject*/ widget )   /* String */
{
   if( widget == null )
     return null;
   
   /* Obtain HelpInfoFile:
      - Use paramS stored in ActivePopup, if any. 
      - Use widget's HelpInfoFile defined in widget's .g file.
      - Use default filename defined by DEFAULT_HELP_INFO_FILE.
   */
   let filename;    /* String */
   if( this.ActivePopup != null && !IsUndefined( this.ActivePopup.paramS ) )
   {
      filename = this.ActivePopup.paramS;
   }
   else
   {
      let res_obj = widget.GetResourceObject( "HelpInfoFile" ); /*GlgObject*/
      if( res_obj != null )
      {
         filename = res_obj.GetSResource( null );
         if( IsUndefined( filename ) )
           filename = DEFAULT_HELP_INFO_FILE;
      }
      else
        filename = DEFAULT_HELP_INFO_FILE;
   }
   
   if( IsUndefined( filename ) )
     return null;
   
   return filename;
}

////////////////////////////////////////////////////////////////////////////////
// Returns a string content from the HelpInfo widget using a filename
// obtained by GetHelpInfoFile().
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetHelpStr = function( /*GlgObject*/ widget )
{
    if( widget == null )
        return;
            
    // Obtain HelpInfoFile.
    let filename = this.GetHelpInfoFile( widget );    
    if( IsUndefined( filename ) )
      return;   

    // Cancel any pending help file loading requests, if any.
    this.AbortPendingHelpInfoRequests();
   
    /* Create a request that can be aborted if the user clicks on another
       button before the current request finished processing.
       Since this function is invoked from a callback, the widget handle 
       is volatile. We need to use GLG.GetReference( widget ) to obtain a 
       non-volatile handle.
    */
    this.HelpInfoRequest =
      { enabled: true,
        help_file: filename,
        widget: GLG.GetReference( widget ) };

    // Help file is expected to be found in the directory of all .g files.
    let filepath = this.GetFullName( filename );   /* String */
    let help_file_url = new URL( filepath, window.location.href );

    /* Load help file, using GlgHTTPRequestResponseType.TEXT request type. 
       It will invoke a specified callback (HelpFileLoadCB), passing 
       the content of the loaded file (help text string).
    */
    GLG.LoadAsset( help_file_url.toString(),
                   GLG.GlgHTTPRequestResponseType.TEXT, 
                   /*callback*/ this.HelpFileLoadCB.bind( this ),
                   /*user_data*/ this.HelpInfoRequest );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.HelpFileLoadCB = function( loaded_obj, user_data, url_path )
{
   if( !this.Active )
     return;
   
   let help_request = user_data;
   
   if( !help_request.enabled )        // This request was aborted 
     return;

   let help_str = loaded_obj;    // Loaded text from the help url. 
   if( help_str != null )
     help_request.widget.SetSResource( "HelpInfo/String", help_str );

   // Reset: we are done with this request.
   this.HelpInfoRequest = null;
}

////////////////////////////////////////////////////////////////////////////////
// Update a toggle named "PlayButton", if present in the given viewport.
////////////////////////////////////////////////////////////////////////////////
function UpdatePlayButton( /*GlgObject*/ viewport, /*boolean*/ timer_enabled )
{
   let play_button = viewport.GetResourceObject( "PlayButton" );  /*GlgObject*/
   if( play_button == null )
     return;
   
   play_button.SetDResource( "OnState", timer_enabled ? 1.0 : 0.0 );
   play_button.Update();
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.PauseUpdates = function( /*boolean*/ update_button )
{
   this.UpdatesEnabled = false;

   if( update_button )
     UpdatePlayButton( this.MainViewport, this.UpdatesEnabled );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ResumeUpdates = function( /*boolean*/ update_button )
{
   this.UpdatesEnabled = true;
   
   /* Update PlayButton toggle, if present, allowing to play/pause 
      data updates.
   */
   if( update_button )
     UpdatePlayButton( this.MainViewport, this.UpdatesEnabled );
}

////////////////////////////////////////////////////////////////////////////////
// Returns String[] array containing unique tag sources for all charts with
// MultiSampleUpdate flag.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CreatePlotTagList = function() /* String[] */
{
   let num_charts = this.ChartList.length;
   if( num_charts == 0 )
     return null;

   let tag_list = null; /* Combined list of tag sources. */
   for( let i=0; i<num_charts; ++i )
   {
      let chart_widget = this.ChartList[i];

      /* Add chart plots' tags to the list if the chart is not waiting for
         prefilling.
      */
      if( chart_widget.MultiSampleUpdate && !chart_widget.PrefillActive ) 
        tag_list = chart_widget.AddPlotTagsToList( tag_list );
   }

   return tag_list;
}
   
////////////////////////////////////////////////////////////////////////////////
// Destroy currently loaded viewer drawing, if any.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DestroyDrawing = function()
{
   if( this.MainViewport == null )
     return;

   this.CleanupPage();
   
   this.ViewerStarted = false;
   this.GlgAlarmButton = null;
   
   this.MainViewport.ResetHierarchy();   // Destroy loaded top level drawing.
   this.MainViewport = null;
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CleanupPage = function()
{
   // Close active popup, if any, and unload the popup's drawing.
   this.CloseActivePopup();

   // Stop updates for this page.
   this.PauseUpdates( /*update the toggle*/ true );
      
   this.EraseMessageDialog();
   
   // Reset IsReady flag. It is set to true when a new page gets displayed.
   this.IsReady = false;

   this.TagRecords = null;          // Clear TagRecords array
   this.WriteDataRecords = null;    // Clear stored adjusted values, if any.
   this.PlotTagList = null;         // Clear PlotTagList
}

////////////////////////////////////////////////////////////////////////////////
// This function is invoked after the drawing's raw data has been downloaded
// and before loading the drawing from raw data. If the function returns true,
// loading the drawing from raw data is aborted.
////////////////////////////////////////////////////////////////////////////////
function AbortLoad( load_request )   /* boolean */
{
   // Return true to abort if the load request was cancelled.
   return !load_request.enabled;
}

////////////////////////////////////////////////////////////////////////////////
// Cancels any pending drawing load requests.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AbortPendingLoadRequests = function()
{
   if( this.DrawingLoadRequest != null )
   {
      this.DrawingLoadRequest.enabled = false;
      this.DrawingLoadRequest = null;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Cancels any pending drawing load requests into a subwindow.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AbortPendingGoToLoadRequests = function()
{
   if( this.GoToLoadRequest != null )
   {
      this.GoToLoadRequest.enabled = false;
      this.GoToLoadRequest = null;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Cancels any pending help file load requests.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AbortPendingHelpInfoRequests = function()
{
   if( this.HelpInfoRequest != null )
   {
      this.HelpInfoRequest.enabled = false;
      this.HelpInfoRequest = null;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Add event listeners to the top level viewport of the loaded drawing.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AddListeners = function()
{
   // The code may be augmented to provide custom listeners based on PageType.
   switch( this.PageType )
   {
    default:
      this.MainViewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                                     this.InputCallback.bind( this ) );
      this.MainViewport.AddListener( GLG.GlgCallbackType.TRACE_CB,
                                     this.TraceCallback.bind( this ) );

      // Add HierarchyCallback, invoked for all SUBWINDOW or SUBDRAWING objects.
      this.MainViewport.AddListener( GLG.GlgCallbackType.HIERARCHY_CB, 
                                     this.HierarchyCallback.bind( this ) );
      break;
   }   
}

////////////////////////////////////////////////////////////////////////////////
// Initialize loaded HMI Page before hierarchy setup.
// A page may a top level drawing of the Viewer (MainViewport), or it could be
// loaded in one of the child subwindows inside MainViewport.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitPageBeforeH = function( /*GlgObject*/ viewport )
{
   // Obtain PageType of the loaded drawing.
   let page_type = GetPageType( viewport );

   // Add code to initialize loaded page based on its PageType as needed.
   switch( page_type )
   {
    case "MainLayout":
      /* These pages have a layout allowing to navigate between sub-pages and
	 may have their own Back button that can be used to go back to the
	 previous sub-page. Clear previously stored Back info, if any, 
	 not to interfere with the Back button on this page.
      */
      this.ClearBackInfo();
      break;

    default: break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
// A page may be a top level drawing of the Viewer (MainViewport), or it could
// be loaded in one of the child subwindows inside this.MainViewport.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitPageAfterSetup = function( /*GlgObject*/ viewport )
{
   // Obtain PageType of the loaded drawing.
   let page_type = GetPageType( viewport );

   /* Process and initialize widgets in the loaded viewport. 
      Populate/remap widget tags based on widget ID.
   */
   this.ProcessWidgets( viewport );
  
   /* Set DataUpdateInterval based on PageType. */
   this.DataUpdateInterval = GetPageUpdateInterval( page_type );

   // Perform extra initialization for the tags, if needed. 
   if( NeedTagRemapping( page_type ) )
     RemapTags( viewport );

   /* Initialize RoleIndicator, if present in the loaded drawing, 
      based on userRole variable.
      It can be done either by the resource name RoleIndicator/RoleIndex,
      or by using a tag with TagName=RoleIndex.
   */
   UpdateRoleIndicator( viewport, this.UserRole );

   if( this.IsMobile )
     /* Increase pick resolution for the water treatment page to make it easier
        to select pump motors by touching on mobile devices.
     */
     viewport.SetDResource( "$config/GlgPickResolution",
                            page_type == "Aeration" ? 30 : 5 );
     
   // Adjust the drawing for mobile devices if needed.
   this.AdjustForMobileDevices( viewport );
}

////////////////////////////////////////////////////////////////////////////////
// Returns update interval based on page_type.
////////////////////////////////////////////////////////////////////////////////
function GetPageUpdateInterval( /*String*/ page_type )  /* int */
{
   switch( page_type )
   {
    default:
    case DEFAULT_PAGE_TYPE:  return DEFAULT_UPDATE_INTERVAL;
    case "Aeration":         return 2000;
    case "Circuit":          return 1000;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if the page with the specified page_type requires
// remapping of all unset tags defined in the page.
////////////////////////////////////////////////////////////////////////////////
function NeedTagRemapping( /*String*/ page_type )  /* boolean */
{
   switch( page_type )
   {
    default:            return false;
    case "Aeration":    return true;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Returns viewport to be zoomed or panned when using Zoom/Pan controls.
// Invoked after hierarchy setup.
////////////////////////////////////////////////////////////////////////////////
function GetZoomVP( /*GlgObject*/ viewport )   /* GlgObject */
{
   /* By default, zoom the specified viewport.
      If the page has a layout that has a subwindow or a viewport 
      with a predefined name, such as "DrawingArea" or "AreaMiddle", 
      assign ZoomVP to this viewport or the subwindow's instance.
   */
   let zoom_vp = viewport.GetResourceObject( "AreaMiddle" );
   if( zoom_vp == null )
     zoom_vp = viewport.GetResourceObject( "DrawingArea" );
   
   if( zoom_vp == null )
     zoom_vp = viewport;
   else if( IsSubdrawing( zoom_vp ) )
     zoom_vp = zoom_vp.GetResourceObject( "Instance" );
   
   return zoom_vp;
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ShowZoomControls = function( /*boolean*/ show )
{
   let zoom_controls_div =
      document.getElementById( this.GLG_div_name + "_zoom_controls" );
   if( zoom_controls_div )
     zoom_controls_div.style.visibility = ( show ? "visible" : "hidden" );
   else
     Debug( "Missing zoom controls." ); 
}

////////////////////////////////////////////////////////////////////////////////
// Process widgets in the viewport after hierarchy setup. 
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ProcessWidgets = function( /*GlgObject*/ viewport )
{
   /* Find all widgets that have property IsWidget=1 and process them in place
      based on WidgetType in ProcessWidgetAfterH custom match function, which
      is invoked by the Toolkit for each widget.
   */
   FindWidgets( viewport,
                /*process function*/ this.ProcessWidgetAfterH.bind( this ) );
}

////////////////////////////////////////////////////////////////////////////////
// Traverses children of a given viewport, finds widget objects that match 
// criteria defined by the custom_match function and processes them in-place.
////////////////////////////////////////////////////////////////////////////////
function /* {found_multiple, found_object} */
  FindWidgets( /*GlgObject*/ viewport, /*Custom match function*/ custom_match ) 
{
   let match_type = GLG.GlgObjectMatchType.CUSTOM_MATCH;
   let find_parents = false;       /* traverse down to find children */
   let include_top_object = true;  /* include viewport itself if it 
                                      matches search criteria */
   let find_first_match = false;   /* find all matching objects */
   let search_inside = true;
   let search_drawable_only = true;
   let object_type = null;
   let object_name = null;
   let resource_name = null;
   let object_id = null;
   let search_templates = false;
   let dont_add_matches = true; /* Process in place, don't return an
                                   array of matching objects. */
     
   let rval =
     viewport.FindObjects( match_type, find_parents, include_top_object,
                           find_first_match, search_inside,
                           search_drawable_only,
                           object_type, object_name, resource_name,
                           object_id, custom_match, search_templates,
                           dont_add_matches );
}

////////////////////////////////////////////////////////////////////////////////
// Custom function used to process objects of interest after hierarchy setup.
// Invoked by FindWidgets() for each found object.
// If an object is a widget, processes the widget in place.
// Returns false if children objects need to be processed, or true otherwise.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ProcessWidgetAfterH = function( /*GlgObject*/ widget )
{
   if( !IsWidget( widget ) )
     return false;  /* Continue traversal */

   /* Initialize the widget after setup based on its WidgetType. */
   this.InitWidgetAfterH( widget );

   /* Some Composite widgets may have child widgets that need to be processed
      as well. Return false to continue traversal to find child widgets.
   */
   let widget_type = GetWidgetType( widget );

   switch( widget_type )
   {
    case "EditSetpoints":
    case "ConfigAlarms":
      return false;  /* Continue traversal */
   }
   return true;      /* Don't traverse inside the widget. */
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if the object has a resource "IsWidget" and its value is 1.
// Otherwise, returns false.
////////////////////////////////////////////////////////////////////////////////
function IsWidget( /*GlgObject*/ glg_obj ) /* boolean */
{
   let res_name = "IsWidget";
   let res_obj = glg_obj.GetResourceObject( res_name );
   if( res_obj == null )
     return false;

   let value = res_obj.GetDResource( null );
   return value == 1;
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if the object has a resource WidgetType and its value is one
// of the special widgets of interest, such as a chart. Otherwise, returns
// false.
////////////////////////////////////////////////////////////////////////////////
function IsSpecialWidget( /*GlgObject*/ glg_obj ) /* boolean */
{
   let widget_type = GetWidgetType( glg_obj );
   return IsSpecialWidgetType( widget_type );
}

////////////////////////////////////////////////////////////////////////////////
// Returns true widget_type matches one of the special widget types of interest
// that requires special handling, such a chart. Otherwise, returns false.
////////////////////////////////////////////////////////////////////////////////
function IsSpecialWidgetType( /*String*/ widget_type ) /* boolean */
{
   switch( widget_type )
   {
    case "RTChart":
    case "RTChartScroll":
    case "UserRole":
      return true;
   }
   return false;
}

////////////////////////////////////////////////////////////////////////////////
// A custom setup callback that handles special widgets marked by checked 
// CustomSetupFlag in the object's Properties dialog.
// It is invoked by the Toolkit at different times of the object's lifetime,
// such as before and after hierarchy setup, as well as before and after 
// object reset.
// The special widgets include charts, the alarm table and the user role widget.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetupWidgetCB =
  function( /*GlgObject*/ widget, /*GlgCustomSetupType*/ setup_type )
{
   let special_widget = null;
   
   switch( setup_type )
   {
    case GLG.GlgCustomSetupType.BEFORE_HI_SETUP:
      /* Obtain WidgetType of the widget object. */ 
      let widget_type = GetWidgetType( widget );
      switch( widget_type )
      {
       case "RTChart":
       case "RTChartScroll":
         special_widget = new ChartWidget( this, widget, widget_type );
         break;
         
       case "UserRole":
         special_widget = new UserRoleWidget( this, widget, this.UserRole ); 
         break;

       default: special_widget = null; break;         
      }

      if( special_widget )
      {
         /* Perform special widget initialization logic before setup.
            For example, add custom callbacks, which need to be added before
            setup.
         */
         special_widget.InitBeforeH();

         // Associate the special widget with the GLG object.
         SetObjectWidget( widget, special_widget );
      }
      break;

    case GLG.GlgCustomSetupType.AFTER_HI_SETUP:
      /* If it's a special widget, perform special widget initialization logic
         after setup.
      */ 
      special_widget = GetObjectWidget( widget );
      if( special_widget )
        special_widget.InitAfterH();
      break;

     case GLG.GlgCustomSetupType.FINISHED_SETUP:
      /* If it's a special widget, perform special widget initialization logic
         after setup.
      */ 
      special_widget = GetObjectWidget( widget );
      if( special_widget )
        special_widget.FinishSetup();
      break;

     case GLG.GlgCustomSetupType.BEFORE_RESET_SETUP:
      /* The widget has been reset - perform cleanup of special widget before
         the widget gets destroyed.
      */
      special_widget = GetObjectWidget( widget );
      if( special_widget )
         special_widget.BeforeReset();
      break;
      
    case GLG.GlgCustomSetupType.AFTER_RESET_SETUP:
      // The widget has been reset - perform cleanup of special widget.
      special_widget = GetObjectWidget( widget );
      if( special_widget )
      {            
         special_widget.AfterReset();

         /* Unset the special widget stored on the widget object. */
         SetObjectWidget( widget, null );
      }
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Initialize a specified widget after hierarchy setup.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitWidgetAfterH = function( /*GlgObject*/ widget )
{
   // Retrieve WidgetType.
   let widget_type = GetWidgetType( widget );

   if( widget_type != DEFAULT_WIDGET_TYPE )
     Debug( "Init widget, WidgetType = " + widget_type );
      
   /* Populate widget tags by replacing 'ID' in TagSource with the 
      widget_id string. Application may extend this logic as needed. 
   */
   AssignWidgetTags( widget );

   /* Initialize the widget based on widget_type. */
   switch( widget_type )
   {
    case "HelpInfo":
      this.GetHelpStr( widget );
      break;

    case "EditAlarmSP":
      let widget_id = GetWidgetID( widget ); /* String */
      if( widget_id == null )
        break;
      
      this.DataFeed.GetAlarmSPInfo( widget_id, InitAlarmSP, widget );
      break;

    case "EditSetpoints":
    case "EditAnalogValue":
    case "EditDigitalValue":
    case "ConfigAlarms":
    case "PopupMenu2":
    case "PopupMenu3":      
      /* Disable SaveButton, if any. It will be enabled when the changes
         can be saved.
      */
      this.UpdateDialogButtons( widget );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Initialize spinner values in the widget of type "EditAlarmSP".
////////////////////////////////////////////////////////////////////////////////
function InitAlarmSP( /*AlarmSPInfo*/ alarm_sp_info, /*GlgObject*/ widget )
{
    if( alarm_sp_info == null || widget == null )
        return;
    
    let widget_type = GetWidgetType( widget );
    if( widget_type != "EditAlarmSP" )
      return;

    let widget_id = GetWidgetID( widget );
    if( widget_id != alarm_sp_info.id )
    {
       AppInfo( "Mismatched data point id. Failed to initialize alarm setpoints for ID=" + widget_id );
       return;
    }
    
    if( alarm_sp_info.has_low_sp && alarm_sp_info.low_sp != null )
    {
       widget.SetDResource( "HasLowSP", 1. );
       widget.SetDResource( "SpinnerLow/Value", alarm_sp_info.low_sp );
    }
    else
      widget.SetDResource( "HasLowSP", 0. ); // Hide SpinnerLow

    if( alarm_sp_info.has_high_sp && alarm_sp_info.high_sp != null )
    {
       widget.SetDResource( "HasHighSP", 1. );
       widget.SetDResource( "SpinnerHigh/Value", alarm_sp_info.high_sp );
       
    }
    else
      widget.SetDResource( "HasHighSP", 0. ); // Hide SpinnerHigh

    // Set Min/Max values for the spinners.
    if(  alarm_sp_info.low != null )
    {
       if( alarm_sp_info.has_low_sp )
         widget.SetDResource( "SpinnerLow/MinValue", alarm_sp_info.low );

       if( alarm_sp_info.has_high_sp )
         widget.SetDResource( "SpinnerHigh/MinValue", alarm_sp_info.low );
    }

    if(  alarm_sp_info.high != null )
    {
       if( alarm_sp_info.has_low_sp )
         widget.SetDResource( "SpinnerLow/MaxValue", alarm_sp_info.high );

       if( alarm_sp_info.has_high_sp )
         widget.SetDResource( "SpinnerHigh/MaxValue", alarm_sp_info.high );
    }
}

////////////////////////////////////////////////////////////////////////////////
// Populate widget tags by replacing 'ID' in TagSource with the widget's ID
// property value. The tag assignment logic may be extended by the application
// as needed.
////////////////////////////////////////////////////////////////////////////////
function AssignWidgetTags( /*GlgObject*/ widget )
{
   if( widget == null )
     return;
   
   // Retrieve ID property from the widget, if any.
   let widget_id = GetWidgetID( widget ); /* String */
   
   // Omit the widget if it doesn't have a valid ID.
   if( widget_id == null )
     return;
   
   // Retrieve widget tags.
   let tag_list = widget.CreateTagList( /*all tags*/ false );
   if( tag_list == null )
     return;  // no tags found.
    
   let size = tag_list.GetSize();
   if( size == 0 )
     return;  // no tags found 

   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );
      ReplaceTagStr( tag_obj, 'ID', widget_id );
   }
}

////////////////////////////////////////////////////////////////////////////////
// Change TagSource to replace a substring defined by str with the new substring
// defined by new_str.
////////////////////////////////////////////////////////////////////////////////
function ReplaceTagStr( /*GlgObject*/ tag_obj, /*String*/ str,
                        /*String*/ new_str )
{
   if( tag_obj == null || IsUndefined( str ) || IsUndefined( str ) )
     return false;

   let tag_source = tag_obj.GetSResource( "TagSource" );
      
   // Skip undefined tags.
   if( IsUndefined( tag_source ) )
     return false;

   /* Build a new tag source string where all occurrences of the substring
      specified by str are replaced with the substring specified by new_str.
   */
   let new_tag_source = tag_source.replace( str, new_str );
   
   if( new_tag_source === tag_source ) 
     return false; // tag source hasn't changed, nothing to do.
      
   // Assign new TagSource for the tag object.
   AssignTagSource( tag_obj, new_tag_source );
   return true;
}   

////////////////////////////////////////////////////////////////////////////////
// Finalizes the charts and returns true if any of the charts need data to be
// prefilled.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinalizeCharts = function()   /*boolean*/
{
   let need_data_prefill = false;

   let size = this.ChartList.length;
   for( let i=0; i<size; ++i )
   {
      let chart_widget = this.ChartList[i];
      if( !chart_widget.SetupFinished )
      {
         /* Chart setup has not been finished yet - do it now. */
         chart_widget.Finalize();

         if( chart_widget.PrefillActive )
           need_data_prefill = true;
      }
   }
   return need_data_prefill;
}

////////////////////////////////////////////////////////////////////////////////
// Prefills charts with data.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.PrefillCharts = function()
{
   if( !this.Active )
     return;

   let size = this.ChartList.length;
   for( let i=0; i<size; ++i )
   {
      let chart_widget = this.ChartList[i];
      if( chart_widget.PrefillActive )
        chart_widget.FillChartHistory();
   }
}

////////////////////////////////////////////////////////////////////////////////
// Query tags for the viewer viewport and rebuild TagRecordArray. 
// TagRecordArray will include all tags for the loaded page, as well as tags
// for the popup dialogs, if any.
// Also finalize setup of any newly loaded chart widgets.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.QueryTags = function()
{
   /* Finalize setup of any newly loaded chart widgets. It can be performed
      only after all tag assignments are done, which is true when QueryTags()
      is invoked. Therefore, finalize the charts here.
      FinalizeCharts() returns true if there are any charts that need to be
      prefilled.
   */
   if( this.FinalizeCharts() )
   {
      if( RANDOM_DATA )
        /* In demo mode, prefilling is done synchronously - prefill data on a
           timer to let the browser display the loaded drawing first without
           a pause caused by prefilling data.
        */
        setTimeout( ()=>this.PrefillCharts(), 10 );
      else
        this.PrefillCharts();
   }
              
   // Build TagRecords array, a list of GLG tag records.
   this.TagRecords = this.CreateTagRecords( this.MainViewport );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CreateDataFeed = function()
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

////////////////////////////////////////////////////////////////////////////////
// Create and populate TagRecords array, with elements of type
// GlgTagRecord.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CreateTagRecords = function( viewport )
{
   /* Retrieve a tag list from the drawing. Include tags with unique
      tag sources.
   */
   let tag_list = viewport.CreateTagList( /*unique tag sources*/ true );
   if( tag_list == null )
     return null;  // no tags found.
    
   let size = tag_list.GetSize();
   if( size == 0 )
     return null;  // no tags found 
    
   /* Create an array of tag records by traversing the tag list and retrieving 
      information from each tag object in the list.
   */
   let tag_record_array = [];
   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );
      let tag_source = tag_obj.GetSResource( "TagSource" );
      let tag_name = tag_obj.GetSResource( "TagName" );
      let tag_comment = tag_obj.GetSResource( "TagComment" );
      let data_type = Math.trunc( tag_obj.GetDResource( "DataType" ) );
      
      // Skip undefined tags.
      if( IsUndefined( tag_source ) )
        continue;

      /* Skip disabled tags. These tags may be present in a chart widget with
         MultiSampleUpdate flag.
      */
      let tag_enabled = tag_obj.GetDResource( "TagEnabled" );
      if( tag_enabled == 0 )
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
      }

      /* Add a valid tag record to the list. "value" property will be assigned
         in StoreTagValue(), when a new data value is received. 
      */
      let tag_record = new GlgTagRecord( data_type, tag_name, tag_source, 
                                         tag_obj, tag_access_type );

      /* If a loaded drawing contains charts, find a chart plot with 
         a matching tag_source. If found, and the plot's MultiSampleUpdate 
         flag is false, store the plot info associated with this tag to 
         indicate that the plot's time_stamp and valid flag should 
         be pushed for this tag in PushData().
      */
      if( SUPPLY_PLOT_TIME_STAMP && this.ChartList.length > 0 )
      {
         let plot_info = this.LookupChartPlotByTag( tag_source );
         if( plot_info != null && !plot_info.MultiSampleUpdate )
           tag_record.plot_info = plot_info;
      }
      
      tag_record_array.push( tag_record );
   }

   Debug( "TagRecords array size: " + tag_record_array.length ); 

   if( tag_record_array.length == 0 )
     return null;

   return tag_record_array;
}

////////////////////////////////////////////////////////////////////////////////
// Obtains real-time data for all tags defined in the drawing.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetData = function()
{
   if( !this.Active || this.DataFeed == null )
     return;

   /* The drawing doesn't have tags, viewer is not ready, or waiting for 
      prefilling a tag-based chart - get the timer going using a shorter
      interval and return.

      WaitForPrefill may be set if a chart with tag-based data updates is 
      waiting for prefilling. If set, suspend data updates until prefilling has
      finished to avoid current tag data being pushed into the chart before the
      older historical data. To keep tag data updates active during prefilling,
      use charts with MultiSampleUpdate.
   */
   if( !this.IsReady || this.WaitForPrefill > 0 || this.TagRecords == null )
   {
      /* The drawing doesn't have tags, or viewer is not ready - 
         get the timer going using a shorter interval and return.
      */
      setTimeout( ()=>this.GetData(), 30 );
      return;
   }
   
   this.DataStartTime = GetCurrTime();  // Current time in sec.

   /* Obtain new real-time data values for all tags in the TagRecords array
      and invoke GetDataCB callback when done. Pass currently loaded drawing
      name to the callback. Use time interval in seconds.
   */
   this.DataFeed.RequestData( this.TagRecords,
                              /*callback*/ this.GetDataCB.bind( this ), 
                              /*user data*/ this.LoadedDrawingName );
}

////////////////////////////////////////////////////////////////////////////////
// Obtains real-time data for all charts with MultiSampleUpdate property > 0.
// These charts are updated separately from the general tag mechanism and use
// plot entry points (ValueEntryPoint, etc.) to push plot data.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetChartData = function()
{
   if( !this.Active || this.DataFeed == null )
     return;
    
   /* Build a combined list of tag sources from all plots in the charts with
      MultiSampleUpdate flag.
   */
   if( this.RebuildPlotTagList )
   {
      this.PlotTagList = this.CreatePlotTagList();
      this.RebuildPlotTagList = false;
   }
    
   if( !this.IsReady || this.PlotTagList == null )
   {
      /* The viewer is not ready or the drawing doesn't have charts with 
         MultiSampleUpdate flag that are active (not waiting for prefilling)
         get the timer going using a shorter interval and return.
      */
      setTimeout( ()=>this.GetChartData(), 30 );
      return;
   }
   
   let current_time = GetCurrTime();  // Current time in sec.

   /* Request chart data that came since the last chart data
      query. MAX_NUM_SAMPLES may be used to limit the maximum number 
      of data points per chart update operation. The GetChartDataCB callback
      will be invoked with the list of received data points.
   */
   let status =
     this.DataFeed.RequestPlotData( this.PlotTagList,
                                    /*start time*/ this.ChartLastUpdateTime,
                                    /*end_time*/ current_time,
                                    MAX_NUM_SAMPLES,
                                    /*real-time mode*/ false,
                                    /*callback*/ this.GetChartDataCB.bind( this ),
                                    /*user data*/ this.LoadedDrawingName );
   
   if( status )
     this.ChartLastUpdateTime = current_time;
}

////////////////////////////////////////////////////////////////////////////////
// Data query callback. It is invoked by the DataFeed after the new data 
// are received from the server.
////////////////////////////////////////////////////////////////////////////////
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
      GlgDataRecord objects, i.e. GlgDataRecord[].
   */ 
   new_data = this.DataFeed.ProcessRawData( new_data );
   
   /* Query new data even if the previous query failed (new_data is null),
      to continue data updates even if there were intermittent network errors.
   */
   if( USE_FIXED_TIMER_INTERVAL )  // Use fixed targeted DataUpdateInterval
   {
      // Push new data to graphics for all other pages.
      this.PushData( new_data );
      
      // Send new data query request.
      setTimeout( ()=>this.GetData(), this.DataUpdateInterval );
   }
   else   /* Adjust TimerInterval, trying to maintain targeted
             DataUpdateInterval */
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
        /* Data query took longer than targeted DataUpdateInterval: process
           with no delay.
        */
        this.ProcessData( new_data );
      else
        // Delay next iteration to maintain requested update rate.
        setTimeout( ()=>this.ProcessData( new_data ), this.TimerInterval );
   }
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetChartDataCB = function( new_data, drawing_name )
{
   if( !this.Active )
     return;

   /* Ignore new data if the drawing name has changed and a new drawing 
      has been loaded. Stop further queries for the old drawing and start
      queries for the plots of the new drawing, if any.
   */ 
   if( drawing_name != this.LoadedDrawingName )
   {
      /* When a new drawing is loaded, restart the timer with a shorter
         time interval to fill the newly loaded drawing with data right away.
      */
      setTimeout( ()=>this.GetChartData(), 30 );   
      return;
   }

   /* Perform processing of new data using application specific 
      chart data format. The returned new_data is expected to be an array of
      PlotDataPoint objects, i.e. PlotDataPoint[].
   */ 
   new_data = this.DataFeed.ProcessRawChartData( new_data );

   // Update all charts with MultiSampleUpdate flag with newly received data.
   this.UpdateCharts( new_data );
   
   // Send new chart data query request.
   setTimeout( ()=>this.GetChartData(), this.ChartUpdateInterval );
}

////////////////////////////////////////////////////////////////////////////////
// Updates all charts with MultiSampleUpdate flag with new data.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.UpdateCharts = function( /*PlotDataPoint[]*/ new_data )
{
   if( new_data == null || new_data.length == 0 )
   {
      AppInfo( "No new chart data received." );
      return;
   }
   
   // Push new data samples to the each chart's plots.
   let size = this.ChartList.length;
   for( let i=0; i<size; ++i )
     this.ChartList[i].PushChartData( new_data, /*use real-time mode*/ false );

   // Refresh display.
   this.MainViewport.Update();
}
   
////////////////////////////////////////////////////////////////////////////////
// Used only if USE_FIXED_TIMER_INTERVAL = false.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ProcessData = function( new_data )
{
   if( !this.Active )
     return;

   let update_start_time = new Date().getTime();

   // Push new data to graphics for all other pages.
   this.PushData( new_data );
        
   let update_finish_time = new Date().getTime();

   this.UpdateDuration = update_finish_time - update_start_time;
   this.WaitForUpdate = false;   // Update finished.
}

////////////////////////////////////////////////////////////////////////////////
// Push new data into graphics. For each tag in new_data array, find a
// tag record in TagRecords array with a matching tag_source, store
// the new value in the found tag record, and push new value into graphics.  
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.PushData = function( /*GlgDataRecord[]*/ new_data )
{
   if( new_data == null || new_data.length == 0 )
   {
      AppInfo( "No new data received." );
      return;
   }

   if( this.TagRecords == null || !this.UpdatesEnabled )
     return;
   
   let tag_record = null;
   let size = new_data.length;
   for( let i=0; i<size; ++i )
   {
      /* Store a new value in the tag record with a matching tag source,
         if found. 
      */
      tag_record = this.StoreTagValue( new_data[i].tag_source,
                                       new_data[i].data_type,
                                       new_data[i].value,
                                       new_data[i].time_stamp,
                                       new_data[i].value_valid );
      // Tag record not found.
      if( tag_record == null )
        continue;

      // Push new data value into graphics.
      switch( tag_record.data_type )
      {
       case GLG.GlgDataType.D: // D-type tag
         /* Push a new data value into a given tag. If the last argument 
            (if_changed flag) is true, the value is pushed into graphics
            only if it changed. Otherwise, a new value is always 
            pushed into graphics. The if_changed flag is ignored for tags
            attached to the plots in a real time chart, and the new value
            is always pushed to the chart even if it is the same.
         */
         this.MainViewport.SetDTag( tag_record.tag_source, tag_record.value, 
                                    /*if_changed*/ true );
         
         /* If SUPPLY_PLOT_TIME_STAMP=true and the tag source is used in a 
            chart plot, push time_stamp and value_valid flag for this plot.
            If SUPPLY_PLOT_TIME_STAMP=false, the chart automatically
            supplies a time stamp using current time.
            There is no need to push the value, it was done via SetDTag.
         */
         if( SUPPLY_PLOT_TIME_STAMP && tag_record.plot_info != null )
         {
            this.PlotPoint.FillPlotPoint( /*value*/ null, tag_record.time_stamp,
                                          tag_record.value_valid );
            tag_record.plot_info.PushPlotPoint( this.PlotPoint );
         }
         break;
            
       case GLG.GlgDataType.S:
         this.MainViewport.SetSTag( tag_record.tag_source, tag_record.value, 
                                    /*if_changed*/ true );
         break;
             
       case GLG.GlgDataType.G:      // Not used in this example.
      }
   }

   // Refresh display.
   this.MainViewport.Update();
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StoreTagValue =
  function( /*String*/ tag_source, /*GlgDataType*/ data_type,
            /*double or String*/ value, /*double*/ time_stamp,
            /*boolean*/ value_valid )
{
   // Find a tag record with a matching tag_source.
   let tag_record = this.LookupTagRecords( tag_source );

   if( tag_record == null ) // Not found.
     return null;

   if( data_type == null )
   {
      /* Unknown data type supplied with new data -- treat the received
         value based on tag_record.data_type.
      */
      data_type = tag_record.data_type;
   }
   else if( data_type != tag_record.data_type ) // mismatch
   {
      AppError( "StoreTagValue(): data_type mismatch, skipping tag: " +
                tag_source );
      return null;
   }
         
   switch( tag_record.data_type )
   {
    case GLG.GlgDataType.D: // D-type tag
      let d_value = Number.parseFloat( value );
      if( Number.isNaN( d_value ) )
      {
         AppError( "Invalid value received for D-type tag: " +
                   "  tag=" + tag_source + " value=" + value );
         return null;
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
         return null;
      }
      
      // Store new value in the tag_record as a string.
      tag_record.value = value;
      break;
      
    case GLG.GlgDataType.G: // Unsupported in this demo.
      AppError( "Invalid date_type. Skipping tag = " + tag_source );
      return null;
    }
       
   // Store supplied time stamp and the valid flag in the found tag_record.
   tag_record.time_stamp = time_stamp;
   tag_record.value_valid = ( value_valid !=null ? value_valid : true );

   // Return a valid tag record.
   return tag_record;
} 

////////////////////////////////////////////////////////////////////////////////
// Handle user interaction with the buttons, as well as process custom
// actions attached to objects in the drawing.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InputCallback =
  function( /*GlgObject*/ viewport, /*GlgObject*/ message_obj )
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
      // Don't process object commands if viewport is in ZoomToMode.
      if( ZoomToMode( viewport ) )
        return;
      
      let action_obj = message_obj.GetResourceObject( "ActionObject" );
      this.ProcessObjectCommand( viewport, selected_obj, action_obj );
      this.MainViewport.Update();
   }
    
   // Handle custom events.
   else if( format == "CustomEvent" )
   {
      // Don't process object selection event if viewport is in ZoomToMode.
      if( ZoomToMode( viewport ) )
        return;
         
      let event_label = message_obj.GetSResource( "EventLabel" );
      let action_data = null;
        
      if( event_label == null || event_label == "" )
        return;    // don't process events with empty EventLabel.
      
      let action_obj = message_obj.GetResourceObject( "ActionObject" ); 
      if( action_obj != null )
        action_data = action_obj.GetResourceObject( "ActionData" );

      // Place custom code here to handle custom ActionData.
        
      // Handle custom input events based on EventLabel.
      switch( event_label )
      {
       case "SaveChanges":
         this.SaveChanges();

         /* Disables Save button if saving changes was successful. */
         this.UpdateDialogButtons( viewport );
         break;
         
       case "ValidateChanges":
         if( this.ValidateChanges() )
         {
            this.RecordsValidated = true;
            this.UpdateDialogButtons( viewport );  /* Enables Save button. */
         }
         else
           this.AppMessage( "Value Change Validation failed, see log for details." );
         break;

       case "CancelChanges":
         /* Cancel changes without closing the dialog, which is different 
            from ClosePopupDialog command which closes the dialog. 
            Closing active dialog may not generate this event, as closing 
            active dialog cancels changes by directly clearing 
            WriteDataRecords without sending this event.
         */
         this.CancelChanges( viewport );

         this.UpdateDialogButtons( viewport );
         break;
      }
      
      viewport.Update();
   }
    
   else if( format == "Button" )
   {	 
      // Neither a push button nor a toggle button.
      if( action !="Activate" && action != "ValueChanged" )
        return;
        
      if( action == "Activate" )  // Push button event.
      {
         if( origin == "Left" )
           this.PerformZoom( 'l' );
         else if( origin == "Right" )
           this.PerformZoom( 'r' );
         else if( origin == "Up" )
           this.PerformZoom( 'u' );
         else if( origin == "Down" )
           this.PerformZoom( 'd' );
         else if( origin == "ZoomIn" )
           this.PerformZoom( 'i' );
         else if( origin == "ZoomOut" )
           this.PerformZoom( 'o' );
         else if( origin == "ZoomTo" )
           this.PerformZoom( 't' );
         else if( origin == "ZoomReset" )
           this.PerformZoom( 'n' );
      }
      else if( action == "ValueChanged" ) // Toggle button event.
      {
         let state = message_obj.GetDResource( "OnState" );

         // PlayButton toggles updates on/off
         if( origin == "PlayButton" )
         {
            if( state == 1 )
              this.ResumeUpdates( /*don't update the button*/ false );
            else
              this.PauseUpdates( /*don't update the button*/ false );
         }
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
         this.ClosePopupDialog( this.ActivePopup.popup_type, null );
         viewport.Update();
      }
   }

   /* Finalize drawing initialization and update display after 
      a subdrawing or a subwindow loads its drawing.
   */
   else if( format == "TemplateLoad" )
   {
      if( GLG.GetPendingInstances() == 0 )
      {
         if( !this.ViewerStarted )
           this.FinalizeViewer();
         else if( this.GoToSubwindow )
         {
            /* Viewer started, but a new page is loaded into a subwindow,
               and it requires page initialization.
            */
            this.FinalizePageLoad( this.GoToSubwindow.GetResourceObject( "Instance" ) );
         }
         else if( this.ActivePopup != null && !this.ActivePopup.finalized )
           this.FinalizeActivePopup();
      }
      this.MainViewport.Update();
   }

   // Update display after an image object loads its image file.
   else if( format == "ImageLoad" )
     this.MainViewport.Update();
}

////////////////////////////////////////////////////////////////////////////////
// Trace callback is used to process native events of interest.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.TraceCallback =
  function( /*GlgObject*/ viewport, /*GlgTaceData*/ trace_info )
{
   if( !this.Active )
     return;

   let x, y; //Cursor position.
   let event_type = trace_info.event_type;
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
      // On mobile devices, enable touch dragging for defining ZoomTo region.
      if( !this.StartDragging )
        return;
      
      GLG.SetTouchMode();        /* Start dragging via touch events. */
      this.StartDragging = false;     /* Reset for the next time. */
      /* Fall through */
      
    case GLG.GlgEventType.TOUCH_MOVED:
      if( !GLG.GetTouchMode() )
        return;
       /* falls through */
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
      switch( keyCode )
      {
       case 27: // ESC key
         break;
       default: break;
      }
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.PerformZoom = function( /* String */ zoom_type )
{
   if( !this.Active )
     return;

   if( this.ZoomVP == null || !this.IsReady )
   {
      AppInfo( "Null ZoomVP or not ready, zooming is not performed." );
      return;
   }

   let zoom_vp = this.ZoomVP;
   switch( zoom_type )
   {
    case 'i':
    case 'o':
      Zoom( zoom_vp, zoom_type, 1.5 );
      zoom_vp.Update();
      break;

    case 'l':
    case 'r':
    case 'u':
    case 'd':
      Zoom( zoom_vp, zoom_type, 0.1 );
      zoom_vp.Update();
      break;

    case 'n':
      Zoom( zoom_vp, 'n', 0 );
      zoom_vp.Update();
      break;

    case 't':
      this.StartDragging = true;
      Zoom( zoom_vp, 't', 0.0 );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Performs zoom/pan operations of the specified type.
////////////////////////////////////////////////////////////////////////////////
function Zoom( /*GlgObject*/ viewport, /*String*/ zoom_type, /*double*/ scale )
{
   if( viewport == null )
     return;

   let zoom_reset_type = 'n';
   switch( zoom_type )
   {
    default: 
      viewport.SetZoom( null, zoom_type, scale );
      break;
      
    case 'n':
      /* If a viewport is a chart with the chart zoom mode, use 'N'
         to reset both Time and Y ranges. For a chart, 'n' would reset 
         only the Time range.
      */
      let zoom_mode_obj =   /* GlgObject */
        viewport.GetResourceObject( "ZoomModeObject" );
       if( zoom_mode_obj != null &&
           zoom_mode_obj.GetObjectType() == GLG.GlgObjectType.CHART )
         zoom_reset_type = 'N';
      
      viewport.SetZoom( null, zoom_reset_type, 0.0 );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Clear previously stored information for the Back button, if any.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ClearBackInfo = function()
{
   this.PreviousDrawingFile = null;
   this.PreviousDrawingTitle = null;
   this.CurrentDrawingFile = null;
   this.CurrentDrawingTitle = null;
}

////////////////////////////////////////////////////////////////////////////////
// Store information to be used for the Back button, if present on the page,
// to navigate between GLG drawings.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StoreBackInfo =
  function( /*String*/ drawing_file, /*String*/ title, destination /*String*/  )
{
   /* Loading a new top drawing - store only information for the top-level
      drawing and clear it for the GoTo subdrawing.
   */
   if( destination == "/" )
   {
      /* Store destination as top-level (unless it is the first time with no
         loaded drawing).
      */
      if( this.TopDrawingName != null )
        this.PreviousDestination = "/";

      this.PreviousTopDrawingName = this.TopDrawingName;
      this.TopDrawingName = drawing_file;
      
      this.PreviousTopTitle = this.TopTitle;
      this.TopTitle = title;
      
      /* Clear information about the drawing loaded in the GoTo subwindow of the
         current top drawing: the new top drawing may have no GoTo subwindow or
         have a different, unrelated one.
      */
      this.PreviousDrawingName = null;
      this.PreviousDrawingTitle = null;
      this.CurrentDrawingName = null;
      this.CurrentDrawingTitle = null;
   }
   else   /* Loading a new drawing into the GoTo subwindow:
             Store information about the drawing loaded in the subwindow. */
   {
      this.PreviousDestination = this.CurrentDestination;

      this.PreviousDrawingName = this.CurrentDrawingName;
      this.PreviousDrawingTitle = this.CurrentDrawingTitle;
      
      this.CurrentDrawingName = drawing_file;
      this.CurrentDrawingTitle = title;
   }

   this.CurrentDestination = destination;
}

////////////////////////////////////////////////////////////////////////////////
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

   /* Allow Control-type command only for the Administrator user.
      For example, popup dialogs for changing values or alarm setpoints
      will appear only for users with administrative privileges.
    */
   if( event_label == "Control" && this.UserRole != Data.ADMINISTRATOR_ROLE )
   {
      this.AppMessage( "Administrative privileges are required to execute this action." );
      return;
   }

   let save_later;
   let widget_type = GetWidgetType( command_vp );
   let command_type = GetCommandType( command_obj );
   switch( command_type )
   {
    case "PopupDialog":
      if( !this.IsReady )
      {
         AppAlert( "Please wait for the page to finish loading" );
         break;
      }
      
      this.DisplayPopupDialog( command_vp, selected_obj, command_obj,
                               event_label );
      break;
      
    case "ClosePopupDialog":
      let dialog_type = GetDialogType( command_obj );
      this.ClosePopupDialog( dialog_type, command_obj );
      break;
      
    case "PopupMenu":
      this.DisplayPopupMenu( command_vp, selected_obj, command_obj,
                             event_label );
      break;
      
    case "ClosePopupMenu":
      this.ClosePopupMenu();
      break;
      
    case "GoTo":
      this.GoTo( command_vp, selected_obj, command_obj, event_label );
      break;

    case "GoBack":
      this.GoBack();
      break;
      
    case "WriteValue":
      // Process Write command only for users with administrative privileges.
      if( this.UserRole != Data.ADMINISTRATOR_ROLE )
      {
         this.AppMessage( "Administrative privileges are required to adjust " +
                          "values. Changes will not be saved." );
         break;
      }

      save_later = ( event_label == "SaveForLater" );
      
      // Process command.
      this.WriteValue( command_vp, selected_obj, command_obj, save_later );
      if( save_later )
        this.UpdateDialogButtons( command_vp );
      break;
      
    case "WriteValueFromWidget":
      /* Write command is allowed only for users with administrative 
         privileges.
      */
      if( this.UserRole != Data.ADMINISTRATOR_ROLE )
      {
         this.AppMessage( "Administrative privileges are required to adjust " +
                          "values. Changes will not be saved." );
         break;
      }

      save_later = ( event_label == "SaveForLater" );

      // Process command.
      this.WriteValueFromInputWidget( command_vp, selected_obj, command_obj,
                                      save_later );
      if( save_later )
        this.UpdateDialogButtons( command_vp );
      break;
      
    default: 
      AppError( "Command failed: Unknown CommandType." );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Process command "PopupDialog". This example handles popup dialogs embedded
// in the loaded drawing. The dialog displays a popup drawing defined by the
// DrawingFile property of the command attached to a widget.
//
// If defined, the DialogResource property of the command specifies the name
// of the popup viewport in the drawing. Otherwise, a popup viewport is added
// on the fly using PopupVPTemplate object loaded as an asset.
//
// If DialogResource points to a viewport in the drawing, this viewport 
// must contain a subwindow named DrawingArea, which will be used to
// display a drawing defined by the DrawingFile property of the command.
//
// The DrawingFile property in the command is mandatory.
// The application may extend the logic to handle other popup types.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayPopupDialog = function( /*GlgObject*/ command_vp,
                                                   /*GlgObject*/ selected_obj, 
                                                   /*GlgObject*/ command_obj,
                                                   /*String*/ event_label )
{
   /* To avoid flickering, do nothing if the popup is already displayed
      and the user clicked on the same object.
   */
   if( this.ActivePopup != null &&
       selected_obj.Equals( this.ActivePopup.selected_obj ) )
      return;
   
   // Obtain DialogType.
   let dialog_type = GetDialogType( command_obj );

   switch( dialog_type )
   {
    case "Popup":
      // Close currently displayed active popup dialog, if any.
      this.CloseActivePopup();
         
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

    case "ViewerDialog":
      // GLG AlarmButton: show AlarmDialog with a list of system alarms. 
      if( event_label == "ShowAlarms" )
      {
         this.AlarmPage.ShowAlarms( "System Alarms" );
         return;
      }
         
      // Add custom code here to handle other global/html dialogs.
      break;
    
    case "NativeDialog":
      AppError( "Not implemented: Add code to implement native popup dialog." );
      break;
      
    case "CustomDialog":
      AppError( "Not implemented: Add code to implement custom popup dialog." );
      break;
      
    default:
      AppError( "Unknown type of popup dialog: can't create." );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Process command "PopupMenu". The MenuResource property of the command
// may specify the name of the popup menu viewport embedded in the drawing.
// It is expected that the popup viewport contains a subwindow named
// DrawingArea, which will be used to display a menu drawing defined by
// the DrawingFile property of the command.
//
// If MenuResource is not defined, a popup viewport is added on the fly
// using PopupVPTemplate object loaded as an asset. The DrawingFile property
// defined in the command specifies the drawing name to be displayed in the
// popup.
//
// The DrawingFile property is mandatory.
// The application may extend the logic to handle other types of popup menus.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayPopupMenu = function( /*GlgObject*/ command_vp, 
                                                 /*GlgObject*/ selected_obj,
                                                 /*GlgObject*/ command_obj,
                                                 /*String*/    event_label )
{
   /* To avoid flickering, do nothing if the popup is already displayed and the
      user clicked on the same object.
   */
   if( this.ActivePopup != null &&
       selected_obj.Equals( this.ActivePopup.selected_obj ) )
      return;
   
   // Close currently active popup menu, if any.
   this.ClosePopupMenu();

   // Obtain MenuType.
   let menu_type = GetPopupMenuType( command_obj );

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

    case "CustomPopupMenu":
      AppError( "Not implemented: Add code to implement custom popup menu." );
      break;
       
    default:
      AppError( "Unknown type of popup menu: can't create." );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
// Handle popups embedded in the loaded drawing.
// popup_name specifies the viewport name in the drawing to be used to
// display a popup menu or popup dialog drawing specified by the command.
// 
// With the Intermediate API, a popup viewport is expected to be saved 
// in each drawing that supports popup commands. 
//
// With the Extended API, the popup viewport is added to the
// drawing on the fly, making a copy of PopupVPTemplate object
// (loaded as an asset).
//
// The popup viewport is expected to have a subwindow named DrawingArea,
// which is used to display a drawing defined by the DrawingFile property
// of the command.
//
// The DrawingFile property in the command is mandatory.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayEmbeddedPopup = function( /*int*/ popup_type,
                                                     /*String*/ popup_name, 
                                                     /*GlgObject*/ selected_obj,
                                                     /*GlgObject*/ command_obj,
                                                     /*String*/ event_label )
{
   /* Retrieve DrawingFile from the command, which specifies the 
      GLG drawing to be displayed in the popup viewport.
   */
   let drawing_file = command_obj.GetSResource( "DrawingFile" );
   if( IsUndefined( drawing_file ) )
   {
      AppError( "Invalid DrawingFile, popup command failed." );
      return;
   }
    
   // Extract Title string from the command.
   let title = command_obj.GetSResource( "Title" );

   /* Extract  ParamS and ParamD parameters from the command, which may
      define extra custom data.
   */
   let paramS = command_obj.GetSResource( "ParamS" );
   let paramD = command_obj.GetDResource( "ParamD" );

   // Create ActivePopup object and store information for the active popup.
   if( !this.CreateActivePopup( popup_type, popup_name, drawing_file,
                                selected_obj, title, paramS, paramD ) )
     AppError( "Popup command failed." );
}


////////////////////////////////////////////////////////////////////////////////
// Finish popup initialization. This method is invoked in HierarchyCallback
// after hierarchy is set up for the loaded popup drawing.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.FinalizeActivePopup = function()
{
   if( this.ActivePopup == null || this.ActivePopup.drawing_vp == null ) 
   {
      AppError( "Popup command failed." );
      this.CloseActivePopup();
      return;
   }

   // Initialize the popup drawing based on the selected object.
   this.InitializePopup( this.ActivePopup.selected_obj,
                         this.ActivePopup.drawing_vp );

   // Adjust popup parameters for mobile devices as needed.
   this.AdjustForMobileDevices( this.ActivePopup.drawing_vp );
    
   /* Set popup viewport size, based on the size of the loaded popup drawing,
      and position it next to the selected object.
   */
   this.SetPopupSizeAndPosition();

   this.QueryTags();
   
   // Make the new popup visible. 
   this.ActivePopup.popup_vp.SetDResource( "Visibility", 1 );
   this.ActivePopup.finalized = true;
}

////////////////////////////////////////////////////////////////////////////////
// Create GlgActivePopup object and store information about the currently
// active popup.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CreateActivePopup =
  function( /*int*/ popup_type, /*String*/ popup_name, /*String*/ drawing_file,
            /*GlgObject*/ selected_obj, /*String*/ title,
            /*String*/ paramS, /*double*/ paramD )           /* boolean */
{
   if( this.MainViewport == null )
     return false;

   // Retrieve popup viewport, if any.
   let popup_vp = this.MainViewport.GetResourceObject( popup_name );

   let first_popup = false;
   if( popup_vp == null )
   {
      /* A popup viewport has a custom name different from default, but
         an object with this name is not found in the loaded drawing: 
         generate an error and return.
      */
      if( popup_name != POPUP_VIEWPORT_NAME )
      {
         AppError( "Can't find embedded dialog or menu " + popup_name );
         return false;
      }

      /* A popup viewport with a default name is not present in the loaded 
         drawing: add it on the fly from PopupVPTemplate. 
         Extended API is required to execute this functionality.
      */
      if( HAS_EXTENDED_API )
      {
         if( this.PopupVPTemplate == null )
         {
            AppError( "Null popup viewport template." );
            return false;
         }
         
         /* Create a new PopupViewport by making a copy of the popup 
            template, and set the flag to add the popup viewport to 
            the drawing.
         */
         popup_vp = 
           this.PopupVPTemplate.CloneObject( GLG.GlgCloneType.FULL_CLONE );
         
         first_popup = true;
      }
      else
      {
         AppError( "Can't find popup viewport" + popup_name );
         return false;
      }
   }
   
   // Retrieve DrawingArea subwindow from the popup viewport.
   let subwindow = popup_vp.GetResourceObject( "DrawingArea" );
   if( subwindow == null ) 
   {
      AppError( "Can't find DrawingArea in the popup viewport." );
      return false;
   }

   // Create a new ActivePopup object.
   this.ActivePopup =
     new GlgActivePopup( popup_type, popup_vp, drawing_file, subwindow,
                         selected_obj, title, paramS, paramD );

   // Load a popup drawing into the subwindow.
   subwindow.SetSResource( "SourcePath", drawing_file );

   /* Set ShellType to make a popup dialog with a floating dialog shell, 
      or a popup menu with a non-floating viewport.
   */
   let shell_type;
   if( popup_type == "Popup" )
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
   popup_vp.SetDResourceIf( "ShellType", shell_type, true );
      
   /* First time: Add popup viewport to the top level viewport, which
      also performs hierarchy setup for popup_vp.
      Otherwise, if the PopupViewport already has been added, call
      SetupHierarchy to trigger popup drawing loading into subwindow.
   */
   if( HAS_EXTENDED_API && first_popup )
     this.MainViewport.AddObjectToBottom( popup_vp );
   else
     popup_vp.SetupHierarchy();

   return true;
}

////////////////////////////////////////////////////////////////////////////////
// Initializes popup before hierarchy setup.
// ActivePopup.drawing_vp is assigned in the Hierarchy callback to the viewport
// loaded into the popup subwindow.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ActivePopupInitBeforeH = function()
{
   if( this.ActivePopup == null || this.ActivePopup.drawing_vp == null ) 
   {
      AppError( "Popup command failed." );
      this.CloseActivePopup();
      return;
   }
   
   // Obtain WidgetType of the loaded popup drawing.
   let widget_type = GetWidgetType( this.ActivePopup.drawing_vp );
      
   /* For a floating popup dialog, set dialog ScreenName based on WidgetType.
      This logic can be adjusted by the application as needed.
   */
   if( this.ActivePopup.is_floating )
   {
      let screen_name = null;
      switch( widget_type )
      {
       case "EditAnalogValue":
         screen_name = "Adjust Analog Value";
         break;
       case "EditDigitalValue":
         screen_name = "Set Digital Value";
         break;
       case "ConfigAlarms":
         screen_name = "Configure Alarm Setpoints";
         break;
       case "EditSetpoints":
         screen_name = "Edit Setpoints";
         break;
       case "UserRole":
         screen_name = "Change User Role";
         break;
       case DEFAULT_WIDGET_TYPE:
       default:
         // Use a title string stored in ActivePopup as a screen name, if any.
         if( !IsUndefined( this.ActivePopup.title ) )
           screen_name = this.ActivePopup.title;
         break;
      }

      if( screen_name )
        this.ActivePopup.popup_vp.SetSResource( "ScreenName", screen_name );
   }
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ActivePopupFinishSetup = function()
{
   /* Finalize ActivePopup initialization. 

      GLG.GetPendingInstances() returns a number of subdrawings that are in the
      process of being loaded. If ActivePopup has no subdrawings, finalize
      initialization right away. Otherwise, finalize initialization in
      InputCallback (format=TemplateLoad) after all subdrawings finished
      loading.
   */
   if( GLG.GetPendingInstances() == 0 )
     this.FinalizeActivePopup();
}
   
////////////////////////////////////////////////////////////////////////////////
// Initialize a popup object based on its WidgetType property of the
// loaded popup drawing (popup_obj), if any.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.InitializePopup =
  function( /*GlgObject*/ selected_obj, /*GlgObject*/ popup_obj )
{
   // Obtain WidgetType of the loaded popup drawing.
   let widget_type = GetWidgetType( popup_obj );

   // Display a title string in the popup, if defined.
   if( !IsUndefined( this.ActivePopup.title ) )
   {
      if( popup_obj.HasResourceObject( "TitleString" ) )
        popup_obj.SetSResource( "TitleString", this.ActivePopup.title );
   }

   /* Set extra parameters ParamS and ParamD in the loaded popup drawing
      if these parameters are specified by the popup command, and if
      ParamS and ParamD resources are present in the popup drawing.
      In this example, ParamS is used to specify YAxis label in the 
      popup chart (rtchart_popup.g).
   */
   if( !IsUndefined( this.ActivePopup.paramS ) && 
       popup_obj.HasResourceObject( "ParamS" ) )
     popup_obj.SetSResource( "ParamS", this.ActivePopup.paramS );
   
   if( this.ActivePopup.paramD != null && 
       popup_obj.HasResourceObject( "ParamD" ) )
     popup_obj.SetDResource( "ParamD", this.ActivePopup.paramD );
   
   // Populate tags in the popup drawing.
   switch( widget_type )
   {
    default:
      /* Transfer tags from the selected object to the popup object,
         (unset_tags parameter = false). 
      */
      let num_remapped = this.TransferTags( selected_obj, popup_obj, false );

      /* Set popup's ID property based on ID of the selected object. */
      TransferWidgetID( selected_obj, popup_obj, false );
      break;
    
    case "ConfigAlarms":
    case "UserRole":
    case "HelpInfo":
      break;   // These widgets don't need to transfer any tags.
   }

   /* Populate tags for widgets inside the popup and initialize each widget
      based on its WidgetType.
   */
   this.ProcessWidgets( popup_obj );
}

////////////////////////////////////////////////////////////////////////////////
// This method may be extended to handle closing of different dialog types. 
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ClosePopupDialog =
  function( /*String*/ dialog_type, /*GlgObject*/ command_obj )
{
   switch( dialog_type )
   {
    case "Popup":  // Embedded popup
      this.CloseActivePopup();
      break;
    case "ViewerDialog":
      /* Alarm dialog is closed using native window event (clicking on the 
         X button), and it never gets here. For other native dialog type,
         add code to implement dialog closing as needed.
      */
      AppError( "Not implemented: Add code to implement native popup dialog." );
      break;
    case "NativeDialog":
      AppError( "Not implemented: Add code to implement native popup dialog." );
      break;
    case "CustomDialog":
      AppError( "Not implemented: Add code to implement custom popup dialog." );
      break;
    default:
      AppError( "Unknown type of popup dialog: can't close." );
      break;
   }
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ClosePopupMenu = function()
{
   /* ActivePopup is singular and is used for both popup menus and embedded 
      popup dialogs. Close it when requested to close popup menu.
   */
   this.CloseActivePopup();
}

////////////////////////////////////////////////////////////////////////////////
// Close currently active popup dialog. It clears the current popup
// and rebuilds TagRecords array.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CloseActivePopup = function()
{
   if( this.ActivePopup == null )
     return;

   /* Reset ActivePopup object. This disables active popup logic in the 
      Hierarchy callback and FinalizeActivePopup(). Local variable is used to
      load empty drawing below.
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
       if( active_popup.popup_vp != null )
       {
          active_popup.popup_vp.SetDResource( "Visibility", 0 );  
          active_popup.popup_vp.Update();
       }
       break;
       
    case "CustomPopupMenu":
      AppError( "Not implemented: Add code to implement custom popup menu." );
      break;

    default:
      AppError( "Unknown popup type: can't close active popup." );
      break;
   }

   // Clear WriteDataRecords array.
   this.WriteDataRecords = null;
   
   // Rebuild TagRecords array, to exclude tags from the previous popup.
   this.QueryTags();
}

////////////////////////////////////////////////////////////////////////////////
// Process "GoTo" command. The command loads a new drawing specified by the
// DrawingFile parameter into the object specified by the Destination parameter.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GoTo =
  function( /*GlgObject*/ command_vp, /*GlgObject*/ selected_obj,
            /*GlgObject*/ command_obj, /*String*/ event_label )
{   
   /* Retrieve command parameters.
      Use XfValue for the DrawinFile and Title property in case this property
      has a transformation attached. For example, Tabs menu widgets have 
      a GoTo command where the DrawinFile property has a List transformation
      allowing to assign a unique DrawingFile for the individual menu items.
   */
   let drawing_file = command_obj.GetSResource( "DrawingFile/XfValue" );
   let destination = command_obj.GetSResource( "Destination" );
   let drawing_title = command_obj.GetSResource( "Title/XfValue" );

   /* The Back button has the GoBack command type and is handled separately.
      For backward compatibility, also handle GoTo commands with 
      event_label="GoBack" or drawing_file="BackToPrevious".
   */
   if( event_label == "GoBack" || drawing_file == "BackToPrevious" )
   {
      this.GoBack();
      return;
   }

   if( IsUndefined( drawing_file ) )
   {
      AppError( "GoTo Command failed: Invalid DrawingFile." );
      return;
   }

   /* rtchart_page.g drawing has four charts. On mobile devices with smaller
      screens, use rtchart_page_ext.g drawing with only two charts.
   */
   if( this.IsMobile && drawing_file == "rtchart_page.g" )
     drawing_file = "rtchart_page_ext.g";

   // Load the new drawing to the requested destination.
   this.Navigate( drawing_file, drawing_title, destination, command_vp );
}
   
////////////////////////////////////////////////////////////////////////////////
// Go back to the drawing displayed before the last GoTo command.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GoBack = function()
{
   let drawing_file, drawing_title;
   
   /* The Back button uses previously stored information to navigate to the
      previous drawing. The stored destination is either "/" when replacing 
      the whole page, or starts with "/" and is relative to MainViewport.
   */
   let destination = this.PreviousDestination;
   if( destination == null )
   {
      this.AppMessage( "GoBack information is not available." );
      return;
   }
      
   // Going back to the previous top drawing.
   if( destination == "/" )
   {            
      drawing_file = this.PreviousTopDrawingName;
      drawing_title = this.PreviousTopTitle;
   }
   else // Going back to the drawing previously displayed in the GoTo subwindow.
   {
      drawing_file = this.PreviousDrawingName;
      drawing_title = this.PreviousDrawingTitle;
   }

   if( drawing_file == null  )
   {
      this.AppMessage( "GoBack information is not available." );
      return;
   }

   // Load the new drawing to the requested destination.
   this.Navigate( drawing_file, drawing_title, destination, null );
}
 
////////////////////////////////////////////////////////////////////////////////
// Navigate to the requested destination.
//
// When invoked by the GoTo command, command_vp is used to determine the
// subwindow to display the drawing in for relative destinations.
//
// When invoked by the Back button, command_vp is null, and the absolute
// destination path is provided by the stored back info.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.Navigate =
  function( /*String*/ drawing_file, /*String*/ drawing_title,
            /*String*/ destination, /*GlgObject*/ command_vp )
{
   /* Navigate to a new drawing based on the destination:
      - If destination="/", replace the top level drawing with a new drawing 
        (replace MainViewport).
      
      - For absolute destinations that start with "/", use the destination
        as a resource path to find the subwindow to display the drawing in.

      - If destination is empty or equals to "./", find a parent subwindow of 
        the viewport where the command occurred (command_vp). If found, replace
        the drawing in that subwindow, otherwise replace the top level drawing
        with a new drawing (replace MainViewport).

      - Handle other destinations as relative to the viewport in which the 
        command occurred: use the destination as a resource path to find the 
        subwindow inside the viewport and display the drawing there if found.
   */
            
   let subwindow;                /*GlgObject*/

   if( destination == "/" )
   {
      // Replace the top page with the new drawing.
      this.LoadDrawing( drawing_file, drawing_title );
      return;
   }
   else if( destination.startsWith("/") )
   {
      /* Absolute destination relative to the top level viewport (MainViewport).
         Omit the first '/' when using the resource path to obtain the subwindow
         object.
      */
      subwindow =
        this.MainViewport.GetResourceObject( destination.substring( 1 ) );
   }
   else
   {
      if( command_vp == null )
      {
         AppError( "Can't navigate: null command_vp." );
         return;
      }

      if( IsUndefined( destination ) || destination == "./" )
      {
         /* Try to locate a parent subwindow based on the command_vp command
            viewport. 
         */
         subwindow = GetParentWidget( command_vp );
         if( !IsSubwindow( subwindow, false ) )
         {
            // Can't find subwindow - replace the top page with the new drawing.
            this.LoadDrawing( drawing_file, drawing_title );
            return;
         }
      }
      else
        /* Destination is relative to the viewport where the command occurred:
           use the destination as a resource path to find the subwindow inside
           the viewport and display the drawing there if found,
        */
        subwindow = command_vp.GetResourceObject( destination );
   }

   /* If a subwindow is found, use it as a destination to load a new drawing.
      A second level destination subwindow may not be available if the drawing
      in the parent subwindow has been replaced.
   */
   if( !IsSubwindow( subwindow, true ) )
   {
      AppError( "Can't navigate: Destination not found." );
      return;
   }

   /* If the new requested filename matches the current drawing file loaded into
      the GoToSubwindow, or the top level drawing, abort the command.
   */
   if( drawing_file == this.CurrentDrawingFile ||  // SubWindow drawing.
       drawing_file == this.TopDrawingName )       // Top level drawing.  
   {
      this.AppMessage( "This drawing is already displayed." );
      return;  // Nothing to do: Requested file matches current file.
   }

   /* Determine subwindow path relative to the MainViewport: it will be stored
      as an absolute destination path for the Back button.
   */
   let subwindow_path = GLG.CreateResourcePath( subwindow, this.MainViewport );
   if( subwindow_path == null )
     AppError( "Can't determine destination path." );
   else
     destination = "/" + subwindow_path;      
   
   // Display Loading message.
   DisplayPageTitle( this.MainViewport,
                     "Loading: ",  drawing_title + ", please wait." );

   // New drawing was requested, cancel any pending drawing load requests.
   this.AbortPendingGoToLoadRequests();

   
   /* Store a new load request in a global variable to be able to abort it
      if needed.
   */
   this.GoToLoadRequest = { enabled: true,
                            drawing_file : drawing_file,
                            drawing_title: drawing_title,
                            destination : destination,
                            subwindow : subwindow };

   /* Send a request to load a new drawing and invoke the GoToCB callback 
      when it's ready.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( drawing_file ), null,
                          this.GoToCB.bind( this ), this.GoToLoadRequest,
                          AbortLoad );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GoToCB =
  function( /* GlgObject */ drawing, /* Object */ user_data, /* String */ path )
{
   if( !this.Active )
     return;
   
   // Reset: we are done with this request.
   this.GoToLoadRequest = null;

   if( drawing == null )
   {
      // Loading failed: stay on the previous page and generate an error.
      AppError( "Drawing loading failed: " + user_data.drawing_title );
      return;
   }

   // Cleanup previous page.
   this.CleanupPage();

   let subwindow = user_data.subwindow;
   let filename = user_data.drawing_file;
   let title = user_data.drawing_title;
   let destination = user_data.destination;
   
   /* Store info to be used for the Back button, using currently loaded
      drawing name, title and destination.
   */
   this.StoreBackInfo( filename, title, destination );
      
   /* Store the subwindow object in a global variable, which will be used
      to finalize the page load into this subwindow in InputCallback
      when all subdrawings have been loaded.
   */
   this.GoToSubwindow = GLG.GetReference( subwindow );

   /* Set the new drawing as a template of the subwindow.
      The new drawing will be set up, and HierarchyCallback will be invoked 
      before and after hierarchy setup for new drawing.
   */
   subwindow.SetTemplate( drawing );

   /* Initialize and display a new drawing if there are no pending subdrawings.
      Otherwise, finish drawing initialization in the InputCallback after all
      subdrawings have been loaded.
   */
   if( GLG.GetPendingInstances() == 0 )
   {
      let viewport = subwindow.GetResourceObject( "Instance" );
      if( viewport != null )
        this.FinalizePageLoad( viewport );
   }

   /* Update TabMenu (if present on the page) if the GoTo command was not 
      triggered the TabMenu, but the loaded drawing corresponds to one of 
      the menu tabs.
   */
   this.UpdateTabMenu( filename ); 

   /* Display Page Title in the MainViewport, using TitleString or Title
      resource, if found.
   */
   DisplayPageTitle( this.MainViewport, "Displayed: ", title );
     
   this.MainViewport.Update();
}

////////////////////////////////////////////////////////////////////////////////
// Update TabMenu (if present on the page) if the GoTo command was
// not triggered the TabMenu, but the loaded drawing corresponds to one
// of the menu tabs, highlight the matching tab item.
// For example, it may happen when using a Back button.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.UpdateTabMenu = function( /*String*/ drawing_file )
{
   if( !this.TabMenu )
     return; // Nothing to do.

   /* Retrieve current tab index. */
   let tab_index = this.TabMenu.GetDResource( "SelectedIndex" );
   
   /* Find a tab with a matching drawing_file, if any. */
   let new_tab_index = this.LookupTabMenuByDrawingFile( drawing_file );
   
   /* If currently selected tab corresponds to the requested drawing_file,
      there is nothing else to do.
   */
   if( new_tab_index == tab_index )
     return;
   
   /* GoTo command was triggered by an object other than TabMenu:
      highlight a corresponding tab with new_tab_index. 
      If a tab corresponding to the specified drawing_file is not found
      (new_tab_index=-1), the menu will be unselected.
   */
   this.TabMenu.SetDResource( "SelectedIndex", new_tab_index );
}

////////////////////////////////////////////////////////////////////////////////
// Display Page Title using resource TitleString or Title, if found.
////////////////////////////////////////////////////////////////////////////////
function DisplayPageTitle( /*GlgObject*/ viewport,
                           /*String*/ prefix, /*String*/ title )
{
   if( viewport == null || title == null )
     return;

   /* Prefix: "Displayed: " or "Loading: " */
   if( viewport.HasResourceObject( "TitleObject/Prefix" ) )
     viewport.SetSResource( "TitleObject/Prefix", prefix );
   
   if( viewport.HasResourceObject( "TitleString" ) )
     viewport.SetSResource( "TitleString", title );
   else if( viewport.HasResourceObject( "Title" ) )
     viewport.SetSResource( "Title", title );
}

////////////////////////////////////////////////////////////////////////////////
// Returns a title string displayed on this page, defined by either
// TitleString or Title resource of the top level viewport (MainViewport).
// If not found, returns title of the top level drawing.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.GetPageTitle = function( /*GlgObject*/ viewport ) /*String*/
{
   if( viewport == null )
     return;
   
   let title_res_obj =   /* GlgObject */
     viewport.GetResourceObject( "TitleString" );

   if( title_res_obj == null )
     title_res_obj = viewport.GetResourceObject( "Title" );

   /* Neither TitleString or Title resource is found: 
      return TopTitle of the currently loaded page. 
   */
   if( title_res_obj == null )
     return this.TopTitle;   

   /* TitleString (or Title) resource value is undefined: return null. */
   let title_str = title_res_obj.GetSResource( null );   /* String */
   if( IsUndefined( title_str ) )
     return null;

   return title_str;
}

////////////////////////////////////////////////////////////////////////////////
// Process command "WriteValue". The command writes a new value specified
// by the Value parameter into the tag in the back-end system
// specified by the OutputTagHolder.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.WriteValue =
  function( /*GlgObject*/ command_vp, /*GlgObject*/ widget,
            /*GlgObject*/ command_obj, /*boolean*/ save_later )
{
   // Retrieve tag source to write data to.
   let tag_source =  command_obj.GetSResource( "OutputTagHolder/TagSource" );
    
   // Validate.
   if( IsUndefined( tag_source ) )
   {
      AppError( "WriteValue Command failed: Invalid TagSource." );
      return;
   }
      
   /* Retrieve the value to be written to the tag source. 
      Use Value/XfValue in case the command's Value property has a 
      transformation attached. If there is no transformation, the value of
      Value/XfValue and Value resource will be the same.
   */
   let value = command_obj.GetDResource( "Value/XfValue" );
    
   /* Place custom code here as needed, to validate the value specified
      in the command.
   */
    
   /* Write new value to the specified tag source. */
   this.WriteDValue( tag_source, value, save_later, widget );
}

////////////////////////////////////////////////////////////////////////////////
// Process command "WriteValueFromWidget". The command allows writing
// a new value into the tag in the back-end system using an input
// widget, such as a toggle or a spinner.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.WriteValueFromInputWidget =
  function( /*GlgObject*/ command_vp, /*GlgObject*/ widget,
            /*GlgObject*/ command_obj, /*boolean*/ save_later )
{
   /* Retrieve input widget's resource name that stores the new value 
      when the user uses the input widget to change the value.
      For a spinner, the retrieved name is "Value"; for a toggle button, 
      it may also be "OnState".
   */
   let widget_value_res = command_obj.GetSResource( "ValueResource" );
    
   /* Obtain object ID of the input resource/tag object we read the 
      new value from.
   */
   let input_tag_obj = widget.GetResourceObject( widget_value_res );
   if( input_tag_obj == null )
   {
      this.AppMessage( "Write Command failed: NULL input tag object." );
      return;
   }
      
   // Obtain object ID of the write tag object (output tag).
   let output_tag_obj = command_obj.GetResourceObject( "OutputTagHolder" ); 
   if( output_tag_obj == null )
   {
      this.AppMessage( "Write Command failed: NULL output tag object." );
      return;
   }
   
   /* Obtain TagSource from the write tag. */
   let output_tag_source = output_tag_obj.GetSResource( "TagSource" );
    
   /* Validate. */
   if( IsUndefined( output_tag_source ) )
   {
      AppError( "Write Command failed: Invalid Output TagSource." );
      return;
   }
    
   // Retrieve new value from the input widget.
   let value = input_tag_obj.GetDResource( null );

   /* Write new value to the specified tag source. */
   this.WriteDValue( output_tag_source, value, save_later, widget );
}

////////////////////////////////////////////////////////////////////////////////
// Write new value to the specified tag source.
// Handle event_label as needed: in this example, if event_label="SaveForLater,
// write changes when the user clicked on the Save button; otherwise, save
// changes to the back-end system right away.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.WriteDValue =
  function( /*String*/ tag_source, /*double*/ value,
            /*boolean*/ save_later, /*GlgObject*/ widget )
{
   if( this.UserRole != Data.ADMINISTRATOR_ROLE ) // Shouldn't happen.
   {
      this.AppMessage( "Can't store values without administrative privileges." );
      return;  
   }
   
   if( save_later )
   {
      /* Store the value in the WriteDataRecords array. The value will 
         be written to the back-end when the user clicks on the Save button.
      */
      this.StoreDataRecord( tag_source, GLG.GlgDataType.D, value, widget );
   }
   else
     // Write new value to the back-end right away.
     this.DataFeed.WriteDValue( tag_source, value );
}

////////////////////////////////////////////////////////////////////////////////
// Write previously stored adjusted values to the back-end system.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SaveChanges = function()
{
   if( this.WriteDataRecords == null )
     return;   // Nothing to save.

   /* For not-administrator, we shouldn't get here, because SaveButton
      should get enabled only if UserRole == ADMINISTRATOR_ROLE.
      However, check UseRole anyway to ensure that saving changes will 
      occur only for users with administrative privileges.
   */
   if( this.UserRole == Data.ADMINISTRATOR_ROLE )
   {
      let size = this.WriteDataRecords.length;
      for( let i=0; i<size; ++i )
      {
         let tag_source = this.WriteDataRecords[i].tag_source;
         let value = this.WriteDataRecords[i].value;
         
         switch( this.WriteDataRecords[i].data_type )
         {
          case GLG.GlgDataType.D:
            this.DataFeed.WriteDValue( tag_source, value );
            break;
          case GLG.GlgDataType.S:
            this.DataFeed.WriteSValue( tag_source, value );
            break;
         }
      }
   }
   else
     this.AppMessage( "Administrative privileges are required to adjust " +
                      "values. Changes will not be saved." );

   // Clear stored data records.
   this.WriteDataRecords = null;
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CancelChanges = function( /*GlgObject*/ viewport )
{
   // Clear stored data records, if any.
   this.WriteDataRecords = null;

   /* In the demo mode (RANDOM_DATA), reinitialize the page to populate 
      edit value widgets with current data values from DemoDataFeed.
   */
   if( RANDOM_DATA )
     this.InitPageAfterSetup( viewport );
   
   /* The alarm configuration page (PageType=Configuration) may be used as a 
      tab page instead of being placed inside a popup dialog. In this case, the
      Pause/Play button is used to pause updates while the alarm setpoints are
      being edited. 
      When changes are cancelled in the real data mode, the original values 
      will be displayed when the Play button is pressed.
   */
}

////////////////////////////////////////////////////////////////////////////////
// Validate data value change. The type of the value parameter can be a double
// or a String, and it must match data_type (D or S respectively).
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ValidateChanges =
  function( /*GlgObject*/ viewport ) /*boolean*/
{
   if( this.WriteDataRecords == null )
     return true;  /* No changes. */

   let validation_failed = false;

   let size = this.WriteDataRecords.length;
   for( let i=0; i<size; ++i )
   {
      let data_record = this.WriteDataRecords[i];   /* GlgDataRecord */
      if( !this.ValidateValueChange( data_record ) )
        validation_failed = true;
   }

   return !validation_failed;
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ValidateValueChange =
  function( /*GlgDataRecord*/ data_record ) /* boolean */
{
   let
     min_value,
     max_value;

   let widget_type = GetWidgetType( data_record.widget );   
   switch( widget_type )
   {
    default: return true;     /* Not a widget type of interest. */
      
      // Add code to handle other widget types of interest.
    case "ValueSpinner":
    case "ValueInput":
       break;
   }

   min_value = data_record.widget.GetDResource( "MinValue" );
   max_value = data_record.widget.GetDResource( "MaxValue" );
   if( min_value == null || max_value == null )
   {
      AppError( "Missing MinValue or MaxValue." );
      return false;
   }
   
   // Check if the adjusted value is within specified range.
   let in_range = ( data_record.value >= min_value &&
                    data_record.value <= max_value );
   
   /* In Demo mode, value_valid is true. The application can extend
      the code to handle value validation, display a message dialog if the
      value is invalid, etc.
   */
   let value_valid = this.DataFeed.IsValid( data_record.tag_source,
                                            data_record.data_type,
                                            data_record.value );
   if( !value_valid || !in_range )
   {
      this.AppMessage( "Invalid value entered for: " + data_record.tag_source );
      return false;
   }

   return true;
}

////////////////////////////////////////////////////////////////////////////////
// Store adjusted value for a given tag source.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.StoreDataRecord =
  function( /*String*/ tag_source, /*int*/ data_type,
            /*double*/ new_value, /*GlgObject*/ widget )
{
   if( data_type != GLG.GlgDataType.D )  /* Expected a double value. */
   {
      this.AppMessage( "Invalid non-double data type, can't store." );
      return;
   }
 
   // If empty, create WriteDataRecords array.
   if( this.WriteDataRecords == null )
     this.WriteDataRecords = [];

   /* If data record for a specified tag_source already exists in
      WriteDataRecords, store the new adjusted value in the found
      record. Otherwise, add a new record to the WriteDataRecords array.
   */
   let data_record = this.LookupWriteDataRecords( tag_source, data_type );
   if( data_record != null )
     data_record.value = new_value;
   else
   {
      data_record = new Data.GlgDataRecord( tag_source, data_type, new_value );

      /* Store the widget for validation. Store as a GlgObject to minimize
         memory allocations.
      */
      data_record.widget = widget;

      this.WriteDataRecords.push( data_record );
   }

   this.RecordsValidated = false;
}

////////////////////////////////////////////////////////////////////////////////
// Find a tag record in TagRecords array with a tag source matching
// the specified tag_source.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LookupTagRecords = function( /*String*/ tag_source )
{
   let size = this.TagRecords.length;
   for( let i=0; i<size; ++i )
      if( this.TagRecords[i].tag_source == tag_source )
        return this.TagRecords[i];

   return null; // not found.
}

////////////////////////////////////////////////////////////////////////////////
// Find a data record in WriteDataRecords array with tag source
// matching the specified tag_source. Returns GlgDataRecord if found,
// or null otherwise.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LookupWriteDataRecords =
  function( /*String*/ tag_source, /*int*/ data_type )
{
   if( this.WriteDataRecords == null )
     return null;

   let size = this.WriteDataRecords.length;
   for( let i=0; i<size; ++i )
   {
      if( this.WriteDataRecords[i].tag_source == tag_source &&
          this.WriteDataRecords[i].data_type == data_type )
        return this.WriteDataRecords[i];
   }

   return null; // not found.
}

////////////////////////////////////////////////////////////////////////////////
// Find a plot in a chart with tag_source property matching the specified
// tag_source.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LookupChartPlotByTag =
  function( /*String*/ tag_source )  /*PlotInfo*/
{
   let plot_info = null;
   let size = this.ChartList.length;
   for( let i=0; i<size; ++i )
   {
      plot_info = this.ChartList[i].LookupPlotByTag( tag_source );
      if( plot_info != null )
        break;
   }
   
   return plot_info;
}

////////////////////////////////////////////////////////////////////////////////
// Traverse DrawingFileList in the tabs menu and return an index of the
// item with DrawingFile% matching specified drawing_file.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.LookupTabMenuByDrawingFile =
  function( /*String*/ drawing_file ) /*int*/
{
   let drawing_file_list =                    /* GlgObject */
     this.TabMenu.GetResourceObject( "DrawingFileList" );
   
   let num_tabs = this.TabMenu.GetDResource( "NumTabs" );
   for( let i=0; i<num_tabs; ++i )
   {
      let res_name = GLG.CreateIndexedName( "DrawingFile%", i );
      let filename = drawing_file_list.GetSResource( res_name );
      
      if( filename == drawing_file )
        return i; /* Found matching item. */
   }
   
   return NO_SCREEN; /* matching item not found */
}

////////////////////////////////////////////////////////////////////////////////
// Assign new widget ID based on selected object.
// If unset_id=true, clear currently assigned widget ID.
// If unset_id=false, assign ID value only if it is empty (not defined in the
// drawing).
////////////////////////////////////////////////////////////////////////////////
function TransferWidgetID( /*GlgObject*/ selected_obj, /*GlgObject*/ widget,
                           /*boolean*/ unset_id )
{
   if( unset_id )
   {
      SetWidgetID( widget, "" );
      return;
   }

   // Obtain currently assigned widget ID.
   let widget_id = GetWidgetID( widget );

   // unset_id=false:
   /* If the widget doesn't have ID property, or the ID is present and has
      a non-empty value, don't change it.
   */
   if( widget_id == null || !IsUndefined( widget_id ) )
     return;

   /* Obtain ID property value from the selected object, if present.
      Otherwise, obtain ID property from the selected 
      object's parent of type REFERENCE (subdrawing).
   */
   let selected_widget = null;
   if( selected_obj.HasResourceObject( "ID" ) )
     selected_widget = selected_obj;
   else
     selected_widget = GetParentWidget( selected_obj );
   
   let new_id = GetWidgetID( selected_widget );  // Handles null.
   if( IsUndefined( new_id ) )
   {
      AppInfo( "TransferWidgetID failed: invalid ID property for the selected object." );
      return;
   }
  
   // Assign new value to the widget's ID property.
   SetWidgetID( widget, new_id );
}

////////////////////////////////////////////////////////////////////////////////
// Update Save button enabled state for values that will be saved later.
// Also updates enabled state of the Validate button, if present.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.UpdateDialogButtons = function( /*GlgObject*/ viewport )
{

   /* Skip validation of there is no validate button. */
   let validate_button = viewport.GetResourceObject( "ValidateButton" );
   if( !validate_button )
     /* If there is no validate button, we are ready to save. */
     this.RecordsValidated = true;
   else
   {
      /* If validate button exists, enable the button if there are records
         to write and they have not been validated.
      */
      let validate_enabled = this.WriteDataRecords && !this.RecordsValidated;
      SetButtonState( viewport, "ValidateButton", validate_enabled );
   }
   
   /* Enable Save button if there are validated records that can be saved. */
   let save_enabled = this.WriteDataRecords && this.RecordsValidated;
   SetButtonState( viewport, "SaveButton", save_enabled );
}

////////////////////////////////////////////////////////////////////////////////
// Transfer tag sources for tags with a matching TagName from the
// selected object to the specified viewport. Returns a total number of 
// remapped tags. If unset_tags=true, set tag sources to "unset".
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.TransferTags =
  function( /*GlgObject*/ selected_obj, /*GlgObject*/ viewport,
            /*boolean*/ unset_tags )     /* int */
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
        num_remapped_tags = this.RemapNamedTags( viewport, tag_name, "unset" );
      else
        num_remapped_tags = this.RemapNamedTags( viewport, tag_name,
                                                 tag_source );
        
      total_remapped += num_remapped_tags;
   }

   return total_remapped;
}

////////////////////////////////////////////////////////////////////////////////
// Remap all object tags with the specified tag_name to use a new tag_source. 
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.RemapNamedTags =
  function( /*GlgObject*/ glg_obj, /*String*/ tag_name, 
            /*String*/ tag_source )      /*int*/
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
      
   let num_remapped = 0;
   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );

      /* Don't change tag with already defined TagSource which is different 
         from the new requested tag_source.
      */
      let current_tag_source = tag_obj.GetSResource( "TagSource" );
      if( !IsUndefined( current_tag_source ) &&
          current_tag_source != tag_source )
        continue;
      
      /* If tag is INIT ONLY, initialize its value based on the current 
         data value of the given tag source. Don't reassign TagSource 
         for this tag_obj, it is initialized only once and will not be 
         subject to periodic updates.
      */
      if( InitializeInitOnlyTag( this.MainViewport, tag_obj, tag_source ) )
        continue;
      
      // Reassign TagSource.
      AssignTagSource( tag_obj, tag_source );

      ++num_remapped;
   }
    
   return num_remapped;
}

////////////////////////////////////////////////////////////////////////////////
// Assigns new TagSource to the given tag object.
////////////////////////////////////////////////////////////////////////////////
function AssignTagSource( /*GlgObject*/ tag_obj, /*String*/ new_tag_source )
{
   tag_obj.SetSResource( "TagSource", new_tag_source );
} 

////////////////////////////////////////////////////////////////////////////////
// If tag_obj is INIT ONLY, initialize its value based on the current 
// data value for the specified tag_source in a given viewport. 
////////////////////////////////////////////////////////////////////////////////
function InitializeInitOnlyTag( /*GlgObject*/ viewport, /*GlgObject*/ tag_obj,
                                /*String*/ tag_source )   /* boolean */
{
   let access_type = Math.trunc( tag_obj.GetDResource( "TagAccessType" ) );
   if( access_type != GLG.GlgTagAccessType.INIT_ONLY_TAG )
     return false;
   
   if( !viewport.HasTagSource( tag_source ) )
     return false; 

   let data_type = Math.trunc( tag_obj.GetDResource( "DataType" ) );
   switch( data_type )
   { 
    case GLG.GlgDataType.D:
      let d_value = viewport.GetDTag( tag_source );
      tag_obj.SetDResource( null, d_value );
      break;
    case GLG.GlgDataType.S:
      let s_value = viewport.GetSTag( tag_source );
      tag_obj.SetSResource( null, s_value );
      break;
   }

   /* In DEMO mode, return false to enable tag remapping for Write commands
      in popups. For example, the scada_motor_info.g popup — used on the SCADA
      Aeration page (scada_aeration.g) — includes both a dial and a slider. The
      Speed INIT_ONLY tag in the dial must be remapped to mirror the changing
      value from the slider (which uses a WriteValueFromWidget command).

      When the popup is activated to display the status of a specific motor
      symbol, the initial Speed tag values for both the slider and the dial are
      dynamically assigned from the selected motor's data. 

      Speed tags are intentionally excluded from animation to facilitate 
      testing of the Write commands.
   */                       
   if( RANDOM_DATA )
     return false;
      
   return true;
}

////////////////////////////////////////////////////////////////////////////////
// Remap tags in the loaded drawing if needed.
// In demo mode, it assigns unset tag sources to be the same as 
// tag names. 
////////////////////////////////////////////////////////////////////////////////
function RemapTags( /* GlgObject */ viewport )
{
   let tag_obj;    /* GlgObject */
   let
     tag_source,   /* String  */
     tag_name;     /* String  */

   /* Obtain a list of all tags defined in the drawing and remap them
      as needed.
   */
   let tag_list =   /* GlgObject */
     viewport.CreateTagList( /* List all tags */ false );  
   if( tag_list == null )
     return;
   
   let size = tag_list.GetSize();
   if( size == 0 )
     return; // no tags found
   
   // Traverse the tag list and remap each tag as needed.
   for( let i=0; i<size; ++i )
   {
      tag_obj = tag_list.GetElement( i );
         
      /* Retrieve TagName and TagSource attributes from the
         tag object. TagSource represents the data source variable
         used to supply real-time data. This function demonstrates
         how to reassign the TagSource at run-time.
      */
      tag_name = tag_obj.GetSResource( "TagName" );
      tag_source = tag_obj.GetSResource( "TagSource" );
      
      RemapTagObject( tag_obj, tag_name, tag_source );
   }
}

////////////////////////////////////////////////////////////////////////////////
// Reassign TagSource parameter for a given tag object to a new
// TagSource value. tag_source and tag_name parameters are the current 
// TagSource and TagName of the tag_obj.
////////////////////////////////////////////////////////////////////////////////
function RemapTagObject( /* GlgObject */ tag_obj, /* String */ tag_name,
                         /* String */ tag_source )
{
   if( RANDOM_DATA )
   {
      // Skip tags with undefined TagName.
      if( IsUndefined( tag_name ) )
        return;
         
      /* In demo mode, assign unset tag sources to be the same as tag names
         to enable animation with demo data.
      */
      if( IsUndefined( tag_source ) )
        AssignTagSource( tag_obj, tag_name );
   }
   else
   {
      // Assign new TagSource as needed.
      // AssignTagSource( tag_obj, new_tag_source );
   }
}

////////////////////////////////////////////////////////////////////////////////
// Set popup viewport size, based on the size of the loaded popup drawing,
// and position the popup next to the selected object.
////////////////////////////////////////////////////////////////////////////////
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
      dialog window decorations, to position the popup dialog using the same
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

////////////////////////////////////////////////////////////////////////////////
// Returns true if glg_obj is a subdrawing object. Otherwise, returns false.
////////////////////////////////////////////////////////////////////////////////
function IsSubdrawing( /*GlgObject*/ glg_obj ) /* boolean */
{
   if( glg_obj == null )
     return false;

   if( glg_obj.GetObjectType() == GLG.GlgObjectType.REFERENCE )
   {
      let reference_type =
        Math.trunc( glg_obj.GetDResource( "ReferenceType" ) );
      
      if( reference_type == GLG.GlgReferenceType.SUBDRAWING_REF ||
          reference_type == GLG.GlgReferenceType.SUBWINDOW_REF )
        return true;
   }

   return false;
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if glg_obj is a Subwindow Reference. Otherwise, returns false.
////////////////////////////////////////////////////////////////////////////////
function IsSubwindow( /*GlgObject*/ glg_obj,
                      /*boolean*/ generate_error ) /* boolean */
{
   if( !glg_obj )
   {
      if( generate_error )
        AppError( "Null subwindow object." );
      return false;
   }
   
   if( glg_obj.GetObjectType() != GLG.GlgObjectType.REFERENCE )
   {
      if( generate_error )
        AppError( "Invalid subwindow object type." );
      return false;
   }
   
   let reference_type = Math.trunc( glg_obj.GetDResource( "ReferenceType" ) );
   if( reference_type != GLG.GlgReferenceType.SUBWINDOW_REF )
   {
      if( generate_error )
        AppError( "Invalid reference type: not a subwindow." );
      return false;
   }

   return true;
}

////////////////////////////////////////////////////////////////////////////////
// Move the object to the top of the object hierarchy inside a container.
////////////////////////////////////////////////////////////////////////////////
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
   
////////////////////////////////////////////////////////////////////////////////
// Change drawing size while maintaining width/height aspect ratio.
// Adjust canvas resolution for mobile devices and browser zoom state.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 1200 / 900;
    
   const MIN_WIDTH = 800;
   const MAX_WIDTH = 1200;
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

////////////////////////////////////////////////////////////////////////////////
// Increases canvas resolution for mobile devices with HiDPI displays and for
// browser zooming. Sets CoordScale global variable.
////////////////////////////////////////////////////////////////////////////////
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

      TextScale = 1.38;
      PixelOffsetScale = TextScale;
      ScreenCoordScale = PixelOffsetScale;
      NativeWidgetTextScale = 0.5;
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

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Adjust GLG object geometry for mobile devices if needed, using
// special properties defined in the object.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AdjustForMobileDevices = function( /*GlgObject*/ glg_obj )
{
   if( !this.IsMobile ) // Desktop, no adjustments needed.
     return;

   // Add any adjustments here.
}

////////////////////////////////////////////////////////////////////////////////
// Loads any assets required by the application and invokes the specified
// callback when done.
// Alternatively, the application drawing can be loaded as an asset here
// as well, so that it starts loading without waiting for the other assets 
// to finish loading.
////////////////////////////////////////////////////////////////////////////////
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
   GLG.LoadWidgetFromURL( this.GetFullName( "glg_scrollbar_h.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_h", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );
   GLG.LoadWidgetFromURL( this.GetFullName( "glg_scrollbar_v.g" ), null,
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

   /* Load a drawing containing a custom fonttable. */
   GLG.LoadWidgetFromURL( this.GetFullName( "fonttable_file.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "fonttable", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );

   if( HAS_EXTENDED_API )
   {
      /* Load a popup viewport object that will be used to display popup 
         drawings for the PopupDialog or PopupMenu commands that may be 
         attached to objects.
      */
      GLG.LoadWidgetFromURL( this.GetFullName( POPUP_VIEWPORT_FILENAME ),
                             null, this.AssetLoaded.bind( this ),
                             { name: "popup_viewport", callback: callback,
                               user_data: user_data },
                             /*abort test function*/ ()=>!this.Active );
   }
}
   
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AssetLoaded = function( loaded_obj, data, url_path )
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
   else if( data.name == "fonttable" )
   {
      if( loaded_obj != null )
      {
         let fonttable_obj =  /* GlgObject */
           loaded_obj.GetResourceObject( "Screen/Fonttable" );

         // Set global GLG DefaultFontTable to the loaded fonttable object.
         if( fonttable_obj != null )
           loaded_obj.SetResourceObject( "$config/GlgDefaultFontTable",
                                          fonttable_obj );
      }
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
   if( this.NumLoadedAssets == ( HAS_EXTENDED_API ? 5 : 4 ) )
   {
      this.AssetsLoadedFlag = true;  // Signal that all assets finished loading.

      data.callback( data.user_data );
   }
}

////////////////////////////////////////////////////////////////////////////////
// Status display: 
// Display the title of the currently displayed drawing, as well as
// the title of the drawing which is in the process of being loaded (if any).
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.DisplayStatus = function()
{
   let message;
   
   if( this.TopTitle == null && this.LoadingTitle == null )
     message = "<br>";
   else
   {
      if( this.TopTitle )
        message = "Displayed: <b>" + this.TopTitle + "</b>";
      
      if( this.LoadingTitle )
      {
         if( this.TopTitle )
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

////////////////////////////////////////////////////////////////////////////////
// Returns PageType string using PageTypeTable.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Returns CommandType string using CommandTypeTable.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Returns PopupMenuType string using PopupMenuTypeTable.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Returns DialogType string using DialogTypeTable.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Returns widget type as a string. If the object doesn't have WidgetType
// resource present, or if WidgetType is present but its value is
// empty or not of interest (not found in WidgetTypeTable), return
// "Default" as widget type. Otherwise, if the WidgetType resource value
// matches one of the widget types listed in WidgetTypeTable,
// return this widget type string as defined in the drawing.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Utility function to check if string matches to one of the strings
// defined in a provided table.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// Returns widget's ID property as defined in the drawing.
////////////////////////////////////////////////////////////////////////////////
function GetWidgetID( /*GlgObject*/ widget ) /* String */ 
{
   if( widget == null )
     return null;

   // Retrieve WidgetType and augment the logic if needed.
   let widget_type = GetWidgetType( widget );
   
   let res_name = "ID";
   if( IsSubdrawing( widget ) )
     res_name = "Bindings/" + res_name;

   let res_obj = widget.GetResourceObject( res_name );
   if( res_obj == null )
     return null; /* Widget doesn't have "ID" property. */

   // Return a string value of the ID property.
   return res_obj.GetSResource( null );
}

////////////////////////////////////////////////////////////////////////////////
// Returns object's parent of type REFERENCE.
////////////////////////////////////////////////////////////////////////////////
function GetParentWidget( /*GlgObject*/ glg_obj ) /* GlgObject */
{
   let match_type = GLG.GlgObjectMatchType.OBJECT_TYPE_MATCH;
   let find_parents = true;        /* traverse up to find parents */
   let find_first_match = true;    /* find first matching object */
   let search_inside = false;
   let search_drawable_only = true;
   let object_type = GLG.GlgObjectType.REFERENCE;

   // null parameters at the end: may be omitted.
   // let object_name = null;
   // let resource_name = null;
   // let object_id = null;
   // let custom_match = null;
   
   let rval =
     glg_obj.FindMatchingObjects( match_type, find_parents,
                                  find_first_match,
                                  search_inside, search_drawable_only,
                                  object_type
                                  /* omitting trailing null parameters */ );
   
   if( rval == null || rval.found_object == null )
     return null;

   return rval.found_object;
}

////////////////////////////////////////////////////////////////////////////////
// Assign a new specified ID value to the widget.
////////////////////////////////////////////////////////////////////////////////
function SetWidgetID( /*GlgObject*/ widget, /*String*/ id )
{
   if( widget == null )
     return;
   
   let res_name = "ID";
   if( IsSubdrawing( widget ) )
     res_name = "Bindings/" + res_name;

   let res_obj = widget.GetResourceObject( res_name );
   if( res_obj == null )
     return; /* Widget doesn't have "ID" property. */

   // Assign new ID value.
   res_obj.SetSResource( null, id );
}

////////////////////////////////////////////////////////////////////////////////
// Associates special widget with the GLG object.
////////////////////////////////////////////////////////////////////////////////
function SetObjectWidget( /*GlgObject*/ glg_obj, data )
{
   glg_obj.SetObjectData( data );
}

////////////////////////////////////////////////////////////////////////////////
// Retrieves special widget of the specified viewport, if any.
////////////////////////////////////////////////////////////////////////////////
function GetObjectWidget( /*GlgObject*/ viewport )
{
   return viewport.GetObjectData();
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ShowMessageDialog =
  function( /*String*/ message, /*boolean*/ error )
{
   if( this.MessageDialog == null )
     return;

   this.MessageDialog.Show( message, error );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.EraseMessageDialog = function()
{
   if( this.MessageDialog == null )
     return;

   this.MessageDialog.Erase();
}
                  
////////////////////////////////////////////////////////////////////////////////
// HTML button click interface.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.ShowAlarmDialog = function( title )
{
   this.AlarmPage.ShowAlarms( title );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.CloseAlarmDialog = function()
{
   if( this.AlarmPage == null )
     return;

   this.AlarmPage.CloseAlarmDialog();
}

////////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     AppLog( message );
}

////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AppMessage = function( /*String*/ message )
{
   this.ShowMessageDialog( message, false );
}

////////////////////////////////////////////////////////////////////////////////
// Used only if USE_FIXED_TIMER_INTERVAL = false.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.AdjustTimerInterval = function()
{
   if( this.FirstDataQuery )
   {
      this.FirstDataQuery = false;

      // Set TimerInterval to the DataUpdateInterval of the loaded page.
      this.TimerInterval = this.DataUpdateInterval;
      return;
   }

   /* If updates and data queries are fast compared to the DataUpdateInterval, 
      a simple timer with a fixed DataUpdateInterval can be used, as shown in 
      the case of USE_FIXED_TIMER_INTERVAL=true, and the logic below 
      would not be necessary.

      However, if a timer with a fixed interval is started before rendering 
      is completed by PushData(), it may overload the browser and cause 
      sluggish response if rendering takes longer than the requested 
      DataUpdateInterval. If a timer with a fixed interval is started after 
      PushData() is called, the actual update interval will be slower than 
      the requested interval if either rendering or data query takes longer.

      The logic below uses a dynamic timeout that attempts to maintain the 
      requested DataUpdateInterval regardless of the fluctuations in the 
      duration of the data requests and drawing updates.
       
      The data query is asynchronous. If the data query takes a long time, 
      we want to issue the next data query right away, so that the new data 
      are loaded while the drawing is being updated with the data we received. 
      If data queries and drawing updates are fast, we want to use a timeout 
      that would ensure a requested DataUpdateInterval. 
       
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
    
   let elapsed_time = current_time - this.DataStartTime * 1000; //sec
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

   if( elapsed_time < this.DataUpdateInterval )
   {
      /* Data request + update was too fast, increase timer interval.
         Increase gradually using CHANGE_COEFF to avoid rapid jumps on a 
         single fast iteration that might have little data to update.
      */
      this.TimerInterval +=
        ( this.DataUpdateInterval - elapsed_time ) * CHANGE_COEFF;
   }
   else if( elapsed_time > this.DataUpdateInterval )
   {
      // The data query took longer, decrease timer interval if possible.
      let delta = elapsed_time - this.DataUpdateInterval;
        
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
   // else : elapsed_time == DataUpdateInterval, no change.
}

////////////////////////////////////////////////////////////////////////////////
// Detect a touch device if it hasn't been detected yet.
////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// "keydown" event listener added to the document to handle key down events.
// In this example, ESC key closes active popup dialog and Alarm dialog,
// if any.
////////////////////////////////////////////////////////////////////////////////
GlgViewer.prototype.HandleKeyEvent = function( event )
{
   if( event.key == "Escape" )      // ESC key
   {
      // Close active popup, if any.
      this.CloseActivePopup();
      
      // Close Alarm dialog, if any.
      this.CloseAlarmDialog();

      // Close message dialog if displayed.
      this.EraseMessageDialog();
   }
}

////////////////////////////////////////////////////////////////////////////////
// GlgTagRecord object is used to store information for a given GLG tag. 
// It can be extended by the application as needed.
////////////////////////////////////////////////////////////////////////////////
function GlgTagRecord( /*int*/ data_type, /*String*/ tag_name,
                       /*String*/ tag_source, /*GlgObject*/ tag_obj,
                       /*int*/ tag_access_type )
{
   this.data_type = data_type;              /* int */
   this.tag_name = tag_name;                /* String */
   this.tag_source = tag_source;            /* String */
   this.tag_obj = tag_obj;                  /* GlgObject */
   this.tag_access_type = tag_access_type;  /* int */
   
   this.value = null;                       /* double for data_type=D, 
                                               or String for data_type=S. */
   this.time_stamp = null;                  /* double */
   this.value_valid = false;                /* boolean */
   this.plot_info = null;                   /* PlotInfo of a chart plot in the
                                               drawing with a matching 
                                               tag_source, if any. */
}

////////////////////////////////////////////////////////////////////////////////
function GlgActivePopup( /*String*/ popup_type, /*GlgObject*/ popup_vp,
                         /*String*/ drawing_file, /*GlgObject*/ subwindow,
                         /*GlgObject*/ selected_obj, /*String*/ title,
                         /*String*/ paramS, /*double*/ paramD )
{
   this.popup_type = popup_type;              /* String */
   this.popup_vp = popup_vp;                  /* GlgObject */  
   this.drawing_file = drawing_file;          /* String */
   this.subwindow = subwindow;                /* GlgObject */
   this.selected_obj = selected_obj;          /* GlgObject */
   this.title = title;                        /* String */
   this.paramS = paramS;                      /* String */
   this.paramD = paramD;                      /* double */

   this.drawing_vp = null;                    /* GlgObject */
   this.default_width = 300;                  /* Default popup width */
   this.default_height = 300;                 /* Default popup height */
   this.is_floating = false;                  /* boolean */
   this.finalized = false;                    /* boolean */
}
