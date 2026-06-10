//////////////////////////////////////////////////////////////////////////////
// GLG Process Control Demo
//
// The demo is written in pure HTML5 JavaScript. The source code of the
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
//
// Except for the changes to comply with the JavaScript syntax, this source
// is identical to the source code of the corresponding C/C++, Java and C#
// versions of the demo.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = true;

const DRAWING_NAME = "process.g";

/* Demonstrates updating the drawing using either tags (true) or 
   resources (false).
*/
const USE_TAGS = true;

/* Demonstrates two ways of processing user clicks on objects:
   - processing actions attached to objects in the input callback (true), or 
   - using simple selection via object names in the selection callback (false).
*/
const USE_ACTIONS = false;

// Graphics update interval.
const UPDATE_INTERVAL = 50;    // msec

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the process demo.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgProcess( glg_div_name, glg_path, is_standalone, is_mobile )
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

   // Use path to the drawings directory is supplied.
   this.GlgPath = glg_path;

   this.Viewport = null;    // Top level viewport of the loaded drawing.   
   this.FullScreen = false; // Full screen mode, used by the HTML version.
   this.UpdateTimer = null; // Animation timer.
   this.Timer3D = null;     // Timer used for switching between 2D and 3D tanks.
    
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;

   //////////////////////////////////////////////////////////////////////////
   // The variables below are used for the process simulation.
   //////////////////////////////////////////////////////////////////////////
   this.WaterAlarm = false;
   this.HeaterAlarm = false;

   this.ProcessCounter = 0;
   this.heater_high = 0;
   this.heater_low = 0;
   this.water_high = 0;
   this.water_low = 0;
   this.steam_high = 0;
   this.steam_low = 0;
   this.cooling_high = 0;
   this.cooling_low = 0;  

   this.SolventValve = 0.85;
   this.SteamValve = 1.0;
   this.CoolingValve = 0.8;
   this.WaterValve = 0.4;
   this.SolventFlow = 0.0;
   this.SteamFlow = 0.0;
   this.CoolingFlow = 0.0;
   this.WaterFlow = 0.0;
   this.OutFlow = 3495.0;
   this.SteamTemperature = 0.0;
   this.HeaterTemperature = 0.0;
   this.BeforePreHeaterTemperature = 0.0;
   this.PreHeaterTemperature = 0.0;
   this.AfterPreHeaterTemperature = 0.0;
   this.CoolingTemperature = 0.0;
   this.HeaterPressure = 0.0;
   this.HeaterLevel = 0.5;
   this.WaterLevel = 0.1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts process demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgProcess.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load misc. assets such as GLG scrollbars. When assets are loaded, 
      LoadDrawing callback is invoked that loads a GLG drawing defined by
      DrawingName variable.
   */
   this.LoadAssets( ()=>this.LoadDrawing(), null );
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgProcess.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   this.StopUpdateTimer();
   this.Stop3DTimer();

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgProcess.prototype.LoadDrawing = function()
{
   Debug( "LoadDrawing for: " + this.GLG_div_name );
   
   if( !this.Active )
     return;

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( DRAWING_NAME ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgProcess.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.LoadCB =
  function( /*GlgObject*/ drawing, /*Object*/ user_data, /*String*/ path )
{
   Debug( "LoadCB for: " + this.GLG_div_name );

   if( !this.Active )
     return;

   if( drawing == null )
   {
      AppAlert( "Can't load drawing, check console message for details." );
      return;
   }
   
   if( !document.getElementById( this.GLG_div_name ) )
   {
      Debug( "Can't find " + this.GLG_div_name +
             " div: it may have been removed from the document." );
      return;
   }
    
   // Disable spinning loader.   
   RemoveElement( this.GLG_div_name, "loader_container" );
    
   // Define the element in the HTML page to display the drawing.
   drawing.SetParentElement( this.GLG_div_name );
    
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );
    
   this.StartProcessDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.StartProcessDemo = function( drawing )
{
   this.Viewport = drawing;

   this.InitDrawing();
   this.Viewport.InitialDraw();

   // Start periodic updates.
   this.StartUpdateTimer();

   // Show 3D tanks and pipes after a few seconds.
   this.Start3DTimer();
}

//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.InitDrawing = function()
{
   this.Viewport.SetDResource( "3DPipesToggle/ShadowWidth", 0.0 );
   this.Viewport.SetDResource( "3DPipesToggle/LineWidth", 1.0 );
   this.Viewport.SetGResource( "3DPipesToggle/EdgeColor", 0.7, 0.7, 0.7 );
   
   this.Viewport.SetDResource( "FlowToggle/ShadowWidth", 0.0 );
   this.Viewport.SetDResource( "FlowToggle/LineWidth", 1.0 );
   this.Viewport.SetGResource( "FlowToggle/EdgeColor", 0.7, 0.7, 0.7 );

   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );
   this.Viewport.AddListener( GLG.GlgCallbackType.SELECT_CB,
                              this.SelectCallback.bind( this ) );

   if( this.IsMobile || this.FullScreen )
   {
      /* Maintain the aspect ratio regardless of the screen dimensions
         (or orientation on mobile devices).
      */
      this.Viewport.SetDResource( "Stretch", 0 );
      this.Viewport.SetDResource( "PushIn", 1 ); 
      this.Viewport.SetDResource( "YScale", 0.92 );
      this.Viewport.SetDResource( "XScale", 1.08 );
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.IterateProcess = function()
{
   if( !this.Active )
     return;
   
   this.GetProcessData();          // Get new process data.

   this.UpdateDrawingWithData();   // Update the drawing with the new data.

   // Restart update timer.
   this.StartUpdateTimer();
}

//////////////////////////////////////////////////////////////////////////////
// In a real application, this function will query live process data.
//
// This demo uses simulated data to animate the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.GetProcessData = function()
{   
   this.GetSimulatedData();
}

//////////////////////////////////////////////////////////////////////////////
// Updates the drawing with the new data.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.UpdateDrawingWithData = function()
{
   // The drawing can be updated using either tags or resources.
   if( USE_TAGS )
     this.UpdateProcessTags();
   else
     this.UpdateProcessResources();      
   
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Updates drawing using tags. Each tag is referenced by name and is set
// to a value of the corresponding variable.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.UpdateProcessTags = function()
{
   this.Viewport.SetDTag( "SolventValveValue", this.SolventValve, true );
   this.Viewport.SetDTag( "SteamValveValue", this.SteamValve, true );
   this.Viewport.SetDTag( "CoolingValveValue", this.CoolingValve, true );
   this.Viewport.SetDTag( "WaterValveValue", this.WaterValve, true );
   
   this.Viewport.SetDTag( "SolventFlow", this.GetFlow( SOLVENT_FLOW ), true );
   this.Viewport.SetDTag( "SteamFlow", this.GetFlow( STEAM_FLOW ), true );
   this.Viewport.SetDTag( "CoolingFlow", this.GetFlow( COOLING_FLOW ), true );
   this.Viewport.SetDTag( "WaterFlow", this.GetFlow( WATER_FLOW ), true );
   
   this.Viewport.SetDTag( "OutFlow", this.OutFlow, true );

   this.Viewport.SetDTag( "SteamTemperature", this.SteamTemperature, true );
   this.Viewport.SetDTag( "HeaterTemperature", this.HeaterTemperature, true );
   this.Viewport.SetDTag( "BeforePreHeaterTemperature",
                          this.BeforePreHeaterTemperature, true );
   this.Viewport.SetDTag( "PreHeaterTemperature",
                          this.PreHeaterTemperature, true );
   this.Viewport.SetDTag( "AfterPreHeaterTemperature",
                          this.AfterPreHeaterTemperature, true );
   this.Viewport.SetDTag( "CoolingTemperature", this.CoolingTemperature, true );
   
   this.Viewport.SetDTag( "HeaterLevel", this.HeaterLevel, true );
   this.Viewport.SetDTag( "WaterLevel", this.WaterLevel, true );
   
   this.Viewport.SetDTag( "HeaterAlarm", this.HeaterAlarm ? 1.0 : 0.0, true );
   this.Viewport.SetDTag( "WaterAlarm", this.WaterAlarm ? 1.0 : 0.0, true );
   
   /* Pass if_changed=false to move the chart even if the value did not 
      change. The rest of resources use true to update them only if their 
      values changed.
   */
   this.Viewport.SetDTag( "PlotValueEntryPoint",
                          this.HeaterTemperature, false );
   
   this.Viewport.SetDTag( "PressureValue", 5.0 * this.HeaterPressure, true );
}   

//////////////////////////////////////////////////////////////////////////////
// Updates drawing using heirarchical resources. Each resource is
// referenced by a resource path and is set to a value of the
// corresponding variable.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.UpdateProcessResources = function()
{
   this.Viewport.SetDResourceIf( "SolventValve/Value",
                                 this.SolventValve, true );
   this.Viewport.SetDResourceIf( "SteamValve/Value", this.SteamValve, true );
   this.Viewport.SetDResourceIf( "CoolingValve/Value",
                                 this.CoolingValve, true );
   this.Viewport.SetDResourceIf( "WaterValve/Value", this.WaterValve, true );
   
   this.Viewport.SetDResourceIf( "SolventFlow",
                                 this.GetFlow( SOLVENT_FLOW ), true );
   this.Viewport.SetDResourceIf( "SteamFlow",
                                 this.GetFlow( STEAM_FLOW ), true );
   this.Viewport.SetDResourceIf( "CoolingFlow",
                                 this.GetFlow( COOLING_FLOW ), true );
   this.Viewport.SetDResourceIf( "WaterFlow",
                                 this.GetFlow( WATER_FLOW ), true );
   
   this.Viewport.SetDResourceIf( "OutFlow", this.OutFlow, true );
   
   this.Viewport.SetDResourceIf( "Heater/SteamTemperature",
                                 this.SteamTemperature, true );
   this.Viewport.SetDResourceIf( "Heater/HeaterTemperature",
                                 this.HeaterTemperature, true );
   this.Viewport.SetDResourceIf( "BeforePreHeaterTemperature",
                                 this.BeforePreHeaterTemperature, true );
   this.Viewport.SetDResourceIf( "PreHeaterTemperature",
                                 this.PreHeaterTemperature, true );
   this.Viewport.SetDResourceIf( "AfterPreHeaterTemperature",
                                 this.AfterPreHeaterTemperature, true );
   this.Viewport.SetDResourceIf( "CoolingTemperature",
                                 this.CoolingTemperature, true );
      
   this.Viewport.SetDResourceIf( "Heater/HeaterLevel", this.HeaterLevel, true );
   this.Viewport.SetDResourceIf( "WaterSeparator/WaterLevel",
                                 this.WaterLevel, true );
   
   this.Viewport.SetDResourceIf( "HeaterAlarm",
                                 this.HeaterAlarm ? 1.0 : 0.0, true );
   this.Viewport.SetDResourceIf( "WaterAlarm",
                                 this.WaterAlarm ? 1.0 : 0.0, true );
   
   /* Pass if_changed=false to move the chart even if the value did not 
      change. The rest of resources use true to update them only if their 
      values changed.
   */
   this.Viewport.SetDResourceIf( "ChartVP/Chart/Plots/Plot#0/ValueEntryPoint", 
                                 this.HeaterTemperature, false );
   
   this.Viewport.SetDResourceIf( "PressureGauge/Value",
                                 5.0 * this.HeaterPressure, true );
}
   
//////////////////////////////////////////////////////////////////////////////
// Handle user interaction with the buttons, as well as process custom
// actions attached to objects in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( format == "Button" )
   {	 
      if( action != "ValueChanged" )
        return;

      let _3D_pipes_visible =
        ( this.Viewport.GetDResource( "3DPipesToggle/OnState" ) != 0.0 );
      let flow_lines_visible =
        ( this.Viewport.GetDResource( "FlowToggle/OnState" ) != 0.0 );

      if( origin == "3DPipesToggle" )
      {
         /* Make flow lines visible if both 3D pipes and flow lines were 
            turned off.
         */
         if( !_3D_pipes_visible && !flow_lines_visible )
         {
            this.Viewport.SetDResource( "FlowToggle/OnState", 1.0 );
            this.Viewport.Update();
         }

         this.Stop3DTimer();
      }
      else if( origin == "FlowToggle" )
      {
         /* Make 3D pipes visible if both flow lines and 3D pipes were
            turned off.
         */
         if( !_3D_pipes_visible && !flow_lines_visible )
         {
            this.Viewport.SetDResource( "3DPipesToggle/OnState", 1.0 );
            this.Viewport.Update();
         }

         this.Stop3DTimer();
      }
      else if( origin == "ToggleAutoScroll" )
      {
         /* Activate chart's X pan slider when AutoScroll=OFF.
            The toggle is connected to the chart's AutoScroll and controls 
            it. The X pan slider is activated here.
         */
         let auto_scroll =
           ( this.Viewport.GetDResource( "ChartVP/Chart/AutoScroll" ) != 0.0 );
         this.Viewport.SetDResource( "ChartVP/Pan",
                                     ( auto_scroll ? GLG.GlgPanType.PAN_Y_AUTO :
                                       GLG.GlgPanType.PAN_X | GLG.GlgPanType.PAN_Y ) );

         if( auto_scroll )
         {
            /* Reset the chart's ranges when returning to auto-scroll. */
            this.Viewport.SetDResource( "ChartVP/Chart/Plots/Plot#0/YLow", 50.0 );
            this.Viewport.SetDResource( "ChartVP/Chart/Plots/Plot#0/YHigh", 150.0 );
         }
         this.Viewport.Update();
      }
   }
   else if( format == "CustomEvent" )
   {
      /* If USE_ACTIONS=false, user clicks on objects are processed using
         simple selection via object names in the Select callback.
      */
      if( !USE_ACTIONS )
        return;
         
      /* Handle custom event actions attached to valves to open or close 
         them when the user clicks on them with the left or right mouse 
         button.
      */
      let event_label = message_obj.GetSResource( "EventLabel" );
      let button = message_obj.GetDResource( "ButtonIndex" );
         
      let increment;
      if( button == 1 )
        increment = 1.0;
      else
        increment = -1.0;
      
      if( event_label == "SolventValveClick" )
      { 
         this.SolventValve += 0.2 * increment;
         this.SolventValve = PutInRange( this.SolventValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "SolventValve/Value", this.SolventValve );
      }
      else if( event_label == "SteamValveClick" )
      {
         this.SteamValve += 0.2 * increment;
         this.SteamValve = PutInRange( this.SteamValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "SteamValve/Value", this.SteamValve );
      }
      else if( event_label == "CoolingValveClick" )
      {
         this.CoolingValve += 0.2 * increment;
         this.CoolingValve = PutInRange( this.CoolingValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "CoolingValve/Value", this.CoolingValve );
      }
      else if( event_label == "WaterValveClick" )
      {
         this.WaterValve += 0.2 * increment;
         this.WaterValve = PutInRange( this.WaterValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "WaterValve/Value", this.WaterValve );
      }
      /* Erase or display the pressure gauge when the gauge or the heater
         are clicked on.
      */
      else if( event_label == "HeaterClick" ||
               event_label == "PressureGaugeClick" )
      {
         let visibility =
           this.Viewport.GetDResource( "PressureGauge/Visibility" );
         this.Viewport.SetDResource( "PressureGauge/Visibility",
                                     visibility == 0 ? 1.0 : 0.0 );
      }
      this.Viewport.Update();
   }
   else if( format == "Timer" )   // Handles timer transformations.
     this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Selection callback that may be used as an alternative way to handle
// mouse selection, such open or close valves on a mouse click, by
// processing names of objects selected by the mouse click.
//
// InputCallback uses a more elaborate alternative that handles custom
// actions attached to objects in the drawing, which does not rely
// on object names.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.SelectCallback = function( vp, name_array, button )
{
   let
     increment,
     name;

   if( !this.Active )
     return;
    
   /* If USE_ACTIONS=true, Input callback is used to process user clicks
      via actions attached to objects, instead of using the Select callback.
   */
   if( USE_ACTIONS )
     return;
   
   // Process user clicks on objects using simple selection via object names.
   if( name_array == null )
     return;
   
   if( button == 1 )
     increment = 1.0;
   else
     increment = -1.0;
   
   for( let i=0; ( name = name_array[i] ) != null; ++i )
   {
      if( name == "SolventValve" )
      { 
         this.SolventValve += 0.2 * increment;
         this.SolventValve = PutInRange( this.SolventValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "SolventValve/Value", this.SolventValve );
         break;
      }
      else if( name == "SteamValve" )
      {
         this.SteamValve += 0.2 * increment;
         this.SteamValve = PutInRange( this.SteamValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "SteamValve/Value", this.SteamValve );
         break;
      }
      else if( name == "CoolingValve" )
      {
         this.CoolingValve += 0.2 * increment;
         this.CoolingValve = PutInRange( this.CoolingValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "CoolingValve/Value", this.CoolingValve );
         break;
      }
      else if( name == "WaterValve" )
      {
         this.WaterValve += 0.2 * increment;
         this.WaterValve = PutInRange( this.WaterValve, 0.0, 1.0 );
         this.Viewport.SetDResource( "WaterValve/Value", this.WaterValve );
         break;
      }
      else if( name.indexOf( "Heater" ) == 0 ||
               name.indexOf( "PressureGauge" ) == 0 )
      {
          let visibility =
              this.Viewport.GetDResource( "PressureGauge/Visibility" );
         this.Viewport.SetDResource( "PressureGauge/Visibility",
                                     visibility == 0.0 ? 1.0 : 0.0 );
         break;
      }
   }
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Toggles 3D pipes when the "Toggle 3D" HTML button is pressed.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.Toggle3D = function()
{
   if( !this.Active )
     return;
       
   let _3D_pipes_visible =
     ( this.Viewport.GetDResource( "3DPipesToggle/OnState" ) != 0.0 );
   let flow_lines_visible =
     ( this.Viewport.GetDResource( "FlowToggle/OnState" ) != 0.0 );

   // Toggle 3D pipes display.
   _3D_pipes_visible = ( _3D_pipes_visible == 1 ? 0 : 1 );
   this.Viewport.SetDResource( "3DPipesToggle/OnState", _3D_pipes_visible );
   
   // Make flow lines visible if both 3D pipes and flow lines were turned off.
   if( !_3D_pipes_visible && !flow_lines_visible )
     this.Viewport.SetDResource( "FlowToggle/OnState", 1.0 );
   
   this.Viewport.Update();

   this.Stop3DTimer();
}

//////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.StartUpdateTimer = function()
{
   this.UpdateTimer = setTimeout( ()=>this.IterateProcess(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.StopUpdateTimer = function()
{
   if( this.UpdateTimer != null )
   {
      clearTimeout( this.UpdateTimer );
      this.UpdateTimer = null;
   }
}

//////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.Start3DTimer = function()
{
   this.Timer3D = setTimeout( ()=>this.Toggle3D(), 3000 );
}
   
//////////////////////////////////////////////////////////////////////////////
// Clears the timer used to demo 3D pipes.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.Stop3DTimer = function()
{
   if( this.Timer3D == null )
     return;

   clearTimeout( this.Timer3D );
   this.Timer3D = null;
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 700 / 600;
   
   const MIN_WIDTH = 600;
   const MAX_WIDTH = 1000;
   const SCROLLBAR_WIDTH = 15;

   let span_x = document.body.clientWidth;
   if( !this.FullScreen )
     span_x -= SCROLLBAR_WIDTH;
    
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
         
         if( span_x < 600 )
           this.SetDrawingSize.size_array = small_sizes;
         else if( span_x < 800 )
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
      if( this.FullScreen )
      {
         let span_y = window.innerHeight;
         let span_ratio = span_x / span_y;
         if( span_ratio < ASPECT_RATIO )
         {
            drawing_area.style.width = "" + span_x + "px";
            drawing_area.style.height = 
              "" + Math.trunc( span_x / ASPECT_RATIO ) + "px";            
         }
         else   // span_ratio >= ASPECT_RATIO
         {
            drawing_area.style.height = "" + span_y + "px";
            drawing_area.style.width = 
              "" + Math.trunc( span_y * ASPECT_RATIO ) + "px";            
         }
      }
      else
      {
         let start_width;
         if( span_x < MIN_WIDTH )
           start_width = MIN_WIDTH;
         else if( span_x > MAX_WIDTH )
           start_width = MAX_WIDTH;
         else
           start_width = span_x;
         
         let size_coeff = this.SetDrawingSize.size_array[ this.SizeIndex ];
         let width =
           Math.trunc( Math.max( start_width * size_coeff, MIN_WIDTH ) );
         drawing_area.style.width = "" + width + "px";
         drawing_area.style.height = 
           "" + Math.trunc( width / ASPECT_RATIO ) + "px";
      }
   }

   // Adjust canvas resolution for mobile devices and browser zoom state.
   if( !next_size )
     this.SetCanvasResolution();
}

//////////////////////////////////////////////////////////////////////////////
// Increases canvas resolution for mobile devices with HiDPI displays and for
// browser zooming. Sets CoordScale global variable.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.SetCanvasResolution = function()
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

         The PixelOffsetScale parameter is used to scale pixel offsets,
         such as pixel offsets used in layout of charts. When text is scaled,
         pixel offsets are usually scaled by the same factor to increase space
         allowed for the enlarged text.

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
GlgProcess.prototype.LoadAssets = function( callback, user_data )
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
GlgProcess.prototype.AssetLoaded = function( glg_object, data, path )
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
     data.callback( data.user_data );
}

//////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     AppLog( message );
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
// SIMULATION ONLY
// All code below is used only to animate the demo with simulated data.
// In a real application, live process data will be queried and used
// to update the drawing.
//////////////////////////////////////////////////////////////////////////////

// Constants that define simulation parameters.
const
   PROCESS_SPEED = 0.05,
   HEATER_LEVEL_SPEED = 0.05,
   WATER_LEVEL_SPEED = 0.02,
   VALVE_CHANGE_SPEED = 0.05,
   STEAM_VALVE_CHANGE_SPEED = 0.05;

const
   SOLVENT_FLOW = 0,
   STEAM_FLOW = 1,
   COOLING_FLOW = 2,
   WATER_FLOW = 3;
      
//////////////////////////////////////////////////////////////////////////////
// SIMULATION ONLY
// Recalculate simulated values used to animate the demo.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.GetSimulatedData = function()
{
   ++this.ProcessCounter;
   if( this.ProcessCounter == 0x7fffffff )
     this.ProcessCounter = 0;
   
   this.SteamTemperature += ( this.SteamValve - 0.6 ) * 2 * PROCESS_SPEED;
   this.SteamTemperature = PutInRange( this.SteamTemperature, 0.0, 1.0 );

   this.HeaterTemperature +=
     ( this.SteamTemperature - this.HeaterTemperature * this.HeaterLevel ) *
     PROCESS_SPEED;
   this.HeaterTemperature = PutInRange( this.HeaterTemperature, 0.0, 1.5 );
   
   this.BeforePreHeaterTemperature +=
     ( 1.5 * this.HeaterTemperature - this.BeforePreHeaterTemperature ) *
     PROCESS_SPEED;
   this.BeforePreHeaterTemperature =
     PutInRange( this.BeforePreHeaterTemperature, 0.0, 1.0 );
         
   this.PreHeaterTemperature +=
     ( this.BeforePreHeaterTemperature - this.PreHeaterTemperature ) *
     PROCESS_SPEED;
   this.PreHeaterTemperature =
     PutInRange( this.PreHeaterTemperature, 0.0, 1.0 );
   
   this.AfterPreHeaterTemperature +=
     ( 0.9 * this.HeaterTemperature - this.AfterPreHeaterTemperature ) *
     PROCESS_SPEED ;
   this.AfterPreHeaterTemperature =
     PutInRange( this.AfterPreHeaterTemperature, 0.0, 1.0 );
         
   this.CoolingTemperature +=
     ( this.AfterPreHeaterTemperature - this.CoolingTemperature -
       this.CoolingValve ) * PROCESS_SPEED;
   this.CoolingTemperature = PutInRange( this.CoolingTemperature, 0.0, 1.0 );
         
   this.OutFlow = this.SolventValve * 3495.0;
         
   this.HeaterLevel += ( this.SolventValve - 0.75 ) * HEATER_LEVEL_SPEED;
   this.HeaterLevel = PutInRange( this.HeaterLevel, 0.0, 1.0 );
         
   // Inversed
   this.WaterLevel += ( 0.5 - this.WaterValve ) * WATER_LEVEL_SPEED;
   this.WaterLevel = PutInRange( this.WaterLevel, 0.0, 1.0 );
         
   if( this.HeaterLevel > 0.9 || this.heater_high != 0 )
   {
      this.heater_high = LagVar( this.heater_high, 10 );
      this.SolventValve -= VALVE_CHANGE_SPEED;
   }
   else if( this.HeaterLevel < 0.45 || this.heater_low != 0 )
   {
      this.heater_low = LagVar( this.heater_low, 10 );
      this.SolventValve += VALVE_CHANGE_SPEED;
   }
   this.SolventValve = PutInRange( this.SolventValve, 0.0, 1.0 );
         
   // Inversed
   if( this.WaterLevel > 0.2 || this.water_high != 0 )
   {
      this.water_high = LagVar( this.water_high, 10 );
      this.WaterValve += VALVE_CHANGE_SPEED;
   }
   else if( this.WaterLevel < 0.05 || this.water_low != 0 )
   {
      this.water_low = LagVar( this.water_low, 10 );
      this.WaterValve -= VALVE_CHANGE_SPEED;
   }
   this.WaterValve = PutInRange( this.WaterValve, 0.0, 1.0 );
         
   if( this.SteamTemperature > 0.9 || this.steam_high != 0 )
   {
      LagVar( this.steam_high, 20 );
      this.SteamValve -= STEAM_VALVE_CHANGE_SPEED;
   }
   else if( this.SteamTemperature < 0.2 || this.steam_low != 0 )
   {
      LagVar( this.steam_low, 20 );
      this.SteamValve += STEAM_VALVE_CHANGE_SPEED;
   }
   this.SteamValve = PutInRange( this.SteamValve, 0.0, 1.0 );
         
   if( this.CoolingTemperature > 0.7 || this.cooling_high != 0 )
   {
      LagVar( this.cooling_high, 10 );
      this.CoolingValve += VALVE_CHANGE_SPEED;
   }
   else if( this.CoolingTemperature < 0.3 || this.cooling_low != 0 )
   {
      LagVar( this.cooling_low, 10 );
      this.CoolingValve -= VALVE_CHANGE_SPEED;
   }
   this.CoolingValve = PutInRange( this.CoolingValve, 0.0, 1.0 );
         
   this.HeaterPressure =
     this.HeaterLevel * ( this.HeaterTemperature + 1.0 ) / 2.0;
   this.HeaterPressure = PutInRange( this.HeaterPressure, 0.0, 1.0 );
         
   this.HeaterAlarm = ( this.HeaterLevel < 0.45 || this.HeaterLevel > 0.9 );
   this.WaterAlarm = ( this.WaterLevel > 0.2 || this.WaterLevel < 0.05 );
}

//////////////////////////////////////////////////////////////////////////////
// SIMULATION ONLY
// Returns the flow value, which is later used as a line type value used 
// to simulate liquid flow.
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.GetFlow = function( type )
{
   if( type == SOLVENT_FLOW )
     return this.SolventFlow =
       this.GetFlowValue( this.SolventFlow, this.SolventValve );
   else if( type == STEAM_FLOW )
     return this.SteamFlow =
       this.GetFlowValue( this.SteamFlow, this.SteamValve );
   else if( type == COOLING_FLOW )
     return this.CoolingFlow =
       this.GetFlowValue( this.CoolingFlow, this.CoolingValve );
   else if( type == WATER_FLOW )
     return this.WaterFlow =
       this.GetFlowValue( this.WaterFlow, this.WaterValve );
   else
     return 0.0;
}
   
//////////////////////////////////////////////////////////////////////////////
// SIMULATION ONLY
// Recalculates the line type values used to simulate liquid flow based
// on the previous line type value and a flow speed defined by the valve
// opening.
// Parameters:
//     state - last value of the line type
//     valve - current valve opening
//
// Shifting the line type pattern's offset is achieved by increasing the
// line type value by 32.0 Refer to the documentation of the polygon's 
// LineType resource for more details.   
// Alternatively, the flow line widget from the Custom Object palette
// may be used for integrated flow line functionality, in which case
// this code is not needed. 
//////////////////////////////////////////////////////////////////////////////
GlgProcess.prototype.GetFlowValue = function( state, valve )
{
   let
     value,
     update_interval;
   const
     FLOW_LINE_TYPE = 24,
     NO_FLOW_LINE_TYPE = 0,
     MAX_FLOW = 3;
      
   if( valve == 0 )
     value = NO_FLOW_LINE_TYPE;     // Valve is closed - no flow.
   else
   {
      if( state == 0.0 )
        value = FLOW_LINE_TYPE;    // First time: init to FLOW_LINE_TYPE.
      else
      {
         // Skip a few intervals to represent variable flow speed.
         update_interval = MAX_FLOW - Math.trunc( ( valve + 0.1 ) * MAX_FLOW );
         update_interval = Math.min( 0, update_interval );
         update_interval = Math.max( MAX_FLOW, update_interval );
         if( update_interval == 0 ||
             ( this.ProcessCounter % update_interval ) == 0 )
         {
            /* Add 32 to the line type value to increase the line type 
               pattern's offset by 1.
            */
            value = state + 32;
            
            /* Reset periodically at the end of the pattern to prevent 
               overflow. Since the length of the GDI pattern is 24 and 
               the length of the OpenGL pattern is 16, reset after 24 * 16 
               iterations to handle both.
            */
            if( value == FLOW_LINE_TYPE + 32 * 24 * 16 )
              value = FLOW_LINE_TYPE;
         }
         else
           // No change: skipping a few intervals to show a slow speed.
           value = state;
      }
   }
   
   return value;
}
   
//////////////////////////////////////////////////////////////////////////////
// SIMULATION ONLY
// Helps to implement lag behavior
//////////////////////////////////////////////////////////////////////////////
function LagVar( variable, lag )
{
   if( variable != 0 )
     return --variable;
   else
     return lag;
}

//////////////////////////////////////////////////////////////////////////////
// SIMULATION ONLY
//////////////////////////////////////////////////////////////////////////////
function PutInRange( variable, low, high )
{
   if( variable < low )
     return low;
   else if( variable > high )
     return high;
   else
     return variable;
}
