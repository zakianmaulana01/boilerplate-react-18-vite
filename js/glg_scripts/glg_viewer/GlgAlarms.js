/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GLG, IsUndefined, ConfigureWindow, ScaleParameter,
         AppAlert, AppLog } from './Utils.js'

const ALARM_UPDATE_INTERVAL = 1000;  /* Update interval, msec */ 

//////////////////////////////////////////////////////////////////////////
// Stores information for an individual alarm, can be extended as needed.
//////////////////////////////////////////////////////////////////////////
export function AlarmRecord()
{
   this.time = null;          /* double : Epoch time in seconds. */
   this.tag_source = null;    /* String */
   this.description = null;   /* String */

   /* If string_value is set to null, double_value will be displayed as alarm 
      value; otherwise string_value will be displayegd.
   */
   this.string_value = null;  /* String  */
   this.double_value = 0;     /* double */

   this.status = 0;           /* int */   
   this.ack = false;          /* boolean */

   this.age = 0;              /* int: Used for demo alarm simulation only. */
}

//////////////////////////////////////////////////////////////////////////
export function AlarmPage( glg_viewer )
{
   this.Viewer = glg_viewer;
   
   this.AlarmDialog = null;  /* GlgObject */
   this.AlarmListVP = null;  /* GlgObject : Viewport containing the alarm list.
                              */
   this.NumAlarmRows = 0;    /* int: Number of visible alarms on one alarm page.
                              */
   this.AlarmRows = null;    /* GlgObject[] : Keeps object ID's of alarm rows 
                                for faster access. */
   
   this.AlarmStartRow = 0;   /* int: Scrolled state of the alarm list. */
   this.AlarmList = null;    /* AlarmRecord[] : List of alarms. */
   this.AlarmDialogVisible = false;  /*boolean*/
   
   /* Is used to show a help message when the alarm dialog is shown for the 
      first time. 
   */
   this.FirstAlarmDialog = true;       /* boolean */
}

//////////////////////////////////////////////////////////////////////////
// Display alarm table as a top level floating dialog.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.ShowAlarms = function( title )
{
   /* Load alarm drawing alarms.g if it hasn't been loaded already. 
      Otherwise, make previously stored AlarmDialog visible.
   */
   if( this.AlarmDialog == null )
     GLG.LoadWidgetFromURL( this.Viewer.GetFullName( "alarms.g" ), null,
                            this.AlarmLoadCB.bind( this ), 
                            /*user data*/ title,
                            /*abort test function*/ ()=>!this.Viewer.Active );
   else
   {
      // Make AlarmDialog visible.
      this.ShowAlarmDialog( true );
      this.AlarmDialog.Update();
   }   
}

//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.AlarmLoadCB =
  function( /*GlgObject*/ drawing, /*String*/ title, path )
{
   if( !this.Viewer.Active )
     return;
    
   if( drawing == null )
   {     
      AppAlert( "Can't load alarm drawing, check console message for details." );
      return;
   }

   // Store loaded viewport.
   this.AlarmDialog = drawing;

   // Adjust dialog parameters for mobile devices.
   this.AdjustAlarmDialogForMobileDevices();

   // Initialize alarm dialog before hierarchy setup.
   this.InitAlarmDialogBeforeH();

   // Setup hierarchy.
   this.AlarmDialog.SetupHierarchy();

   // Initialize alarm dialog.
   this.InitAlarmDialogAfterH();

   // Set title for the AlarmDialog.
   this.AlarmDialog.SetSResource( "ScreenName", title );

   // Display alarm dialog as a floating dialog.
   this.AlarmDialog.InitialDraw();
}

//////////////////////////////////////////////////////////////////////////
// Initialize before hierarchy setup.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.InitAlarmDialogBeforeH = function()
{
   // Add event listeners.
   this.AlarmDialog.AddListener( GLG.GlgCallbackType.INPUT_CB,
                                 this.AlarmInputCallback.bind( this ) );
   this.AlarmDialog.AddListener( GLG.GlgCallbackType.TRACE_CB,
                                 this.AlarmTraceCallback.bind( this ) );
    
   // Store an object ID of the AlarmDialog viewport.
   this.AlarmListVP = this.AlarmDialog.GetResourceObject( "Table" );
   this.NumAlarmRows = Math.trunc( this.AlarmListVP.GetDResource( "NumRows" ) );

   // Set "ProcessMouse" for the viewport to enable custom events on MouseClick.
   this.AlarmListVP.SetDResource( "ProcessMouse",
                                  GLG.GlgProcessMouseMask.MOUSE_CLICK );
    
   // Initialize alarm list (set initial values in the template).
   this.AlarmListVP.SetSResource( "Row/ID", "" );
   this.AlarmListVP.SetSResource( "Row/Description", "" );
   this.AlarmListVP.SetDResource( "Row/UseStringValue", 0.0 );
   this.AlarmListVP.SetDResource( "Row/DoubleValue", 0.0 );
   this.AlarmListVP.SetSResource( "Row/StringValue", "" );
   this.AlarmListVP.SetDResource( "Row/AlarmStatus", 0.0 );
   this.AlarmListVP.SetDResource( "Row/RowVisibility", 0.0 );
   this.AlarmListVP.SetDResource( "Row/BlinkingEnabled", 0.0 );

   // Set dialog size and position.
   this.PositionAlarmDialog();

   // Make dialog visible.
   this.ShowAlarmDialog( true );
}

//////////////////////////////////////////////////////////////////////////
// Initialize after hierarchy setup.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.InitAlarmDialogAfterH = function()
{
   // Store object ID's of alarm rows for faster access.
   this.AlarmRows = new Array( this.NumAlarmRows );
   for( let i=0; i<this.NumAlarmRows; ++i )
     this.AlarmRows[i] = this.AlarmListVP.GetResourceObject( "Row" + i );
}

//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.GetAlarmData = function()
{
   if( !this.Viewer.Active )
     return;

   this.Viewer.DataFeed.GetAlarms( /*callback*/ this.AlarmDataCB.bind( this ),
                                   /*user data*/ null );
}

//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.AlarmDataCB = function( alarm_list )
{
   if( !this.Viewer.Active )
     return;

   if( alarm_list != null )
   {   
      /* Store the obtained alarm list, it will be used to scroll the alarm
         list using scrollbars.
      */
      this.AlarmList = alarm_list;

      /* Highlight the Alarms button if there are unacknowledged alarms
         in the obtained alarm list. Push new alarm data to graphics 
         if the user clicked on the Alarms button to show the 
         alarm dialog.
      */
      this.ProcessAlarms();
   }
    
   // Send new data query request.
   setTimeout( this.GetAlarmData.bind( this ), ALARM_UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
// Show/Hide alarm dialog.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.ShowAlarmDialog = function( /*boolean*/ show )
{
   if( this.AlarmDialog == null )
     return;

   /* Show the help message only when the alarm dialog is drawn for the
      first time.
   */
   if( show && this.FirstAlarmDialog )
   {
      this.FirstAlarmDialog = false;
      this.Viewer.ShowMessageDialog( ( this.Viewer.TouchDevice ?
                                       "Click" : "Ctrl-click" ) +
                                     " on the alarm row to acknowledge an alarm.",
                                     false );
   }
    
   this.AlarmDialog.SetDResource( "Visibility", show ? 1 : 0 );
   this.AlarmDialogVisible = show;
}

//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.AlarmInputCallback =
  function( /*GlgObject*/ viewport, /*GlgObject*/ message_obj )
{
   if( !this.Viewer.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );   /*String*/
   let format = message_obj.GetSResource( "Format" );   /*String*/
   let action = message_obj.GetSResource( "Action" );   /*String*/
    
   // Retrieve selected object ID from the message object.
   let selected_obj = message_obj.GetResourceObject( "Object" );

   // Handle window closing.
   if( format == "Window" && action == "DeleteWindow" )
   {
      if( selected_obj.Equals( this.AlarmDialog ) )
         this.CloseAlarmDialog();
   }

   // Handle custom events.
   else if( format == "CustomEvent" )
   {
      let event_label = message_obj.GetSResource( "EventLabel" );
      let action_data = null;
        
      if( event_label == null || event_label.length == 0 )
        return;    // don't process events with empty EventLabel.
        
      let action_obj = message_obj.GetResourceObject( "ActionObject" ); 
      if( action_obj != null )
        action_data = action_obj.GetResourceObject( "ActionData" );
        
      if( event_label == "AlarmRowACK" )
      {
         // The object ID of the alarm row selected by Ctrl-click.
         let alarm_row = selected_obj;
            
         // Retrieve the tag source.
         let tag_source = alarm_row.GetSResource( "ID" );
            
         this.Viewer.DataFeed.ACKAlarm( tag_source );
      }
      else
      {
         /* Place custom code here to handle custom events as needed. */
      }
        
      viewport.Update();
   }

   else if( format == "Button" && action == "Activate" )
   {
      /* Alarm scrolling buttons. */
      if( origin == "ScrollToTop" )
      {
         this.AlarmStartRow = 0;
         this.ProcessAlarms();
      }
      else if( origin == "ScrollUp" )
      {
         --this.AlarmStartRow;
         if( this.AlarmStartRow < 0 )
           this.AlarmStartRow = 0;
         this.ProcessAlarms();
      }
      else if( origin == "ScrollUp2" )
      {
         this.AlarmStartRow -= this.NumAlarmRows;
         if( this.AlarmStartRow < 0 )
           this.AlarmStartRow = 0;
         this.ProcessAlarms();
      }
      else if( origin == "ScrollDown" )
      {
         ++this.AlarmStartRow;
         this.ProcessAlarms();
      }
      else if( origin == "ScrollDown2" )
      {
         this.AlarmStartRow += this.NumAlarmRows;
         this.ProcessAlarms();
      }
      else
        return;

      viewport.Update();
   }
   else if( format == "Timer" )
     viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Trace callback is used to process native events of interest.
//////////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.AlarmTraceCallback =
  function( /*GlgObject*/ viewport, /*GlgTaceData*/ trace_info )
{   
   if( !this.Viewer.Active )
     return;

   // Process events only in the AlarmVP (Alarm table viewport).
   if( !trace_info.viewport.Equals( this.AlarmListVP ) )
     return;

   let x, y;   // Cursor position.
   let event_type = trace_info.event_type;     // Native event type.

   switch( event_type )
   {
    case GLG.GlgEventType.MOUSE_PRESSED:
    case GLG.GlgEventType.MOUSE_MOVED:
      x = trace_info.mouse_x;
      y = trace_info.mouse_y;
      break;

    default: break;
   }
}

//////////////////////////////////////////////////////////////////////////
// Fills AlarmDialog with received alarm data if the AlarmDialog is
// visible. Highlights the Alarms button if there are unacknowledged 
// alarms in the alarm list. 
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.ProcessAlarms = function()
{
   let num_alarms = 0; /*int*/
   if( this.AlarmList != null )
     num_alarms = this.AlarmList.length;
    
   // Highlight Alarms button if there are unacknowledged alarms.
   let has_active_alarms = false;

   for( let i=0; i<num_alarms; ++i )
   {
      let alarm = this.AlarmList[i];  /*AlarmRecord*/
      if( !alarm.ack )
      {
         has_active_alarms = true;
         break;
      }
   }

   // Highlight the Alarms button.
   this.HighlightAlarmButton( has_active_alarms );        
    
   if( this.AlarmDialog == null || !this.AlarmDialogVisible )
     return;
    
   /* Fill alarm rows starting with the AlarmStartRow that controls
      scrolling.
   */
   let num_visible = num_alarms - this.AlarmStartRow; /*int*/
   if( num_visible < 0 )
     num_visible = 0;
   else if( num_visible > this.NumAlarmRows )
     num_visible = this.NumAlarmRows;
    
   // Fill alarm rows.
   for( let i=0; i<num_visible; ++i )
   {         
      let alarm = this.AlarmList[i];       /*AlarmRecord*/
      let alarm_row = this.AlarmRows[i];   /*GlgObject*/
        
      alarm_row.SetDResourceIf( "AlarmIndex", this.AlarmStartRow + i + 1,
                                true );
      alarm_row.SetDResourceIf( "TimeInput", alarm.time, true  );
      alarm_row.SetSResourceIf( "ID", alarm.tag_source, true );
      alarm_row.SetSResourceIf( "Description", alarm.description, true );
        
      // Set to 1 to supply string value via the StringValue resource.
      // Set to 0 to supply double value via the DoubleValue resource.
      alarm_row.SetDResourceIf( "UseStringValue", 
                                alarm.string_value == null ? 0.0 : 1.0, true );
      if( alarm.string_value == null )
        alarm_row.SetDResourceIf( "DoubleValue", alarm.double_value, true );
      else
        alarm_row.SetSResourceIf( "StringValue", alarm.string_value, true );

      alarm_row.SetDResourceIf( "RowVisibility", 1.0, true  );
      alarm_row.SetDResourceIf( "AlarmStatus", alarm.status, true );
        
      /* Enable blinking: will be disabled when alarm is ACK'ed. */
      alarm_row.SetDResourceIf( "BlinkingEnabled", alarm.ack ? 0.0 : 1.0, 
                                true );
   }
    
   /* Empty the rest of the rows. Use true as the last parameter to update
      only if the value changes.
   */
   for( let i=num_visible; i<this.NumAlarmRows; ++i )
   {
      let alarm_row = this.AlarmRows[i];
        
      alarm_row.SetDResourceIf( "AlarmIndex", this.AlarmStartRow + i + 1,
                                true );
      alarm_row.SetSResourceIf( "ID", "", true );
        
      // Set status to normal to unhighlight the rightmost alarm field.
      alarm_row.SetDResourceIf( "AlarmStatus", 0.0, true );
        
      // Make all text labels invisible.
      alarm_row.SetDResourceIf( "RowVisibility", 0.0, true );
        
      alarm_row.SetDResourceIf( "BlinkingEnabled", 0.0, true );
   }
    
   this.AlarmDialog.Update();
}

//////////////////////////////////////////////////////////////////////////
// Highlight Alarm button if there are unacknowledged alarms.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.HighlightAlarmButton = function( /*boolean*/ highlight )
{
   if( !this.Viewer.Active )
     return;
   
   let alarm_button_name = this.Viewer.GLG_div_name + "_alarms";   
   let button = document.getElementById( alarm_button_name );
   if( !button )
   {
      if( this.Viewer.Debug )
        AppLog( "Can't find " + alarm_button_name +
                " button: it may have been removed from the document." );
      return;
   }

   if( highlight )
     button.style.backgroundColor = 'rgb(255,0,0)';
   else
     button.style.backgroundColor = 'rgb(240,240,240)';
}

//////////////////////////////////////////////////////////////////////////
// Set AlarmDialog size and position.
//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.PositionAlarmDialog = function()
{
   let offset_x, offset_y;
   let width, height;

   // Define dialog size and position in CSS pixels.
   if( this.Viewer.IsMobile )   // Mobile device.
   {
       offset_x = 10;
       offset_y = 80;
       width = window.screen.width - 20;
       height = width * 0.6;
   }
   else   // Desktop
   {
      offset_x = 50;
      offset_y = 125;
      width = 600;
      height = 450;
   }

   // Set dialog position relatively to the glg_area.
   let glg_area = document.getElementById( this.Viewer.GLG_div_name );
   let x = glg_area.offsetLeft + offset_x;
   let y = glg_area.offsetTop + offset_y;
   
   // Convert to device pixel coordinates used by ConfigureWindow.
   let CoordScale = this.Viewer.CoordScale;
   x *= CoordScale;
   y *= CoordScale;
   width *= CoordScale;
   height *= CoordScale;
   
   // Set BaseWidth to increase text size on browser zoom.
   this.AlarmDialog.SetDResource( "BaseWidth", width );
    
   ConfigureWindow( this.AlarmDialog, x, y, width, height );
}

//////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.AdjustAlarmDialogForMobileDevices = function()
{
   if( !this.Viewer.IsMobile )   // Desktop.
     return;

   this.AlarmDialog.SetDResource( "Table/NumRows", 6. );
   this.AlarmDialog.SetDResource( "Table/NumVisibleRows", 6. );

   let CoordScale = this.Viewer.CoordScale;
   ScaleParameter( this.AlarmDialog, "ScrollWidth", CoordScale );
   ScaleParameter( this.AlarmDialog, "TopScrollHeight", CoordScale );
   ScaleParameter( this.AlarmDialog, "BottomScrollHeight", CoordScale );
   ScaleParameter( this.AlarmDialog, "HeaderHeight", 1.5 );
}

//////////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.CloseAlarmDialog = function()
{
   if( this.AlarmDialog != null )
   {
      this.ShowAlarmDialog( false );  // Hide the dialog.
      this.AlarmDialog.Update();
   }
}

//////////////////////////////////////////////////////////////////////////////
AlarmPage.prototype.DestroyAlarmDialog = function()
{
   if( this.AlarmDialog != null )
     this.AlarmDialog.ResetHierarchy();
}
