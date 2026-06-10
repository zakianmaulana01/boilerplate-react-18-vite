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
import { GlgRTChart } from './glg_scripts/misc_demos/GlgRTChart.js'
import './glg_demo.css';

function GlgRTChartDemo( { glg_div_name, style } )
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

   /* onClick callback for the button that changes chart mode (real-time or
      historical).
   */
   const SetMode = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.SetMode( -1 );
   };

   // onChange callback for the AutoScroll checkbox.
   const ChangeAutoScroll = ( is_checked )=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeAutoScroll( is_checked ? 1 : 0 );
   };

   // onChange callback for the span buttons.
   const SetChartSpan = ( span )=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.SetChartSpan( span, /* update chart */ true );
   };

   // onChange callback for the Touch Action radiobox.
   const SetTouchAction = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.SetTouchAction();
   };
    
   // Specifies the script to be used by the GlgBase component.
   const script_constructor =
     ()=>new GlgRTChart( glg_div_name, glg_path, standalone, isMobile );

   /* Pass glg_div_name and script_data as parameters to GlgBase. 
      Hide the Change Size button on mobile devices.
   */
   return (
            <>
              <div style={{display: "flex", alignItems: "center"}}>
    
                { isMobile ? null :
                    <button onClick={ ChangeSize } style={{margin: "3px"}}>
                       Change Drawing Size</button>
                }

                <div className="checkbox_div" style={{margin: "3px"}}>
                  <input type="checkbox" id={glg_div_name + "_auto_scroll"}
                         className="checkbox_input"
                         name={glg_div_name + "_autoscroll"} value="1"
                         onChange={(e)=>ChangeAutoScroll( e.target.checked )} />
                  <label htmlFor={glg_div_name + "_auto_scroll"}
                         className="checkbox_label">AutoScroll</label>
                </div>

                <button id={glg_div_name + "_chart_mode"}
                        onClick={ SetMode } style={{margin: "3px"}}>
                   Change to Historical</button>
              </div>

              { !isMobile ? null :
               <div style={{marginTop: "5px", marginBottom: "5px" }}>
                 <button id={glg_div_name + "_SpanButton0"}
                         style={{margin: "3px 10px 3px 3px"}}
                         onClick={()=>SetChartSpan( 0 )}>
                   10 sec</button>
                 <button id={glg_div_name + "_SpanButton1"}
                         style={{margin: "3px 10px 3px 3px"}}
                         onClick={()=>SetChartSpan( 1 )}>
                   1 min</button>
                 <button id={glg_div_name + "_SpanButton2"}
                         style={{margin: "3px 10px 3px 3px"}}
                         onClick={()=>SetChartSpan( 2 )}>
                   10 min</button>
                 <button id={glg_div_name + "_SpanButton3"}
                         style={{margin: "3px 10px 3px 3px"}}
                         onClick={()=>SetChartSpan( 3 )}>
                   All</button>
                <br/>
               </div>
              }
              
              <div id={glg_div_name + "_touch_action"}
                   className="radio_container"
                   style={{margin: "3px 0px 10px 3px"}}>
                Touch Action: 
                <div className="checkbox_div" style={{margin: "3px"}}>
                  <input type="radio" id={glg_div_name + "_crosshair_mode"}
                         className="checkbox_input" value="0"
                         name={glg_div_name + "_touch_action"} defaultChecked
                         onChange={ SetTouchAction } />
                  <label htmlFor={glg_div_name + "_crosshair_mode"}
                         className="checkbox_label">Crosshair</label>
                </div>
                
                <div className="checkbox_div" style={{margin: "3px"}}>
                  <input type="radio" id={glg_div_name + "_scroll_mode"}
                         className="checkbox_input" value="1"
                         name={glg_div_name + "_touch_action"}
                         onChange={ SetTouchAction } />
                  <label htmlFor={glg_div_name + "_scroll_mode"}
                         className="checkbox_label">Scroll Chart</label>
                </div>
              </div>
              
              <GlgBase glg_div_name={glg_div_name}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgRTChartDemo;
