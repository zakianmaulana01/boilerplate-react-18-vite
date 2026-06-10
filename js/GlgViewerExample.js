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
import { GlgViewer } from './glg_scripts/glg_viewer/GlgViewer.js'

function GlgViewerExample( { glg_div_name, style } )
{
   const standalone = false;          // Script is used as a React component.

   // Load drawings from the public/glg/glg_viewer directory.
   const glg_path = "glg/glg_viewer";

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

   // onClick callback for the Viewer buttons.
   const onClick = ( page_param ) => {
     console.log( "===== Button click: " + page_param );

     let script_instance = script_instance_ref.current.instance;
     if( !script_instance )
       return;
     
     switch( page_param )
     {
      default:
      case "Process":
        script_instance.LoadDrawing( 'process_overview.g', 'Process Overview' );
        break;
      case "Telemetry":
        script_instance.LoadDrawing( 'telemetry.g', 'Telemetry Data' );
        break;
      case "Commands":
        script_instance.LoadDrawing( 'commands.g', 'Object Commands' );
        break;
      case "RealTimeChart":
        script_instance.LoadDrawing( 'rtchart_page.g', 'RealTime Chart' );
        break;
      case "Alarms":
        script_instance.ShowAlarmDialog( 'System Alarms' );
        break;
       }
   }
   
   // Specifies the script to be used by the GlgBase component.
   const script_constructor =
     ()=>new GlgViewer( glg_div_name, glg_path, standalone, isMobile );

   /* Pass glg_div_name and script_data as parameters to GlgBase. 
      Hide the Change Size button on mobile devices.
   */
   return (
            <>
              { isMobile ? null :
                  <button onClick={ ChangeSize } style={{margin: "3px"}}>
                          Change Drawing Size</button>
              }
            
              <button onClick={ ()=>onClick( "Process" ) }
                      style={{margin: "3px"}}>
                      Process</button>

              <button onClick={ ()=>onClick( "Telemetry" ) }
                      style={{margin: "3px"}}>
                      Telemetry</button>

              <button onClick={ ()=>onClick( "Commands" ) }
                      style={{margin: "3px"}}>
                      Commands</button>

              <button onClick={ ()=>onClick( "RealTimeChart" ) }
                      style={{margin: "3px"}}>
                      RealTime Chart</button>

              <button onClick={ ()=>onClick( "Alarms" ) }
                      style={{margin: "3px"}}
                      id={glg_div_name + "_alarms"}>
                      Alarms</button>

              <div id={glg_div_name + "_status_div"}> <br/> </div>

              <GlgBase glg_div_name={glg_div_name} style={style}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgViewerExample;
