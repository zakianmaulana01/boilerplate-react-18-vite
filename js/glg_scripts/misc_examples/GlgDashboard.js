//////////////////////////////////////////////////////////////////////////////
// This example demonstrates how to animate a Glg drawing containing a
// panel (dashboard) of GLG controls and handle user interaction in a
// GLG widget, such as a button or a slider.
//
// GetData() method supplies simulated data for animation. An application 
// should provide a custom implementation of this method to supply real-time
// application data.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

const DRAWING_NAME = "dashboard.g";      // GLG drawing filename. 

const UPDATE_INTERVAL = 100;             // Update rate in msec.

/* If set to true, tags defined in the drawing are used for animation.
   Otherwise, object resources are used to push real-time values into 
   the drawing.
*/
const USE_TAGS = true;

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the dashboard.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgDashboard( glg_div_name, glg_path, is_standalone, is_mobile )
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

   this.DrawingName = DRAWING_NAME;
           
   // Top level viewport of the loaded drawing.   
   this.Viewport = null;

   this.UpdateTimer = null; 
 
   this.Counter = 0;    // Counter used for simulated data.

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts the dashboard by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgDashboard.prototype.Start = function()
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
GlgDashboard.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
      this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   this.StopUpdateTimer();

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}
  
////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgDashboard.prototype.LoadDrawing = function()
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
   GLG.LoadWidgetFromURL( this.GetFullName( this.DrawingName ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgDashboard.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.LoadCB =
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
    
   this.StartDashboard( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.StartDashboard = function( /*GlgObject*/ drawing )
{
   this.Viewport = drawing;
    
   // Initialization before hierarchy setup.
   this.InitBeforeH();

   // Setup object hierarchy of the drawing.
   this.Viewport.SetupHierarchy();

   // Initialization after hierarchy setup.
   this.InitAfterH();

   // Start dynamic updates.
   this.StartUpdateTimer();

   // Display the drawing in a web page.
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.InitBeforeH = function()
{
   // Add Input callback to hadle user interaction.
   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );

   // Set initial patameters as needed.
   this.Viewport.SetDResource( "DialPressure/Low", 0.0 );
   this.Viewport.SetDResource( "DialVoltage/Low", 0.0 );
   this.Viewport.SetDResource( "DialAmps/Low", 0.0 );
   this.Viewport.SetDResource( "SliderPressure/Low", 0.0 );
    
   this.Viewport.SetDResource( "DialPressure/High", 50.0 );
   this.Viewport.SetDResource( "DialVoltage/High", 120.0 );
   this.Viewport.SetDResource( "DialAmps/High", 10.0 );
   this.Viewport.SetDResource( "SliderPressure/High", 50.0 );

   // If the drawing contains a QuitButton, make it invisible.
   if( this.Viewport.HasResourceObject( "QuitButton" ) )
     this.Viewport.SetDResource( "QuitButton/Visibility", 0 );
}

//////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.InitAfterH = function()
{
   // Place application specific code here as needed.
}

//////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.StartUpdateTimer = function()
{
   this.UpdateTimer =
     setTimeout( this.UpdateDrawing.bind( this ), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.StopUpdateTimer = function()
{
   if( this.UpdateTimer != null )
   {
      clearTimeout( this.UpdateTimer );
      this.UpdateTimer = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Animation: obtain new data and push the new values to graphics.
//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.UpdateDrawing = function()
{
   if( !this.Active )
     return;
   
   /* Obtain simulated demo data values in a specified range.
      The application should provide a custom implementation of the 
      data acquisition interface to obtain real-time data values.
   */
   let voltage = this.GetData( 0.0, 120.0 );
   let current = this.GetData( 0.0, 10.0 );
    
   if( USE_TAGS ) // Use tags for animation.
   {
      // Push values to the objects using tags defined in the drawing.
      this.Viewport.SetDTag( "Voltage", voltage, /*if_changed*/ true );
      this.Viewport.SetDTag( "Current", current, /*if_changed*/ true );
   }
   else // Use resources for animation.
   {
      // Push values to the objects using resource paths.
      this.Viewport.SetDResourceIf("DialVoltage/Value", voltage, 
                              /*if_changed*/ true );
      this.Viewport.SetDResourceIf("DialAmps/Value", current, 
                              /*if_changed*/ true );
   }

   // Refresh display.
   this.Viewport.Update();

   // Restart the update timer.
   this.StartUpdateTimer();
}

//////////////////////////////////////////////////////////////////////////////
// Handle user interaction as needed.
//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.InputCallback = function( /*GlgObject*/ viewport,
                                                 /*GlgObject*/ message_obj )
{
   if( !this.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );
    
   // Handle events from a GLG Button widget.
   if( format == "Button" )
   {
      if( action == "Activate" )  //Push button events.
      {
         // Place code here to handle push button events.
      }
      else if( action == "ValueChanged" ) //Toggle button events.
      {
         if( origin == "StartButton" )
         {
            let value = message_obj.GetDResource( "OnState" );
            switch (value)
            {
             case 0:
               this.StopUpdateTimer();
               break;
             case 1:
               this.StartUpdateTimer();
               break;
             default: break;
            }
         }
      }
        
      // Refresh display.
      viewport.Update();
   }
    
   // Input occurred in a slider named SliderPressure.
   else if( format == "Slider" && origin == "SliderPressure" )
   {
      // Retrieve current slider value from the message object.
      let slider_value = message_obj.GetDResource( "ValueY" );
        
      // Set a data value for a dial control DialPressure.
      viewport.SetDResource( "DialPressure/Value", slider_value);
      viewport.Update();
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.GetData = function( /*double*/ low, /*double*/ high )
{
   let
     half_amplitude, center,
     period,
     value,
     alpha;
      
   half_amplitude = ( high - low ) / 2.0;
   center = low + half_amplitude;
    
   period = 100.0;
   alpha = 2.0 * Math.PI * this.Counter / period;
      
   value = center +
     half_amplitude * Math.sin( alpha ) * Math.sin( alpha / 30.0 );
    
   ++this.Counter;
   return value;
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgDashboard.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 700 / 700;
    
   const MIN_WIDTH = 500;
   const MAX_WIDTH = 700;
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
GlgDashboard.prototype.SetCanvasResolution = function()
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
GlgDashboard.prototype.LoadAssets = function( callback, user_data )
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
GlgDashboard.prototype.AssetLoaded = function( glg_object, data, path )
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
     console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppError( message )
{
   console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppAlert( message )
{
   window.alert( message );
}
