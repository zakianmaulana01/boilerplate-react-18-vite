////////////////////////////////////////////////////////////////////////////
// This is a "subclass" of GlgBase that provides a GLG script instance
// used to implement GLG functionality of the GlgBase. The script loads
// the GLG drawings and handles its behavior, data updates and and user
// interaction.
//
// Parameters passed by the parent component:
//   glg_div_name    - a unique name for the component's div element used
//                     to display the GLG drawing.
//   style           - specifies the component's width and height.
//   title           - an optional title string to be displayed.
////////////////////////////////////////////////////////////////////////////

import { useRef } from 'react';
import { isMobile } from 'react-device-detect';
import GlgBase from './GlgBase.js';
import { GlgRTChartSimple } from './glg_scripts/misc_examples/GlgRTChartSimple.js'

function GlgSimpleChart( { glg_div_name, style, title } )
{
   const standalone = false;         // Script is used as a React component.

   // Load drawings from the public/glg/misc_examples directory.
   const glg_path = "glg/misc_examples";

   /* A holder for the script instance to filled by the child.
      It may be used to invoke script functions on button clicks.
   */
   var script_instance_ref = useRef( null );
   if( script_instance_ref.current == null )
     script_instance_ref.current = { instance : null };

   // onClick callback for the Change Size button.
   const ChangeSize = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.SetDrawingSize( true );
   };
   
   // Specifies the script to be used by the GlgBase component.
   const script_constructor =
     ()=>new GlgRTChartSimple( glg_div_name, glg_path, standalone, isMobile,
                               title );

   /* Pass glg_div_name and script_data as parameters to GlgBase. 
      Hide the Change Size button on mobile devices.
   */
   return (
            <>
              { isMobile ? null :
                  <button onClick={ ChangeSize } style={{margin: "3px"}}>
                          Change Drawing Size</button>
              }
                
              <GlgBase glg_div_name={glg_div_name}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgSimpleChart;
