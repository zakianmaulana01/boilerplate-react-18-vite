/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined, GetCurrTime, GetPropertyValue, RemoveArrayElement,
         AppAlert, AppLog, AppError } from './Utils.js'

// Convenient time span constants.
const  ONE_MINUTE = 60;
const  ONE_HOUR   = 3600;
const  ONE_DAY    = 3600 * 24;

/* PREFILL constants. Used to specify if the chart plots should be filled with
   historical data on initial appearance.
*/
const DISABLE_PREFILL = 0;        /* Disable prefilling of charts. */
const USE_CHART_PREFILL = 1;      /* Use the value of the chart's Prefill 
                                     property. */
const FORCE_PREFILL = 2;          /* Force data prefilling for all charts. */

/* Default setting for chart prefilling, used for chart.PrefillMode flag. 
   May be used to override the setting of the chart's Prefill property 
   in the drawing by setting DEFAULT_PREFILL_MODE to one of the PREFILL 
   constants above.
*/
let DEFAULT_PREFILL_MODE = USE_CHART_PREFILL;

/* Default Prefill time interval, specifies amount of data to prefill in the 
   real time chart. An individual chart may provide a custom prefill span 
   value using PrefillSpan property. 
*/
let DEFAULT_PREFILL_SPAN = ONE_HOUR * 8;

/* If set to true, chart dragging in Y direction is enabled, in addition to 
   the X direction. Otherwise, dragging is enabled only in the X direction.
*/
let ENABLE_Y_DRAGGING = true;

/* Constants for scrolling the chart to the beginning or the end of 
   the time range.
*/
const DONT_CHANGE  = 0;
const MOST_RECENT  = 1;  /* Make the most recent data visible. */
const LEAST_RECENT = 2;  /* Make the least recent data visible.*/

/* Metadata table that may be used to configure charts.
   The chart widget's Description parameter should match the description 
   property in the desired metadata record in the table. If found, the 
   information is stored as this.Metadata object and used to configure the
   chart widget, including number of Y axes, number of plots, etc.
*/
let MetadataTable = CreateMetadataTable();

//////////////////////////////////////////////////////////////////////////////
// Returns Metadata Table that may be used to configure the charts
// on the fly. In this example, metadata table is provided as a predefined
// table below. The application may implement a custom method to query
// metadata for the charts, for example query metadata from a database.
//
// The chart widget's Description parameter should match the description 
// property in the desired metadata record in the table. If found, the 
// information is stored as Metadata object and used to configure the
// chart widget, including number of Y axes, number of plots, etc.
//////////////////////////////////////////////////////////////////////////////
function CreateMetadataTable()
{
  let metadata_table =
  [ { description: "AmpVolt",
      yaxes: [ { axis_label: "Volt", low: 0., high: 500. },
               { axis_label: "Amp", low: 0., high: 50. }
             ],
      plots: [ { annotation: "Volt", linked_axis: "Volt",
                 color: {r:0, g:194, b:0},
                 tag: "Value_Volt-E1" },        
               { annotation: "Amp", linked_axis: "Amp",
                 color: {r:222, g:85, b:22},
                 tag: "Value_Amp-E1" }
             ]
    },

    { description: "PressureTemperature",
      yaxes: [ { axis_label: "bar", low: 0., high: 50. },
               { axis_label: "°C", low: 0., high: 100. }
             ],
      plots: [ { annotation: "THP", linked_axis: "bar",
                 color: {r:185, g:0, b:160},
                 tag: "Value_THP-1" },
               { annotation: "BAP", linked_axis: "bar",
                 color: {r:109, g:0, b:219},
                 tag: "Value_BAP-1" },
               { annotation: "EOT", linked_axis: "°C",
                 color: {r:0, g:211, b:211},
                 tag: "Value_EOT-1" },
               { annotation: "TE", linked_axis: "°C",
                 color: {r:0, g:113, b:227},
                 tag: "Value_TE-E1" }
             ]
    }
  ];

  return metadata_table;
}

//////////////////////////////////////////////////////////////////////////////
export function ChartWidget( glg_viewer,
                             /*GlgObject*/ glg_obj, /*String*/ widget_type )
{
   this.Viewer = glg_viewer;

   /* Use GetReference API method to obtain a GlgObject instance that can be 
      stored in a persistent variable.
   */
   this.glg_obj = GLG.GetReference( glg_obj ); /* GlgObject:  
                                                  Top level widget viewport.*/
   this.ChartVP = null;           /* GlgObject: viewport containing the 
                                     Chart object. */
   this.Chart = null;             /* GlgObject: Chart object inside ChartVP.*/
   this.WidgetType = widget_type;  /* String: Char widget type: "RTChart" or
                                      "RTChartScroll". */   
   this.Metadata = null;          /* metadata used to configure the chart,
                                     if found in MetadataTable. */
   this.PlotArray = null;         /* PlotInfo[]: Stores information for 
                                     each plot. It assumes that each plot 
                                     is linked to the corresponding Y axis, 
                                     so that plot's low/high range gets 
                                     automatically adjusted based on its 
                                     linked axis, or CommonRange=YES in case
                                     of a single/common YAxis. */
   this.YAxisArray = null;        /* ChartAxisInfo[]: Stores information for
                                     each YAxis, including initial low/high 
                                     ranges which will be used to restore the
                                     ranges on ZoomReset. */
   this.NumPlots = 0;             /* int: Number of plots. */
   this.NumYAxes = 0;             /* int: Number of Y axes. */
        
   this.Toolbar = null;           /* GlgObject: Toolbar object inside the
                                     widget viewport (if any). */
   this.INIT_SPAN = 0;            /* int: Initial time span index. */
   this.SpanIndex = this.INIT_SPAN;  /* int: Index of the currently displayed 
                                        X axis time span. Used in RTChartScrol
                                        and corresponds to the SelectedIndex 
                                        of SpanSelector menu. */
   this.TimeSpan = 0;             /* int: Time axis span in sec. */    
   this.AutoScroll = 1;           /* int: Current auto-scroll state: 
                                     enabled(1) or disabled(0). */
   this.StoredScrollState = null; /* int: Stored AutoScroll state to be 
                                     restored if ZoomTo is aborted. */
    
   this.PrefillMode = DEFAULT_PREFILL_MODE; /* int: Specifies if the chart's 
                                               data  buffer gets prefilled with 
                                               historical data on initial 
                                               appearance. */    
   this.PrefillSpan = 0;           /* int: The value of the chart's PrefillSpan
                                      property that controls prefilling the 
                                      chart with historical data on initial
                                      appearance:
                                      - if 0, disables chart prefill
                                      - if >0, provides a prefill span
                                      - if <0, used default prefill span.
                                      Used if PrefillMode>0. */
   this.PrefillActive = false;     /* boolean: Will be set for the duration of
                                      prefilling the chart with historical data.
                                   */
   this.MultiSampleUpdate = false; /* boolean: The value of the chart's 
                                      MultiSampleUpdate property. If false, 
                                      the chart is updated using tags, 
                                      otherwise RequestPlotData() is used to 
                                      obtain multiple data samples on
                                      each update iteration. */
    
   this.EnableYDragging = ENABLE_Y_DRAGGING; /* boolean: Chart dragging in
                                                Y direction: enabled (true) or 
                                                disabled (false). 
                                                If disabled, chart dragging is 
                                                performed only in horizontal 
                                                direction. */
   this.SetupFinished = false;      /* boolean: Is set to true if the chart
                                       setup has already been done via its
                                       Finalize() method.
                                    */

   /* Add the chart to ChartList. */
   this.Viewer.ChartList.push( this );
   if( this.Viewer.Debug )
     AppLog( "Adding a chart widget to the list." );
    
   this.Active = true;             /* Will be set to false when the chart
                                      is deleted. */
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.InitBeforeH = function()
{
   /* Augment code based on WidgetType as needed.
      Chart parameters such as NumPlots, NumAxes may be assigned here.
   */

   switch( this.WidgetType )
   {
    default:
    case "RTChart":
      // Top level widget viewport is the viewport containing the Chart object.
      this.ChartVP = this.glg_obj;
      break;

    case "RTChartScroll":
      /* Obtain Toolbar object containing control widgets. */
      this.Toolbar = this.glg_obj.GetResourceObject( "Toolbar" );
      
      /* Viewport of the Chart object. */
      this.ChartVP = this.glg_obj.GetResourceObject( "ChartViewport" );
      if( this.ChartVP == null )
      {
         AppAlert( "ChartViewport not found." );
         return;
      }
      break;
   }
   
   // Retrieve the Chart object.
   this.Chart = this.ChartVP.GetResourceObject( "Chart" );
   if( this.Chart == null )
   {
      AppAlert( "Chart object not found." );
      return;
   }
   
   /* Obtain configuration data (metadata) for the chart (if defined).
      The chart's Description resource is used to find its metadata in
      MetadataTable.
   */
   this.Metadata = this.GetMetadata();
   
   /* Set Chart Zoom mode. It was set and saved with the drawing, 
      but do it again programmatically just in case.
   */
   this.ChartVP.SetZoomMode( null, this.Chart, null,
                             GLG.GlgZoomMode.CHART_ZOOM_MODE );

   if( this.Metadata == null )
   {
      // Use information from the drawing.
      this.NumYAxes = Math.trunc( this.Chart.GetDResource( "NumYAxes" ) );
      this.NumPlots = Math.trunc( this.Chart.GetDResource( "NumPlots" ) );
   }
   else
   {
      // Use Metadata to set number of axes and plots.
      this.NumYAxes = this.Metadata.yaxes.length;
      this.NumPlots = this.Metadata.plots.length;
      this.ConfigureChartBeforeH();
   }

   if( this.WidgetType == "RTChartScroll" )
   {
      // Using closure to capture "this".
      this.glg_obj.AddListener( GLG.GlgCallbackType.INPUT_CB,
                                this.InputCallback.bind( this ) );
      this.glg_obj.AddListener( GLG.GlgCallbackType.TRACE_CB,
                                this.TraceCallback.bind( this ) );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Initialization after hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.InitAfterH = function()
{
   if( this.Chart == null )
      return;

   this.MultiSampleUpdate = GetPropertyValue( this.glg_obj, "MultiSampleUpdate",
                                              0, false ) == 0 ? false : true;

   // Allocate arrays to store information for Y axes and plots.
   this.YAxisArray = new Array( this.NumYAxes );
   this.PlotArray = new Array( this.NumPlots );
   
   /* Populate YAxisArray with ValueAxiInfo objects, which will store
      initial low/high ranges, axis label, etc. If provided, Metadata 
      will be used to configure the axes in ConfigureChartAfterH(). 
      Otherwise, use information stored in the drawing.
   */         
   let axis_array = this.Chart.GetResourceObject( "YAxisGroup" ); /*GlgObject*/
   for( let i=0; i<this.NumYAxes; ++i )
      this.YAxisArray[i] = new ChartAxisInfo( axis_array.GetElement(i) );

   if( this.Metadata != null )
   {
      /* Use Metadata to configure chart's Y axes and plots.
         It will create plot objects on the fly and populate PlotArray to
         store plot information.
      */
      this.ConfigureChartAfterH();
   }
   else
   {
      // Populate PlotArray with plots' information stored in the drawing.
      let plot_array = this.Chart.GetResourceObject( "Plots" );  /*GlgObject*/
      for( let i=0; i<this.NumPlots; ++i )
        this.PlotArray[i] = new PlotInfo( plot_array.GetElement(i), this ); 
   }
   
   /* For charts with MultiSampleUpdate flag, the plots are updated using 
      entry points. Disable tags attached to the entry points to exclude them
      from the default tag-based updates.
   */
   if( this.MultiSampleUpdate )
      this.DisableChartTags();
   
   // Extra initialization based on WidgetType.
   switch( this.WidgetType )
   {
    default:
    case "RTChart":
      break;
    
    case "RTChartScroll":
      // Enable AutoScroll, both for the toggle button (if any) and the chart.
      this.ChangeAutoScroll( 1 );
      
      // Set X axis time span, tick intervals, time format, etc.
      this.SetChartSpan( this.SpanIndex );
      break;
   }
   
   /* Uncomment the line below to override XAxis label TimeFormat 
      defined in the drawing. "%T" displays time without a date.
   */
   //this.Chart.SetSResource( "XAxis/TimeFormat", "%T" );
}

//////////////////////////////////////////////////////////////////////////////
// Perform extra initialization after hierarchy setup has finished.
// For example, it may be used to access transformed attribute values.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.FinishSetup = function()
{
   /* Determine if the chart needs to be prefilled with data. If it does,
      set its PrefillSpan to a positive value.
   */
   if( this.PrefillMode != DISABLE_PREFILL )
   {
      this.PrefillSpan = GetPropertyValue( this.glg_obj, "PrefillSpan",
                                           DEFAULT_PREFILL_SPAN, true );

      // Prefill the chart if requested by PrefillSpan or forced by PrefillMode.
      if( this.PrefillSpan != 0 || this.PrefillMode == FORCE_PREFILL )
      {
         // Use default span if no value is specified.
         if( this.PrefillSpan <= 0 )
           this.PrefillSpan = DEFAULT_PREFILL_SPAN;
      }
   }

   if( this.PrefillSpan > 0 )
   {
      this.PrefillActive = true;

      /* For chart without MultiSampleUpdate, increase WaitForPrefill counter 
         to suspend tag data updates until prefilling has finished to avoid 
         current tag data being pushed into the chart before the older
         historical data.
      */
      if( !this.MultiSampleUpdate )
        ++this.Viewer.WaitForPrefill;

      this.ShowDataPrefillMessage( true );  // Display data prefill message.
   }
   else
     /* A new chart was added: if MultiSampleUpdate flag is true, and the chart
        is not waiting to be prefilled, PlotTagList needs to be rebuilt.
     */
     if( this.MultiSampleUpdate )
       this.Viewer.RebuildPlotTagList = true;
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.BeforeReset = function()
{
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.AfterReset = function()
{
   /* A chart was deleted: if MultiSampleUpdate flag is true, PlotTagList 
      needs to be rebuilt.
   */
   if( this.MultiSampleUpdate )
     this.Viewer.RebuildPlotTagList = true;
    else
      /* If a chart without MultiSampleUpdate has prefilling in progress, 
         decrease WaitForPrefill now: the chart was deleted and the chart data
         callback will not be invoked.
      */
      if( this.PrefillActive )
        --this.Viewer.WaitForPrefill;

   // Delete chart widget from ChartList.
   if( !RemoveArrayElement( this.Viewer.ChartList, this ) )
      AppError( "Failed to remove chart from ChartList." );

   this.Active = false;
}

//////////////////////////////////////////////////////////////////////////////
// Display or erase a data prefill message inside the chart (if exists)
// depending on the show parameter.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ShowDataPrefillMessage = function( /*boolean*/ show )
{
   let message_text = this.ChartVP.GetResourceObject( "MessageText" );
   if( message_text )
      message_text.SetDResource( "Visibility", show ? 1. : 0. );
}

//////////////////////////////////////////////////////////////////////////////
// Finalizes the chart.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.Finalize = function()
{
   if( this.SetupFinished )
      return false;

   // First time: finalize chart setup.
   this.SetupFinished = true;
   
   /* Fill tag sources in the stored plot info structures, can be performed
      only after all tag assignments are done.
   */
   for( let i=0; i<this.NumPlots; ++i )
      this.PlotArray[i].SetTagSource();
}
      
/////////////////////////////////////////////////////////////////////////////
// Disable chart tags attached to the plots' ValueEntryPoint, so that these 
// tags will not be added to the viewer's TagRecords array and therefore will 
// be excluded from the general tag animation of the viewer. 
// This function is invoked only for charts with MultiSampleUpdate:
// these charts are updated using plot entry points, as opposed to tag-based
// data updates using SetDTag.
/////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.DisableChartTags = function()
{
   for( let i=0; i<this.NumPlots; ++i )
   {
      let plot_info = this.PlotArray[i];
    
      let tag_obj = plot_info.value_ep.GetResourceObject( "TagObject" );
      if( tag_obj == null )
         continue;
      
      // Disable tag attached to plot's ValueEntryPoint.
      tag_obj.SetDResource( "TagEnabled", 0. );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Obtain Metadata for this chart. In this example, the widget's Description
// property is used to obtain metadata record from predefined MetadataTable.
// The application can extend this functionality and define chart metadata
// using custom logic.
// Metadata object should include the following properties:
// description:
//     A String used as a key to match the Description defined in the widget.
// yaxes:
//     An array of objects containing properties that define a YAxis:
//     {axis_label:  low:  high:}
// plots:
//     An array of objects containing properties that define a plot line:
//     { annotation:
//          A String displayed in a chart Legend for this plot.  
//       linked_axis:
//          A String that defines a corresponding YAxis listed in yaxes array.
//          Should match axis_label in yaxes[i] element. 
//       color:
//          An object {r: g: b:} that defines the plot line color.
//       tag:
//          A String to be assigned as TagSource for the plot object
//          ValueEntryPoint.
//     }
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.GetMetadata = function()  /*Metadata object*/
{
   let res_obj = this.glg_obj.GetResourceObject( "Description" );
   if( res_obj == null )
      return null;

   let res_str = res_obj.GetSResource( null );
   if( IsUndefined( res_str ) )
      return null;

   for( let i=0; i<MetadataTable.length; ++i )
   {
      let metadata = MetadataTable[i];
      if( !this.VerifyMetadata( metadata ) )
      {
         AppError( "Invalid metadata record, index = " + i );
         continue;
      }
   
      if( metadata.description == res_str )
         return MetadataTable[i]; // Found matching metadata record.
   }
   
   return null;
}
   
//////////////////////////////////////////////////////////////////////////////
// Configure chart parameters before setup using provided metadata.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ConfigureChartBeforeH = function()
{
   if( this.Chart == null || this.Metadata == null )
      return; // Nothing to do.
   
   // Set NumYAxes for the chart based on metadata.
   this.Chart.SetDResource( "NumYAxes", this.NumYAxes );

   /* For a chart with a single YAxis, set CommonRange=YES, so that
      all plots are automatically linked to this axis.
   */
   if( this.NumYAxes == 1 ) 
      this.Chart.SetDResource( "CommonRange", 1. );
   
   /* Set NumPlots=0, which will discard existing plots.
      The new plots will be created and configured dynamically in 
      ConfigureChartAfterH based on Metadata.plots[].
   */
   this.Chart.SetDResource( "NumPlots", 0 );
}

//////////////////////////////////////////////////////////////////////////////
// Configure chart parameters after hierarchy setup using provided metadata.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ConfigureChartAfterH = function()
{
   if( this.Metadata == null )
      return; // Nothing to do.

   // Configure each YAxis using provided metadata.
   for( let i=0; i<this.NumYAxes; ++i )
      this.YAxisArray[i].ConfigureAxis( this.Metadata.yaxes[i] );

   /* Populate PlotArray with PlotInfo objects, which will store
      plot's tag, entry points, etc.
   */
   for( let i=0; i<this.NumPlots; ++i )
   {
      let plot = GLG.CreateObject( GLG.GlgObjectType.PLOT );  /*GlgObject*/     
      this.PlotArray[i] = new PlotInfo( plot, this );
      
      /* Find Y axis record (ChartAxisInfo) matching a specified linked_axis
         string in plot's metadata, and if found, assign plot's 
         LinkedAxis in ConfigurePlot().
         In case of a single YAxis, the plot's Low/High ranges are set 
         automatically based on the setting CommonRange=YES.
      */
      let axis_info = null;
      if( this.NumYAxes > 1 )
      {
         axis_info =
           this.LookupYAxisArray( this.Metadata.plots[i].linked_axis );
            
         if( axis_info == null )
           AppError( "Mismatched linked_axis in plot's metadata: " +
                     this.Metadata.plots[i].linked_axis );
      }

      /* Assign plot information using provided metadata, such as 
         plot annotation, color, tag, linked axis (if any), etc. 
      */ 
      this.PlotArray[i].ConfigurePlot( this.Metadata.plots[i], axis_info );

      // Add new plot to the chart.
      this.Chart.AddPlot( null, plot );
   }
}

////////////////////////////////////////////////////////////////////////////// 
// Prefill the chart's history buffer with data for all chart plots.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.FillChartHistory = function()
{
   if( this.PrefillSpan <= 0 )
   {
      AppError( "Invalid prefill span." );      
      this.EnableRealTimeUpdates();
      return;
   }

   /* Populate an array of tag sources for the chart plots for historical data
      retrieval.
   */
   let prefill_tag_list = this.AddPlotTagsToList( null );
   if( prefill_tag_list == null )
   {
      this.EnableRealTimeUpdates();
      return;  // Nothing to do.
   }
   
   let current_time = GetCurrTime();   /* double */
   
   /* Fill the amount of data requested by the prefill_span, up to the available
      chart's buffer size defined in the drawing. Add an extra second to avoid
      rounding errors.
   */
   let num_seconds = this.PrefillSpan + 1;  /* int */
   
   let buffer_size =  /*int*/
      Math.trunc( this.Chart.GetDResource( "BufferSize" ) );
   
   if( buffer_size < 1 )
      buffer_size = 1;
   
   let max_num_samples;   /* int */
   if( this.Viewer.RandomData )
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

   /* Request historical data for all chart's plots. The PushChartData callback
      will be invoked with the list of received data.
   */
   let status =
     this.Viewer.DataFeed.RequestPlotData( prefill_tag_list,
                                           start_time, end_time,
                                           max_num_samples, /*historical*/ true,
                                           /*callback*/ this.PushChartData.bind( this ),
                                           /*user data: historical mode*/ true );

   if( !status )
     this.EnableRealTimeUpdates();
}
   
///////////////////////////////////////////////////////////////////////////
// Iterates through a chart's plots and pushes the data into each plot
// based on matched tag sources.
//   
// If historical=false, this function is invoked on a timer to
// handle periodic data updates for charts with MultiSampleUpdate flag.
//
// If historical=true, this function is invoked from FillChartHistory
// to prefill charts with historical data.
///////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.PushChartData =
  function( /*PlotDataPoint[]*/ new_data, /*boolean*/ historical )
{
   if( !this.Active )
     return;
   
   if( new_data == null || new_data.length == 0 )
   {      
      // If no prefill data has been received, just enable real-time updates.
      if( historical )
        this.EnableRealTimeUpdates();
      return;
   }
   
   /* Traverse PlotArray and push data points from new_data array that
      match tag_source in a given plot.
   */
   for( let i=0; i<this.NumPlots; ++i )
   {
      let plot_info = this.PlotArray[i];
      if( IsUndefined( plot_info.tag_source ) )
        continue;
      
      /* The data array can contain multiple sequential data points for each
         plot; subsequent points might have a null tag source to avoid 
         repetition and minimize the size of the transmitted data.
         
         The logic below iterates through these points, transitioning to 
         the next plot once the current set is processed.
      */
         
      /* Stores found matching tag source to be used for data processing
         for the current plot.
      */
      let found_tag_source = null;
      
      let num_points = new_data.length;
      for( let j=0; j<num_points; ++j )
      {
         let data_point = new_data[j];

         /* point's tag_source=null and tag match hasn't been found -
            don't process this data point and continue traversal.
         */
         if( data_point.tag_source == null && found_tag_source == null )
            continue;
         
         if( data_point.tag_source != null )
         {
            /* new_data[i].tag_source has changed:
               We are done processing data points for this plot using
               found_tag_source -- stop new_data traversal for this plot.
            */
            if( found_tag_source != null &&
                data_point.tag_source != found_tag_source )
              break;
            
            if( data_point.tag_source == plot_info.tag_source )
            {
               // Plot's tag and data point's tag match: store tag source. 
               found_tag_source = data_point.tag_source;
            }
            else
            {
               /* Current data point's tag_source doesn't match this plot, 
                  reset found_tag_source and go to the next point.
               */
               found_tag_source = null;
               continue;
            }
         }

         // Found matching tag source: process data point for the current plot.
         plot_info.PushOnePlotPoint( data_point, historical );
      }
   }

   /* Historical data (including chart prefilling) are pushed using the quick 
      mode optimized for performance. If chart auto-scaling is enabled in the
      drawing, update the chart's auto-scaling state, allowing it to perform
      its auto-scaling logic.
   */
   if( historical )
   {
      this.Chart.UpdateChartState( null, GLG.GlgChartState.CHART_AUTOSCALE_STATE );

      // Enable updates after prefilling has finished.
      this.EnableRealTimeUpdates();
   }
}

//////////////////////////////////////////////////////////////////////////////
// Enable chart updates and reset PrefillActive after prefilling has finished.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.EnableRealTimeUpdates = function()
{
   if( this.MultiSampleUpdate )
   {
      // Rebuild plot tag list to start updating the chart.
      this.Viewer.RebuildPlotTagList = true;

      /* Initialize ChartLastUpdateTime to current time, to make sure realtime
         data start accumulating only after the last prefilled data sample.
      */
      this.Viewer.ChartLastUpdateTime = GetCurrTime();
   }
   else if( this.PrefillActive )
   {
      // Resume tag data updates if no charts are waiting for prefilling.
      --this.Viewer.WaitForPrefill;
   }

   this.PrefillActive = false;
   
   this.ShowDataPrefillMessage( false );   /* Erase data prefill message. */
}
   
//////////////////////////////////////////////////////////////////////////////
// Adds tag sources for the chart's plots to the provided tag_list
// and returns a new list.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.AddPlotTagsToList =      /* String[] */
  function( /*String[]*/ tag_list )
{
   for( let i=0; i<this.NumPlots; ++i )
   {
      let tag_source = this.PlotArray[i].tag_source;    
      if( IsUndefined( tag_source ) )
        continue;
      
      if( tag_list == null )
        tag_list = [];

      if( tag_list.includes( tag_source ) )
        continue;
          
      tag_list.push( tag_source );
   }

   return tag_list;
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.LookupPlotByTag =  /* PlotInfo */
    function( /*String*/ tag_source )
{
   if( this.PlotArray == null )
     return null;

   for( let i=0; i<this.NumPlots; ++i )
   {
      if( this.PlotArray[i].tag_source == tag_source )
        return this.PlotArray[i];
   }

   return null; // not found
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.LookupYAxisArray =  /*ChartAxisInfo*/ 
  function ( /*String*/ axis_label )
{
   if( this.YAxisArray == null || axis_label == null )
     return;
   
   for( let i=0; i<this.NumYAxes; ++i )
   {
      if( this.YAxisArray[i].axis_label == axis_label )
        return this.YAxisArray[i];
   }

   return  null; // not found
}
   
//////////////////////////////////////////////////////////////////////////////
// Handle user interaction as needed.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.InputCallback =
    function( /*GlgObject*/ viewport, /*GlgObject*/ message_obj )
{
   if( !this.Viewer.Active || this.ChartVP == null || this.Chart == null )
     return;

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
         this.ChartVP.SetZoom( null, 't', 0.0 );  
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
         this.ChartVP.SetZoom( null, 'l', 0.33 );
      }
      else if( origin == "ScrollForward" )
      {
         this.ChangeAutoScroll( 0 );
         
         // Scroll right by 1/3 of the span.
         this.ChartVP.SetZoom( null, 'r', 0.33 );
      }
      else if( origin == "ScrollBack2" )
      {
         this.ChangeAutoScroll( 0 );
         
         // Scroll left by a full span.
         this.ChartVP.SetZoom( null, 'l', 1.0 );
      }
      else if( origin == "ScrollForward2" )
      {
         this.ChangeAutoScroll( 0 );
         
         // Scroll right by a full span.
         this.ChartVP.SetZoom( null, 'r', 1.0 );
      }
      else if( origin == "ZoomIn" )
      {
         // Zoom in in Y direction.
         this.ChartVP.SetZoom( null, 'I', 1.5 );
      }
      else if( origin == "ZoomOut" )
      {
         // Zoom out in Y direction.
         this.ChartVP.SetZoom( null, 'O', 1.5 );
      }
      else if( origin == "ScrollToRecent" )
      {
         // Scroll to show most recent data.
         this.ScrollToDataEnd( MOST_RECENT, true );
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

         /* Restore Low/High ranges in case the chart was zoomed. 
            It is assumed that each plot is linked to a corresponding Y axis,
            so that the plot's Low/High ranges are updated automatically
            based on the axis's range.
         */
         this.RestoreInitialYRanges(); 
         
         /* Scroll to show the recent data to avoid showing an empty chart
            if user scrolls too much into the future or into the past.
            Invoke ScrollToDataEnd() even if AutoScroll is true to 
            scroll ahead by a few extra seconds to show a few next updates
            without scrolling the chart.
         */
         let min_max =    /* GlgMinMax */
           this.Chart.GetChartDataExtent( null, /*x extent*/ true,
                                          /*query all samples*/ false );  
         
         if( min_max != null )
         {
            let first_time_stamp = min_max.min;   /* double */
            let last_time_stamp = min_max.max;    /* double */
            let displayed_time_end = /* double */
              this.Chart.GetDResource( "XAxis/EndValue" );
            
            if( this.AutoScroll != 0 )
              this.ScrollToDataEnd( MOST_RECENT, true );
            else if( displayed_time_end >
                     last_time_stamp + this.GetExtraSeconds() )
              this.ScrollToDataEnd( MOST_RECENT, true );            
            else if( displayed_time_end - this.TimeSpan <= first_time_stamp )
              this.ScrollToDataEnd( LEAST_RECENT, true );
            
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
   else
     // Pass the unprocessed event to the global InputCallback of the Viewer.
     this.Viewer.InputCallback( viewport, message_obj );
}

//////////////////////////////////////////////////////////////////////////////
// A custom trace callback for the page; is used to obtain coordinates 
// of the mouse click.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.TraceCallback =
  function( /*GlgObject*/ viewport, /*GlgTraceData*/ trace_info )
{
   if( !this.Viewer.Active )
     return;

   // Process only events that occur in CharVP.
   if( !trace_info.viewport.Equals( this.ChartVP ) )
     return;
   
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
      x = trace_info.mouse_x * this.Viewer.CoordScale;
      y = trace_info.mouse_y * this.Viewer.CoordScale;
      
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

      // Enable chart dragging only for the charts with a Toolbar.
      switch( this.WidgetType )
      {
       case "RTChartScroll":
         /* Start dragging with the mouse on a mouse click. 
            If user clicked on an axis, the dragging will be activated in the
            direction of that axis. If the user clicked in the chart area,
            dragging can be activated in both vertical and horizontal 
            direction (EnableYDragging=true), or only in the X (time) 
            direction (EnableYDragging=false).
         */
         let drag_type = ( this.EnableYDragging ? 's' : '>' ); 
         this.ChartVP.SetZoom( null, drag_type, 0.0 );
      
         // Disable AutoScroll not to interfere with dragging.
         this.ChangeAutoScroll( 0 );
         this.ChartVP.Update();
         break;

       default: break; 
      }
      break;

      default: break; 
   }
}
   
//////////////////////////////////////////////////////////////////////////////
// Change chart's AutoScroll mode.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ChangeAutoScroll = function( /*int*/ new_value )
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
      this.Toolbar.SetDResource( "ToggleAutoScroll/OnState", 
                                 this.AutoScroll );
   }
   
   // Set chart's auto-scroll.
   this.Chart.SetDResource( "AutoScroll", this.AutoScroll );
   
   /* Activate time scrollbar if AutoScroll is Off. The Y value scrollbar 
      uses PAN_Y_AUTO and appears automatically as needed.
   */
   let pan_x =    /* int */
     ( this.AutoScroll != 0 ? GLG.GlgPanType.NO_PAN : GLG.GlgPanType.PAN_X );
   
   this.ChartVP.SetDResource( "Pan", ( pan_x | GLG.GlgPanType.PAN_Y_AUTO ) );
}
   
//////////////////////////////////////////////////////////////////////////////
// Changes the time span shown in the graph, adjusts major and minor tick 
// intervals to match the time span.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.SetChartSpan = function( /*int*/ span_index )
{
   let span, major_interval, middle_interval, minor_interval;   /* int */
   
   /* Change chart's time span, as well as major and minor tick intervals.*/
   switch( span_index )
   {
    default:
    case 0:
      span = ONE_MINUTE;
      major_interval = 10;              /* major tick every 10 sec. */
      middle_interval = 5;              /* middle tick every 5 sec. */
      minor_interval = 1;               /* minor tick every sec. */
      break;
      
    case 1:
      span = 10 * ONE_MINUTE;
      major_interval = ONE_MINUTE;      /* major tick every minute. */
      middle_interval = 30;             /* middle tick every 30 sec. */
      minor_interval = 10;              /* minor tick every 10 sec. */
      break;
      
    case 2:
      span = ONE_HOUR;
      major_interval = ONE_MINUTE * 10; /* major tick every 10 min. */
      middle_interval = ONE_MINUTE * 5; /* middle tick every 5 min. */
      minor_interval = ONE_MINUTE;      /* minor tick every min. */
      break;
      
    case 3:
      span = ONE_HOUR * 8;
      major_interval = ONE_HOUR;         /* major tick every hour. */
      middle_interval = ONE_MINUTE * 30; /* middle tick every 30 min. */
      minor_interval = ONE_MINUTE * 15;  /* minor tick every 15 min. */
      break;
   }

   /* Update the menu in the drawing (if any) with the initial value 
      if different. 
   */
   if( this.Toolbar != null )
     this.Toolbar.SetDResourceIf( "SpanSelector/SelectedIndex", 
                                  span_index, /*if changed*/ true );
   
   /* Set intervals before SetZoom() below to avoid redrawing huge number 
      of labels. 
   */
   this.Chart.SetDResource( "XAxis/MajorInterval", major_interval );
   this.Chart.SetDResource( "XAxis/MiddleInterval", middle_interval );
   this.Chart.SetDResource( "XAxis/MinorInterval", minor_interval );
   
   // Set X axis span which controls how much data is displayed in the chart. 
   this.TimeSpan = span;
   this.Chart.SetDResource( "XAxis/Span", this.TimeSpan );
   
   // Turn on data filtering for large spans. 
   if( span_index > 1 )
   {
      /* Agregate multiple data samples to minimize the number of data points 
         drawn per each horizontal FilterPrecision interval (defined in pixels).
         Show only one set of MIN/MAX values per each pixel interval. 
         An averaging data filter is also available.
      */
      this.SetChartFiltering( GLG.GlgChartFilterType.MIN_MAX_FILTER, 1.0 );
   }
   else
     this.SetChartFiltering( GLG.GlgChartFilterType.NULL_FILTER );
   
   /* Change time and tooltip formatting to match the selected span. */
   this.SetTimeFormats();
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.SetChartFiltering =
  function ( /*int*/ filter_type, /*int*/ precision )
{
   for( let i=0; i<this.NumPlots; ++i )
   {
      let plot = this.PlotArray[i].plot;
      plot.SetDResource( "FilterType", filter_type );
      
      if( precision != null )
        plot.SetDResource( "FilterPrecision", precision );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Sets the formats of time labels and tooltips depending on the selected 
// time span.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.SetTimeFormats = function()
{
   let 
     time_label_format,           /* String */
     time_tooltip_format,         /* String */
     chart_tooltip_format,        /* String */
     single_line;                 /* int */
    
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
      /* Time and date display format for the current locale. */ 
      //time_label_format = "%X%n%x";
      
      // 24-hour notation without a date.
      time_label_format = "%H:%M:%S";
      single_line = 1;
      break;
      
    case 2: /* 1 hour span */
      /* Use the 12 hour time display with no seconds, and the default 
         date display format for the current locale.
      */
      time_label_format = "%I:%M %p%n%x";
      single_line = 0;
      break;
      
    case 3: /* 8 hour spans */
      /* Use 24 hour notation and don't display seconds. */
      time_label_format = "%H:%M%n%x";
      single_line = 0;
      break;
   }
   
   this.Chart.SetSResource( "XAxis/TimeFormat", time_label_format );
   if( this.Chart.HasResourceObject( "SingleLine" ) )
     this.Chart.SetDResource( "SingleLine", single_line );
     
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
// most recent or the least recent data. If show_extra is True, adds a 
// few extra seconds in the real-time mode to show a few next updates
// without scrolling the chart.
//
// Enabling AutoScroll automatically scrolls the chart to show current 
// data points when the new time stamp is more recent then the EndValue 
// of the axis, but it is not the case when the chart is scrolled into 
// the future (to the right) - still need to invoke this method.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ScrollToDataEnd =
  function( /*int*/ data_end, /*boolean*/ show_extra_sec )
{
   let end_value, extra_sec;   /* double */
   
   if( data_end == this.DONT_CHANGE )
     return;
   
   // Get the min and max time stamp.
   let min_max =   /* GlgMinMax */
   this.Chart.GetDataExtent( null, /* x extent */ true );
   if( min_max == null )
     return;
   
   if( show_extra_sec )   
     extra_sec = this.GetExtraSeconds();
   else
     extra_sec = 0.0;
   
   if( data_end == MOST_RECENT )
     end_value = min_max.max + extra_sec;
   else   /* LEAST_RECENT */
     end_value = min_max.min - extra_sec + this.TimeSpan ;
   
   // Advance the Time axis to the specified time stamp.
   this.Chart.UpdateChartTimeAxis( null, end_value, false );
}
   
//////////////////////////////////////////////////////////////////////////////
// Restore Y axis range to the initial Low/High values.
// Each plot should be linked to a corresponding Y axis, so that the
// plot's Low/High range gets adjusted automatically when the YAxis' range
// gets changed.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.RestoreInitialYRanges = function()
{
   for( let i=0; i<this.NumYAxes; ++i )
      this.YAxisArray[i].SetRange();
}
   
//////////////////////////////////////////////////////////////////////////////
// Returns true if the chart's viewport is in ZoomToMode.
// ZoomToMode is activated on Dragging and ZoomTo operations.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.ZoomToMode = function()   /* boolean */
{
   let zoom_mode =    /* int */
   Math.trunc( this.ChartVP.GetDResource( "ZoomToMode" ) );
   return ( zoom_mode != 0 );
}
   
//////////////////////////////////////////////////////////////////////////////
// Abort ZoomTo mode.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.AbortZoomTo = function()
{
   if( this.ZoomToMode() )
   {
      // Abort zoom mode in progress.
      this.ChartVP.SetZoom( null, 'e', 0.0 ); 
      this.ChartVP.Update();
   }
}

//////////////////////////////////////////////////////////////////////////////
// Determines a good number of extra seconds to be added at the end in
// the real-time mode to show a few next updates without scrolling the
// chart.
//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.GetExtraSeconds = function()   /* double */
{
   let extra_sec, max_extra_sec;   /* double */
   
   extra_sec = this.TimeSpan * 0.1;
   max_extra_sec = ( this.TimeSpan > ONE_HOUR ? 5.0 : 3.0 );
   
   if( extra_sec > max_extra_sec )
     extra_sec = max_extra_sec;
   
   return extra_sec;
}

//////////////////////////////////////////////////////////////////////////////
ChartWidget.prototype.VerifyMetadata = function( metadata )    /* boolean */
{
   if( metadata == null )
     return false;

   if( metadata.description == null || metadata.yaxes == null ||
       metadata.plots == null )
     return false;

   for( let i=0; i<metadata.plots.length; ++i )
   {
      let plot_data = metadata.plots[i];
      if( plot_data.tag == null )
      {
         AppError( "Invalid tag in metadata record for plot index = " + i );
         return false;
      }
   }

   for( let i=0; i<metadata.yaxes.length; ++i )
   {
      let axis_metadata = metadata.yaxes[i];
      if( axis_metadata.axis_label == null ||
          axis_metadata.low == null || axis_metadata.high == null )
      {
         AppError( "Invalid metadata for Y axis index = " + i );
         return false;
      }
   }

   return true;
}
   
//////////////////////////////////////////////////////////////////////////////
function PlotInfo( /*GlgObject*/ glg_obj, /*ChartWidget
*/ chart_widget )
{
   this.plot = glg_obj;  /* Plot's object ID */

   // Store plot's ValueEntryPoint.
   this.value_ep = /*GlgObject*/
     this.plot.GetResourceObject( "ValueEntryPoint" );
   
   // Store plot's TimeEntryPoint.
   this.time_ep = /* GlgObject */
     this.plot.GetResourceObject( "TimeEntryPoint" );
   
   // Store plot's ValidEntryPoint.
   this.valid_ep = /* GlgObject */
     this.plot.GetResourceObject( "ValidEntryPoint" );

   /* Data source variable for ValueEntryPoint. Will be assigned either from
      the drawing or from metadata, if provided.
   */
   this.tag_source = null;

   /* If set to true, the plot uses RequestPlotData() instead of tags for
      data updates. 
   */
   this.MultiSampleUpdate = chart_widget.MultiSampleUpdate;
}

//////////////////////////////////////////////////////////////////////////////
// Store the tag source used by the plot object. This has to be done after
// the tags were remapped.
//////////////////////////////////////////////////////////////////////////////
PlotInfo.prototype.SetTagSource = function()
{
   /* If the tag source has not been already stored when the chart was 
      configured using metadata, store TagSource associated with the plot's
      ValueEntryPoint, if it is defined.
   */
   if( IsUndefined( this.tag_source ) &&
       this.value_ep.HasResourceObject( "TagObject" ) )
     this.tag_source = this.value_ep.GetSResource( "TagSource" );
}

//////////////////////////////////////////////////////////////////////////////
// Configure the plot using provided metadata.
//////////////////////////////////////////////////////////////////////////////
PlotInfo.prototype.ConfigurePlot =
  function( /*Metadata.plots[i]*/ plot_data, /*ChartAxisInfo*/ axis_info )
{
   if( plot_data == null )
     return;
   
   if( plot_data.annotation != null )
     this.plot.SetSResource( "PlotAnnotation", plot_data.annotation );

    if( plot_data.color != null )
    {
        /* Plot metadata record contains r,g,b values for the plot color
           in the range [0,255]. When setting the color for the chart
           plot, set the values in range [0,1].
        */
        this.plot.SetGResource( "EdgeColor", plot_data.color.r / 255.,
                                plot_data.color.g / 255.,
                                plot_data.color.b / 255. );
    }
       
   // Store tag_source.
   this.tag_source = plot_data.tag;

   // Add TagObject to ValueEntryPoint and assign its TagSource.
   this.AddDataTag();

   // Set LinkedAxis for the plot, if defined.
   if( axis_info != null )
     this.plot.SetLinkedAxis( null, axis_info.axis, null );
}

//////////////////////////////////////////////////////////////////////////////
// Add data tag to the plot's ValueEntryPoint.
//////////////////////////////////////////////////////////////////////////////
PlotInfo.prototype.AddDataTag = function()
{
   let tag_obj = GLG.CreateObject( GLG.GlgObjectType.TAG,
                                   /*TagName*/ "Value",
                                   /*TagSource*/ this.tag_source,
                                   /*TagComment*/ null );

   this.value_ep.SetResourceObject( "TagObject", tag_obj );
}

///////////////////////////////////////////////////////////////////////
PlotInfo.prototype.PushOnePlotPoint =
  function( /*PlotDataPoint*/ data_point, /*boolean*/ historical )
{
   // Verify data point.
   if( data_point.value == null )
   {
      AppError( "Received null data value for chart plot with tag=" +
                this.tag_source +
                ". Using value=0 and marking data sample invalid." );
      data_point.value = 0;
      data_point.value_valid = false;
   }
   
   if( historical )
   {
      // In historical mode, time stamp must be valid.
      if( data_point.time_stamp == null )
      {
        AppError( "Null time stamp in chart historical mode, tag=" +
                  this.tag_source +
                  ". Using time_stamp=0 and marking data sample invalid." );
        data_point.time_stamp = 0;
        data_point.value_valid = false;  
      }
      
      // Push data sample using low level API for optimization.  
      this.PushPlotPointDirect( data_point );
   }
   else
     this.PushPlotPoint( data_point );
}
   
///////////////////////////////////////////////////////////////////////
// Push the new data sample into the plot using plot's entry points,
// such as ValueEntryPoint, TimeEntryPoint, ValidEntryPoint.
///////////////////////////////////////////////////////////////////////
PlotInfo.prototype.PushPlotPoint = function( /*PlotDataPoint*/ data_point )
{
   if( data_point.value != null )
     this.value_ep.SetDResource( null, data_point.value );
   
   if( data_point.time_stamp != null )
     this.time_ep.SetDResource( null, data_point.time_stamp );
   
   if( data_point.value_valid != null )
     this.valid_ep.SetDResource( null, data_point.value_valid ? 1. : 0. );
}

///////////////////////////////////////////////////////////////////////
// Push the new data sample into the plot. For increased performance,
// the data are pushed into the plot using a low level API method
// AddPlotDataSample.
///////////////////////////////////////////////////////////////////////
PlotInfo.prototype.PushPlotPointDirect =
  function( /*PlotDataPoint*/ data_point )
{
   /* Display markers for plots that contain markers, such as plots with 
      PlotType = MARKERS or LINE_AND_MARKERS.
   */
   let marker_visibility = 1;
   
   // Using quick mode to speed-up prefilling of the chart.
   this.plot.AddPlotDataSample( data_point.value, data_point.time_stamp,
                                data_point.value_valid, marker_visibility,
                                /*quick mode*/ true );
}

//////////////////////////////////////////////////////////////////////////////
function ChartAxisInfo( /*GlgObject*/ glg_obj )
{
   this.axis = glg_obj;
   this.low = glg_obj.GetDResource( "Low" );
   this.high = glg_obj.GetDResource( "High" );
   this.axis_label = glg_obj.GetSResource( "AxisLabelString" );
}

//////////////////////////////////////////////////////////////////////////////
ChartAxisInfo.prototype.ConfigureAxis =
  function( /*Metadata.yaxes[i]*/ axis_data )
{
   if( axis_data.axis_label != null )
   {
      this.axis_label = axis_data.axis_label;
      this.SetAxisLabel();
   }

   if( axis_data.low != null && axis_data.high !=null )
   {
      // Store provided low/high ranges.
      this.low = axis_data.low;
      this.high = axis_data.high;
      this.SetRange();
   }
}

//////////////////////////////////////////////////////////////////////////////
ChartAxisInfo.prototype.SetRange = function()
{
   this.axis.SetDResource( "Low", this.low );
   this.axis.SetDResource( "High", this.high );
}

//////////////////////////////////////////////////////////////////////////////
ChartAxisInfo.prototype.SetAxisLabel = function()
{
   this.axis.SetSResource( "AxisLabelString", this.axis_label );
}        
