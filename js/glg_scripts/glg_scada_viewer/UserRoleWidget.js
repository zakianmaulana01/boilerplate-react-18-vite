/* eslint eqeqeq: 0 */

import { USER_ROLE, ADMINISTRATOR_ROLE } from './DataStructures.js'
import { GLG, SetButtonState, AppInfo } from './Utils.js'

//////////////////////////////////////////////////////////////////////////////
// UserRoleWidget object: 
// Handles a widget with WidgetType=UserRole.
//////////////////////////////////////////////////////////////////////////////
export function UserRoleWidget( glg_viewer,
                                /*GlgObject*/ glg_obj, /*String*/ user_role )
{
   this.Viewer = glg_viewer;

   /* Use GetReference API method to obtain a GlgObject instance that can be 
      stored in a persistent variable.
   */
   this.glg_obj = GLG.GetReference( glg_obj ); /* GlgObject: widget viewport. */
   this.widget_type = "UserRole";   /* String: WidgetType property. */
   this.user_role = user_role;      /* String: Initialized to current UserRole.
                                       It gets updated based on the new
                                       requested role setting from the GUI. */
}

//////////////////////////////////////////////////////////////////////////////
// Initialization before hierarchy setup.
//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.InitBeforeH = function()
{
   // Using closure to capture "this".
   this.glg_obj.AddListener( GLG.GlgCallbackType.INPUT_CB,
                             ( vp, msg )=>this.InputCallback( vp, msg ) );
}   

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.InitAfterH = function()
{
   if( this.user_role == null )
   {
     AppInfo( "UserRoleWidget initialization failed." );
     return;
   }

   this.glg_obj.SetDResource( "PwdGroup/Visibility", 0.0 );
   this.glg_obj.SetSResource( "PwdInput/TextString", "" );
   this.glg_obj.SetDResource( "Menu/SelectedIndex",
                              this.user_role == ADMINISTRATOR_ROLE ? 1.0 : 0.0 );
   this.glg_obj.SetDResource( "PwdValid", 1.0 );

   /* Disable OKButton. It will be enabled when the user switches user role
      using the rolw selection menu.
   */
   SetButtonState( this.glg_obj, "OKButton", false );
}

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.InputCallback =
    function( /*GlgObject*/ viewport, /*GlgObject*/ message_obj )
{
   if( !this.Viewer.Active )
     return;
    
   let origin = message_obj.GetSResource( "Origin" );   /*String*/
   let format = message_obj.GetSResource( "Format" );   /*String*/
   let action = message_obj.GetSResource( "Action" );   /*String*/

   if( format == "Menu" && origin == "Menu" )
   {
      if( action == "Activate" )
      {
         let index = message_obj.GetDResource( "SelectedIndex" );

         if( index == 0 ||
             ( index == 1 && this.Viewer.UserRole == ADMINISTRATOR_ROLE ) )
         {
            /* No password needed: we either switch from ADMIN to USER or
               current UserRole is already ADMIN. Enable OK button allowing
               to save the new setting and close the dialog.
            */
            this.glg_obj.SetDResource( "PwdGroup/Visibility", 0.0 );
            SetButtonState( this.glg_obj, "OKButton", true );
         }
         else 
         {
            // Switching from USER to ADMIN: password required. 
            this.glg_obj.SetDResource( "PwdGroup/Visibility", 1.0 );
            this.glg_obj.SetSResource( "PwdInput/TextString", "" );
            this.glg_obj.SetDResource( "PwdValid", 1.0 );
         }

         // Store new setting.
         this.user_role = ( index == 0 ? USER_ROLE : ADMINISTRATOR_ROLE );
      }

      this.glg_obj.Update();
   }

   else if( format == "Text" && origin == "PwdInput" )
   {
      if( action == "ValueChanged" || action == "Activate" )
      {
         // Enable OKButton
         SetButtonState( this.glg_obj, "OKButton", true );
         this.glg_obj.Update();
      }
          
      if( action == "Activate" )
        // Send Activate message to OKButton.
        this.glg_obj.SendMessageToObject( "OKButton/Handler", "Activate",
                                          null, null, null, null );
   }
   
   else if( format == "CustomEvent" )
   {
      let event_label = message_obj.GetSResource( "EventLabel" );
      if( event_label == null || event_label == "" )
        return;
      
      switch( event_label )
      {
       case "ChangeUserRole":
         if( this.user_role == USER_ROLE )
         {
            /* Switching to USER ROLE, change system UserRole right away,
               no password or verification needed, and close popup dialog.
            */ 
            this.Viewer.ChangeUserRole( this.user_role );
            this.Viewer.CloseActivePopup();
         }
         else
         {
            /* Switching to ADMIN, password verification is required. */ 
            let pwd = this.glg_obj.GetSResource( "PwdInput/TextString" );
            this.Viewer.DataFeed.VerifyPassword( this.user_role, pwd,
                                                 /*callback*/
                                                 this.VerifyCB.bind( this ) );
         }
         break;

       case "CancelChanges":
         break;

       default: break;
      }
   }
   else
     /* Pass the unprocessed event to the global InputCallback
        of the Viewer. For example, the widget's OK and Cancel buttons 
        have a ClosePopupDialog command which will be handled by the 
        Viewer's InputCallback.
     */
     this.Viewer.InputCallback( viewport, message_obj );
}

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.VerifyCB = function( /*boolean*/ is_valid )
{
   if( !this.Viewer.Active )
     return;

   if( is_valid )
   {
      this.Viewer.ChangeUserRole( this.user_role );
      this.Viewer.CloseActivePopup();
      return;
   }

   /* Invalid password: display a message and disable OK button. It will be
      enabled only when the user enters new password.
   */
   this.glg_obj.SetDResource( "PwdValid", 0.0 );
   SetButtonState( this.glg_obj, "OKButton", false );
   this.glg_obj.Update();
}

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.FinishSetup = function()
{
}

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.BeforeReset = function()
{
}

//////////////////////////////////////////////////////////////////////////////
UserRoleWidget.prototype.AfterReset = function()
{
}
