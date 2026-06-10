//////////////////////////////////////////////////////////////////////////////
// GLG Graph Demo
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// The library load GLG drawings containing 2D and 3D Graphs and renders
// them on a web page, providing an API to animate the graphs with
// real-time data and modifying graphs' parameters.
//
// In addition to controlling the graphs via the GLG API at run time,
// the GLG Graphics Builder can be used to set parameters of the graphs
// interactively, as well as to create panels containing multiple graphs
// together with dials, toggles and other custom graphical objects.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

const UPDATE_INTERVAL = 100;   // msec

const DEFAULT_GRAPH_TYPE = "bar";

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the graph dashboard.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgGraph( glg_div_name, glg_path, is_standalone, is_mobile )
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

   this.Graph = null;          /* GlgObject - loaded graph viewport. */
   this.GraphType = null;      /* String */
   this.FirstGraph = true;
   this.UpdateAfterEachSample = true;
   this.PerformUpdates = true;
   this.LabelCounter = 0;
   this.UpdateCounter = 0;

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts graph demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgGraph.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   this.LoadGraph( DEFAULT_GRAPH_TYPE );
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.LoadGraph = function( type )
{
   if( this.GraphType == type )
     return;
   
   let graph_drawing;   
   switch( type )
   {
    case "bar":    graph_drawing = "bar1.g"; break;
    case "bar_3d": graph_drawing = "bar101.g"; break;
    case "line":   graph_drawing = "line1.g"; break;
    case "ribbon": graph_drawing = "line101.g"; break;
    default: AppAlert( "Invalid graph type" ); return;
   }

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( graph_drawing ), null,
                          this.LoadCB.bind( this ), /*user data*/ type,
                          /*abort test function*/ ()=>!this.Active );
}


////////////////////////////////////////////////////////////////////////////// 
GlgGraph.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgGraph.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Graph )
     this.Graph.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

//////////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.LoadCB = function( drawing, graph_type, path )
{
   Debug( "LoadCB for: " + this.GLG_div_name );

   if( !this.Active )
     return;

   if( drawing == null )
   {
      AppAlert( "Can't load drawing, check console message for details." );
      return;
   }

   if( this.FirstGraph )
   {
      if( !document.getElementById( this.GLG_div_name ) )
      {
         Debug( "Can't find " + this.GLG_div_name +
                " div: it may have been removed from the document." );
         return;
      }
      
      // Disable spinning loader.   
      RemoveElement( this.GLG_div_name, "loader_container" );
   }
   
   // Define the element in the HTML page to display the drawing.
   drawing.SetParentElement( this.GLG_div_name );
    
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );

   this.GraphType = graph_type;
   
   this.EnableButtons();
       
   this.StartGraphDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////
// Initializes the graph and starts updates.
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.StartGraphDemo = function( drawing )
{
   if( this.Graph )
     this.Graph.ResetHierarchy();   // Delete the previous graph.
                                
   this.Graph = drawing;

   // Set the initial number of samples, etc.
   this.Graph.SetDResource( "DataGroup/Factor", 20.0 );
   this.Graph.SetSResource( "XLabelGroup/XLabel/String", "" ); // Initial value
   this.Graph.SetDResource( "XLabelGroup/Factor", 5.0 ); // Num labels and ticks
   this.Graph.SetDResource( "XLabelGroup/MinorFactor", 4.0 ); // Num minor ticks
   this.Graph.SetDResource( "DataGroup/ScrollType", 0.0 );
   this.Graph.SetSResource( "XAxisLabel/String", "Sample" );
   this.Graph.SetSResource( "YAxisLabel/String", "Value" );

   // Don't set title: let the graph display the graph type defined in the
   // drawing as a title.
   // this.Graph.SetSResource( "Title/String", "Graph Example" );
   
   // Make the level line invisible
   if( this.GraphType == "bar" || this.GraphType == "line" )
     this.Graph.SetDResource( "LevelObjectGroup/Visibility", 0.0 );

   this.Graph.InitialDraw();
   
   // Start periodic updates when the first graph is loaded.
   if( this.FirstGraph )
   {
      this.FirstGraph = false;
      setTimeout( ()=>this.UpdateGraph(), UPDATE_INTERVAL );
   }
}
 
//////////////////////////////////////////////////////////////////////////////
// Updates the graph with random data.
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.UpdateGraph = function()
{
   if( !this.Active )
     return;
   
   if( this.PerformUpdates )
   {
      let num_samples;
      if( this.UpdateAfterEachSample )
        num_samples = 1;    // Update after each new datasample.
      else                  // Update after filling the whole graph.
        num_samples =
          Math.floor( this.Graph.GetDResource( "DataGroup/Factor" ) );

      for( let i=0; i<num_samples; ++i )
      {
         ++this.LabelCounter;
         if( this.LabelCounter >= 10000 )
           this.LabelCounter = 0;
         
         // Push next data value
         this.Graph.SetDResource( "DataGroup/EntryPoint",
                                  GLG.Rand( 0.0, 1.0 ) );
         
         // Push next label
         this.Graph.SetSResource( "XLabelGroup/EntryPoint",
                                  "#" + this.LabelCounter );
      }

      // Slow update rates if filling the whole graph.
      if( num_samples == 1 || ( this.UpdateCounter % 4 ) == 0 )
        this.Graph.Update();

      ++this.UpdateCounter;
      if( this.UpdateCounter >= 100 )
        this.UpdateCounter = 0;
   }

   // Restart update timer.
   setTimeout( ()=>this.UpdateGraph(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Enable / disable buttons depending on the graph type.
//////////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.EnableButtons = function()
{
   // Disable Reverse button for a ribbon graph.
   document.getElementById( this.GLG_div_name + "_reverse_button" ).disabled =
     ( this.GraphType == "ribbon" ? true : false );

   // Disable grid buttons for 3D graphs.
   document.getElementById( this.GLG_div_name + "_x_grid_button" ).disabled =
     ( this.GraphType == "ribbon" ||
       this.GraphType == "bar_3d" ? true : false );
   document.getElementById( this.GLG_div_name + "_y_grid_button" ).disabled =
     ( this.GraphType == "ribbon" ||
       this.GraphType == "bar_3d" ? true : false );
}

//////////////////////////////////////////////////////////////////////////
// Changes number of samples
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeNumberOfSamples = function()
{
   let num_samples =
     Math.floor( this.Graph.GetDResource( "DataGroup/Factor" ) );
   
   num_samples += 10;
   if( num_samples >= 60 )
     num_samples = 20;
   
   this.Graph.SetDResource( "DataGroup/Factor", num_samples );
   this.Graph.Update();
   
   // Adjust the number of labes to a new number of samples.
   this.ChangeXLabels( false ); 
}

//////////////////////////////////////////////////////////////////////////
// Changes scroll type
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeScrollType = function()
{
   let scroll_type =
   Math.floor( this.Graph.GetDResource( "DataGroup/ScrollType" ) );

   // Toggle between WRAP and SCROLL
   if( scroll_type == GLG.GlgHistoryScrollType.WRAPPED )
     scroll_type = GLG.GlgHistoryScrollType.SCROLLED; 
   else
     scroll_type = GLG.GlgHistoryScrollType.WRAPPED;

   this.Graph.SetDResource( "DataGroup/ScrollType", scroll_type );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes scroll direction
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.Reverse = function()
{
   if( this.GraphType != "ribbon" )    // No reversing for 3D line
   {
      let inversed =
      Math.floor( this.Graph.GetDResource( "DataGroup/Inversed" ) );

      // Toggle between 0 and 1
      if( inversed == 0 )
        inversed = 1;
      else
        inversed = 0;

      this.Graph.SetDResource( "DataGroup/Inversed", inversed );
      this.Graph.Update();
   }
}

//////////////////////////////////////////////////////////////////////////
// Changes range
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeRange = function()
{
   let high_range =
     Math.floor( this.Graph.GetDResource( "YLabelGroup/YLabel/High" ) );

   if( high_range == 1.0 )
     high_range = 5;
   else
     high_range = 1.0;

   this.Graph.SetDResource( "YLabelGroup/YLabel/High", high_range );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes the number of digits after the decimal point for Y labels
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeYFormat = function()
{
   let format = this.Graph.GetSResource( "YLabelGroup/YLabel0/Format" );
   if( format == "%.1lf" )
     format = "%.2lf";
   else
     format = "%.1lf";

   this.Graph.SetSResource( "YLabelGroup/YLabel0/Format", format );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes the number of Y labels
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeYLabels = function()
{
   let num_minor_ticks;

   let num_labels =
     Math.floor( this.Graph.GetDResource( "YLabelGroup/Factor" ) );

   if( num_labels == 5 )
   {
      num_labels = 4;
      num_minor_ticks = 3;
   }
   else
   {
      num_labels = 5;
      num_minor_ticks = 2;
   }
      
   this.Graph.SetDResource( "YLabelGroup/Factor", num_labels );
   this.Graph.SetDResource( "YLabelGroup/MinorFactor", num_minor_ticks );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes the number of X labels
//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ChangeXLabels = function( change )
{
   let num_minor_ticks;

   let num_samples =
     Math.floor( this.Graph.GetDResource( "DataGroup/Factor" ) );
   let num_labels =
     Math.floor( this.Graph.GetDResource( "XLabelGroup/Factor" ) );

   /* If change is true, change the number of X labels, otherwise just adjust
      the number of labes to a number of samples that changed outside.
   */
   if( change )
     if( num_labels == 5 )
       num_labels = 10;
     else
       num_labels = 5;
      
   if( num_labels == num_samples )
     // No minor ticks: we have a lable for each sample
     num_minor_ticks = 1;
   else
     num_minor_ticks = num_samples / num_labels;

   this.Graph.SetDResource( "XLabelGroup/Factor", num_labels );
   this.Graph.SetDResource( "XLabelGroup/MinorFactor", num_minor_ticks );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.UpdateEachSample = function()
{
   this.UpdateAfterEachSample = true;

   // Enable Change Scroll Type and Reverse buttons
   document.getElementById( this.GLG_div_name + "_scroll_type_button" ).disabled = false;
   if( this.GraphType != "ribbon" )
     document.getElementById( this.GLG_div_name + "_reverse_button" ).disabled = false;
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.UpdateWholeFrame = function()
{
   this.UpdateAfterEachSample = false;

   // Disable Change Scroll Type and Reverse buttons
   document.getElementById( this.GLG_div_name + "_scroll_type_button" ).disabled = true;
   document.getElementById( this.GLG_div_name + "_reverse_button").disabled = true;
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.StopUpdate = function()
{
   this.PerformUpdates = false;
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.StartUpdate = function()
{
   this.PerformUpdates = true;
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.SetTitles = function( title, titleX, titleY )
{
   this.Graph.SetSResource( "Title/String", title );
   this.Graph.SetSResource( "XAxisLabel/String", titleX );
   this.Graph.SetSResource( "YAxisLabel/String", titleY );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.ToggleGrid = function( x_grid )
{
   let resource_name;

   if( x_grid != 0 )
     resource_name = "XGridGroup/Visibility";
   else
     resource_name = "YGridGroup/Visibility";

   let grid_on = Math.floor( this.Graph.GetDResource( resource_name ) );

   // Toggle between 0 and 1
   if( grid_on == 0 )
     grid_on = 1;
   else
     grid_on = 0;
        
   this.Graph.SetDResource( resource_name, grid_on );
   this.Graph.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgGraph.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 700 / 600;
   
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
GlgGraph.prototype.SetCanvasResolution = function()
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

      TextScale = 2.;
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
