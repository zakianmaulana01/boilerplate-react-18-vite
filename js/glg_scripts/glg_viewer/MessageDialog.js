/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars : 0 */

import { GLG, ConfigureWindow } from './Utils.js'

export function MessageDialogWidget( glg_viewer, /*GlgObject*/ dialog_vp  )
{
   this.Viewer = glg_viewer;
   this.dialog_vp = dialog_vp;
}

/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.SetupDialog = function()
{
   /* Initialize the dialog viewport before setup */
   this.InitBeforeH();

   /* Setup dialog as a top level window. */
   this.dialog_vp.SetupHierarchy();

   this.InitAfterH();

   this.dialog_vp.Update();
}

/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.ResetDialog = function()
{
   this.dialog_vp.ResetHierarchy();
}

/////////////////////////////////////////////////////////////////////
// Dialog initialization before setup.
/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.InitBeforeH = function()
{
   // Add Input Callback.
   this.dialog_vp.AddListener( GLG.GlgCallbackType.INPUT_CB,
                               this.InputCallback.bind( this ) );

   /* Make the dialog initially invisible. */
   this.dialog_vp.SetDResource( "Visibility", 0. );
    
   /* Make a dialog a free floating dialog. ShellType property
      can be also set at design time.
   */
   this.dialog_vp.SetDResource( "ShellType", GLG.GlgShellType.DIALOG_SHELL );

   this.dialog_vp.SetSResource( "Name", "MessageDialog" );
   this.dialog_vp.SetSResource( "Screen/ScreenName", "Message Dialog" );

   let width, height;
    
   // Define dialog size in CSS pixels.
   if( this.Viewer.IsMobile )
   {
      width = window.screen.width * 0.7;
      height = width / 3.;
   }
   else   // Desktop 
   {
      width = 350;
      height = 110;
   }

   // Set BaseWidth to increase text size on browser zoom.
   this.dialog_vp.SetDResource( "BaseWidth", width );

   // Center message dialog in glg_area.
   let glg_area = document.getElementById( this.Viewer.GLG_div_name );
   
   let x = glg_area.offsetLeft + ( glg_area.clientWidth - width ) / 2.;
   let y = glg_area.offsetTop + ( glg_area.clientHeight - height ) / 2.;

   // Convert to device pixel coordinates used by ConfigureWindow.
   let CoordScale = this.Viewer.CoordScale;
   x *= CoordScale;
   y *= CoordScale;
   width *= CoordScale;
   height *= CoordScale;
   
   ConfigureWindow( this.dialog_vp, x, y, width, height );
}

/////////////////////////////////////////////////////////////////////
// Dialog initialization after setup.
/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.InitAfterH = function()
{
   // Display the dialog on front of all other windows.
   let dialog_div = this.dialog_vp.GetResource( "Shell" );
   dialog_div.style.zIndex = "1";
}
      
/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.InputCallback =
    function( /*GlgObject*/ viewport, /*GlgObject*/ message_obj )
{
   if( !this.Viewer.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );   /*String*/
   let format = message_obj.GetSResource( "Format" );   /*String*/
   let action = message_obj.GetSResource( "Action" );   /*String*/

   if( format == "Button" && action == "Activate" && origin == "OKButton" )
   {
      // Event from the OK button: hide the dialog.
      this.Erase();
      viewport.Update();
   }
   else if( format == "Window" && action == "DeleteWindow" )
   {
      this.Erase();  // Hide MessageDialog
      viewport.Update();
   }
}

/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.Show =
    function( /*String*/ message_str, /*bool*/ error )
{
   /* Set the specified message string. */
   this.dialog_vp.SetSResource( "MessageString", message_str );
   
   /* Set to 1. to highlight the message in red. */
   this.dialog_vp.SetDResource( "ShowErrorColor", error ? 1. : 0. );
   
   /* Show/hide the dialog. */
   this.dialog_vp.SetDResource( "Visibility", 1. );
   this.dialog_vp.Update();
}

/////////////////////////////////////////////////////////////////////
MessageDialogWidget.prototype.Erase = function()
{
   this.dialog_vp.SetDResource( "Visibility", 0. );
   this.dialog_vp.Update();
}
