//////////////////////////////////////////////////////////////////////////////
// GLG Power and Data Center Monitoring Demo
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
// editor that allows to create grahical objects and define their dynamic
// behavior without any programming.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

const UPDATE_INTERVAL = 100;     // Update interval, msec.

// Constants used for simulating demo alarm.
const ALARM_DURATION = 30;
const MAX_DATACENTER_ALARMS = 5;

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the data center demo.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//   page_type     - specifies the initial drawing: "PowerMonitoring" or
//                   "DataCenter"
//////////////////////////////////////////////////////////////////////////////
export function GlgDataCenter( glg_div_name, glg_path,
                               is_standalone, is_mobile, start_page )
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

   // Start page: "PageMonitoring" or "DataCenter".
   this.StartPage = start_page;
   
   // Use path to the drawings directory is supplied.
   this.GlgPath = glg_path;

   this.AssetsLoadedFlag = false;
   this.UpdateStarted = false;
   this.DrawingLoadRequest = null;

   this.Viewport = null;            /* GlgObject: top level viewport of the 
                                       loaded drawing. */
   this.LoadedDrawingName = null;   /* Filename of the loaded drawing. */

   this.CurrentTitle = null;        /* Title of currently displayed drawing. */

   this.NewTitle = null;            /* Title of a new drawing being loaded. */

   this.PageType = null;            /* Page type of the loaded drawing:
                                       "PageMonitoring" or "DataCenter". */
   this.RoomID = 0;                 /* RoomID for "DataCenter" pages. */   

   this.TagRecords = null;          /* GlgTagRecord[] : array of tag records
                                       used to animate the drawing with data. */

   // Variables used for demo animation.
   this.ManualMode = true; 
   this.AutoAnimationState = -1;
   this.AutoAnimationCounter = 0;

   // Variables used for animating alarms using simulated data.
   this.ActiveAlarmList = null;
   this.current_alarm_index = -1;
   this.current_alarm_duration = ALARM_DURATION;
   
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts data center demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load misc. assets such as GLG scrollbars. When assets are loaded, 
      LoadDrawing callback is invoked that loads the requested start page.
   */
   this.LoadAssets( ()=>this.LoadPageOfType( this.StartPage ), null );
}

////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.LoadPageOfType = function( page_type )
{
   if( !this.AssetsLoadedFlag )
     return;

   let load_request = CreateLoadRequest( page_type );

   this.LoadDrawing( load_request, null );
}      
   
////////////////////////////////////////////////////////////////////////////// 
function CreateLoadRequest( page_type )
{
   switch( page_type )
   {
    default:
    case "PowerMonitoring":
      return { enabled : true,
               drawing_name : "power_diagram.g",
               drawing_title : "Power Monitoring" };
      
    case "DataCenter":
      return { enabled : true,
               drawing_name : "datacenter.g",
               drawing_title : "DataCenter" };
   }
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   this.AbortPendingLoadRequests();
   
   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.LoadDrawing = function( load_request )
{
   if( !this.Active )
     return;
   
    /* Disable load requests from HTML buttons until all assets have been
       loaded.
    */
    if( !this.AssetsLoadedFlag )
        return;

    /* Don't reload the drawing if the drawing name is invalid or matches the
       currently loaded drawing name.
    */
    if( load_request.drawing_name == null ||
        load_request.drawing_name == this.LoadedDrawingName )
      return;

    // New drawing was requested, cancel any pending drawing load requests.
    this.AbortPendingLoadRequests();    
    
    // Store load request to be able to about it if necessary.
    this.DrawingLoadRequest = load_request;

    // Display status info about the new drawing load request.
    this.NewTitle = load_request.drawing_title;    
    this.DisplayStatus();

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( load_request.drawing_name ), null,
                          this.LoadCB.bind( this ),
                          /*user data*/ load_request,
                          /*abort test function*/ ()=>!load_request.enabled );
}

////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Cancels any pending drawing load requests.
////////////////////////////////////////////////////////////////////////////// 
GlgDataCenter.prototype.AbortPendingLoadRequests = function()
{
   if( this.DrawingLoadRequest != null )
   {
      this.DrawingLoadRequest.enabled = false;
      this.DrawingLoadRequest = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.LoadCB =
  function( /*GlgObject*/ drawing, /*Object*/ user_data, /*String*/ path )
{
   let load_request = user_data;

   /* Check if this load request was aborted by requesting to load another
      drawing before this load request has finished.
   */
   if( !this.Active || !load_request.enabled )
     return;

   // Reset: we are done with this request.
   this.DrawingLoadRequest = null;

   let error = false;
   if( drawing == null )
   {
      AppAlert( "Drawing loading failed: " + this.NewTitle );
      error = true;
   }
   
   let page_type = drawing.GetSResource( "PageType" );
   if( page_type != "PowerMonitoring" && page_type != "DataCenter" )
   {
      AppAlert( "Invalid page type: " + page_type );
      error = true;
   }

   if( error )
   {
      // Update status info and stay on the previously loaded page.
      this.NewTitle = null;
      this.DisplayStatus();
      return;
   }

   this.PageType = page_type;
      
   // Disable spinning loader.   
   RemoveElement( this.GLG_div_name, "loader_container" );
    
   // Destroy currently loaded drawing, if any.
   if( this.Viewport != null )
     this.DestroyDrawing();

   // Store drawing name of the currently loaded drawing.
   this.LoadedDrawingName = load_request.drawing_name;

   // Define the element in the HTML page to display the drawing.
   drawing.SetParentElement( this.GLG_div_name );
    
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );
   
   // Update status info.
   this.NewTitle = null;
   this.CurrentTitle = load_request.drawing_title;
   this.DisplayStatus();
   
   this.StartDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.StartDemo = function( /*GlgObject*/ drawing )
{
   this.Viewport = drawing;

   // Initialization before hierarchy setup.
   this.InitBeforeH();

   // Setup object hierarchy in the drawing.
   this.Viewport.SetupHierarchy();

   // Initialization after hierarchy setup.
   this.InitAfterH();
   
   if( this.PageType == "PowerMonitoring" )    // Power monitoring page.
   {
      this.ManualMode = true;   // Start in the manual mode.
      this.Viewport.SetDResource( "ManualMode/OnState", 1 );
   }
   else   // DataCenter page.
   {
      let room_index;
      if( !this.RoomID )
      {            
         // First time: start with the page selected in the drawing.
         room_index =
           Math.trunc( this.Viewport.GetDResource( "RoomMenu/SelectedIndex" ) );
         this.RoomID = GetRoomID( room_index );
      }
      else
      {
         // Returning to the datacenter page: show the last viewed page.
         room_index = GetRoomIndex( this.RoomID );
         this.Viewport.SetDResource( "RoomMenu/SelectedIndex", room_index );
      }
      
      this.ChangeRoom( this.RoomID );
   }
   
   // Start update timer once.
   if( !this.UpdateStarted )
   {
      this.UpdateStarted = true;
      this.UpdateData();
   }
   
   // Display the drawing in a web page.
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
function GetRoomID( room_index )
{
   switch( room_index )
   {
    default:
    case 0: return "1A";
    case 1: return "1B";
    case 2: return "2A";
    case 3: return "2B";
   }
}

//////////////////////////////////////////////////////////////////////////////
function GetRoomIndex( room_id )
{
   switch( room_id )
   {
    default:
    case "1A": return 0;
    case "1B": return 1;
    case "2A": return 2;
    case "2B": return 3;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Displays the datacenter room requested by room_id.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.ChangeRoom = function( room_id )
{
   this.Viewport.SetSResource( "Title", "Room " + room_id );

   this.ConfigureRoom( room_id );

   /* Multiple datacenter rooms may have the same layout and may therefore
      use the same drawing. The tags used for data updates may be dynamically
      remapped based on the room ID to query the data based on the room ID,
      without creating multiple copies of the same drawing with different data
      tags.
      For example, the RemapTag function may modify all tags source
      strings that start with RoomXX to replace RoomXX with Room<id> 
      (i.e Room1A, Room1B, Room2A, etc. ).
      In the demo, it is not needed, since it uses simulated data.
      Uncomment the next line to remap tags.
    */
    // this.RemapTags( room_id );

    this.StartDataCenterPageAnimation();
}

//////////////////////////////////////////////////////////////////////////////
// Change room equipment.
// In real application, each room may use a different drawing.
// GLG Extended API may also be used to create a room's drawing and fill it
// with equipment on the fly based on a configuration file.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.ConfigureRoom = function( room_id )
{
   switch( room_id )
   {
    default:
    case "1A":
      this.Viewport.SetDResource( "Cabinet8/Visibility", 1 );
      this.Viewport.SetDResource( "Cabinet9/Visibility", 1 );
      this.Viewport.SetDResource( "Cabinet10/Visibility", 1 );
      break;
    case "1B":
      this.Viewport.SetDResource( "Cabinet8/Visibility", 1 );
      this.Viewport.SetDResource( "Cabinet9/Visibility", 0 );
      this.Viewport.SetDResource( "Cabinet10/Visibility", 0 );
      break;
    case "2A":
      this.Viewport.SetDResource( "Cabinet8/Visibility", 1 );
      this.Viewport.SetDResource( "Cabinet9/Visibility", 1 );
      this.Viewport.SetDResource( "Cabinet10/Visibility", 0 );
      break;
    case "2B":
      this.Viewport.SetDResource( "Cabinet8/Visibility", 0 );
      this.Viewport.SetDResource( "Cabinet9/Visibility", 0 );
      this.Viewport.SetDResource( "Cabinet10/Visibility", 0 );
      break;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Destroy currently loaded drawing, if any.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.DestroyDrawing = function()
{
   if( this.Viewport == null )
     return;
    
   this.DeleteTagRecords();
   this.Viewport.ResetHierarchy();
   this.Viewport = null;
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.InitBeforeH = function()
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
GlgDataCenter.prototype.InitAfterH = function()
{
   /* Build TagRecords array, a list of GLG tag records used to update
      the drawing with real-time data.
   */
   this.TagRecords = CreateTagRecords( this.Viewport, this.PageType );
}

//////////////////////////////////////////////////////////////////////////////
// Create and populate TagRecords array. Tags are defined in the drawing and
// are used for animating the drawing with data.
//////////////////////////////////////////////////////////////////////////////
function CreateTagRecords( viewport, page_type )
{
   /* Retrieve a tag list from the drawing. 
      Include tags with unique tag sources.
   */
   let tag_list = viewport.CreateTagList( /*unique tag sources*/ true );
   if( tag_list == null )
     return null;  // No tags found.
    
   let size = tag_list.GetSize();
   if( size == 0 )
     return null; // No tags found.
    
   /* Create an array of tag records by traversing the tag list and retrieving 
      information from each tag object in the list.
   */
   let tag_records = [];
   for( let i=0; i<size; ++i )
   {
      let tag_obj = tag_list.GetElement( i );
      let tag_name = tag_obj.GetSResource( "TagName" );        

      if( page_type == "PowerMonitoring" )
      {
         /* Demo: on the OnlineDiagram page use tags to animate only the alarm
            indicators.
         */
         if( tag_name != "AlarmStatus" )
           continue;
         else   // Initialize alarm state to OFF.
           tag_obj.SetDResource( null, 0. );
      }

      let tag_source = tag_obj.GetSResource( "TagSource" );
      if( IsUndefined( tag_source ) )
        continue;         // Skip undefined tags.

      let data_type = Math.trunc( tag_obj.GetDResource( "DataType" ) );
      // let tag_comment = tag_obj.GetSResource( "TagComment" );

      // Add tag record to the list.
      let tag_record = new GlgTagRecord( data_type, tag_source, tag_obj );
      tag_records.push( tag_record );
   }

   if( tag_records.length == 0 )
     return null;
    
   return tag_records;
}

///////////////////////////////////////////////////////////////////////////////
// Remap tags by replacing a tag prefix with a new prefix based on the room id.
///////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.RemapTags = function( room_id )
{
   let size = this.TagRecords.length;   
   for( let i=0; i<size; ++i )
   {
      let tag_record = this.TagRecords[i];

      /* Replace the "Room<number><A or B letter>_" pattern at the beginning
         of the string with "Room<room_id>_". For example, if room_id is "3B",
         "Room2A_" will be changed to "Room3B_".
      */
      tag_record.tag_source =
        tag_record.tag_source.replace( /^Room\d[A-B]_/, "Room" + room_id + "_" );

      AppLog( "Changed to: " + tag_record.tag_source );
    }
}    

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.DeleteTagRecords = function()
{
   // Drop existing tag records.
   this.TagRecords = null;
}

//////////////////////////////////////////////////////////////////////////////
// Update display with demo animation.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.UpdateData = function()
{
   if( !this.Active )
     return;
   
   if( this.PageType == "PowerMonitoring" )
     this.UpdatePowerPage();
   else
     this.UpdateDataCenterPage();

   this.Viewport.Update();   // Refresh display.

   // Restart update timer.
   setTimeout( this.UpdateData.bind( this ), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Update power monitoring page.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.UpdatePowerPage = function()
{
   if( !this.ManualMode )
     this.AnimatePowerState();
   
   this.AnimatePowerAlarms();
}

//////////////////////////////////////////////////////////////////////////////
// Demo: Update alarm state on the Power Monitoring page using simulated data,
// simulating one alarm at a time.
// In a real application, real-time data will be supplied by the application.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.AnimatePowerAlarms = function()
{
   if( this.TagRecords == null || this.TagRecords.length == 0 )
     return;
   
   // Display each alarm for this number of updates intervals.
   if( this.current_alarm_duration < ALARM_DURATION )
   {
      ++this.current_alarm_duration;
      return;
   }
   else
     this.current_alarm_duration = 0;
   
   let alarm_tag_obj;
   if( this.current_alarm_index != -1 )
   {
      // Reset previous alarm.
      alarm_tag_obj = this.TagRecords[ this.current_alarm_index ].tag_obj;
      alarm_tag_obj.SetDResource( null, 0 );
   }        

   // Randomly set new alarm.
   this.current_alarm_index =
     Math.trunc( GLG.Rand( 0., this.TagRecords.length - 0.1 ) );
   alarm_tag_obj = this.TagRecords[ this.current_alarm_index ].tag_obj;
   alarm_tag_obj.SetDResource( null, 1 );
}

//////////////////////////////////////////////////////////////////////////////
// Demo: Update alarm state on the DataCenter page using simulated data.
// In a real application, real-time data will be supplied by the application.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.UpdateDataCenterPage = function()
{
    if( this.TagRecords == null || this.TagRecords.length == 0 )
        return;

    // Display each alarm for this number of updates intervals.
    if( this.current_alarm_duration < ALARM_DURATION )
    {
        ++this.current_alarm_duration;
        return;
    }
    else
        this.current_alarm_duration = 0;

    /* Change alarms: remove current alarms and display new ones. */
    for( let i=0; i<MAX_DATACENTER_ALARMS; ++i )
      this.RemoveDataCenterAlarm();

    for( let i=0; i<MAX_DATACENTER_ALARMS; ++i )
      this.AddDataCenterAlarm();
}

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.StartDataCenterPageAnimation = function()
{
   if( this.ActiveAlarmList )
   {
      // Reset all room alarms  when changing to a different room.
      for( let i=0; i<this.ActiveAlarmList.length; ++i )
      {
         let alarm_tag_record = this.ActiveAlarmList[ i ];
    
         // Deactivate alarm display by setting it to 0.
         alarm_tag_record.tag_obj.SetDResource( null, 0 );
      }
   }

   // Reset alarm list when changing the room.
   this.ActiveAlarmList = [];

    // Add new simulated alarms for the new room.
   for( let i=0; i<MAX_DATACENTER_ALARMS; ++i )
     this.AddDataCenterAlarm();

   this.current_alarm_duration = 0; 
}
    
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.AddDataCenterAlarm = function()
{
   // Randomly select new alarm.
   let new_alarm_index =
     Math.trunc( GLG.Rand( 0., this.TagRecords.length - 0.1 ) );
    
   let alarm_tag_record = this.TagRecords[ new_alarm_index ];    
   if( this.IsActiveAlarm( alarm_tag_record ) )
   {
      this.AddDataCenterAlarm();  // If this alarm is already active, try again.
      return;
   }

   // Activate alarm display by setting it to 1 (warning) or 2 (error).
   let alarm_value = Math.trunc( GLG.Rand( 1., 2.5 ) );
   alarm_tag_record.tag_obj.SetDResource( null, alarm_value );

   // Add it to the active alarm list.
   this.ActiveAlarmList.push( alarm_tag_record );
}

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.RemoveDataCenterAlarm = function()
{
   // Randomly select an active alarm to be removed.
   let removed_alarm_index =
     Math.trunc( GLG.Rand( 0., this.ActiveAlarmList.length - 0.1 ) );

   let alarm_tag_record = this.ActiveAlarmList[ removed_alarm_index ];
    
   // Deactivate alarm display by setting it to 0.
   alarm_tag_record.tag_obj.SetDResource( null, 0 );

   // Remove it from the active alarm list.
   this.ActiveAlarmList.splice( removed_alarm_index, 1 );
}

//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.IsActiveAlarm = function( alarm_tag_record )
{
   if( !this.ActiveAlarmList || this.ActiveAlarmList.length == 0 )
     return false;

   for( let i=0; i<this.ActiveAlarmList.length; ++i )
     if( this.ActiveAlarmList[ i ] == alarm_tag_record )
       return true;

   return false;
}

//////////////////////////////////////////////////////////////////////////////
// Handle user interaction with the buttons, as well as process custom
// actions attached to objects in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( format == "Button" )
   {	 
      /* Neither a push button or a toggle button. */
      if( action !="Activate" && action != "ValueChanged" )
        return;
        
      if( action == "Activate" )  // Push button event.
      {
         // if( origin == "XXX" )
         //    ;
      }
      else if( action == "ValueChanged" ) // Toggle button event.
      {
         let state = message_obj.GetDResource( "OnState" );
         
         if( origin == "ManualMode" )   // Handle manual mode switch.
         {
            if( state == 1 )
              this.ManualMode = true;
            else
            {
               this.ManualMode = false;
               this.AutoAnimationState = -1;
            }
         }
      }
        
      this.Viewport.Update();
    }
   else if( format == "Menu" )
   {
      if( action == "Activate" )
      {
         let room_index = message_obj.GetDResource( "SelectedIndex" );
         this.RoomID = GetRoomID( room_index );
            
         this.ChangeRoom( this.RoomID );
         this.Viewport.Update();
      }
   }
   /* Handle GoTo commands attached to room buttons in the Power Monitoring
      drawing and to the Back button in the DataCenter drawing.
   */
   else if( format == "Command" )
    {
       // Retrieve selected object.
       // let selected_obj = message_obj.GetResourceObject( "Object" );
       
       // Retrieve action attached to the object.
       let action_obj = message_obj.GetResourceObject( "ActionObject" ); 
       
       // Retrieve an action's command.
       let command_obj = action_obj.GetResourceObject( "Command" );
       
       // Retrieve command type.
       let command_type = command_obj.GetSResource( "CommandType" );
       if( command_type == "GoTo" )
       {
          let drawing_file = command_obj.GetSResource( "DrawingFile" );
          let title = command_obj.GetSResource( "Title" );
          
          // RoomID resource is present only in the DataCenter drawing.
          let room_id_obj = command_obj.GetResourceObject( "RoomID" );
          if( room_id_obj )
            // Get the string held in the room_id_obj object.
            this.RoomID = room_id_obj.GetSResource( null );
            
          let load_request =
            { enabled : true,
              drawing_name : drawing_file, drawing_title : title };

          this.LoadDrawing( load_request );            
          this.Viewport.Update();
       }
       else
         AppAlert( "Unsupported command." );
    }
   else if( format == "Timer" )   // Handles timer transformations.
     this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Demo: Update power state using demo data.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.AnimatePowerState = function()
{
   const MAX_ANIMATION_COUNTER = 20;
   
   if( this.AutoAnimationState != -1 &&
       this.AutoAnimationCounter < MAX_ANIMATION_COUNTER )
   {
      ++this.AutoAnimationCounter;
      return;
   }
   else
     this.AutoAnimationCounter = 0;
   
   switch( this.AutoAnimationState )
   {
    default:
    case -1:   // Initialize demo animation. 
      this.Viewport.SetDTag( "Feed1B", 0, true );
      this.Viewport.SetDTag( "Feed2B", 0, true );
      this.Viewport.SetDTag( "Feed3B", 0, true );
      this.Viewport.SetDTag( "Feed4B", 0, true );
      
      this.Viewport.SetDTag( "Feed1A", 1, true );
      this.Viewport.SetDTag( "Feed2A", 1, true );
      this.Viewport.SetDTag( "Feed3A", 0, true );
      this.Viewport.SetDTag( "Feed4A", 0, true );
      
      this.Viewport.SetDTag( "Feed12", 1, true );
      this.Viewport.SetDTag( "Feed34", 0, true );
      this.Viewport.SetDTag( "TieBreaker", 1, true );
      
      this.Viewport.SetDTag( "Room1A", 1, true );
      this.Viewport.SetDTag( "Room1B", 1, true );
      this.Viewport.SetDTag( "Room2A", 1, true );
      this.Viewport.SetDTag( "Room2B", 1, true );
      
      this.AutoAnimationState = 0;
      this.AutoAnimationCounter = MAX_ANIMATION_COUNTER;
      return;

    case 0:
      this.Viewport.SetDTag( "Feed3A", 1, true );
      break;
      
    case 1:
      this.Viewport.SetDTag( "Feed4A", 1, true );
      break;
      
    case 2:
      this.Viewport.SetDTag( "Feed34", 1, true );
      break;
      
    case 3:
      this.Viewport.SetDTag( "Feed1A", 0, true );
      break;
      
    case 4:
      this.Viewport.SetDTag( "Feed2A", 0, true );
      break;

    case 5:
      this.Viewport.SetDTag( "Feed12", 0, true );
      break;
      
    case 6:
      this.Viewport.SetDTag( "Feed1A", 1, true );
      break;
      
    case 7:
      this.Viewport.SetDTag( "Feed2A", 1, true );
      break;
      
    case 8:
      this.Viewport.SetDTag( "Feed12", 1, true );
      break;
      
    case 9:
      this.Viewport.SetDTag( "Feed34", 0, true );
      break;
      
    case 10:
      this.Viewport.SetDTag( "Feed3A", 0, true );
      break;
      
    case 11:
      this.Viewport.SetDTag( "Feed4A", 0, true );
      break;
   }
   
   ++this.AutoAnimationState;
   if( this.AutoAnimationState == 12 )
     this.AutoAnimationState = 0;
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 1 / 1;
   
   const MIN_WIDTH = 600;
   const MAX_WIDTH = 800;
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
GlgDataCenter.prototype.SetCanvasResolution = function()
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

//////////////////////////////////////////////////////////////////////////////
// Loads any assets required by the application and invokes the specified
// callback when done.
// Alternatively, the application drawing can be loaded as an asset here
// as well, so that it starts loading without waiting for the other assets 
// to finish loading.
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.LoadAssets = function( callback, user_data )
{
   Debug( "LoadAssets for: " + this.GLG_div_name );
   
   if( !this.Active )
     return;

   /* Define an internal variable to keep the number of loaded assets. */
   this.NumLoadedAssets = 0;

   /* HTML5 doesn't provide a scrollbar input element (only a range input 
      html element is available). This application needs to load GLG scrollbars
      used for integrated chart scrolling. For each loaded scrollbar, the 
      AssetLoaded callback is invoked with the supplied data array parameter.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
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
GlgDataCenter.prototype.AssetLoaded = function( glg_object, data, path )
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
   if( this.NumLoadedAssets == 2 )
   {
      this.AssetsLoadedFlag = true;
      data.callback( data.user_data );
   }
}

//////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppAlert( message )
{
    window.alert( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppError( message )
{
    console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppLog( message )
{
    console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
function IsUndefined( /*String*/ str ) /* boolean */
{
   return ( str == null || str.length == 0 ||
            str == "unset" || str == "$unnamed" );
}

//////////////////////////////////////////////////////////////////////////////
// Status display: 
// Display the title of the currently displayed drawing, as well as
// the title of the drawing which is in the process of being loaded (if any).
//////////////////////////////////////////////////////////////////////////////
GlgDataCenter.prototype.DisplayStatus = function()
{
   let message;
   
   if( this.CurrentTitle == null && this.NewTitle == null )
     message = "<br>";
   else
   {
      message = "";
      if( this.CurrentTitle )
        message += "Displayed: <b>" + this.CurrentTitle + "</b>";
        
      if( this.NewTitle )
      {
         if( this.CurrentTitle )
           // Add spaces after the displayed drawing title.
           message += "&nbsp;&nbsp;&nbsp;&nbsp;";   
            
         message += "Loading: <b>" + this.NewTitle + "</b>";
      }
   }

   document.getElementById( this.GLG_div_name + "_status_div" ).innerHTML = message;
}

//////////////////////////////////////////////////////////////////////////
// GlgTagRecord object is used to store information for a given GLG tag. 
// It can be extended by the application as needed.
//////////////////////////////////////////////////////////////////////////
function GlgTagRecord( /*int*/ data_type, /*String*/ tag_source,
                       /*GlgObject*/ tag_obj )
{
    this.data_type = data_type;    /* int */
    this.tag_source = tag_source;  /* String */
    this.tag_obj = tag_obj;        /* GlgObject */
}
