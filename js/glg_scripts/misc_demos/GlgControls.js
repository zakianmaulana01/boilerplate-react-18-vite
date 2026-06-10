//////////////////////////////////////////////////////////////////////////////
// GLG Controls Demo
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

const UPDATE_INTERVAL = 50;    // msec

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the controls dashboard.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgControls( glg_div_name, glg_path, is_standalone, is_mobile )
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

   // GlgObject: top level viewport of the loaded drawing.
   this.Viewport = null;

   this.AnimationArray = null;   /* Array of records used for animation. */

   this.PerformUpdates = true;
    
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts controls demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgControls.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( "controls.g" ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgControls.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgControls.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.LoadCB = function( drawing, data, path )
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
    
   this.StartControlsDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.StartControlsDemo = function ( drawing )
{
   this.Viewport = drawing;

   this.InitializeSimulationData();

   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );
   
   this.Viewport.InitialDraw();

   // Start periodic updates.
   setTimeout( ()=>this.UpdateControls(), UPDATE_INTERVAL );
}
   
//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.UpdateControls = function()
{
   if( !this.Active )
     return;
   
   if( this.PerformUpdates )
   {
      // Update all animation_values
      for( let i=0; i < this.AnimationArray.length; ++i )
        if( this.AnimationArray[ i ] != null )
          this.AnimationArray[ i ].Iterate();

      this.Viewport.Update();   // Show changes
   }

   // Restart update timer
   setTimeout( ()=>this.UpdateControls(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Handles user input: in this demo, it handles clicks on the start and stop 
// buttons.
//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( action == "ValueChanged" )
   {
      /* Stop automatic updates to let the user play with controls
         when a control's value is adjusted with the mouse.
      */
      this.StopUpdate();
   }
   else if( format == "Button" )
   {
      if( action != "Activate" )
        return;
         
      if( origin == "Start" )
        this.StartUpdate();
      else if( origin == "Stop" )
        this.StopUpdate();
   }

   if( format != "Window" )
     this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.StartUpdate = function()
{
   this.PerformUpdates = true;
   this.Viewport.SetDResource( "ManualMode", 0 );
}

//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.StopUpdate = function()
{
   this.PerformUpdates = false;
   this.Viewport.SetDResource( "ManualMode", 1 );
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 750 / 600;
   
   const MIN_WIDTH = 600;
   const MAX_WIDTH = 1000;
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
GlgControls.prototype.SetCanvasResolution = function()
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

      TextScale = 1.6;
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
// SIMULATION ONLY
// All code below is used only to animate the demo with simulated data.
// In a real application, live data will be queried and used to update
// the drawing.
//////////////////////////////////////////////////////////////////////////////

const INCR = 0;
const SIN = 1;
const RANDOM = 2;
const RANDOM_INT = 3;

//////////////////////////////////////////////////////////////////////////////
GlgControls.prototype.InitializeSimulationData = function()
{
   const k = 3;   // Speed factor

   // Initialize simulation controlling parameters

   this.AnimationArray = [];
    
   /* 3 top gages */
   this.AnimationArray[ 0 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 47 * k, 50.0, 180.0, "Dial1/Value" );
   this.AnimationArray[ 1 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 63 * k, 30.0, 90.0, "Dial2/Value" );
   this.AnimationArray[ 2 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 91 * k, 1.2, 3.5, "Dial3/Value" );

   /* Two small gauges in the middle. */
   this.AnimationArray[ 3 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 36 * k, 2.0, 8.0, "Dial4/Value" );
   this.AnimationArray[ 4 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 59 * k, 2.0, 8.0, "Dial5/Value" );

   /* Sliders */
   this.AnimationArray[ 5 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 75 * k, 0.2, 0.8, "Slider1/ValueY" );
   this.AnimationArray[ 6 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 45 * k, 0.2, 0.8, "Slider2/ValueY" );
   this.AnimationArray[ 7 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 84 * k, 0.2, 0.8, "Slider3/ValueY" );
   this.AnimationArray[ 8 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 65 * k, 0.2, 0.8, "Slider4/ValueY" );
   this.AnimationArray[ 9 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 32 * k, 0.2, 0.8, "Slider5/ValueY" );
   this.AnimationArray[ 10 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 58 * k, 0.2, 0.8, "Slider6/ValueY" );

   /* Thermometer */
   this.AnimationArray[ 11 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 80 * k, -20.0, 105.0, "Thermometer/ValueY" );

   /* 3 knobs to the right of the thermometer */
   this.AnimationArray[ 12 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 46 * k, 5.0, 80.0, "Knob1/Value" );
   this.AnimationArray[ 13 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 65 * k, 1.0, 9.0, "Knob2/Value" );
   this.AnimationArray[ 14 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 38 * k, 1.0, 9.0, "Knob3/Value" );

   /* 2 switches */
   this.AnimationArray[ 15 ] =
     new GlgAnimationValue( this.Viewport, RANDOM_INT,
                            0, 5, 0.0, 3.0, "Switch1/ValueX" );
   this.AnimationArray[ 16 ] =
     new GlgAnimationValue( this.Viewport, RANDOM_INT,
                            0, 5, 0.0, 2.0, "Switch2/OnState" );

   /* Lights */
   this.AnimationArray[ 17 ] =
     new GlgAnimationValue( this.Viewport, RANDOM,
                            0, 5, 0.0, 3.0, "Light1/Value" );
   this.AnimationArray[ 18 ] =
     new GlgAnimationValue( this.Viewport, RANDOM,
                            0, 5, 0.0, 3.0, "Light2/Value" );
   this.AnimationArray[ 19 ] =
     new GlgAnimationValue( this.Viewport, RANDOM,
                            0, 5, 0.0, 3.0, "Light3/Value" );

   /* Toggle switches */
   this.AnimationArray[ 20 ] =
     new GlgAnimationValue( this.Viewport, RANDOM_INT,
                            0, 5, 0.0, 1.99, "Toggle1/OnState" );
   this.AnimationArray[ 21 ] =
     new GlgAnimationValue( this.Viewport, RANDOM_INT,
                            0, 5, 0.0, 1.99, "Toggle2/OnState" );
   this.AnimationArray[ 22 ] =
     new GlgAnimationValue( this.Viewport, RANDOM_INT,
                            0, 5, 0.0, 1.99, "Toggle3/OnState" );

   /* Joystick */
   this.AnimationArray[ 23 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 23 * k, 0.2, 0.8, "Joystick/ValueX" );
   this.AnimationArray[ 24 ] =
     new GlgAnimationValue( this.Viewport, SIN,
                            0, 19 * k, 0.2, 0.8, "Joystick/ValueY" );
}

//////////////////////////////////////////////////////////////////////////////
function GlgAnimationValue( viewport, type, counter, period, min, max, name )
{
   this.viewport = viewport;
   this.type = type;
   this.counter = counter;
   this.period = period;
   this.min = min;
   this.max = max;
   this.name = name;
   this.last_value = null; 
}

//////////////////////////////////////////////////////////////////////////////
GlgAnimationValue.prototype.Iterate = function ()
{
   let angle, value;
    
   if( this.period < 1 )
   {
      GLG.Error( GLG.GlgErrorType.USER_ERROR, "Invalid this.period.", null );
      return;
   }

   switch( this.type )
   {
    case SIN:
      angle = Math.PI * this.counter / this.period;	 
      value = this.min + ( this.max - this.min ) * Math.sin( angle );	 
      break;

    case INCR:
      value = this.min +
         ( this.counter / ( this.period - 1 ) ) * ( this.max - this.min );
      break;

    case RANDOM:
      if( this.last_value == null || this.counter == this.period - 1 )
      {
         value = GLG.Rand( this.min, this.max );
         this.last_value = value;
      }
      else
        value = this.last_value;
      break;

    case RANDOM_INT:
      if( this.last_value == null || this.counter == this.period - 1 )
      {
         value = Math.floor( GLG.Rand( this.min, this.max ) );
         this.last_value = value;
      }
      else
        value = this.last_value;
      break;

    default:
      GLG.Error( GLG.GlgErrorType.USER_ERROR, "Invalid animation type." );
      value = 0.0;
      break;
   }

   this.viewport.SetDResource( this.name, value );

   // Increment counter
   ++this.counter;
   if( this.counter >= this.period )
       this.counter = 0;    // Reset counter
}
