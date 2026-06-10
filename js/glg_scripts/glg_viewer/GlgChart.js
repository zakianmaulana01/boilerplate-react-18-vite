/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined, GetCurrTime } from './Utils.js'

// Update interval in msec.
const CHART_UPDATE_INTERVAL = 100; 

// Convenient time span constants.
const  ONE_MINUTE = 60;
const  ONE_HOUR   = 3600;
const  ONE_DAY    = 3600 * 24;
    
/* Prefill time interval, specifies amount of data to prefill in the 
   real time chart. 
*/
let PREFILL_SPAN = ONE_HOUR * 8;

/* Constants for scrolling the chart to the beginning or the end of 
   the time range.
*/
const DONT_CHANGE  = 0;
const MOST_RECENT  = 1;  /* Make the most recent data visible. */
const LEAST_RECENT = 2;  /* Make the least recent data visible.*/

// Index of the initial span to display.
const INIT_SPAN = 0;    

/* If set to true, the chart's data buffer is prefilled with historical data
   on start-up.
*/ 
const PREFILL_DATA = true;     

//////////////////////////////////////////////////////////////////////////////
export function RTChartPage( glg_viewer, /*GlgObject*/ top_viewport )
{
   this.Viewer = glg_viewer;
   
   this.MainViewport = top_viewport;  /* Top viewport */
   
   // Viewport containing the Chart object.
   this.ChartVP = null;          /* GlgObject */

   // An array of plot objects.
   this.PlotArray = null;        /* GlgObject[] */

   // Number of plots.
   this.NumPlots = 0;            /* int */
    
   // Number of Y axes.
   this.NumYAxes = 0;            /* int */

   // Arrays storing low and high ranges for all Y axes.
   this.Low = null;             /* double[] */
   this.High = null;            /* double[] */

   // Toolbar object inside the chart drawing.
   this.Toolbar = null;         /* GlgObject */

   // Index of the currently displayed time span.
   this.SpanIndex = INIT_SPAN; 

   this.TimeSpan = 0;           // Time axis span in sec.

   // Current auto-scroll state: enabled(1) or disabled(0).
   this.AutoScroll = 1;         /* int */

   // Stored AutoScroll state to be restored if ZoomTo is aborted.
   this.StoredScrollState = 0;  /* int */
}

//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.Setup = function()   
{
   // Set targeted update interval for the timer.
   this.Viewer.UpdateInterval = CHART_UPDATE_INTERVAL;
    
   // Initialization before hierarchy setup.
   this.InitChartBeforeH();

   // Setup object hierarchy in the drawing.
   this.MainViewport.SetupHierarchy();

   // Initialization after hierarchy setup.
   this.InitChartAfterH();
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarhy setup.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.InitChartBeforeH = function()
{
   // Add Input and Trace callbacks.
   this.MainViewport.AddListener( GLG.GlgCallbackType.INPUT_CB, 
                                  this.ChartInputCallback.bind( this ) );

   this.MainViewport.AddListener( GLG.GlgCallbackType.TRACE_CB, 
                                  this.ChartTraceCallback.bind( this ) );

   // Retrieve object ID of the Toolbar viewport.
   this.Toolbar = this.MainViewport.GetResourceObject( "Toolbar" );

   // Retrieve ChartViewport and the Chart object.
   this.ChartVP = this.MainViewport.GetResourceObject( "ChartViewport" );
    
   // Retrieve the Chart object.
   this.Chart = this.ChartVP.GetResourceObject( "Chart" );

   // Retrieve the number of plots defined in the drawing.
   this.NumPlots = Math.trunc( this.Chart.GetDResource( "NumPlots" ) );
    
   // Retrieve the number of Y axes defined in the drawing.
   this.NumYAxes = Math.trunc( this.Chart.GetDResource( "NumYAxes" ) );
    
   // Enable AutoScroll, both for the toggle button and the chart.
   this.ChangeAutoScroll( 1 );
    
   /* Set Chart Zoom mode. It was set and saved with the drawing, 
      but do it again programmatically just in case.
   */
   this.ChartVP.SetZoomMode( null, this.Chart, null,
                             GLG.GlgZoomMode.CHART_ZOOM_MODE );
    
   /* Uncomment the line below to override XAxis label TimeFormat 
      defined in the drawing. "%T" displays time without a date.
   */
   //this.Chart.SetSResource( "XAxis/TimeFormat", "%T" );
}

//////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.InitChartAfterH = function()
{
   // Allocate PlotArray and store object IDs for each plot. 
   this.PlotArray = new Array( this.NumPlots );
      
   let plot_array = this.Chart.GetResourceObject( "Plots" );  /* GlgObject  */
   for( let i=0; i < this.NumPlots; ++i )
     this.PlotArray[i] = plot_array.GetElement( i ); 
    
   /* Store initial range for each Y axis to restore on zoom reset. 
      Assumes that plots are linked with the corresponding axes in the 
      drawing.
   */         
   this.Low = new Array( this.NumYAxes );    /* double[] */
   this.High = new Array( this.NumYAxes );   /* double[] */
    
   let axis_array =
     this.Chart.GetResourceObject( "YAxisGroup" ); /* GlgObject */
   for( let i=0; i < this.NumYAxes; ++i )
   {
      let axis = axis_array.GetElement( i );   /* GlgObject */
      this.Low[ i ] = axis.GetDResource( "Low" );
      this.High[ i ] = axis.GetDResource( "High" );
   }
    
   // Set chart's time span on the X axis.
   this.SetChartSpan( this.SpanIndex );
    
   /* Prefill chart's history buffer with data for a specified number 
      of seconds.
   */
   if( PREFILL_DATA )
     FillChartHistory( this.Viewer, this.Chart, PREFILL_SPAN,
                       this.Viewer.RandomData );
}

//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.Cleanup = function()
{
   // Add any custom cleanup code here.
}

////////////////////////////////////////////////////////////////////////////// 
// Pre-fill the graph's history buffer with data. 
////////////////////////////////////////////////////////////////////////////// 
export function FillChartHistory( glg_viewer, /*GlgObject*/ chart,
                                  /*int*/ prefill_span )
{
   if( chart == null )
     return;

   glg_viewer.NumPrefilledPlots = 0;
         
   let current_time = GetCurrTime();   /* double */
    
   /* Fill the amount of data requested by the PREFILL_SPAN, up to the 
      available chart's buffer size defined in the drawing.
      Add an extra second to avoid rounding errors.
   */
   let num_seconds = prefill_span + 1;  /* int */
    
   let buffer_size =     /* int */
     Math.trunc( chart.GetDResource( "BufferSize" ) );
   if( buffer_size < 1 )
     buffer_size = 1;
    
   let max_num_samples;   /* int */
   if( glg_viewer.RandomData )
   {
      // In random demo data mode, simulate data stored once per second.
      let samples_per_second = 1.0;   /* double */
      max_num_samples = Math.trunc( num_seconds * samples_per_second );
        
      if( max_num_samples > buffer_size )
        max_num_samples = buffer_size;
   }
   else
     max_num_samples = buffer_size;
    
   // Start and end time for the data query.
   let start_time = current_time - num_seconds;   /* double */
   let end_time = current_time;     /* double : Stop at the current time. */

   let num_plots = Math.trunc( chart.GetDResource( "NumPlots" ) ); /*int*/
   let plots = chart.GetResourceObject( "Plots" );

   let plot;               /* GlgObject */
   let tag_source;         /* String */
   for( let i=0; i<num_plots; ++i )
   {
      plot = plots.GetElement( i );     /* GlgObject */

      // Get tag source of the plot's ValueEntryPoint.
      tag_source = plot.GetSResource( "ValueEntryPoint/TagSource" );
        
      if( IsUndefined( tag_source ) )
        continue;

      let prefill_data = { viewer: glg_viewer, chart: chart, plot: plot };
      
      /* Obtain historical data for the plot. For the demo datafeed, the 
         PlotDataCB callback will be invoked synchronously inside GetPlotData().
      */
      glg_viewer.WaitForPrefill = true;
      glg_viewer.DataFeed.GetPlotData( tag_source, start_time, end_time,
                                       max_num_samples,
                                       /*callback*/ PlotDataCB,
                                       /*user data*/ prefill_data );
   }
}

////////////////////////////////////////////////////////////////////////////// 
// Fills plot with data from the provided data array.
// For increased performance of prefilling a chart with large quantities of
// data, the data are pushed into the plot via AddPlotDataSample API method
// using quick mode.
////////////////////////////////////////////////////////////////////////////// 
function PlotDataCB( /*PlotDataPoint[]*/ data_array, prefill_data )
{
   let viewer = prefill_data.viewer;
   let chart = prefill_data.chart;
   let plot = prefill_data.plot;
   
   if( data_array != null )
   {
      let size = data_array.length;
      for( let i=0; i<size; ++i )
      {
         let data_point = data_array[i];   /* PlotDataPoint */
         
         /* Push a new data sample to the plot's buffer, using quick mode to
            speed up prefilling of the chart. Break out if an error is detected.
         */
         if( !plot.AddPlotDataSample( data_point.value, data_point.time_stamp,
                                      data_point.value_valid, /*no marker*/ 0,
                                      /*quick mode*/ true ) )
           break;
      }
   }

   // Check if all chart's plots have been prefilled.
   ++viewer.NumPrefilledPlots;
   if( viewer.NumPrefilledPlots == GetNumActivePlots( chart ) )
   {
      viewer.WaitForPrefill = false;
      
      // Handle chart autoscale if any.
      chart.UpdateChartState( null, GLG.GlgChartState.CHART_AUTOSCALE_STATE );
         
      ScrollToDataEnd( chart, MOST_RECENT );

      chart.GetParentViewport( true ).Update();
   }
}

//////////////////////////////////////////////////////////////////////////////
// Returns the number of chart's plots with a valid tag source.
//////////////////////////////////////////////////////////////////////////////
function GetNumActivePlots( /*GlgObject*/ chart )  /*int*/
{   
   let num_plots = Math.trunc( chart.GetDResource( "NumPlots" ) );   
   let plots = chart.GetResourceObject( "Plots" );

   let num_active_plots = 0;
   for( let i=0; i<num_plots; ++i )
   {
      let plot = plots.GetElement( i );     /* GlgObject */

      let tag_source = plot.GetSResource( "ValueEntryPoint/TagSource" );
      if( !IsUndefined( tag_source ) )
        ++num_active_plots;
   }
   return num_active_plots;
}

//////////////////////////////////////////////////////////////////////////////
// Handle user interaction as needed.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.ChartInputCallback = function( viewport, message_obj )
{
   if( !this.Viewer.Active || this.ChartVP == null || this.Chart == null )
     return;

   let chart_vp = this.ChartVP;
   let chart = this.Chart;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );
   let subaction = message_obj.GetSResource( "SubAction" );
    
   if( format == "Button" )
   {	 
      if( action !="Activate" &&         /* Not a push button */
          action != "ValueChanged" )     /* Not a toggle button */
        return;

      // Abort ZoomTo mode, if any.
      this.AbortZoomTo();
         
      if( origin == "ToggleAutoScroll" )
      {         
         /* Set Chart AutoScroll based on the ToggleAutoScroll toggle button 
            setting.
         */
         this.ChangeAutoScroll( -1 ); 
      }
      else if( origin == "ZoomTo" )
      {
         // Start ZoomTo operation.
         chart_vp.SetZoom( null, 't', 0.0 );  
      }
      else if( origin == "ZoomReset" )
      {         
         // Set initial time span and reset initial Y ranges.
         this.SetChartSpan( this.SpanIndex );  
         this.RestoreInitialYRanges();   
      }
      else if( origin == "ScrollBack" )
      {
         this.ChangeAutoScroll( 0 );
            
         // Scroll left by 1/3 of the span.
         chart_vp.SetZoom( null, 'l', 0.33 );
      }
      else if( origin == "ScrollForward" )
      {
         this.ChangeAutoScroll( 0 );
            
         // Scroll right by 1/3 of the span.
         chart_vp.SetZoom( null, 'r', 0.33 );
      }
      else if( origin == "ScrollBack2" )
      {
         this.ChangeAutoScroll( 0 );
            
         // Scroll left by a full span.
         chart_vp.SetZoom( null, 'l', 1.0 );
      }
      else if( origin == "ScrollForward2" )
      {
         this.ChangeAutoScroll( 0 );
            
         // Scroll right by a full span.
         chart_vp.SetZoom( null, 'r', 1.0 );
      }
      else if( origin == "ZoomIn" )
      {
         // Zoom in in Y direction.
         chart_vp.SetZoom( null, 'I', 1.5 );
      }
      else if( origin == "ZoomOut" )
      {
         // Zoom out in Y direction.
         chart_vp.SetZoom( null, 'O', 1.5 );
      }
      else if( origin == "ScrollToRecent" )
      {
         // Scroll to show most recent data.
         ScrollToDataEnd( this.Chart, MOST_RECENT );
      }
        
      viewport.Update();  //format = "Button"
   }

   else if( format == "Option" )
   {
      if( action != "Select" )
        return;

      // Abort ZoomTo mode, if any.
      this.AbortZoomTo();

      /* Handle events from the SpanSelector menu allowing to select time 
         interval for the X axis.
      */
      if( origin == "SpanSelector" )    /* Span change */
      { 
         this.SpanIndex =
           Math.trunc( message_obj.GetDResource( "SelectedIndex" ) );
            
         this.SetChartSpan( this.SpanIndex );
         this.RestoreInitialYRanges(); /* Restore in case the chart was zoomed.
                                        */            
         /* Scroll to show the recent data to avoid showing an empty chart
            if user scrolls too much into the future or into the past.
         */
         let min_max =    /* GlgMinMax */
           chart.GetChartDataExtent( null, /*x extent*/ true,
                                     /*query all samples*/ false );  
            
         if( min_max != null )
         {
            let first_time_stamp = min_max.min;   /* double */
            let last_time_stamp = min_max.max;    /* double */
            let displayed_time_end =    /* double */
              chart.GetDResource( "XAxis/EndValue" );
                
            if( this.AutoScroll != 0 )
              ScrollToDataEnd( this.Chart, MOST_RECENT );
                
            else if( displayed_time_end > last_time_stamp )
              ScrollToDataEnd( this.Chart, MOST_RECENT );
                
            else if( displayed_time_end - this.TimeSpan <= first_time_stamp )
              ScrollToDataEnd( this.Chart, LEAST_RECENT );
                
            viewport.Update();
         }
      }
   }

   else if( format == "Chart" && action == "CrossHairUpdate" )
   {
      /* To avoid slowing down real-time chart updates, invoke Update() 
         to redraw cross-hair only if the chart is not updated fast 
         enough by the timer.
      */
      if( this.Viewer.UpdateInterval > 100 )
        viewport.Update();         
   }          
  
   else if( action == "Zoom" )    // Zoom events
   {
      if( subaction == "Start" )
      {
         // Store current AutoScroll state to restore it if ZoomTo is aborted.
         this.StoredScrollState = this.AutoScroll;
      }
      else if( subaction == "ZoomRectangle" )
      {
         // Stop scrolling when ZoomTo action is started.
         this.ChangeAutoScroll( 0 );
      }
      else if( subaction == "End" )
      {
         /* No additional actions on finishing ZoomTo. The Y scrollbar 
            appears automatically if needed: it is set to GLG_PAN_Y_AUTO. 
            Don't resume scrolling: it'll scroll too fast since we zoomed 
            in. Keep it still to allow inspecting zoomed data.
         */
      }
      else if( subaction == "Abort" )
      {
         // Resume scrolling if it was on.
         this.ChangeAutoScroll( this.StoredScrollState ); 
      }
        
      viewport.Update();
   }
   else if( action == "Pan" )    // Pan events
   {
      // Place custom code to handle pan or drag events.
   }
}

//////////////////////////////////////////////////////////////////////////////
// A custom trace callback for the page; is used to obtain coordinates 
// of the mouse click.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.ChartTraceCallback =
  function( /*GlgObject*/ viewport, /*GlgTraceData*/ trace_info )
{
   if( !this.Viewer.Active )
     return;

   // Process only events that occur in ChartViewport.
   if( !trace_info.viewport.Equals( this.ChartVP ) )
     return false;

   let x, y;        /* double */
    
   let event_type = trace_info.event_type;
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
      GLG.SetTouchMode();        /* Start dragging via touch events. */
      /* Fall through */
        
    case GLG.GlgEventType.TOUCH_MOVED:
      if( !GLG.GetTouchMode() )
        return;
       /* falls through */
    case GLG.GlgEventType.MOUSE_PRESSED:
    case GLG.GlgEventType.MOUSE_MOVED:
      let CoordScale = this.Viewer.CoordScale;
      x = trace_info.mouse_x * CoordScale;
      y = trace_info.mouse_y * CoordScale;
         
      /* COORD_MAPPING_ADJ is added to the cursor coordinates for precise
         pixel mapping.
      */
      x += GLG.COORD_MAPPING_ADJ;
      y += GLG.COORD_MAPPING_ADJ;
      break;

    default: return;
   }
   
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
    case GLG.GlgEventType.MOUSE_PRESSED:
      if( this.ZoomToMode() )
        return;  // ZoomTo or dragging mode in progress.
        
      /* Start dragging with the mouse on a mouse click. 
         If user clicked of an axis, the dragging will be activated in the
         direction of that axis. If the user clicked in the chart area,
         dragging in both the time and the Y direction will be activated. 
      */
      this.ChartVP.SetZoom( null, 's', 0.0 );
        
      // Disable AutoScroll not to interfere with dragging.
      this.ChangeAutoScroll( 0 ); 
      break;
        
    default: return;
   }
}

//////////////////////////////////////////////////////////////////////////////
// Change chart's AutoScroll mode.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.ChangeAutoScroll = function( /*int*/ new_value )
{
   if( this.Toolbar == null )
     return;

   if( new_value == -1 )  // Use the state of the ToggleAutoScroll button.
   {
      this.AutoScroll = 
        Math.trunc( this.Toolbar.GetDResource( "ToggleAutoScroll/OnState" ) );
   }
   else    // Set to the supplied value. 
   {
      this.AutoScroll = new_value;
      this.Toolbar.SetDResource( "ToggleAutoScroll/OnState", this.AutoScroll );
   }
    
   // Set chart's auto-scroll.
   this.Chart.SetDResource( "AutoScroll", this.AutoScroll );
    
   /* Activate time scrollbar if AutoScroll is Off. The Y value scrollbar 
      uses GLG_PAN_Y_AUTO and appears automatically as needed.
   */
   let pan_x =    /* int */
     ( this.AutoScroll != 0 ? GLG.GlgPanType.NO_PAN : GLG.GlgPanType.PAN_X );
    
   this.ChartVP.SetDResource( "Pan", ( pan_x | GLG.GlgPanType.PAN_Y_AUTO ) );
}

//////////////////////////////////////////////////////////////////////////////
// Changes the time span shown in the graph, adjusts major and minor tick 
// intervals to match the time span.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.SetChartSpan = function( /*int*/ span_index )
{
   let span, major_interval, minor_interval;   /* int */
    
   /* Change chart's time span, as well as major and minor tick intervals.*/
   switch( span_index )
   {
    default:
    case 0:
      span = ONE_MINUTE;
      major_interval = 10;  /* major tick every 10 sec. */
      minor_interval = 1;   /* minor tick every sec. */
      break;
        
    case 1:
      span = 10 * ONE_MINUTE;
      major_interval = ONE_MINUTE * 2; /* major tick every tow minutes. */
      minor_interval = 30;             /* minor tick every 30 sec. */
      break;
        
    case 2:
      span = ONE_HOUR;
      major_interval = ONE_MINUTE * 10; /* major tick every 10 min. */
      minor_interval = ONE_MINUTE;      /* minor tick every min. */
      break;

    case 3:
      span = ONE_HOUR * 8;
      major_interval = ONE_HOUR;        /* major tick every hour. */
      minor_interval = ONE_MINUTE * 15; /* minor tick every 15 minutes. */
      break;
   }
    
   /* Update the menu in the drawing with the initial value if different. */
   this.Toolbar.SetDResourceIf( "SpanSelector/SelectedIndex", 
                                     span_index, true );
        
   /* Set intervals before SetZoom() below to avoid redrawing huge number 
      of labels. 
   */
   this.Chart.SetDResource( "XAxis/MajorInterval", major_interval );
   this.Chart.SetDResource( "XAxis/MinorInterval", minor_interval );
    
   /* Set the X axis span which controls how much data is displayed in the 
      chart. 
   */
   this.TimeSpan = span;
   this.Chart.SetDResource( "XAxis/Span", this.TimeSpan );
    
   // Turn on data filtering for large spans. 
   for( let i=0; i < this.NumPlots; ++i )
   {
      if( span_index > 1 )
      {
         /* Agregate multiple data samples to minimize a number of 
            data points drawn per each horizontal FilterPrecision interval.
            Show only one set of MIN/MAX values per each pixel interval. 
            An averaging data filter is also available.
         */
         this.PlotArray[i].SetDResource( "FilterType", 
                                         GLG.GlgChartFilterType.MIN_MAX_FILTER );
         this.PlotArray[i].SetDResource( "FilterPrecision", 1.0 );
      }
      else
        this.PlotArray[i].SetDResource( "FilterType", 
                                        GLG.GlgChartFilterType.NULL_FILTER );
   }
   
   /* Change time and tooltip formatting to match the selected span. */
   this.SetTimeFormats();
}

//////////////////////////////////////////////////////////////////////////////
// Sets the formats of time labels and tooltips depending on the selected 
// time span.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.SetTimeFormats = function()
{
   let 
     time_label_format,           /* String */
     time_tooltip_format,         /* String */
     chart_tooltip_format;        /* String */

   /* No additional code is required to use the default settings defined 
      in the drawing. The code below illustrates advanced options for 
      customizing label and tooltip formatting when switching between 
      time spans and data display modes.
       
      For an even greater control over labels and tooltips, an application 
      can define custom Label and Tooltip formatters that will supply 
      custom strings for axis labels and tooltips.
   */
    
   /* Different time formats are used depending on the selected
      time span. See strftime() for all time format options.
   */
   switch( this.SpanIndex )
   {
    default:  /* 1 minute and 10 minutes spans */
      /* Use the preferred time and date display format for the current 
         locale. 
      */
      time_label_format = "%X%n%x";
      break;
        
    case 2: /* 1 hour span */
      /* Use the 12 hour time display with no seconds, and the default 
         date display format for the current locale.
      */
      time_label_format = "%I:%M %p%n%x";
      break;
        
    case 3: /* 1 hour and 8 hour spans */
      /* Use 24 hour notation and don't display seconds. */
      time_label_format = "%H:%M%n%x";
      break;
   }
    
   this.Chart.SetSResource( "XAxis/TimeFormat", time_label_format );
    
   /* Specify axis and chart tooltip format, if different from default 
      formats defined in the drawing.
   */
   time_tooltip_format = 
     "Time: <axis_time:%X> +0.<axis_time_ms:%03.0lf> sec.\nDate: <axis_time:%x>";
    
   /* <sample_time:%s> inherits time format from the X axis. */
   chart_tooltip_format = 
     "Plot <plot_string:%s> value= <sample_y:%.2lf>\n<sample_time:%s>";
    
   /* Set time label and tooltip formats. */
   this.Chart.SetSResource( "XAxis/TooltipFormat", time_tooltip_format );
   this.Chart.SetSResource( "TooltipFormat", chart_tooltip_format );
}

//////////////////////////////////////////////////////////////////////////////
// Scrolls the chart to the minimum or maximum time stamp to show the 
// most recent or the least recent data. 
//
// Enabling AutoScroll automatically scrolls the chart to show current 
// data points when the new time stamp is more recent then the EndValue 
// of the axis, but it is not the case when the chart is scrolled into 
// the future (to the right) - still need to invoke this method.
//////////////////////////////////////////////////////////////////////////////
function ScrollToDataEnd( /*GlgObject*/ chart, /*int*/ data_end )
{
   let end_value;   /* double */
    
   if( data_end == DONT_CHANGE )
     return;
    
   // Get the min and max time stamp.
   let min_max =   /* GlgMinMax */
     chart.GetChartDataExtent( null, /* x extent */ true, false );
   if( min_max == null )
     return;
    
   if( data_end == MOST_RECENT )
     end_value = min_max.max;
   else   /* LEAST_RECENT */
   {
      let time_span = chart.GetDResource( "XAxis/Span" );
      end_value = min_max.min + time_span ;
   }
   
   chart.UpdateChartTimeAxis( null, end_value, false );
}
   
//////////////////////////////////////////////////////////////////////////////
// Restore Y axis range to the initial Low/High values.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.RestoreInitialYRanges = function()
{
   let axis_array = 
     this.Chart.GetResourceObject( "YAxisGroup" ); /* GlgObject */
    
   for( let i=0; i < this.NumYAxes; ++i )
   {
      let axis = axis_array.GetElement( i );   /* GlgObject */
      axis.SetDResource( "Low", this.Low[ i ] );
      axis.SetDResource( "High", this.High[ i ] );
   }
}
   
//////////////////////////////////////////////////////////////////////////////
// Returns true if the chart's viewport is in ZoomToMode.
// ZoomToMode is activated on Dragging and ZoomTo operations.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.ZoomToMode = function()   /* boolean */
{
   let zoom_mode =    /* int */
     Math.trunc( this.ChartVP.GetDResource( "ZoomToMode" ) );
   return ( zoom_mode != 0 );
}

//////////////////////////////////////////////////////////////////////////////
// Abort ZoomTo mode.
//////////////////////////////////////////////////////////////////////////////
RTChartPage.prototype.AbortZoomTo = function()
{
   if( this.ZoomToMode() )
   {
      // Abort zoom mode in progress.
      this.ChartVP.SetZoom( null, 'e', 0.0 ); 
      this.ChartVP.Update();
   }
}
