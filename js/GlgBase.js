////////////////////////////////////////////////////////////////////////////
// This is a generic GLG component that may be used to load and display
// any GLG drawing.
//
// Parameters passed by the parent component:
//   glg_div_name    - the name to use for the component's div element used
//                     to display the GLG drawing.
//   style           - specifies the component's width and height.
//   script_instance - an script object used to load the GLG drawing and
//                     handle its behavior, data updates and user interaction
//                     (real-time chart, SCADA or GIS monitoring, etc.).
//                     The script object must contain the Start method used to
//                     start the script, and the Cleanup method used for 
//                     cleanup.
////////////////////////////////////////////////////////////////////////////

import { useRef, useEffect } from 'react';
import './GlgBase.css';      // Styles for dynamic loader icon.

// Enable debugging/diagnostics information.
const DEBUG = false;

/* eslint-disable react-hooks/exhaustive-deps */

////////////////////////////////////////////////////////////////////////////
function GlgBase( { glg_div_name, script_constructor, parent_instance_ref } )
{
   Debug( "GLG component: Rendering: " + glg_div_name );

   var local_instance_ref = useRef( null );   
   
   /* StartGLG function starts the supplied script to load a GLG drawing and
      displays it inside the div element with the name supplied by the
      glg_div_name parameter.

      This has to be done after the component has been rendered, which is
      accomplished by using useEffect. [] is used to specify no dependencies,
      to invoke only on the initial rendering.

      In order for Cleanup to be invoked for a proper instance, script instance
      has to be created inside useEffect. This is why a script constructor 
      (and not the script instance) is passed from the parent.
   */    
   useEffect( ()=>StartGLG( glg_div_name, script_constructor,
                            parent_instance_ref, local_instance_ref ), [] );

   /* Return a div that will be used to host the GLG drawing inside it.
      The "loader_container" div is used to display a dynamic loader icon.
   */
   return ( <div id={glg_div_name}>
              <div id="loader_container">
                <div id="loader"></div>
              </div>
            </div> );
}

export default GlgBase;

//////////////////////////////////////////////////////////////////////////
function StartGLG( glg_div_name, script_constructor,
                   parent_instance_ref, local_instance_ref )
{
   if( script_constructor == null )
   {
      console.error( "Missing GLG Script with the Start and Cleanup methods." );
      return;
   }

   /* Start the suppled script to load a GLG drawing and display it inside
      the div element with the name supplied by the glg_div_name parameter
      when the script instance was created.
   */
   if( local_instance_ref.current == null )
   {
      local_instance_ref.current = script_constructor();
      local_instance_ref.current.Start();

      // Pass script instance to parent if requested.
      if( parent_instance_ref )
        parent_instance_ref.current.instance = local_instance_ref.current;
      
      Debug( "GLG component: Starting " + glg_div_name + " with script: " +
             Object.getPrototypeOf( local_instance_ref.current ).constructor.name );      
   }

   /* Return the cleanup function. It will be used by React to cleanup when
      the component is deleted.
   */
   return ()=>{
                 Debug( "GLG component: Cleanup: " + glg_div_name );
                 local_instance_ref.current.Cleanup();
                 local_instance_ref.current = null;
                 if( parent_instance_ref )
                   parent_instance_ref.current.instance = null;
              }
}

//////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     console.log( message );
}
