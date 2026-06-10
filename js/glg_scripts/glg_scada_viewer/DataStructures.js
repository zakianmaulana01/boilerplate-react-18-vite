//////////////////////////////////////////////////////////////////////////
// Defines constants and data structures shared between modules.
//////////////////////////////////////////////////////////////////////////

export const USER_ROLE = 0;
export const ADMINISTRATOR_ROLE = 1;

//////////////////////////////////////////////////////////////////////////
export function GlgDataRecord( /*String*/ tag_source, /*int*/ data_type,
                               /*double or String*/ value,
                               /*double*/ time_stamp, /*boolean*/ value_valid )
{
   this.tag_source = tag_source;   /* String */
   this.data_type = data_type;     /* GLG.GlgDataType */
   this.value = value;             /* double if data_type=GLgDataType.D, or
                                      String if data_type=GLgDataType.S. */
   this.time_stamp = time_stamp;   /* double */
   this.value_valid = ( value_valid != null ? value_valid : true );  

   this.widget = null;             /* Used for input validation. */
}
   
//////////////////////////////////////////////////////////////////////////////
// Used to pass information for one data sample to a chart's plot.
//////////////////////////////////////////////////////////////////////////////
export function PlotDataPoint( /*double*/ value, /*double*/ time_stamp,
                             /*boolean*/ value_valid, /*String*/ tag_source )
{
   this.value = value;
   this.time_stamp = time_stamp;
   this.value_valid = value_valid;

   this.tag_source = ( tag_source == undefined ? null : tag_source ); 
}

//////////////////////////////////////////////////////////////////////////////
PlotDataPoint.prototype.FillPlotPoint =
    function( /*double*/ value, /*double*/ time_stamp,
              /*boolean*/ value_valid, /*String*/ tag_source  )
{
   this.value = value;
   this.time_stamp = time_stamp;
   this.value_valid = value_valid;
    
   this.tag_source = ( tag_source == undefined ? null : tag_source ); 
}

