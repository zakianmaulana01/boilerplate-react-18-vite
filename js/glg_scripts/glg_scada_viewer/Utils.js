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
// name. If no preferred value is found, the supplied default value is returned.
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
// Retrieves a value of a named D resource. If the property with the specified
// name is not found, the supplied default value is returned.
// If use_xfvalue=true, a transformed value is returned.
//////////////////////////////////////////////////////////////////////////////
export function GetPropertyValue( /*GlgObject*/ glg_obj,
                                  /*String*/ property_name,
                                  /*double*/ default_value,
                                  /*boolean*/ use_xfvalue )    /* double */
{
   let property = glg_obj.GetResourceObject( property_name );
   if( property == null )
      return default_value;
    
   let value = property.GetDResource( use_xfvalue ? "XfValue" : null );
   if( value == null )
   {
      AppError( "Invalid D property: " + property_name );
      return default_value;
   }
    
   return value;
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

////////////////////////////////////////////////////////////////////////
export function RemoveArrayElement( array, data ) /* boolean */
{
   for( let i=0; i<array.length; ++i )
     if( array[i] == data )
     {
        array.splice( i, 1 );
        return true;
     }

   return false;
}

//////////////////////////////////////////////////////////////////////////////
// Returns true if the specified viewport is in ZoomToMode.
//////////////////////////////////////////////////////////////////////////////
export function ZoomToMode( /*GlgObject*/ viewport ) /* boolean */
{
   if( viewport == null )
   {
      AppError( "ZoomToMode(): Null viewport object." );
      return false;
   }
   
   let type = viewport.GetObjectType(); 
   if( type != GLG.GlgObjectType.VIEWPORT &&
       type != GLG.GlgObjectType.LIGHT_VIEWPORT )
   {
      AppError( "ZoomToMode(): Not a viewport object." );
      return false;
   }
   
   let zoom_mode = Math.trunc( viewport.GetDResource( "ZoomToMode" ) ); /*int*/
   return ( zoom_mode != 0 );
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
