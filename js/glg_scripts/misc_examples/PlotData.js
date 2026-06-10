//////////////////////////////////////////////////////////////////////////////
// Data objects used to store and pass information about one data sample.
// Set SUPPLY_TIME_STAMP=true to supply time_stamp explicitly. 
// Otherwise, the chart will automatically display a time stamp 
// using current time.
//////////////////////////////////////////////////////////////////////////////
export function PlotDataPoint( /*double*/ value, /*double*/ time_stamp,
                               /*boolean*/ value_valid )
{
   this.value = value;
   this.time_stamp = time_stamp;
   this.value_valid = value_valid;
}

//////////////////////////////////////////////////////////////////////////////
// Used to store information about each plot in a chart.
//////////////////////////////////////////////////////////////////////////////
export function PlotInfo( /*GlgObject*/ plot, /*GlgObject*/ value_ep, 
                          /*GlgObject*/ time_ep, /*GlgObject*/ valid_ep, 
                          /*String*/ tag_source )
{
   this.plot = plot;                   /* Plot object:      GlgObject */
   this.value_ep = value_ep;           /* ValueEntryPoint:  GlgObject */
   this.time_ep = time_ep;             /* TimeEntryPoint:   GlgObject */
   this.valid_ep = valid_ep;           /* ValidEntryPoint:  GlgObject */

   /* TagSource assigned to ValueEntryPoint. Represents a data source variable
      in the back-end system to get the real-time value from for this plot.
   */
   this.tag_source = tag_source;       /* String */
}
