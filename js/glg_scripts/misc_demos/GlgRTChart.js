//////////////////////////////////////////////////////////////////////////////
// GLG Real Time Chart Demo
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// The library loads a GLG drawing containing a GLG Real Time Chart and
// renders it on a web page, providing an API to animate the chart with
// real-time data and handle user interaction, such as zooming or dragging
// the chart data with the mouse, or handling toolbar controls that modify
// the chart's behavior.
//
// In addition to controlling the chart via the GLG API at run time,
// the GLG Graphics Builder can be used to set numerious parameters of
// the chart interactively, as well as to create panels containing
// multiple charts together with buttons that control charts' behavior.
//
// This source code demonstrates how to use various features of the real-time
// chart. It includes examples of using the chart with both the real-time,
// historical and calendar data. In a real application, only a small fraction
// of the code will be used to dsiplay and update the chart in the selected
// usage mode.
//
// Except for the changes to comply with the JavaScript syntax, this source
// is identical to the source code of the corresponding C/C++, Java and C#
// versions of the demo.
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

/* Set to true to allow the user to ZoomTo using Button3-Drag-Release
   instead of the Button1-Drag-Release default.
*/
const ENABLE_ZOOM_TO_ON_BUTTON3 = true;

const NUM_PLOTS  = 3;         /* Number of plot lines in the chart. */
const NUM_Y_AXES = NUM_PLOTS; /* One axis for each plot in this demo, 
                                 may be different. */

/* Sampling interval for historical data points in seconds. */
const HISTORICAL_DATA_INTERVAL = 60;   /* Once a minute */

const UPDATE_INTERVAL = 30;   /* Update interval in msec */

const BUFFER_SIZE = 50000;    /* Number of samples to keep in the buffer for 
                                 each line. */
const PREFILL_DATA = true;    /* Setting to false suppresses pre-filling the 
                                 chart's buffer with data on start-up in the 
                                 REAL_TIME mode. */
/* Chart mode */
const REAL_TIME  = 0;         /* Real-time mode: updates graph with data using
                                 the current time for time stamps. */
const HISTORICAL = 1;         /* Historical mode: displays and scrolls through
                                 historical data. */
const CALENDAR   = 2;         /* Calendar mode: displays daily data. */

const DAY = 3600 * 24;        /* Number of seconds in a day */

/* Constants for scrolling to the ends of the time range. */
const DONT_CHANGE  = 0;
const MOST_RECENT  = 1;       /* Make the most recent data visible. */
const LEAST_RECENT = 2;       /* Make the least recent data visible.*/

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the real-time chart.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgRTChart( glg_div_name, glg_path, is_standalone, is_mobile )
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

   this.Drawing = null;          /* Top level viewport of the loaded drawing. */
   this.ChartVP = null;          /* Parent viewport of the chart object. */
   this.Chart = null;            /* GlgChart object. */

   this.UpdateTimer = null; 

   this.Plot = new Array( NUM_PLOTS );
   this.YAxis = new Array( NUM_Y_AXES );

   /* Variables used to keep current state. */
   this.TimeSpan = 0;            /* The currently displayed span in seconds. */
   this.StoredScrollState = 0;   /* Stored AutoScroll state to be restored if 
                                    ZoomTo is aborted. */
   this.AutoScroll = 1;          /* Current auto-scroll state: enabled (1) or 
                                    disabled (0). */
   this.Mode = REAL_TIME;        /* Current chart mode: real-time, historical 
                                    or calendar. */
   this.SpanIndex = 1;           /* Index of the currently displayed time span.
                                  */
   this.YAxisLabelType = 0;      /* Used to demonstrate diff. Y axis labels. */ 
   this.ScrollMode = !is_mobile; /* Defines an action to perform on touch on
                                  mobile devices: 
                                  - true : scroll charts (desktop default)
                                  - false : display sample values 
                                    (mobile default) */

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;

   /* Stores initial range values, used to restore after zooming. */
   this.Min = new Array( NUM_PLOTS );
   this.Max = new Array( NUM_PLOTS );

   this.SelectedPlot = null;     /* Selected GlgPlot object. */
   this.StopAutoScroll = false;
   this.WaitForPrefill = false;  

   /* Variables that keep state information used to generate simulated data 
      for the demo.
   */
   this.PlotCounter = null;
   this.Plot0Valid = true;

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

   /* DATA SIMULATION: These variables used for simulating data displayed 
      in the chart. In a real application, data will be coming from a 
      real data source.
   */
   this.first_error = true;
   this.state = 0;
   this.change_counter = 10;
   this.spike_counter = 1000;
   this.approx_counter = 0;
   this.last_direction = 1;

   this.max_spike_height = 0.0;
   this.last_value = 5.0;
   this.increment_sign = 1.0;
   this.last_value2 = 0.0; 
   this.increment_sign2 = 1.0;         
   this.last_value3 = 70.0;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts real-time chart demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChart.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;

   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   // Show touch action selector for mobile devices.
   if( this.IsMobile )
     ShowElement( this.GLG_div_name + "_touch_action", true );
   
   /* Load misc. assets such as GLG scrollbars. When assets are loaded, 
      LoadDrawing callback is invoked that loads a GLG drawing defined by
      DrawingName variable.
   */
   this.LoadAssets( ()=>this.LoadDrawing(), null );
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChart.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Drawing )
     this.Drawing.ResetHierarchy();        // Undisplay GLG drawing.

   this.StopUpdateTimer();
    
   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
GlgRTChart.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgRTChart.prototype.LoadDrawing = function()
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
   let drawing_file =
     ( this.IsMobile ? "stripchart_demo2.g" : "stripchart_demo.g" );
   GLG.LoadWidgetFromURL( this.GetFullName( drawing_file ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.LoadCB =
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
    
   this.StartRTChartDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.StartRTChartDemo = function( drawing )
{
   this.Drawing = drawing;

   this.ChartVP = this.Drawing.GetResourceObject( "ChartViewport" );
   this.Chart = this.ChartVP.GetResourceObject( "Chart" );   
    
   this.IncreaseSelectionLabelSize();
   
   /* Add Input callback used to handle user interaction. */
   this.Drawing.AddListener( GLG.GlgCallbackType.INPUT_CB,
                             this.InputCallback.bind( this ) );
    
   /* Add Trace callbacks used to start chart scrolling by dragging it with 
      the mouse. */
   this.Drawing.AddListener( GLG.GlgCallbackType.TRACE_CB,
                             this.TraceCallback.bind( this ) );
   this.Drawing.AddListener( GLG.GlgCallbackType.TRACE2_CB,
                             this.Trace2Callback.bind( this ) );
    
   // Display the number of data points per line and the total number of points.
   this.ChartVP.SetDResource( "NumDataPoints", BUFFER_SIZE );
   this.ChartVP.SetDResource( "NumDataPointsTotal",
                              BUFFER_SIZE * NUM_PLOTS );

   this.AdjustForMobileDevices();
   
   this.Drawing.InitialDraw();
    
   this.InitChart();
    
   // Periodic updates for Real Time Mode are started in SetMode() method
   // by invoking StartUpdateTimer().
}

//////////////////////////////////////////////////////////////////////////
// Initializes the drawing and the chart.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.InitChart = function()
{
   this.Drawing.SetDResource( "$config/GlgMouseTooltipTimeout", 0.25 );

   /* Set the requested buffer size. */
   this.Chart.SetDResource( "BufferSize", BUFFER_SIZE );

    /* Set multi-plot tooltip type. */
    this.Chart.SetDResource( "TooltipMode",
                             GLG.GlgChartTooltipMode.MULTI_PLOT_TOOLTIP );

    
   /* Increase the number of plots and Y axes if the matching number of 
      them are not already defined in the chart's drawing. 
   */
   this.Chart.SetDResource( "NumPlots", NUM_PLOTS );
   this.Chart.SetDResource( "NumYAxes", NUM_Y_AXES );

   this.Chart.SetupHierarchy();

   /* Using an Intermediate API to store plot IDs in an array for convenient
      access. To query plot IDs with the Standard API, use GetNamedPlot()
      in conjunction with CreateIndexedName().
   */
   let plot_array = this.Chart.GetResourceObject( "Plots" );
   for( let i=0; i<NUM_PLOTS; ++i )
     this.Plot[i] = plot_array.GetElement( i );
   
   /* Store Y axes in an array for convenient access using an Intermediate 
      API. Alternatively, Y axes' resources can be accessed by their 
      resource names via the Standard API, for example: 
      "ChartVP/Chart/YAxisGroup/YAxis#0/Low"
   */
   let y_axis_array = this.Chart.GetResourceObject( "YAxisGroup" );
   for( let i=0; i<NUM_Y_AXES; ++i )
     this.YAxis[i] = y_axis_array.GetElement( i );

   /* Set the Chart Zoom mode. It was set and saved with the drawing, 
      but do it again programmatically just in case.
   */
   this.ChartVP.SetZoomMode( null, this.Chart, null,
                             GLG.GlgZoomMode.CHART_ZOOM_MODE );

   /* Set the initial Y axis label type. */
   this.ChangeYAxisLabelType( this.YAxisLabelType );

   /* Query the initial Y ranges defined in the drawing and store them
      for the Restore Ranges action.
   */
   this.StoreInitialYRanges();

   this.DisplaySelection( null, true );

   /* Sets initial mode: real-time, historical or calendar. */
   this.SetMode( this.Mode );
}

//////////////////////////////////////////////////////////////////////////
// Updates the chart with data.
// This demo uses simulated data provided by the GetDemoData() function.
// In an application, a custom GetData function may be used to obtain
// live data to be displayed in the chart.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.UpdateChart = function()
{
   if( !this.Active )
     return;
   
   if( !this.WaitForPrefill )
   {
      /* Supply demo data to update plot lines. */
      for( let i=0; i<NUM_PLOTS; ++i )
      {
         this.GetDemoData( i, this.data_point );
         this.PushPlotPoint( i, this.data_point );
      }
      
      this.Drawing.Update();    // Draw new data.
   }
   
   // Restart the update timer if it wasn't stopped.
   if( this.UpdateTimer != null )
     this.StartUpdateTimer();
}

//////////////////////////////////////////////////////////////////////////
// Pushes the data_point's data into the plot using resources.
//////////////////////////////////////////////////////////////////////////  
GlgRTChart.prototype.PushPlotPoint = function( plot_index, data_point )
{
   let plot = this.Plot[ plot_index ];

   /* Supply plot value for the chart via ValueEntryPoint. */
   plot.SetDResource( "ValueEntryPoint", data_point.value );
                 
   if( data_point.has_time_stamp )
   {
      /* Supply an optional time stamp. If not supplied, the chart will 
         automatically generate a time stamp using current time. 
      */
      plot.SetDResource( "TimeEntryPoint", data_point.time_stamp );
   }
      
   /* Using markers to annotate spikes on the first plot. The plot type
      was set to LINE & MARKERS in the drawing; marker's Visibility
      can be used as an entry point for marker visibility values.
   */
   if( plot_index == 0 )
     plot.SetDResource( "Marker/Visibility",
                        data_point.has_marker ? 1.0 : 0.0 );
   
   if( !data_point.value_valid )
   {	   
      /* If the data point is not valid, set ValidEntryPoint resource to 
         display holes for invalid data points. If the point is valid,
         it is automatically set to 1.0 by the chart.
      */
      plot.SetDResource( "ValidEntryPoint", 0.0 );
   }
}

//////////////////////////////////////////////////////////////////////////
// Pushes the data_point's data into the plot using low level API methods
// for increased performance. It is used to prefill a chart with large
// quantities of data.
//////////////////////////////////////////////////////////////////////////  
GlgRTChart.prototype.PushPlotPointDirect = function( plot_index, data_point )
{
   /* Supply an optional time stamp. Use the current time if the time stamp
      is not supplied.
   */
   let time_stamp =
     ( data_point.has_time_stamp ? data_point.time_stamp : GetCurrTime() );

   let marker_visibility =
     ( plot_index == 0 && data_point.has_marker ? 1.0 : 0.0 );

   let plot = this.Plot[ plot_index ];

   // Using quick mode to speed-up prefilling of the chart.
   plot.AddPlotDataSample( data_point.value, time_stamp,
                           data_point.value_valid, marker_visibility,
                           /* quick mode */ true );
}

//////////////////////////////////////////////////////////////////////////
// Handle user interaction.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.InputCallback = function( viewport, message_obj )
{
   if( !this.Active )
     return;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );
   let subaction = message_obj.GetSResource( "SubAction" );

   if( format == "Button" )         /* Handle button clicks */
   {
      if( action != "Activate" &&      /* Not a push button */
          action != "ValueChanged" )   /* Not a toggle button */
        return;
      
      this.AbortZoomTo();
      
      if( origin == "ScrollToRecent" )
      {         
         /* Set time axis's end to current time. */
         this.ScrollToDataEnd( MOST_RECENT, true ); 
      }
      else if( origin == "ToggleAutoScroll" )
      {         
         this.ChangeAutoScroll( -1 ); /* Toggle curr. value between 0 and 1.0 */
      }
      else if( origin == "ZoomTo" )
      {
          if( ENABLE_ZOOM_TO_ON_BUTTON3 )
            /* Allow the ZoomTo toolbar button to use the left mouse button. */
            this.Drawing.SetDResource( "$config/GlgZoomToButton", 1.0 );

         this.ChartVP.SetZoom( null, 't', 0.0 );  /* Start ZoomTo op */
      }
      else if( origin == "ResetZoom" )
      {         
         this.SetChartSpan( this.SpanIndex, false );
         this.RestoreInitialYRanges();
      }
      else if( origin == "ScrollBack" )
      {
         this.ChangeAutoScroll( 0 );
         
         /* Scroll left by 1/3 of the span. */
         this.ChartVP.SetZoom( null, 'l', 0.33 );
      }
      else if( origin == "ScrollBack2" )
      {
         this.ChangeAutoScroll( 0 );
         
         /* Scroll left by a full span. */
         this.ChartVP.SetZoom( null, 'l', 1.0 );
      }
      else if( origin == "ScrollForward" )
      {
         this.ChangeAutoScroll( 0 );
         
         /* Scroll right by 1/3 of the span. */
         this.ChartVP.SetZoom( null, 'r', 0.33 );
      }
      else if( origin == "ScrollForward2" )
      {
         this.ChangeAutoScroll( 0 );
         
         /* Scroll right by a full span. */
         this.ChartVP.SetZoom( null, 'r', 1.0 );
      }
      else if( origin == "ToggleLabels" )
      {
         this.ChangeYAxisLabelType( -1 );   /* Change to the next type. */
      }
      else if( origin == "DemoMode" )
      {
         // Toggle the current mode between REAL_TIME, HISTORICAL and CALENDAR.
         this.SetMode( -1 );
      }

      this.Drawing.Update();
   }
   else if( format == "Menu" )
   {
      if( action != "Activate" )
        return;
      
      this.AbortZoomTo();
      
      if( origin == "SpanSelector" )    /* Span change */
      {         
         this.SpanIndex = message_obj.GetDResource( "SelectedIndex" );
         // Make sure it's an integer.
         this.SpanIndex = Math.round( this.SpanIndex );
         
         this.SetChartSpan( this.SpanIndex, false );
         this.RestoreInitialYRanges(); // Restore in case the chart was zoomed.
         
         /* Scroll to show the recent data to avoid showing an empty chart
            if user scrolls too much into the future or into the past.
            
            In the real-time mode, invoke ScrollToDataEnd() even if 
            AutoScroll is True to scroll ahead by a few extra seconds to 
            show a few next updates without scrolling the chart.
         */
          let min_max =
            this.Chart.GetChartDataExtent( null, /* x extent */ true, false );

         if( min_max != null )
         {
            let first_time_stamp = min_max.min;
            let last_time_stamp = min_max.max;
            let displayed_time_end =
              this.Chart.GetDResource( "XAxis/EndValue" );

            if( this.Mode == REAL_TIME && this.AutoScroll != 0 )
              this.ScrollToDataEnd( MOST_RECENT, true );
            else if( displayed_time_end > last_time_stamp + this.GetExtraSeconds() )
              this.ScrollToDataEnd( MOST_RECENT, true );
            else if( displayed_time_end - this.TimeSpan <= first_time_stamp )
              this.ScrollToDataEnd( LEAST_RECENT, true );
         }
         this.Drawing.Update();
      }
   }
   else if( action == "Zoom" )
   {
      if( subaction == "Start" )
      {
         /* Store current AutoScroll state to restore it if ZoomTo 
            is aborted. */
         this.StoredScrollState = this.AutoScroll;            
      }
      else if( subaction == "ZoomRectangle" )
      {
         /* Stop scrolling: ZoomTo action is being started. */
         this.ChangeAutoScroll( 0 );
      }
      else if( subaction == "End" )
      {
         /* No addtional actions on finishing ZoomTo. The Y scrollbar
            appears automatically if needed: it is set to PAN_Y_AUTO. 
            Don't resume scrolling: it'll scroll too fast since we zoomed 
            in. Keep it still to allow inspecting zoomed data.
         */
      }
      else if( subaction == "Abort" )
      {
         /* Resume scrolling if it was on. */
         this.ChangeAutoScroll( this.StoredScrollState );         
      }
      
      this.Drawing.Update();
   }
   else if( action == "Pan" )
   {
      /* This code may be used to perform custom actions when dragging 
         the chart's data with the mouse. 
      */
      if( subaction == "Start" )   /* Chart dragging start */
      {
      }
      else if( subaction == "Drag" )    /* Dragging */
      {
      }
      else if( subaction == "ValueChanged" )   /* Scrollbars */
      {
      }
      /* Dragging ended or aborted. */
      else if( subaction == "End" ||
               subaction == "Abort" )
      {
      }
   }
   else if( format == "Tooltip" )
   {
      if( action == "SpecialTooltip" )
      {
         /* When the chart tooltip appears, erase selection text, but
            keep selection marker from the tooltip. 
         */
         this.DisplaySelection( null, false );
      }
   }
   else if( format == "Chart" )
   {
      if( action == "CrossHairUpdate" )
      {
         /* No need to invoke Update() to redraw the new position of the 
            chart's cross hair cursor: the drawing will be redrawn in one
            batch by either the update timer or DisplaySelection().
         */
      }
   }
   else if( format == "CustomEvent" )
   {
      let event_label = message_obj.GetSResource( "EventLabel" );
      if( event_label != null )
        if( event_label == "LegendSelect" )
        {
           this.SelectPlot( GLG.GetSelectedPlot() );   /* Select plot. */
           /* Don't stop auto-scroll if legend was clicked on. */
           this.StopAutoScroll = false;
        }
        else if( event_label == "LegendUnselect" )
        {
           this.SelectPlot( null );           /* Unselect plot. */
           this.StopAutoScroll = false;
        }
   }
}

//////////////////////////////////////////////////////////////////////////
// Changes line width of the selected plot.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SelectPlot = function( plot )
{
   if( plot == this.SelectedPlot )
     return;
   
   if( this.SelectedPlot != null )
   {
      /* Unselect the previously selected plot. */
      this.SelectedPlot.SetDResource( "Selected", 0.0 );
      this.SelectedPlot = null;
   }
   
   if( plot != null )
   {
      /* Select a new plot. "Selected" resource controls transformation 
         attached to the plot's line width. When the Selected resource 
         is set to 1, the plot's LineWidth changes to 2.
      */
      plot.SetDResource( "Selected", 1.0 );
      this.SelectedPlot = plot;
   }
   
   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Used to start scrolling the chart by dragging it with the mouse.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.TraceCallback = function( viewport, trace_info )
{
   if( !this.Active )
     return;

   let x, y;
   let display_selection = false;

   /* Use ChartViewport's events only. */
   if( !trace_info.viewport.Equals( this.ChartVP ) )
     return;

   let event_type = trace_info.event_type;
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
      GLG.SetTouchMode();        /* Start dragging via touch events. */
      /* Fall through */

    case GLG.GlgEventType.TOUCH_MOVED:
    case GLG.GlgEventType.MOUSE_PRESSED:
    case GLG.GlgEventType.MOUSE_MOVED:
      x = trace_info.mouse_x * this.CoordScale;
      y = trace_info.mouse_y * this.CoordScale;
      display_selection = true;
         
      /* COORD_MAPPING_ADJ is added to the cursor coordinates for precise
         pixel mapping.
      */
      x += GLG.COORD_MAPPING_ADJ;
      y += GLG.COORD_MAPPING_ADJ;
      break;
        
    case GLG.GlgEventType.MOUSE_EXITED: 
      /* Erase last selection when cursor leaves the window. */
      this.DisplaySelection( null, true );
      return;
      
    default: return;
   }
   
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
    case GLG.GlgEventType.MOUSE_PRESSED:
      if( this.ZoomToMode() )
        return; /* ZoomTo or dragging mode in progress. */
      
      /* Start dragging with the mouse on a mouse click on Button1,
         or start ZoomTo on Button3.
         
         For Button1, if user clicked on an axis, the dragging will
         be activated in the direction of that axis. If the user
         clicked on the chart area, dragging in both the time and
         the Y direction will be activated.
         
         To allow dragging just in one direction, use '>' instead of 's' 
         for horizontal scrolling and '^' for vertical.
      */
      switch( trace_info.button )
      {
       case 1:    // Left button
         if( this.ScrollMode )
           this.ChartVP.SetZoom( null, 's', 0.0 );     /* Start dragging */
         break;
       case 3:   // Right button
         if( ENABLE_ZOOM_TO_ON_BUTTON3 )
         {
            /* Change ZoomTo button from 1 to 3. */
            this.Drawing.SetDResource( "$config/GlgZoomToButton", 3.0 );

            this.ChartVP.SetZoom( null, 't', 0.0 );   /* Start ZoomTo */
         }
         break;
       default: break;
      }
      
      /* Disable AutoScroll not to interfere with dragging - but do it later
         in the Trace2 callback, only if legend was not clicked on.
      */
      if( this.ScrollMode )
        this.StopAutoScroll = true;
      break;

    default: break;
   }

   /* In addition to a tooltip appearing after a timeout when the mouse 
      stops, display selection information when the mouse moves over a 
      chart or axis. The selection is displayed using the same format as 
      the tooltip, which is configured via the TooltipFormat attribute 
      of the chart. Alternatively, an application can invoke 
      GlgCreateChartSelection() and display the returned data in a 
      custom format.
   */
   if( display_selection && !this.ZoomToMode() )
   {
      let selection_string =
        this.Chart.CreateTooltipString( x, y, 10.0, 10.0,
                                        "<single_line><plot_string:%s> = <sample_y:%.2lf>   " );

      /* Display new selection or erase last selection if no selection
         (when string is null). 
      */
      this.DisplaySelection( selection_string, true );
   }
}

//////////////////////////////////////////////////////////////////////////
// Trace2 callback is invoked after the Input callback.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.Trace2Callback = function( viewport, trace_info )
{
   /* Use ChartViewport's events only. */
   if( !trace_info.viewport.Equals( this.ChartVP ) )
     return;

   /* Stop auto-scroll on a click in the chart, but not if the legend was 
      clicked.
   */
   switch( trace_info.event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
    case GLG.GlgEventType.MOUSE_PRESSED:
      if( this.StopAutoScroll )
      {
         this.StopAutoScroll = false;
         this.ChangeAutoScroll( 0 );
      }
      break;
    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////
// Display information about the selected point. It is used on a mouse move 
// in addition to a tooltip.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.DisplaySelection =
  function( selection_string, erase_selection_marker )
{   
   if( selection_string == null )
   {
      selection_string = "";

      // No selection: erase selection highlight marker if requested.
      if( erase_selection_marker )
        this.Chart.SetDResource( "DrawSelected", 0.0, /* if changed */ true );
   }
   
   this.ChartVP.SetSResource( "SelectionLabel/String", selection_string, true );

   /* In the real-time mode the drawing is updated on a timer, otherwise update
      it here.
   */
   if( this.Mode != REAL_TIME )
     this.ChartVP.Update();
}

//////////////////////////////////////////////////////////////////////////
// Scrolls the graph to the minimum or maximum time stamp to show the 
// most recent or the least recent data. If show_extra is True, adds a 
// few extra seconds in the real-time mode to show a few next updates
// without scrolling the chart.
//
// Enabling AutoScroll automatically scrolls to show current data points 
// when the new time stamp is more recent then the EndValue of the axis, 
// but it is not the case when the chart is scrolled into the future 
// (to the right) - still need to invoke this method.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.ScrollToDataEnd = function( data_end, show_extra )
{
   let end_value, extra_sec;
      
   if( data_end == DONT_CHANGE )
     return;

   /* Get the min and max time stamp. */
   let min_max =
     this.Chart.GetChartDataExtent( null, /* x extent */ true, false );
   if( min_max == null )
     return;

   if( show_extra )   
     extra_sec = this.GetExtraSeconds();
   else
     extra_sec = 0.0;
   
   if( data_end == MOST_RECENT )
     end_value = min_max.max + extra_sec;
   else   /* LEAST_RECENT */
     end_value = min_max.min - extra_sec + this.TimeSpan ;
   
   this.Chart.UpdateChartTimeAxis( null, end_value, false );
}

//////////////////////////////////////////////////////////////////////////
// Determines a good number of extra seconds to be added at the end in
// the real-time mode to show a few next updates without scrolling the
// chart.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.GetExtraSeconds = function()
{
   let extra_sec, max_extra_sec;
      
   if( this.Mode != REAL_TIME )
     return 0.0;
   
   extra_sec = this.TimeSpan * 0.1;
   switch( this.SpanIndex )
   {
    default:
    case 0:
    case 1: 
    case 2: max_extra_sec = 3.0; break;
    case 3: max_extra_sec = 5.0; break;
   }
   
   if( extra_sec > max_extra_sec )
     extra_sec = max_extra_sec;
   
   return extra_sec;
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.ChangeAutoScroll = function( new_value )
{
   let pan_x;

   if( new_value == -1 ) /* Use the state of the ToggleAutoScroll button. */
   {
      this.AutoScroll = this.Drawing.GetDResource( "ToggleAutoScroll/OnState" );
      // Make sure it's an integer.
      this.AutoScroll = Math.round( this.AutoScroll );
   }
   else    /* Set to the supplied value. */
   {
      this.AutoScroll = new_value;
      
      /* Update the AutoScroll toggle with the new value. */
      this.Drawing.SetDResource( "ToggleAutoScroll/OnState", this.AutoScroll );
   }

   /* Set chart's auto-scroll. */
   this.Chart.SetDResource( "AutoScroll", this.AutoScroll );

   /* Set the state of the AutoScroll button in HTML. */
   CheckElement( this.GLG_div_name + "_auto_scroll", this.AutoScroll != 0 );
   
   /* Activate time scrollbar if AutoScroll is Off. The Y value scrollbar 
      uses PAN_Y_AUTO and appears automatically as needed.
   */
   pan_x =
     ( this.AutoScroll != 0 ? GLG.GlgPanType.NO_PAN : GLG.GlgPanType.PAN_X );
   this.ChartVP.SetDResource( "Pan", ( pan_x | GLG.GlgPanType.PAN_Y_AUTO ) );
}

//////////////////////////////////////////////////////////////////////////
// Changes the time span shown in the graph, adjusts major and minor tick 
// intervals to match the time span.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetChartSpan = function( span_index, update_chart )
{
   let span, major_interval, minor_interval, time_offset;
   let num_vis_points, sampling_interval;
   
   let in_the_middle = false;
   let fix_leap_years = false;

   /* Change chart's time span, as well as major and minor tick intervals. */
   switch( this.Mode )
   {
    case REAL_TIME:
      switch( span_index )
      {
       case 0:         
         span = 10;            /* 10 sec. */
         major_interval = 3;   /* major tick every 3 sec. */
         minor_interval = 1;   /* minor tick every sec. */
         break;
         
       case 1:
         span = 60;            /* 1 min. */
         major_interval = 15;  /* major tick every 15 sec. */
         minor_interval = 1;   /* minor tick every sec. */
         break;
         
       case 2:
         span = 600;           /* 10 min. */
         major_interval = 180; /* major tick every 3 min. */
         minor_interval = 60;  /* minor tick every min. */
         break;
         
       case 3:
         span = -1;             /* Show all data */
         major_interval = -4;   /* 4 major ticks */
         minor_interval = -5;   /* 5 minor ticks */
         break;
         
       default: AppError( "Invalid span index" ); return;
      }
      time_offset = 0;
      sampling_interval = UPDATE_INTERVAL / 1000.0;
      break;
      
    case HISTORICAL:   
      switch( span_index )
      {
       case 0:
         span = 3600;                /* 1 hour */
         major_interval = 60 * 10;   /* major ticks every 10 min. */
         minor_interval = 60;        /* minor ticks every min. */
         break;
         
       case 1:
         span = 3600 * 8;            /* 8 hours */
         major_interval = 3600 * 2;  /* major tick every 2 hours */
         minor_interval = 60 * 15;   /* minor tick every 15 minutes */
         break;
         
       case 2:
         span = DAY;                 /* 24 hours */
         major_interval = 3600 * 6;  /* major tick every 6 hours */
         minor_interval = 3600;      /* minor tick every hour */
         break;
         
       case 3:
         span = DAY * 10;            /* 10 days */
         major_interval = DAY * 2;   /* major tick every 2 days */
         minor_interval = 3600 * 12; /* minor tick every 12 hours */
         break;
         
       default: AppError( "Invalid span index" ); return;
      }
      
      /* Positions major ticks and labels at 8 AM instead of midnight
         when the major tick interval is set to one day or a whole number 
         of days.
      */
      time_offset = 3600 * 8;
      sampling_interval = HISTORICAL_DATA_INTERVAL;
      break;
      
    case CALENDAR: 
      switch( span_index )
      {
       case 0:
         span = DAY * 31;             /* 1 month */
         major_interval = DAY * 5 ;   /* major ticks every 5 days */
         minor_interval = DAY;        /* minor ticks every day. */
         
         /* Positions ticks and labels at noon instead of midnight. */
         time_offset = DAY / 2;
         break;
         
       case 1:
         span = DAY * 31 * 3;         /* 1 quarter. */
         major_interval = DAY * 14;   /* major tick every 2 weeks */
         minor_interval = DAY;        /* minor tick every day */
            
         /* Positions ticks and labels at noon instead of midnight. */
         time_offset = DAY / 2;
         break;
         
       case 2:
         /* Display labels in the middle of each month's interval. */
         in_the_middle = true; 
         
         /* Offsets month labels by 1/2 month to position them in the 
            midddle of the month's interval.
         */
         time_offset = DAY * 15;
         
         span = DAY * 365;          /* 1 year */
         major_interval = -12;      /* major tick every month (12 ticks) */
         minor_interval = -2;       /* minor tick in the middle (2 ticks)
                                       to show the extent of the month. */
         break;
         
       case 3:
         span = DAY * 365 * 10;      /* 10 years */
         major_interval = DAY * 365; /* major tick every year */
         minor_interval = -12;       /* minor tick every month (12 ticks) */
         
         /* Time labels display only the year for this time scale.
            Position major ticks and labels a bit past the 1st the month 
            to avoid any rounding errors. The tooltips display the exact
            date regardless.
         */
         time_offset = 3600;
         break;
         
       default: AppError( "Invalid span index" ); return;
      }
      
      if( span_index >= 2 )     /* 1 year or 10 years */
        /* The major tick is positioned at the start of the month or the 
           start of the year. Tell the chart to properly calculate the label
           position by adjusting by the number of accumulated leap days.
           It matters only in the calendar mode when the major tick interval
           is greater then a day.
        */
        fix_leap_years = true;
      
      sampling_interval = DAY / 2;
      break;
      
    default: AppError( "Invalid mode" ); return;
   }
   
   /* In the desktop version, update the span selected radio menu in the drawing
      with the initial value if different. In the mobile version, the span 
      selector buttons are in HTML outside of the drawing and do not use radio
      menu.
   */
   if( !this.IsMobile )
     this.Drawing.SetDResource( "SpanSelector/SelectedIndex",
                                span_index, true );
   
   /* Set intervals before SetZoom() below to avoid redrawing huge number 
      of labels. */
   this.Chart.SetDResource( "XAxis/MajorInterval", major_interval );
   this.Chart.SetDResource( "XAxis/MinorInterval", minor_interval );
   
   this.Chart.SetDResource( "XAxis/MajorOffset", time_offset );
   this.Chart.SetDResource( "XAxis/FixLeapYears",
                            fix_leap_years ? 1.0 : 0.0 );
   
   /* Set the X axis span which controls how much data is displayed in the
      chart.
   */
   if( span > 0 )
   {
      this.TimeSpan = span;
      this.Chart.SetDResource( "XAxis/Span", this.TimeSpan );
   }
   else   /* span == -1 : show all accumulated data. */
   {
      /* 'N' resets span to show all data accumulated in the buffer. */
      this.ChartVP.SetZoom( null, 'N', 0.0 );
      
      /* Query the actual time span: set it to the extent of the data 
         accumulated in the chart's buffer, plus a few extra seconds
         at the end to show a few updates without scrolling the chart.
      */
      let min_max =
        this.Chart.GetChartDataExtent( null, /* x extent */ true, false );
      this.TimeSpan = ( min_max.max - min_max.min + this.GetExtraSeconds() );
      this.TimeSpan = Math.floor( this.TimeSpan );   // Make it an int.
   }
   
   /* Turn on data filtering for large spans. FilterType and FilterPrecision
      attributes of all plots are constrained, so that they may be set in one
      place, on one plot.
   */
   if( span_index > 1 )
   {
      /* Agregate multiple data samples to minimize a number of data points 
         drawn per each horizontal FilterPrecision interval.
         Show only one set of MIN/MAX values per each pixel interval. 
         An averaging data filter is also available.
      */
      this.Plot[0].SetDResource( "FilterType",
                            GLG.GlgChartFilterType.MIN_MAX_FILTER );
      this.Plot[0].SetDResource( "FilterPrecision", 1.0 );
   }
   else
     this.Plot[0].SetDResource( "FilterType",
                                GLG.GlgChartFilterType.NULL_FILTER );

   /* Display the filter state in the drawing. */
   this.ChartVP.SetSResource( "DataFilterState",
                              span_index > 1 ? "ON" : "OFF" );
   
   /* Erase major ticks if showing month labels in the middle of the month 
      interval in the CALENDAR mode. */
   this.Chart.SetDResource( "XAxis/MajorTickSize",
                            ( in_the_middle ? 0.0 : 10.0 ) );
   this.Chart.SetDResource( "XAxis/LabelOffset",
                            ( in_the_middle ? 10.0 : 0.0 ) );
   
   /* Display the number of data points visible in all three lines in the 
      current time span.
   */
   num_vis_points = this.TimeSpan / sampling_interval * NUM_PLOTS;
   num_vis_points = Math.floor( num_vis_points );   // Make it an int.
   
   /* Must be divisible by NUM_PLOTS */
   num_vis_points = Math.floor( num_vis_points / NUM_PLOTS ) * NUM_PLOTS;
   num_vis_points = Math.min( num_vis_points, BUFFER_SIZE * NUM_PLOTS );
   this.ChartVP.SetDResource( "NumDataPointsVisible", num_vis_points );
   
   /* Change time and tooltip formatting to match the demo mode and the 
      selected span. */
   this.SetTimeFormats();
   
   this.SetMarkerSize();   /* Decrease marker size for large spans. */

   if( update_chart )
     this.ChartVP.Update();
}

//////////////////////////////////////////////////////////////////////////
// Changes labels in the span selection buttons when switching between 
// the REAL_TIME, HISTORICAL and CALENDAR modes.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetSelectorLabels = function()
{
   const NUM_SPAN_OPTIONS = 4;

   let label;
   for( let i=0; i<NUM_SPAN_OPTIONS; ++i )
   {
      switch( this.Mode )
      {
       case REAL_TIME:
         switch( i )
         {
          case 0: label = "10 sec"; break;
          case 1: label = "1 min";  break;
          case 2: label = "10 min"; break;
          case 3: label = "All";    break;           
          default: AppError( "Invalid span index" ); return;
         }
         break;
         
       case HISTORICAL:
         switch( i )
         {
          case 0: label = "1 hour"; break;
          case 1: label = "8 hours";  break;
          case 2: label = "24 hours"; break;
          case 3: label = "1 week";    break;           
          default: AppError( "Invalid span index" ); return;
         }
         break;
         
       case CALENDAR:
         switch( i )
         {
          case 0: label = "1 month"; break;
          case 1: label = "1 quarter";  break;
          case 2: label = "1 year"; break;
          case 3: label = "10 years";    break;           
          default: AppError( "Invalid span index" ); return;
         }
         break;
         
       default: AppError( "Invalid mode" ); return;
      }

      if( this.IsMobile )
      {
         // Set span button labels in HTML.
         SetElementLabel( this.GLG_div_name + "_SpanButton" + i, label );
      }
      else        
      {
         // Set span button labels in the drawing.
         let res_name = "SpanSelector/Button" +  i;
         let button = this.Drawing.GetResourceObject( res_name );      
         button.SetSResource( "LabelString", label );
      }
   }
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.StoreInitialYRanges = function()
{
   /* In this demo, each plot is associated with the corresponding axis by
      setting the plot's LinkedAxis property in the drawing file. When a 
      plot is linked to an axis, the plot and the axis use the same Y range, 
      
      We are using an Intermediate API to access Y axes here for convenience.
      Alternatively, Y axes' resources can be accessed by their resource 
      names via the Standard API, for example:
      "ChartVP/Chart/YAxisGroup/YAxis#0/Low"
   */
   for( let i=0; i<NUM_Y_AXES; ++i )
   {
      this.Min[i] = this.YAxis[i].GetDResource( "Low" );
      this.Max[i] = this.YAxis[i].GetDResource( "High" );
   }
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.RestoreInitialYRanges = function()
{
   /* In this demo, each plot is associated with the corresponding axis by
      setting the plot's LinkedAxis property in the drawing file. When a plot
      is linked to an axis, changing the plot's and axis' ranges may be done
      by changing ranges of just one object: either a plot or its linked 
      axis. If a plot is not linked to an axis, its range may be different.
   */
   for( let i=0; i<NUM_Y_AXES; ++i )
   {
      this.YAxis[i].SetDResource( "Low",  this.Min[i] );
      this.YAxis[i].SetDResource( "High", this.Max[i] );
   }
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.ZoomToMode = function()
{
   let zoom_mode = this.ChartVP.GetDResource( "ZoomToMode" );
   return ( zoom_mode != 0 );
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.AbortZoomTo = function()
{
   if( this.ZoomToMode() )
   {
      /* Abort zoom mode in progress. */
      this.ChartVP.SetZoom( null, 'e', 0.0 ); 
      this.ChartVP.Update();
   }
}

//////////////////////////////////////////////////////////////////////////
// Demonstrates different styles of Y axis label positioning.
//
// This is usually done by configuring the chart in the GlgBuilder.
// This code just toggles through a few options via an API.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.ChangeYAxisLabelType = function( new_type )
{
   const NUM_LABEL_TYPES = 4;

   let label0, label1, label2;
   let offset_labels;
   let text_direction;      
   let label_anchoring; /* Label anchoring relatively to its control point. */
   let label_position;  /* Label position relatively to its axis. */

   if( new_type < 0 )              /* Toggle through the values. */   
   {
      ++this.YAxisLabelType;
      if( this.YAxisLabelType >= NUM_LABEL_TYPES )
        this.YAxisLabelType = 0;
   }
   else
     this.YAxisLabelType = new_type;    /* Use the supplied value. */
   
   switch( this.YAxisLabelType )
   {
    case 0:
      label0 = "Var1"; 
      label1 = "Var2"; 
      label2 = "Var3"; 
      text_direction = GLG.GlgTextDirection.HORIZONTAL_TEXT;

      /* Position and anchor axis labels at the center of each axis in the
         horizontal direction. */
      label_position =
        ( GLG.GlgAnchoringType.HCENTER | GLG.GlgAnchoringType.VTOP );
      label_anchoring =
        ( GLG.GlgAnchoringType.HCENTER | GLG.GlgAnchoringType.VBOTTOM );
      offset_labels = false;
      break;

    case 1:
      label0 = "Var1"; 
      label1 = "Var2"; 
      label2 = "Var3"; 
      text_direction = GLG.GlgTextDirection.VERTICAL_ROTATED_LEFT;
      
      /* Position and anchor axis labels at the center of each axis in the
         horizontal direction. */
      label_position =
        ( GLG.GlgAnchoringType.HCENTER | GLG.GlgAnchoringType.VTOP );
      label_anchoring =
        ( GLG.GlgAnchoringType.HCENTER | GLG.GlgAnchoringType.VBOTTOM );
      offset_labels = false;
      break;

    case 2:
      label0 = "Variable 1"; 
      label1 = "Variable 2"; 
      label2 = "Variable 3"; 
      text_direction = GLG.GlgTextDirection.HORIZONTAL_TEXT;

      /* Position and anchor axis labels on the left edge of each axis in 
         the horizontal direction. */
      label_position =
        ( GLG.GlgAnchoringType.HLEFT | GLG.GlgAnchoringType.VTOP );
      label_anchoring =
        ( GLG.GlgAnchoringType.HLEFT | GLG.GlgAnchoringType.VBOTTOM );
      offset_labels = true;
      break;
      
    case 3:
      label0 = "Var1"; 
      label1 = "Var2"; 
      label2 = "Var3"; 
      text_direction = GLG.GlgTextDirection.VERTICAL_ROTATED_LEFT;
      /* Position and anchor axis labels at the center of each axis in the
         vertical direction. */      
      label_position =
        ( GLG.GlgAnchoringType.HLEFT | GLG.GlgAnchoringType.VCENTER );
      label_anchoring =
        ( GLG.GlgAnchoringType.HRIGHT | GLG.GlgAnchoringType.VCENTER );
      offset_labels = false;
      break;
      
    default:
      AppError( "Wrong type" ); 
      this.YAxisLabelType = 0; 
      return;
   }
   
   this.YAxis[0].SetSResource( "AxisLabel/String", label0 );
   this.YAxis[1].SetSResource( "AxisLabel/String", label1 );
   this.YAxis[2].SetSResource( "AxisLabel/String", label2 );

   /* Set text direction for all labels using the % wildcard. */
   this.Chart.SetDResource( "YAxisGroup/YAxis#%/AxisLabel/TextDirection",
                            text_direction );

   if( offset_labels )
   {
      for( let i=0; i<3; ++i )
        /* Set increasing Y offsets. */
        this.YAxis[i].SetGResource( "AxisLabelOffset",
                                    0.0, 32.0 - i * 13, 0.0 );
   }
   else    /* Set all Y offsets = 10 using the % wildcard. */
     this.Chart.SetGResource( "YAxisGroup/YAxis#%/AxisLabelOffset",
                              0.0, 10.0, 0.0 );
   
   /* Set position and anchoring of all labels using the % wildcard. */
   this.Chart.SetDResource( "YAxisGroup/YAxis#%/AxisLabelPosition",
                            label_position );
   this.Chart.SetDResource( "YAxisGroup/YAxis#%/AxisLabelAnchoring",
                            label_anchoring );

   /* Position the second label at the bottom of the axis for horizontal 
      labels.
   */
   if( this.YAxisLabelType == 0 )
   {
      this.YAxis[1].SetDResource( "AxisLabelPosition",
                                  ( GLG.GlgAnchoringType.HCENTER |
                                    GLG.GlgAnchoringType.VBOTTOM ) );
      this.YAxis[1].SetDResource( "AxisLabelAnchoring", 
                                  ( GLG.GlgAnchoringType.HCENTER |
                                    GLG.GlgAnchoringType.VTOP ) );
      this.YAxis[1].SetGResource( "AxisLabelOffset", 0.0, -20.0, 0.0 );
   }
   
   /* Adjusts the space taken by the Y axes to accomodate different axis 
      label layouts.
   */
   this.AdjustYAxisSpace();
}

//////////////////////////////////////////////////////////////////////////
// Returns data sample querying interval (in sec.) depending on the demo 
// mode.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.GetSampleInterval = function()
{
   switch( this.Mode )
   {
    case REAL_TIME:
      return UPDATE_INTERVAL / 1000.0;  /* Update interval is in millisec. */
      
    case HISTORICAL:
      /* Historical data are sampled once per minute. */
      return HISTORICAL_DATA_INTERVAL;
      
    case CALENDAR:
      /* Sample calendar data twice per day. 
         libc can not go back beyond 1900 - only ~40K days.
         If sampling once per day, limit BufferSize to 40K.
      */
      return DAY / 2;
      
    default: AppError( "Invalid mode" ); return 100.0;
   }
}

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.PreFillChartData = function()
{
   if( !this.Active )
     return;
   
   let
     current_time, start_time, end_time,
     num_seconds, dt;
     
   current_time = GetCurrTime();
   
   /* Roll back by the amount corresponding to the buffer size. */
   dt = this.GetSampleInterval();
   num_seconds = BUFFER_SIZE * dt;
      
   if( this.Mode == REAL_TIME )
     num_seconds += 1.0;  /* Add an extra second to avoid rounding errors. */
   
   start_time = current_time - num_seconds;
   end_time = 0.0;        /* Stop at the current time. */

   for( let i=0; i<NUM_PLOTS; ++i )
     this.FillHistData( i, start_time, end_time );

   /* Remove the message. */
   this.ChartVP.SetDResource( "PreFillMessage/Visibility", 0.0 );

   // Handle chart autoscale if any.
   this.Chart.UpdateChartState( null, GLG.GlgChartState.CHART_AUTOSCALE_STATE );
    
   this.ScrollToDataEnd( MOST_RECENT, false );

   if( this.IsMobile )
     /* In the mobile version, erase the info text at the top of the chart
        to free space.
     */
     this.Drawing.SetDResource( "ChartViewport/InfoLabel/Visibility", 0 );

   this.Drawing.Update();
   this.WaitForPrefill = false;
}

//////////////////////////////////////////////////////////////////////////
// Prefills the chart with data using simulated data. In a real application,
// data will be coming from an application-specific data source.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.FillHistData = function( plot_index, start_time, end_time )
{
   let check_curr_time;

   /* Demo: generate demo pre-fill data with the same frequency as the 
      UPDATE_INTERVAL (in millisec). In an application, data will be queried
      from a real data source, returning an array of data points.
   */
   let dt = this.GetSampleInterval();

   if( end_time == 0.0 )
   {
      check_curr_time = true;
      end_time = GetCurrTime();
   }
   else
     check_curr_time = false;
   
   /* When prefilling up to the current time, use the result of 
      GetCurrTime() as the loop's end condition and check it after
      each iteration to account for the time it takes to prefill 
      the chart.
   */
   for( let time_stamp = start_time; 
        time_stamp < end_time || ( check_curr_time &&
                                   time_stamp < GetCurrTime() );
        time_stamp += dt )
   {
      this.GetDemoData( plot_index, this.data_point );
      this.GetDemoData( plot_index, this.data_point );
      
      /* Set the time stamp. */
      this.data_point.time_stamp = time_stamp;
      this.data_point.has_time_stamp = true;
      
      this.PushPlotPointDirect( plot_index, this.data_point );
   }
}

//////////////////////////////////////////////////////////////////////////
// Supplies demo data, including the plot's value, an optional time stamp
// and an optional sample_valid flag, as well as visibility of a mraker used
// to annotate some data pooints. 
//
// In a real application, data will be coming from an application-specific 
// data source.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.GetDemoData = function( plot_index, data_point )
{
   this.GetDemoPlotValue( plot_index, data_point ); /* Fills a value to plot. */
   
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

/* Constants used for simulating data displayed in the chart. */
const MAX_COUNTER = 50000;
const PERIOD = 1000;
const SPIKE_DURATION_RT = 25;
const SPIKE_DURATION_HS = 8;
const APPROX_PERIOD = 100;

//////////////////////////////////////////////////////////////////////////
// DATA SIMULATION: Supplies plot values for the demo; also sets
// data_point.has_marker field to annotate some data points with a marker.
//
// In a real application, data will be coming from an application-specific 
// data source.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.GetDemoPlotValue = function( plot_index, data_point )
{
   let
     value, alpha, period, 
     spike_sign, spike_height;   
   let spike_duration;
   
   /* First time: init plot's state counters used to simulate data. */
   if( this.PlotCounter == null )
   {
      this.PlotCounter = new Array( NUM_PLOTS );
      for( let i=0; i<NUM_PLOTS; ++i )
        this.PlotCounter[ i ] = 0;
   }

   alpha = 2.0 * Math.PI * this.PlotCounter[ plot_index ] / PERIOD;
   switch( plot_index )
   {
    case 0:      
      if( this.Mode == REAL_TIME )        
        value = 5.0 + 1.5 * Math.sin( alpha / 5.0 ) + Math.sin( 2.0 * alpha );
      else               
      {
         this.last_value += GLG.Rand( 0.0, 0.01 ) * this.increment_sign;
         this.last_value2 += GLG.Rand( 0.0, 0.03 ) * this.increment_sign2;
         
         value = this.last_value + this.last_value2;
         
         if( GLG.Rand( 0.0, 1000.0 ) > 995.0 )
           this.increment_sign *= -1;

         if( GLG.Rand( 0.0, 1000.0 ) > 750.0 )
           this.increment_sign2 *= -1;
         
         if( value > 6.2 )
           this.increment_sign2 = -1.0;
         else if( value < 3.8 )
           this.increment_sign2 = 1.0;
      }
      
      /* Add a spike */
      spike_height = 0;
      spike_duration =
        ( this.Mode == REAL_TIME ? SPIKE_DURATION_RT : SPIKE_DURATION_HS );

      if( this.spike_counter >= spike_duration * 3 )
      {
         if( GLG.Rand( 0.0, 1000.0 ) > 990.0 ) 
         {
            /* Start a spike */
            this.spike_counter = 0;
            spike_sign = ( GLG.Rand( 0.0, 10.0 ) > 4.0 ? 1.0 : -1.0 );
            this.max_spike_height =
              spike_sign * GLG.Rand( 0.0, this.Mode == REAL_TIME ? 1.0 : 0.5 );
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
      if( this.change_counter != 0 )
      {
         --this.change_counter;
         
         if( this.change_counter == 0 )
         {            
            this.state = ( this.state == 0 ? 1 : 0 );   /* Change the state */
            
            /* Time of the next change */
            this.change_counter = GLG.Rand( 10.0, 100.0 );
            this.change_counter =
              Math.floor( this.change_counter ); // Make it an int.
         }
      }
      
      value = this.state;
      break;
      
    case 2:
      if( this.Mode == REAL_TIME )
      {
         period = ( 0.95 + 0.05 * Math.abs( Math.sin( alpha / 10.0 ) ) ); 
         value = 8.3 + Math.sin( 30.0 * period * alpha ) * 
           Math.sin( Math.PI / 8.0 + alpha );
         value *= 10.0;
      }
      else
      {
         value = this.last_value3 + this.last_direction * 0.1 * 
           ( 1.0 - Math.cos( 2.0 * Math.PI * this.approx_counter / APPROX_PERIOD ) );
            
         this.last_value3 = value;
         if( this.Mode == HISTORICAL )
           this.approx_counter += 3;
         else
           this.approx_counter += 1;
         
         if( ( this.last_direction < 0.0 &&
               value < 0.6  * this.Max[ plot_index ] ) ||
             ( this.last_direction > 0.0 &&
               value > 0.95 * this.Max[ plot_index ] ) ||
             GLG.Rand( 0.0, 1000.0 ) > 900.0 )
         {
            this.last_direction *= -1;
            this.approx_counter = 0;
         }
      }
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

//////////////////////////////////////////////////////////////////////////
// Sets the display mode: REAL_TIME, HISTORICAL or CALENDAR.
// If invoked with mode=-1, switch the mode between all three demo mode.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetMode = function( mode )
{
   this.SelectPlot( null );   /* Unselect a previously selected plot, if any. */
   
   if( mode >= 0 )
     this.Mode = mode;   /* Set to the specified mode. */
   else    /* Negative value: switch between all modes. */
   {
      ++this.Mode;
      if( this.Mode > CALENDAR )
        this.Mode = REAL_TIME;
   }
   
   switch( this.Mode )
   {
    case REAL_TIME:      
      this.SpanIndex = 1;
      this.AutoScroll = 1; 

      this.StartUpdateTimer();  // Start timer to update data in REAL_TIME mode.
      break;

    case HISTORICAL:
    case CALENDAR:      
      this.SpanIndex = ( this.Mode == HISTORICAL ? 2 : 3 );
      this.AutoScroll = 0;
      // No data updates in HISTORICAL and CALENDAR modes.
      this.StopUpdateTimer();
      break;
      
    default: AppError( "Invalid mode" ); return;
   }
   
   /* Disable "Toggle AutoScroll" button and AutoScroll checkbox 
      in HISTORICAL and CALENDAR modes.
   */
   this.Drawing.SetDResource( "ToggleAutoScroll/HandlerDisabled",
                              ( this.Mode != REAL_TIME ? 1.0 : 0.0 ) );
   EnableElement( this.GLG_div_name + "_auto_scroll", this.Mode == REAL_TIME )
   
   /* Disable AutoScroll in non-real-time modes. */
   this.ChangeAutoScroll( this.AutoScroll );
   
   this.SetSelectorLabels();
   this.SetChartSpan( this.SpanIndex, false );
   this.RestoreInitialYRanges();
   
   /* Erase the step plot and its axis in the CALENDAR mode. */
   let enabled = ( this.Mode == CALENDAR ? 0.0 : 1.0 );
   this.YAxis[1].SetDResource( "Visibility", enabled );
   this.Plot[1].SetDResource( "Enabled", enabled );
   this.Chart.SetDResource( "Levels/Level#0/Enabled", enabled );
   this.Chart.SetDResource( "Levels/Level#1/Enabled", enabled );
   this.AdjustYAxisSpace();

   /* Clear all accumulated data samples: the data will be refilled 
      according to the new display mode.
   */
   this.Chart.ClearDataBuffer( null );
   
   /* Switch DemoMode. */

   // Set Change Mode button label in HTML.
   let label;
   switch( this.Mode )
   {
    case REAL_TIME:  label = "Change to Historical"; break;
    case HISTORICAL: label = "Change to Calendar"; break;
    case CALENDAR:   label = "Change to Real-Time"; break;
    default:         label = "Unknown demo mode"; break;
   }
   SetElementLabel( this.GLG_div_name + "_chart_mode", label );

   /* Set the DemoMode button label in the drawing, which is present only in 
      the desctop version. It will automatically update the title string that
      is controlled by mode as well.
   */
   if( !this.IsMobile )
     this.Drawing.SetDResource( "DemoMode/Mode", this.Mode );
   else
     // Set title label in the drawing.
     this.Drawing.SetDResource( "ChartViewport/Title/Mode", this.Mode );
     
   /* In the real-time mode pre-fill chart data only if PREFILL_DATA=true.
      Always prefill in the historical and calendar mode.
   */
   if( this.Mode != REAL_TIME || PREFILL_DATA )
   {
      /* Display "Pre-filling the chart" message. */
      this.ChartVP.SetDResource( "PreFillMessage/Visibility", 1.0 );
      this.ChartVP.Update();
      
      /* Invoke PreFillChartData on a timer, to let the browser to show the 
         chart first.
      */
      setTimeout( ()=>this.PreFillChartData(), 50 );
      this.WaitForPrefill = true;
   }
   else
   {
      this.ScrollToDataEnd( MOST_RECENT, false );

      /* Erase prefill message. */
      this.ChartVP.SetDResource( "PreFillMessage/Visibility", 0.0 );
      this.WaitForPrefill = false;
   }
}

//////////////////////////////////////////////////////////////////////////
// Sets the formats of time labels and tooltips depending on the demo mode
// and the selected time span.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetTimeFormats = function()
{
   let time_label_format, time_tooltip_format, chart_tooltip_format;

   /* No additional code is required to use the defaults defined in the 
      drawing. This elaborate example illustrates advanced options for 
      customizing label and tooltip formatting when switching between 
      time spans and data display modes modes.
      
      For an even greater control over labels and tooltips, an application 
      can define custom Label and Tooltip formatters that will supply 
      custom strings for axis labels and tooltips.
   */
   
   switch( this.Mode )
   {
    case REAL_TIME:
      /* See strftime() for all time format options. */
      time_label_format = "%X%n%x"; 

      time_tooltip_format =
        "Time: <axis_time:%X> +0.<axis_time_ms:%03.0lf> sec.\nDate: <axis_time:%x>";
      
      /* <sample_time:%s> inherits time format from the X axis. */
      chart_tooltip_format =
        "<plot_string:%s> Value= <sample_y:%.2lf>\n<sample_time:%s>";
      break;
      
    case HISTORICAL:
      /* See strftime() for all time format options. */
      time_label_format = "%R%n%e %b %Y";
      
      time_tooltip_format = "Time: <axis_time:%c>";
      chart_tooltip_format =
        "<plot_string:%s> Value= <sample_y:%.2lf>\nTime: <sample_x_time:%c>";
      break;
      
    case CALENDAR:
      /* See strftime() for all time format options. */
      if( this.SpanIndex == 0 || this.SpanIndex == 1 )  // 1 month or 1 quarter
      {
         /* Include day of month. */
         time_label_format = "%e %b\n%Y";
         time_tooltip_format =
           "Date: <axis_time:%a> <axis_time:%d> <axis_time:%b> <axis_time:%Y>";
         chart_tooltip_format =
           "<plot_string:%s> Value= <sample_y:%.2lf>\nDate: <sample_x_time:%a> <sample_x_time:%d> <sample_x_time:%b> <sample_x_time:%Y>";
      }
      else    /* SpanIndex == 2 or 3 :   1 year or 10 years */
      {
         /* Exclude day of month. */
         time_tooltip_format =
           "Date: <axis_time:%d> <axis_time:%b> <axis_time:%Y>";
         chart_tooltip_format =
           "<plot_string:%s> Value= <sample_y:%.2lf>\nDate: <sample_x_time:%d> <sample_x_time:%b> <sample_x_time:%Y>";
         
         if( this.SpanIndex == 2 )      /* 1 year */
         {
            /* Display only month + short year in time labels. */
            time_label_format = "%b\n%Y";
         }
         else    /* SpanIndex == 3 : 10 years */
         {
            /* Display only year in labels. */
            time_label_format = "%Y";
         }
      } 
      break;
      
    default: AppError( "Invalid mode" ); return;
   }
   
   /* Set time label and tooltip formats. */
   this.Chart.SetSResource( "XAxis/TimeFormat", time_label_format );
   this.Chart.SetSResource( "XAxis/TooltipFormat", time_tooltip_format );
   this.Chart.SetSResource( "TooltipFormat", chart_tooltip_format );
}

//////////////////////////////////////////////////////////////////////////
// The chart layout and Y axis space may be configured interactively in
// the Graphics Builder.
//
// This function adjusts the space taken by the Y axes at run time when a 
// number of displayed Y axes and/or their label layout changes. 
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.AdjustYAxisSpace = function()
{
   let axis_offset, label_offset;
   
   if( this.Mode == CALENDAR )
   {
      /* Only two axes are displayed in non-CALENDAR modes. */     
      axis_offset = -25.0;
      
      /* YAxisLabelType == 3 needs extra space to position labels for 
         two axes.
      */
      label_offset = ( this.YAxisLabelType == 3 ? 30.0 : 0.0 );
   }
   else
   {
      /* All three axes are displayed in non-CALENDAR modes. */
      axis_offset = 0.0;
      
      /* YAxisLabelType == 3 needs extra space to position labels for three
         axes. */
      label_offset = ( this.YAxisLabelType == 3 ? 45.0 : 0.0 );
   }

   this.ChartVP.SetDResource( "OffsetLeft", axis_offset + label_offset );
}

//////////////////////////////////////////////////////////////////////////
// Decreases marker size for large spans.
//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetMarkerSize = function()
{

   let marker_size = ( this.SpanIndex < 2 ? 7.0 : 5.0 );
   this.Plot[0].SetDResource( "Marker/MarkerSize", marker_size );
   
   /* Enable smoother sub-pixel scrolling of markers. */
   this.Plot[0].SetDResource( "Marker/AntiAliasing", 
                              GLG.GlgAntiAliasingType.ANTI_ALIASING_DBL );
}

//////////////////////////////////////////////////////////////////////////////
// Increase size of the value selection label in the HTML version.
//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.IncreaseSelectionLabelSize = function()
{
   /* Increase label font size. */
   this.ChartVP.SetDResource( "SelectionLabel/FontSize", 2. );

   /* Increase space the label is displayed in. */
   AdjustOffset( this.ChartVP, "Chart/OffsetTop", 5. );
   AdjustOffset( this.ChartVP, "LegendObject/LegendYOffset", -5. );
}

//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.AdjustForMobileDevices = function()
{
   if( this.is_mobile )
   {
      if( !this.IsMobile )
        /* Decrease toolbar height if non-mobile version is displayed on mobile
           devices.
        */
        this.Drawing.SetDResource( "ToolbarHeight", 25. );
   }
   else   /* !SetDrawingSize.is_mobile */
     if( this.IsMobile )
       /* Increase toolbar height if mobile version is displayed on desktop. */
       this.Drawing.SetDResource( "ToolbarHeight", 60. );
}    

//////////////////////////////////////////////////////////////////////////////
// Adjusts the specified offset by a requested amount.
//////////////////////////////////////////////////////////////////////////////
function AdjustOffset( /* GlgObject */ object, /* String */ offset_name,
                       /* double */ adjustment )
{
   let value = object.GetDResource( offset_name );   /* double */
   value += adjustment;
   object.SetDResource( offset_name, value );
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 700 / 600;
   
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
GlgRTChart.prototype.SetCanvasResolution = function()
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

//////////////////////////////////////////////////////////////////////////
function ShowElement( name, state )
{
   let element = document.getElementById( name );
   if( element != null )
     element.style.display = ( state ? "inline-block" : "none" );
}

//////////////////////////////////////////////////////////////////////////
function CheckElement( name, state )
{
   let element = document.getElementById( name );
   if( element != null )
     element.checked = state;
}

//////////////////////////////////////////////////////////////////////////
function EnableElement( name, state )
{
   let element = document.getElementById( name );
   if( element != null )
     element.disabled = !state;
}

//////////////////////////////////////////////////////////////////////////
function SetElementLabel( name, label )
{
   let element = document.getElementById( name );
   if( element != null )
     element.innerHTML = label;
   else
     AppError( "Can't find element: " + name );
}

//////////////////////////////////////////////////////////////////////////////
// Changes action to be performed on touch move on mobile devices.
//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.SetTouchAction = function()
{
   let id = this.GLG_div_name + "_scroll_mode";
   let scroll_mode_elem = document.getElementById( id );
   if( scroll_mode_elem )     
     this.ScrollMode = scroll_mode_elem.checked;
   else
     AppError( "Can't find element: " + id );
}

//////////////////////////////////////////////////////////////////////////
function GetCurrTime()
{
   return Date.now() / 1000;    // seconds
}   

//////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.StartUpdateTimer = function()
{
   this.UpdateTimer = setTimeout( ()=>this.UpdateChart(), UPDATE_INTERVAL );
}

GlgRTChart.prototype.StopUpdateTimer = function()
{
   if( this.UpdateTimer != null )
   {
      clearTimeout( this.UpdateTimer );
      this.UpdateTimer = null;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Loads any assets required by the application and invokes the specified
// callback when done.
// Alternatively, the application drawing can be loaded as an asset here
// as well, so that it starts loading without waiting for the other assets 
// to finish loading.
//////////////////////////////////////////////////////////////////////////////
GlgRTChart.prototype.LoadAssets = function( callback, user_data )
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
GlgRTChart.prototype.AssetLoaded = function( glg_object, data, path )
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
function AppAlert( message )
{
   window.alert( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppError( message )
{
   console.error( message );
}
