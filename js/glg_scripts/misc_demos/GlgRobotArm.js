//////////////////////////////////////////////////////////////////////////////
// GLG Robot Arm Demo
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
// Creates an instance of the robot arm demo.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgRobotArm( glg_div_name, glg_path, is_standalone, is_mobile )
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
    
   this.ElbowArray = null;   /* Array of records used for animation. */
   this.AutoUpdate = true;

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts robot arm demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgRobotArm.prototype.Start = function()
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
   GLG.LoadWidgetFromURL( this.GetFullName( "robot_arm.g" ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgRobotArm.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgRobotArm.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.LoadCB = function( drawing, data, path )
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
    
   this.StartRobotArmDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.StartRobotArmDemo = function ( drawing )
{
   this.Viewport = drawing;

   this.InitializeSimulationData();

   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );
   
   this.Viewport.InitialDraw();

   // Start periodic updates.
   setTimeout( ()=>this.UpdateRobotArm(), UPDATE_INTERVAL );
   this.StartUpdate();
}
   
//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.UpdateRobotArm = function()
{
   if( !this.Active )
     return;
   
   if( this.AutoUpdate )
   {
      /* Calculate and set new resource values
         Different elbows of the arm are named "s0" - "s6" in the drawing.
         The controlling parameters of elbows' rotation transformations
         are named "Value". 
      */
      
      // Update all seven elbows of the robot arm.
      for( let i=0; i < this.ElbowArray.length; ++i )
        this.ElbowArray[ i ].Iterate();

      this.Viewport.Update();   // Show changes
   }

   // Restart update timer
   setTimeout( ()=>this.UpdateRobotArm(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Handles user input: in this demo, it handles clicks on the start and stop 
// buttons.
//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( format== "Button" )         /* Handle button clicks */
   {
      if( action != "Activate" &&      /* Not a push button */
          action != "ValueChanged" )   /* Not a toggle button */
        return;

      if( origin == "Updates" )
      {
         this.AutoUpdate = ( message_obj.GetDResource( "OnState" ) == 0 ?
                             false : true );
      }
      else if( origin == "WireFrame" )
      {
         this.SetWireFrame( message_obj.GetDResource( "OnState" ) == 0 ?
                            false : true );
      }
   } 
   else if( format == "Slider" && action == "ValueChanged" )
   {
      /* Slider was moved: stop updates to allow the user to control
         the arm with sliders.
      */
      this.AutoUpdate = false;
      this.Viewport.SetDResource( "Updates/OnState", 0 );
   }

   if( format != "Window" )
     this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.SetWireFrame = function( wireframe )
{
   this.Viewport.SetDResource( "robot_area/robot_arm/ZSort",
                               wireframe ? 0 : 1 );
   this.Viewport.SetDResource( "robot_area/fill_type",
                               ( wireframe ?
                                 GLG.GlgFillType.EDGE :
                                 GLG.GlgFillType.FILL_EDGE ) );

   // Update toggle button with the new value.
   this.Viewport.SetDResource( "WireFrame/OnState", wireframe ? 1 : 0 );
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.StartUpdate = function()
{
   this.AutoUpdate = true;      

   // Update the toggle button.
   this.Viewport.SetDResource( "Updates/OnState", 1 );

   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.StopUpdate = function()
{
   this.AutoUpdate = false;

   // Update the toggle button.
   this.Viewport.SetDResource( "Updates/OnState", 0 );

   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgRobotArm.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 600 / 500;
   
   const MIN_WIDTH = 400;
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
GlgRobotArm.prototype.SetCanvasResolution = function()
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

      TextScale = this.CoordScale;
      PixelOffsetScale = TextScale;
      ScreenCoordScale = PixelOffsetScale;
      NativeWidgetTextScale = 1.;
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
GlgRobotArm.prototype.InitializeSimulationData = function()
{
   // Initialize simulation controlling parameters

   this.ElbowArray = [];
    
   this.ElbowArray[ 0 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0,  70, -0.75, 0.75, "s0/Value" );
   this.ElbowArray[ 1 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0,  60,  -0.75, 0.75, "s1/Value" );
   this.ElbowArray[ 2 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0, 200,  0.0,   1.0,   "s2/Value" );
   this.ElbowArray[ 3 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0, 150,  0.0,   1.0,   "s3/Value" );
   this.ElbowArray[ 4 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0,  30,  0.0,   1.0,   "s4/Value" );
   this.ElbowArray[ 5 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0, 100,  0.0,   1.0,   "s5/Value" );
   this.ElbowArray[ 6 ] =
     new GlgAnimationValue( this.Viewport,
                            SIN, 0,  20,  0.0,   1.0,   "s6/Value" );
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
      GLG.Error( GLG.GlgErrorType.USER_ERROR, "Invalid period.", null );
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

   // Increment the counter
   ++this.counter;
   if( this.counter >= this.period )
       this.counter = 0;    // Reset counter
}
