//////////////////////////////////////////////////////////////////////////////
// Data objects used to store and pass information about one data sample.
//////////////////////////////////////////////////////////////////////////////
export function PlotDataPoint( /*double*/ value, /*double*/ time_stamp,
                               /*boolean*/ value_valid )
{
   this.value = value;
   this.time_stamp = time_stamp;
   this.value_valid = value_valid; 
}

//////////////////////////////////////////////////////////////////////////////
// Used to store and pass information about one data sample.
// Set SUPPLY_TIME_STAMP=true to supply time_stamp explicitly. Otherwise,
// the chart will automatically display a time stamp using current time.
//////////////////////////////////////////////////////////////////////////////
export function DataRecord( /*String*/ tag, /*PlotDataPoint[]*/ data_array )
{
   this.tag = tag;
   this.data_array = data_array;
}
