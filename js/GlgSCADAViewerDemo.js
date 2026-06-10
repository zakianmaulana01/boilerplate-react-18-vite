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
import { GlgViewer } from './glg_scripts/glg_scada_viewer/GlgViewer.js'
import './GlgSCADAViewerDemo.css';
// Icons
import { ZoomIn, ZoomOut, ZoomOutMap, ArrowBack, ArrowForward,
         ArrowUpward,ArrowDownward } from '@mui/icons-material';

function GlgSCADAViewerDemo( { glg_div_name, style } )
{
   const standalone = false;          // Script is used as a React component.

   // Load drawings from the public/glg/glg_scada_viewer directory.
   const glg_path = "glg/glg_scada_viewer";

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

   // onClick callback for zoom buttons.
   const PerformZoom = ( zoom_type ) => {
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.PerformZoom( zoom_type );
   };

   // onClick callback for the Viewer buttons.
   const LoadDrawing = ( page_param ) => {
     console.log( "===== Button click: " + page_param );

     let script_instance = script_instance_ref.current.instance;
     if( !script_instance )
       return;
     
     switch( page_param )
     {
      default:
      case "Plant":
        script_instance.LoadDrawing( 'main_layout_tabs.g',
                                     'Plant Monitoring and Control' );
        break;
      case "Charts":
        script_instance.LoadDrawing( 'rtchart_page.g', 'RealTime Charts' );
        break;
      case "Commands":
        script_instance.LoadDrawing( 'scada_test_commands.g',
                                     'Command Samples' );
        break;
      case "Aeration":
        script_instance.LoadDrawing( 'scada_aeration.g',
                                     'Aeration Monitoring' );
        break;
      case "Electrical":
        script_instance.LoadDrawing( 'scada_electric.g',
                                     'Electrical Circuit Monitoring' );
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
            
              <button onClick={ ()=>LoadDrawing( "Plant" ) }
                      style={{margin: "3px"}}>
                      Plant Monitoring and Control</button>

              <button onClick={ ()=>LoadDrawing( "Charts" ) }
                      style={{margin: "3px"}}>
                      RealTime Charts</button>

              <button onClick={ ()=>LoadDrawing( "Commands" ) }
                      style={{margin: "3px"}}>
                      Command Samples</button>

              <button onClick={ ()=>LoadDrawing( "Aeration" ) }
                      style={{margin: "3px"}}>
                      Aeration Monitoring</button>

              <button onClick={ ()=>LoadDrawing( "Electrical" ) }
                      style={{margin: "3px"}}>
                      Electrical Circuit</button>

              <button onClick={ ()=>LoadDrawing( "Alarms" ) }
                      style={{margin: "3px"}}
                      id={glg_div_name + "_alarms"}>
                      Alarms</button>
              <br/>
              <div id={glg_div_name + "_zoom_controls"}
                   style={{marginLeft: "3px", marginBottom: "0px"}}>
                      
                <button onClick={ ()=>PerformZoom('t') }
                        title="Click and drag in the drawing to define an area
                               to zoom to.">
                         Zoom To</button>
                  
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('i') }
                        title="Zoom In">
                  <ZoomIn/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('o') }
                        title="Zoom Out">
                  <ZoomOut/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('n') }
                        title="Reset Zoom">
                  <ZoomOutMap/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('l') }
                        title="Pan Left">
                  <ArrowBack/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('r') }
                        title="Pan Right">
                  <ArrowForward/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('u') }
                        title="Pan Up">
                  <ArrowUpward/></button>
      
                <button type="button" className="icon_button"
                        onClick={ ()=>PerformZoom('d') }
                        title="Pan Down">
                  <ArrowDownward/></button>
              </div>    

                <div id={glg_div_name + "_status_div"}
                         style={{marginLeft: "3px"}}> <br/> </div>

              <GlgBase glg_div_name={glg_div_name} style={style}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgSCADAViewerDemo;
