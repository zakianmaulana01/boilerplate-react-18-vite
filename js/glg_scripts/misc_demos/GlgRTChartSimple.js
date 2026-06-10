//////////////////////////////////////////////////////////////////////////////
// GLG Real Time Chart Example
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// The library loads a GLG drawing containing a GLG Real Time Chart and
// renders it on a web page, providing an API to animate the chart with
// real-time data and handle user interaction.
//
// In addition to controlling the chart via the GLG API at run time,
// the GLG Graphics Builder can be used to set numerious parameters of
// the chart interactively, as well as to create panels containing
// multiple charts together with buttons that control charts' behavior.
//
// This source code demonstrates the basic features of the real-time chart,
// supplying real-time data using the GLG API.
//
// Check the GLG Real-Time Chart Demo
// (https://genlogic.com/html5_demos/rt_chart_demo.html) for more elaborate
// example that demonstrates integrated zooming and scrolling, Real-Time,
// Historical and Calendar chart modes, legend item selection and other
// GLG chart features.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

const NUM_PLOTS  = 2;         /* Number of plot lines in the chart. */
const NUM_Y_AXES = NUM_PLOTS; /* One axis for each plot in this demo, 
                                 may be different. */
const UPDATE_INTERVAL = 30;   /* Update interval in msec */

const BUFFER_SIZE = 5000;     /* Number of samples to keep in the buffer for 
                                 each line. */
// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the GLG real-time chart.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgRTChartSimple( glg_div_name, glg_path, is_standalone, is_mobile )
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

   this.Drawing = null;    // Top level viewport of the loaded drawing.

   /* Variables used to keep current state. */
   this.Inversed = false;
   this.UpdatesOn = true;
   this.UseLinePlot = true;
   this.NumSamplesInBuffer = 0;

   /* Variables that keep state information used to generate simulated data 
      for the demo.
   */
   this.Plot0Valid = true;
   this.SpanIndex = 0;
   this.RangeIndex = 0;
   this.DefaultColors = true;
   this.DefaultLineWidth = true;

   /* Initialize plot's state counters used to simulate data. */
   this.PlotCounter = new Array( NUM_PLOTS );
   for( let i=0; i<NUM_PLOTS; ++i )
     this.PlotCounter[ i ] = 0;

   /* A temporary object used to hold and pass all information about one 
      data point.
   */
   this.data_point =
     {
      value : 0,
      value_valid : false,
      time_stamp : 0,
      has_time_stamp : false,
      has_marker : false
     };
    
   /* DATA SIMULATION: These variables used for simulating data displayed in the
      chart. In a real application, data will be coming from a real data source.
   */
   this.first_error = true;
   this.spike_counter = 1000;
   this.max_spike_height = 0.0;
   
   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts the chart by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChartSimple.prototype.Start = function()
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
GlgRTChartSimple.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChartSimple.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Drawing )
     this.Drawing.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChartSimple.prototype.LoadDrawing = function()
{
   Debug( "LoadDrawing for: " + this.GLG_div_name );
   
   if( !this.Active )
     return;

   /* Load a drawing from the stripchart3.g drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( "stripchart3.g" ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}
   
//////////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.LoadCB = function( drawing, data, path )
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
    
   this.StartRTChart( drawing );
}   

//////////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.StartRTChart = function( drawing )
{
   this.Drawing = drawing;
    
   this.Drawing.InitialDraw();
    
   this.InitChart();
    
   // Start periodic updates.
   setTimeout( ()=>this.UpdateChart(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
// Initializes the drawing and the chart.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.InitChart = function()
{
   this.Drawing.SetDResource( "$config/GlgMouseTooltipTimeout", 0.25 );

   /* Set the requested buffer size. */
   this.Drawing.SetDResource( "Chart/BufferSize", BUFFER_SIZE );

   /* Increase the number of plots and Y axes if the matching number of 
      them are not already defined in the chart's drawing. 
   */
   this.Drawing.SetDResource( "Chart/NumPlots", NUM_PLOTS );
   this.Drawing.SetDResource( "Chart/NumYAxes", NUM_Y_AXES );

   this.Drawing.SetupHierarchy();
}

//////////////////////////////////////////////////////////////////////////
// Updates the chart with data.
// This demo uses simulated data provided by the GetDemoData() function.
// In an application, a custom GetData function may be used to obtain
// live data to be displayed in the chart.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.UpdateChart = function()
{
   if( !this.Active )
     return;
   
   if( this.UpdatesOn )
   {
      /* Supply demo data to update plot lines. */
      for( let i=0; i<NUM_PLOTS; ++i )
      {
         this.GetDemoData( i, this.data_point );
         this.PushPlotPoint( i, this.data_point );
      }

      /* Display the number of samples accumulated in the each plot's buffer. */
      if( this.NumSamplesInBuffer < BUFFER_SIZE )
      {
         ++this.NumSamplesInBuffer;
         this.Drawing.SetDResource( "StoredSamplesLabel/NumSamples",
                                    this.NumSamplesInBuffer );
      }
   }
   
   this.Drawing.Update();    // Draw new data.

   // Restart the update timer.
   setTimeout( ()=>this.UpdateChart(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
// Pushes the data_point's data into the plot using resources.
//////////////////////////////////////////////////////////////////////////  
GlgRTChartSimple.prototype.PushPlotPoint = function( plot_index, data_point )
{
   /* This code uses the GLG Standard API to supply chart data. 
      To increase performance of charts with huge number of data points, 
      the GLG Intermediate API may be used to supply data directly to the plot,
      as shown in the GLG Real-Time Chart Demo.
   */
   
   /* Supply plot value for the chart via ValueEntryPoint.
      A time stamp (in seconds, double) may be supplied via TimeEntryPoint.      
   */
   this.Drawing.SetDResource( "Chart/Plots/Plot#" + plot_index +
                              "/ValueEntryPoint",
                              data_point.value );
                 
   if( data_point.has_time_stamp )
   {
      /* Supply an optional time stamp. If not supplied, the chart will 
         automatically generate a time stamp using current time. 
      */
      this.Drawing.SetDResource( "Chart/Plots/Plot#" + plot_index +
                                 "/TimeEntryPoint",
                                 data_point.time_stamp );
   }
      
   /* Using markers to annotate spikes on the first plot. The plot type
      was set to LINE & MARKERS in the drawing; marker's Visibility
      can be used as an entry point for marker visibility values.
   */
   if( plot_index == 0 )
     this.Drawing.SetDResource( "Chart/Plots/Plot#" + plot_index +
                                "/Marker/Visibility",
                                data_point.has_marker ? 1.0 : 0.0 );
   
   if( !data_point.value_valid )
   {	   
      /* If the data point is not valid, set ValidEntryPoint resource to 
         display holes for invalid data points. If the point is valid,
         it is automatically set to 1.0 by the chart.
      */
      this.Drawing.SetDResource( "Chart/Plots/Plot#" + plot_index +
                                 "/ValidEntryPoint", 0.0 );
   }
}

//////////////////////////////////////////////////////////////////////////
// Inverses chart update direction.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.Inverse = function()
{
   this.Inversed = !this.Inversed;

   this.Drawing.SetDResource( "Chart/XAxis/Inversed", this.Inversed ? 1 : 0 );
   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.StartUpdate = function()
{
   this.UpdatesOn = true;
}

//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.StopUpdate = function()
{
   this.UpdatesOn = false;
}

//////////////////////////////////////////////////////////////////////////
// Changes plot type.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.ChangeType = function()
{
   this.UseLinePlot = !this.UseLinePlot;

   let plot_type0, plot_type1;
   let filter_type, filter_precision0, filter_precision1;
   
   if( this.UseLinePlot )
   {
      plot_type0 = GLG.GlgPlotType.LINE_AND_MARKERS_PLOT;
      plot_type1 = GLG.GlgPlotType.LINE_PLOT;

      /* Filter out samples if the number of them exceeds the number of 
         available pixels.
      */
      filter_type = GLG.GlgChartFilterType.MIN_MAX_FILTER;
      filter_precision0 = 2;
      filter_precision1 = 2;
   }
   else
   {
      plot_type0 = GLG.GlgPlotType.STEP_AND_MARKERS_PLOT;
      plot_type1 = GLG.GlgPlotType.FLOATING_BAR_PLOT;

      /* Filter out excessive samples to have some space between bars. */
      filter_type = GLG.GlgChartFilterType.DISCARD_FILTER;
      filter_precision0 = 40;
      filter_precision1 = 10;
   }
      

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/PlotType", plot_type0 )
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/PlotType", plot_type1 )

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/FilterType", filter_type )
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/FilterType", filter_type )

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/FilterPrecision",
                              filter_precision0 )
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/FilterPrecision",
                              filter_precision1 )

   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes the time span shown in the graph, adjusts major and minor tick 
// intervals to match the time span.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.ChangeSpan = function()
{
   ++this.SpanIndex;
   this.SpanIndex %= 4;

   let span, major_interval, minor_interval;
   let time_format, ms_format;
   
   /* Change chart's time span, as well as major and minor tick intervals.*/
   switch( this.SpanIndex )
   {
    case 0:         
      span = 10;              /* 10 sec. */
      major_interval = 3;     /* major tick every 3 sec. */
      minor_interval = 1;     /* minor tick every sec. */
      time_format = "%r%n%x"; /* Show time and date */  
      ms_format = "";         /* Don't show fractions of a sec. */
      break;
      
    case 1:
      span = 5;               /* 5 sec. */
      major_interval = 1;     /* major tick every sec. */
      minor_interval = 0.5;   /* minor tick every 1/2 sec. */
      time_format = "%T";     /* Show time in 24h notation */  
      ms_format = "";         /* Don't show fractions of a sec. */
      break;
      
    case 2:
      span = 1;               /* 1 sec. */
      major_interval = 0.2;   /* major tick every 2/10 sec. */
      minor_interval = 0.1;   /* minor tick every 1/10 sec. */
      time_format = "%T";     /* Show time in 24h notation. */
      ms_format = "\n%03.0f msec"; /* Show fractions of a sec on a new line:
                                       to avoid clutter on mobile devices. */
      break;
      
    case 3:
      span = -1;              /* Show all data */
      major_interval = -4;    /* 4 major ticks */
      minor_interval = -5;    /* 5 minor ticks */
      time_format = "%r%n%x"; /* Show time and date */  
      ms_format = "";         /* Don't show fractions of a sec. */
      break;
      
    default: AppError( "Invalid span index" ); return;
   }

   this.Drawing.SetDResource( "Chart/XAxis/MajorInterval", major_interval );
   this.Drawing.SetDResource( "Chart/XAxis/MinorInterval", minor_interval );
   this.Drawing.SetSResource( "Chart/XAxis/TimeFormat", time_format );
   this.Drawing.SetSResource( "Chart/XAxis/TimeFormat", time_format );
   this.Drawing.SetSResource( "Chart/XAxis/MilliSecFormat", ms_format );
   
   /* Set the X axis span which controls how much data is displayed in the 
      chart.
   */
   if( span > 0 )
     this.Drawing.SetDResource( "Chart/XAxis/Span", span );
   else
     /* span == -1 : show all accumulated data. 'N' resets span to show all 
        data accumulated in the buffer.
     */
     this.Drawing.SetZoom( null, 'N', 0.0 );

   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes the Y ranges.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.ChangeRange = function()
{
   ++this.RangeIndex;
   this.RangeIndex %= 3;

   let high_coeff, low_coeff;
   switch( this.RangeIndex )
   {
    default:
    case 0: high_coeff = 1.0; low_coeff = 0.0; break;
    case 1: high_coeff = 0.7; low_coeff = 0.3; break;
    case 2: high_coeff = 2.0; low_coeff = 0.0; break;
   }

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/YHigh", 10. * high_coeff );
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/YHigh", 100. * high_coeff );

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/YLow", 10. * low_coeff );
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/YLow", 100. * low_coeff );
   
   this.Drawing.Update();
} 

//////////////////////////////////////////////////////////////////////////
// Changes plot colors.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.ChangeColors = function()
{
   this.DefaultColors = !this.DefaultColors;

   if( this.DefaultColors )
   {
      this.Drawing.SetGResource( "Chart/Plots/Plot#0/EdgeColor", 0., 0., 1. );
      this.Drawing.SetGResource( "Chart/Plots/Plot#0/FillColor", 0., 0., 1. );

      this.Drawing.SetGResource( "Chart/Plots/Plot#1/EdgeColor", 0., 0.6, 0. );
      this.Drawing.SetGResource( "Chart/Plots/Plot#1/FillColor", 0., 0.6, 0. );
   }
   else
   {
      this.Drawing.SetGResource( "Chart/Plots/Plot#0/EdgeColor", 0., 0.6, 0.6 );
      this.Drawing.SetGResource( "Chart/Plots/Plot#0/FillColor", 0., 0.6, 0.6 );

      this.Drawing.SetGResource( "Chart/Plots/Plot#1/EdgeColor", 0.65, 0., 0.65 );
      this.Drawing.SetGResource( "Chart/Plots/Plot#1/FillColor", 0.65, 0., 0.65 );
   }

   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes plot line widths.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.ChangeLineWidth = function()
{
   this.DefaultLineWidth = !this.DefaultLineWidth;

   let line_width = ( this.DefaultLineWidth ? 1 : 3 );

   this.Drawing.SetDResource( "Chart/Plots/Plot#0/LineWidth", line_width );
   this.Drawing.SetDResource( "Chart/Plots/Plot#1/LineWidth", line_width );

   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Supplies demo data, including the plot's value, an optional time stamp
// and an optional sample_valid flag, as well as visibility of a mraker used
// to annotate some data pooints. 
//
// In a real application, data will be coming from an application-specific 
// data source.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.GetDemoData = function( plot_index, data_point )
{
   this.GetDemoPlotValue( plot_index, data_point );  /* Fills a plot value.
   
   /* Let the chart use current time as a time stamp. Optionally,
      an application can provide a time stamp in data_point.time_stamp
      and set data_point.has_time_stamp = true.
   */
   data_point.has_time_stamp = false;
   
   /* Set an optional ValidEntryPoint to make some samples invalid for
      Plot0.0 It is optional: default=True is used for the rest of the plots 
      when ValidEntryPoint is not supplied.
   */   
   if( plot_index == 0 )
   {
      if( this.Plot0Valid ) 
        /* Make samples invalid occasionally. */
        this.Plot0Valid = ( GLG.Rand( 0.0, 100.0 ) > 2.0 );
      else
        /* Make it valid again after a while. */
        this.Plot0Valid= ( GLG.Rand( 0.0, 100.0 ) > 30.0 );
      
      data_point.value_valid = this.Plot0Valid;
   }
   else
     data_point.value_valid = true;
}

// These constants are used for simulating data displayed in the chart.
const PERIOD = 1000;
const MAX_COUNTER = 50000;
const SPIKE_DURATION = 25;

//////////////////////////////////////////////////////////////////////////
// Supplies plot values for the demo; also sets data_point.has_marker field
// to annotate some data points with a marker.
//
// In a real application, data will be coming from an application-specific 
// data source.
//////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.GetDemoPlotValue = function( plot_index, data_point )
{
   let
     value, alpha, period, 
     spike_sign, spike_height,
     spike_duration;
   
   alpha = 2.0 * Math.PI * this.PlotCounter[ plot_index ] / PERIOD;
   switch( plot_index )
   {
    case 0:      
      value = 3.0 + 1.5 * Math.sin( alpha / 5.0 ) + Math.sin( 2.0 * alpha );
      
      /* Add a spike */
      spike_height = 0;
      spike_duration = SPIKE_DURATION;

      if( this.spike_counter >= spike_duration * 3 )
      {
         if( GLG.Rand( 0.0, 1000.0 ) > 990.0 ) 
         {
            /* Start a spike */
            this.spike_counter = 0;
            spike_sign = ( GLG.Rand( 0.0, 10.0 ) > 4.0 ? 1.0 : -1.0 );
            this.max_spike_height = spike_sign * GLG.Rand( 0.0, 1.0 );
         }
      }

      /* Annotate spikes with a marker. */
      data_point.has_marker = ( this.spike_counter == 0 );
      
      if( this.spike_counter <= spike_duration )
      {
         let spike_coeff;
         
         spike_coeff = 1.0 - this.spike_counter / spike_duration;
         spike_height = 
           0.3 * this.max_spike_height * spike_coeff  * spike_coeff * 
           ( 1.0 + Math.cos( 2.0 * Math.PI * this.spike_counter / 12.0 ) );
      }
      
      ++this.spike_counter;
      value += spike_height; 
      break;
      
    case 1:
      period = ( 0.95 + 0.05 * Math.abs( Math.sin( alpha / 10.0 ) ) ); 
      value = 7.0 + Math.sin( 30.0 * period * alpha ) * 
        Math.sin( Math.PI / 8.0 + alpha );
      value *= 10.0;
      break;
      
    default:
      if( this.first_error )
      {
         this.first_error = false;
         AppError( "Add a case to provide demo data for added plots." );
      }
      value = 62.0;
      break;
   }
   
   /* Increase the plot's state counter used to simulate demo data. */
   ++this.PlotCounter[ plot_index ];
   this.PlotCounter[ plot_index ] =
     ( this.PlotCounter[ plot_index ] % MAX_COUNTER );
   
   data_point.value = value;   /* Returned simulated value. */
}

//////////////////////////////////////////////////////////////////////////////
// Maintains width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.SetDrawingSize = function( next_size )
{
   // Settings for desktop displays.
   const MIN_HEIGHT = 250;
   const MAX_HEIGHT = 800;

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
         /* Handle browser zooming. */
         this.ResizeListener = ()=>this.SetDrawingSize( false );
         window.addEventListener( "resize", this.ResizeListener );
      }
   }
   else if( next_size )
   {
      ++this.SizeIndex;
      this.SizeIndex %= 3;
   }

   let drawing_area = document.getElementById( this.GLG_div_name );
   if( this.IsMobile )
   {
      /* Mobile devices use constant device-width. */
       drawing_area.style.height =
           "" + Math.trunc( drawing_area.clientWidth * 0.8 ) + "px";
   }
   else   /* Desktop */
   {
      let coeff;
      switch( this.SizeIndex )
      {
       default:
       case 0: coeff = 0.6; break;
       case 1: coeff = 0.8; break;
       case 2: coeff = 0.4; break;
      }
   
      let width = document.body.clientWidth;
      if( width < 300 )
        coeff *= 1.2;

      let height = width * coeff;

      if( height < MIN_HEIGHT )
        height = MIN_HEIGHT;
      else if( height > MAX_HEIGHT )
        height = MAX_HEIGHT;

      drawing_area.style.height = "" + Math.trunc( height ) + "px";
   }

   // Adjust canvas resolution for mobile devices and browser zoom state.
   if( !next_size )
     this.SetCanvasResolution();
}

//////////////////////////////////////////////////////////////////////////////
// Increases canvas resolution for mobile devices with HiDPI displays and for
// browser zooming. Sets CoordScale global variable.
//////////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.SetCanvasResolution = function()
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

      TextScale = 1.75;
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

//////////////////////////////////////////////////////////////////////////////
// Loads any assets required by the application and invokes the specified
// callback when done.
// Alternatively, the application drawing can be loaded as an asset here
// as well, so that it starts loading without waiting for the other assets 
// to finish loading.
//////////////////////////////////////////////////////////////////////////////
GlgRTChartSimple.prototype.LoadAssets = function( callback, user_data )
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
GlgRTChartSimple.prototype.AssetLoaded = function( glg_object, data, path )
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
