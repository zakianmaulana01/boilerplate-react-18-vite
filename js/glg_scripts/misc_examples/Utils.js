/* eslint eqeqeq: 0, no-unused-vars: 0 */
/* eslint @typescript-eslint/no-unused-vars: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Get a handle to the GLG Toolkit library.
export let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
export function IsUndefined( /*String*/ str )  /* boolean */
{
   return ( str == null || str.length == 0 || 
            str == "unset" || str == "$unnamed" );
}

//////////////////////////////////////////////////////////////////////////
export function GetCurrTime()
{
   return Date.now() / 1000;    // seconds
}   

//////////////////////////////////////////////////////////////////////////////
// Retrieves a preferred value defined in the loaded drawing by the specified 
// name.If no preferred value is found, the supplied default value is returned.
//////////////////////////////////////////////////////////////////////////////
export function GetPreferredValue( /*GlgObject*/ drawing, /*String*/ name,
                            /*int*/ default_value )     /*int*/
{
   if( drawing.HasResourceObject( name ) )
     return drawing.GetDResource( name );
   else
     return default_value;
}

//////////////////////////////////////////////////////////////////////////////
export function ConfigureWindow( /*GlgObject*/ drawing,  x, y, width, height )
{
   /* x, y, width and height may be supplied as either integer or double
      values. Truncate to convert possible doubles to integers to avoid
      exceptions when a debugging library with strict type checking is used.
   */
   drawing.ConfigureWindow( Math.trunc( x ), Math.trunc( y ),
                            Math.trunc( width ), Math.trunc( height ),
                            GLG.GlgConfigureMask.POSITION_AND_SIZE_MASK,
                            null );
}

//////////////////////////////////////////////////////////////////////////////
// Enable or disable a GLG button with a specified name.
//////////////////////////////////////////////////////////////////////////////
export function SetButtonState( /*GlgObject*/ viewport, /*String*/ res_name,
                                /*boolean*/ state )
{
   let button;
   if( res_name != null )
   {
      button = viewport.GetResourceObject( res_name );
      if( button == null )
      {
         AppError( "Can't find button: " + res_name );
         return;
      }
   }
   else
     button = viewport;

   button.SetDResource( "DisableInput", state ? 0. : 1. ); 
}

//////////////////////////////////////////////////////////////////////////
// Sets a D parameter of the specified object to the specified value.
// Returns false if the specified resource is not present.
// Returns true on success.
//////////////////////////////////////////////////////////////////////////
export function SetParameter( /*GlgObject*/ object, /*String*/ res_name,
                              /*double*/ value ) /* boolean */
{
   let res_obj = object.GetResourceObject( res_name );
   if( res_obj == null )
     return false;
   
   return res_obj.SetDResourceIf( null, value, /*if_changed*/ true );
}

//////////////////////////////////////////////////////////////////////////
// Scale a D parameter of the specified object by the specified scale
// factor.
//////////////////////////////////////////////////////////////////////////
export function ScaleParameter( /*GlgObject*/ object, /*String*/ res_name,
                                /*double*/ scale ) /* boolean */
{
   let res_obj = object.GetResourceObject( res_name );
   if( res_obj == null )
     return false;

   let value = res_obj.GetDResource( null );
   return res_obj.SetDResource( null, value * scale );
}

//////////////////////////////////////////////////////////////////////////
export function CheckElement( name, state )
{
   let element = document.getElementById( name );
   if( element != null )
     element.checked = state;
}

//////////////////////////////////////////////////////////////////////////
export function ShowElement( name, state )
{
   let element = document.getElementById( name );
   if( element != null )
     element.style.display = ( state ? "inline-block" : "none" );
}

//////////////////////////////////////////////////////////////////////////////
export function AppError( message )
{
   console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
export function AppAlert( message )
{
   window.alert( message );
}

//////////////////////////////////////////////////////////////////////////////
export function AppLog( message )
{
   console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
export function AppInfo( message )
{
   console.info( message );
}
