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
////////////////////////////////////////////////////////////////////////////

import { useRef } from 'react';
import { isMobile } from 'react-device-detect';
import GlgBase from './GlgBase.js';
import { GlgRTChartSimple } from './glg_scripts/misc_demos/GlgRTChartSimple.js'

function GlgRTChartSimpleDemo( { glg_div_name, style } )
{
   const standalone = false;         // Script is used as a React component.

   // Load drawings from the public/glg/misc_demos directory.
   const glg_path = "glg/misc_demos";

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
    
   // Button's onClick callbacks.
   const StopUpdate = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.StopUpdate();
   };
   const StartUpdate = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.StartUpdate();
   };
   const Inverse = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.Inverse();
   };
   const ChangeType = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeType();
   };
   const ChangeSpan = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeSpan();
   };
   const ChangeRange = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeRange();
   };
   const ChangeColors = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeColors();
   };
   const ChangeLineWidth = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeLineWidth();
   };
   
   // Specifies the script to be used by the GlgBase component.
   const script_constructor =
     ()=>new GlgRTChartSimple( glg_div_name, glg_path, standalone, isMobile );

   /* Pass glg_div_name and script_data as parameters to GlgBase. 
      Hide the Change Size button on mobile devices.
   */
   return (
            <>
              { isMobile ? null :
                  <button onClick={ ChangeSize } style={{margin: "3px"}}>
                          Change Drawing Size</button>
              }
              <button onClick={ StopUpdate } style={{margin: "3px"}}>
                Stop Update</button>
              <button onClick={ StartUpdate } style={{margin: "3px"}}>
                Start Update</button>
              <br/>

              <button onClick={ Inverse } style={{margin: "3px"}}>
                Inverse</button>
              <button onClick={ ChangeType } style={{margin: "3px"}}>
                Change Type</button>
              <button onClick={ ChangeSpan } style={{margin: "3px"}}>
                Change Span</button>
              <button onClick={ ChangeRange } style={{margin: "3px"}}>
                Change Range</button>
              <button onClick={ ChangeColors } style={{margin: "3px"}}>
                Change Colors</button>
              <button onClick={ ChangeLineWidth } style={{margin: "3px"}}>
                Change Line Width</button>
                 
              <GlgBase glg_div_name={glg_div_name}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgRTChartSimpleDemo;
