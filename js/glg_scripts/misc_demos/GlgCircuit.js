//////////////////////////////////////////////////////////////////////////////
// GLG Electrical Circuit Demo
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

const UPDATE_INTERVAL = 500;    // msec

/* If true, the resource path is used to animate resources of the drawing.
   If false, stored resource ID is used to set resource directly with 
   null path using the Intermediate API. 
   Alternatively, tags may be used instead of resources.
*/
const USE_RESOURCE_PATH = false;

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the circuit demo.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgCircuit( glg_div_name, glg_path, is_standalone, is_mobile )
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

   // Array of resources to update, queried from the drawing.
   this.ResourceList = null;

   this.UpdateWithData = true;    // Is used to start or stop data animation.
    
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts circuit demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgCircuit.prototype.Start = function()
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
   GLG.LoadWidgetFromURL( this.GetFullName( "electric_circuit.g" ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgCircuit.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgCircuit.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.LoadCB = function( drawing, data, path )
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
    
   this.StartCircuitDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.StartCircuitDemo = function( drawing )
{
   this.Viewport = drawing;

   this.AdjustForMobileDevices();

   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );
   this.Viewport.InitialDraw();

   // Invoke after InitialDraw, which sets up subdrawings used in the drawing.
   this.InitializeAnimation();

   // Start periodic updates.
   setTimeout( ()=>this.UpdateCircuit(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Creates a list of resources to animate.
//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.InitializeAnimation = function()
{
   this.ResourceList = GetResourceList( this.Viewport, null, null );
   if( this.ResourceList == null )
     AppAlert( "No resources to animate." );
}

//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.UpdateCircuit = function()
{
   if( !this.Active )
     return;

   if( this.UpdateWithData )
   {
      let size = this.ResourceList.GetSize();
      for( let i=0; i<size; ++i )
      {
         let resource = this.ResourceList.GetElement( i );
         
         if( resource.type != GLG.GlgDataType.D ) 
           continue;      // Update only resources of D type
         
         /* Animate using random data. In a real application, live data will
            be queried and used to animate the drawing.
         */
         let value = GLG.Rand( 0, resource.range );
         if( USE_RESOURCE_PATH )
           // Use resource path.
           this.Viewport.SetDResource( resource.resource_path, value );
         else
           /* Use stored resource ID with null path to set the resource 
              directly using the Extended API.
           */
           resource.glg_object.SetDResource( null, value );

         this.Viewport.Update();
      }
   }

   // Restart update timer
   setTimeout( ()=>this.UpdateCircuit(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Handles user input: in this demo, it handles clicks on the buttons.
//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.InputCallback = function( vp, message_obj )
{
   if( !this.Active )
     return;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( format== "Button" )         /* Handle button clicks */
   {
      if( action == "Activate" )
      {
         if( origin == "Resources" )
           this.PrintResources();
         else if( origin == "ToggleUpdates" )
           this.ToggleUpdates();
      }
   }
}

//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.ToggleUpdates = function()
{
   this.UpdateWithData = !this.UpdateWithData;
}

//////////////////////////////////////////////////////////////////////////////
// Prints to the console resources of the drawing used for animation
// (resources whose name starts with the "#" character).
//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.PrintResources = function()
{
   if( this.ResourceList == null )
   {
      AppAlert( "Found no resources to update!" );
      return;
   }

   AppLog( "Resource list for updates: resource_path type" );
   
   let size = this.ResourceList.GetSize();
   for( let i=0; i<size; ++i )
   {
      let resource = this.ResourceList.GetElement( i );

      let data_type_str;
      switch( resource.type )
      {
       case GLG.GlgDataType.D: data_type_str = "d"; break;
       case GLG.GlgDataType.S: data_type_str = "s"; break;
       case GLG.GlgDataType.G: data_type_str = "g"; break;
       default:
         AppError( "Invalid resource type." ); 
         continue;
      }
      
      AppLog( resource.resource_path + " " + data_type_str );
   }

   AppLog( "Resource list: Done." );
   AppAlert( "Resource list was printed to the browser console." );
}

//////////////////////////////////////////////////////////////////////////////
// Creates a list of resources in the drawing that need to be animated
// by traversing all resources of the drawing and creating a list of resources
// of interest that are marked by the "#" characted at the beginning of their
// names. 
//
// Alternatively, tags may be used instead of resources. Tags are reported
// as a flat list and are easier to process for a typical process control
// application.
//////////////////////////////////////////////////////////////////////////////
function GetResourceList( obj, res_path, list )
{
   /* Using only named resources in this example, no aliases or 
      default attribute names.
   */
   let res_list = obj.CreateResourceList( true, false, false );
   if( res_list == null )
     return list;

   let size = res_list.GetSize();
   for( let i=0; i<size; ++i )
   {
      let glg_object = res_list.GetElement( i );

      let name = glg_object.GetSResource( "Name" );
      if( !name.startsWith( "#" ) )
        continue;  // We are interested only in resources that start with #
       
      // Accumulate resource path.
      let new_path;
      if( res_path == null )
        new_path = name;
      else
        new_path = res_path + "/" + name;

      let object_type = glg_object.GetDResource( "Type" );

      // Data or attribute object: add to the list of resources to animate.
      if( object_type == GLG.GlgObjectType.DATA || 
          object_type == GLG.GlgObjectType.ATTRIBUTE )
      {
         let data_type = glg_object.GetDResource( "DataType" );

         /* Set range for animating the resource.
            State resources may have ON (1) and OFF (0) values - 
            use 1.3 as a range to simulate. Use range=100 for the rest 
            of resources.
         */
         let range;
         if( name == "#State" )
           range = 1.3;
         else
           range = 1000.0;

         let resource =
           new AnimatedResource( glg_object, data_type, new_path, range );
         
         // Create a list of does not yet exist.
         if( list == null )
           list =
             GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                               GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );

         list.AddObjectToBottom( resource );
      }

      let has_resources = glg_object.GetDResource( "HasResources" );

      /* If object's HasResources=ON, recursively traverse all resources
         inside it.
      */
      if( has_resources == 1 )
         list = GetResourceList( glg_object, new_path, list );
   }
   return list;
}

//////////////////////////////////////////////////////////////////////////////
// This object keeps parameters of resources that will be animated with data.
// This demo uses simulated data to animate these resources.
// In a real application, live process data will be queried and used for
// animation.
//////////////////////////////////////////////////////////////////////////////
function AnimatedResource( glg_object, data_type, resource_path, range )
{
   this.glg_object = glg_object;
   this.type = data_type;
   this.resource_path = resource_path;
   this.range = range;
}

//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.AdjustForMobileDevices = function()
{
   if( !this.IsMobile )
     return;  // Desktop, no adjustments needed.

   // Erase "Print Resources to Console" button on mobile devices.   
   this.Viewport.SetDResource( "Resources/Visibility", 0 );
}
          
//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgCircuit.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 800 / 700;
   
   const MIN_WIDTH = 500;
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
GlgCircuit.prototype.SetCanvasResolution = function()
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
function AppError( message )
{
   console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppLog( message )
{
   console.log( message );
}
