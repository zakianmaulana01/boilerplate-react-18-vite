import { useState } from 'react';
import { isMobile } from 'react-device-detect';
import './App.css';
import './glg_demo.css';

// GLG Demos
import GlgProcessDemo         from './GlgProcessDemo.js'
import GlgDashboardDemo       from './GlgDashboardDemo.js'
import GlgSCADAViewerDemo     from './GlgSCADAViewerDemo.js'
import GlgComboChartDemo      from './GlgComboChartDemo.js'
import GlgDataCenterDemo      from './GlgDataCenterDemo.js'
import GlgAirTrafficDemo      from './GlgAirTrafficDemo.js'
import GlgGISDemo             from './GlgGISDemo.js'
import GlgAvionicsDemo        from './GlgAvionicsDemo.js'
import GlgCircuitDemo         from './GlgCircuitDemo.js'
import GlgRTChartSimpleDemo   from './GlgRTChartSimpleDemo.js'
import GlgRTChartDemo         from './GlgRTChartDemo.js'
import GlgDiagramEditorDemo   from './GlgDiagramEditorDemo.js'
import GlgRobotArmDemo        from './GlgRobotArmDemo.js'
import GlgControlsDemo        from './GlgControlsDemo.js'
import GlgSatelliteDemo       from './GlgSatelliteDemo.js'
import GlgTrajectoryDemo      from './GlgTrajectoryDemo.js'
import GlgAirCombatDemo       from './GlgAirCombatDemo.js'
import GlgMapDemo             from './GlgMapDemo.js'
import GlgGraphDemo           from './GlgGraphDemo.js'

// GLG Examples
import GlgChartExample        from './GlgChartExample.js'
import GlgSimpleChartExample  from './GlgSimpleChartExample.js'
import GlgDashboardExample    from './GlgDashboardExample.js'
import GlgSimpleViewerExample from './GlgSimpleViewerExample.js'
import GlgViewerExample       from './GlgViewerExample.js'

function App()
{
   const DEFAULT_DEMO_PAGE = "SCADAViewer";
   const DEFAULT_EXAMPLES_PAGE = "RealTimeChart";

   const onClick = ( page_param, force_param ) =>
   {
      //console.log( "===== Button click: " + page_param );
      setPage( page_param );

      /* Force to reload pages that use start_page parameter.
         These pages may change the displayed page themselves, and using the
         force parameter forces them to restore the start page.
      */
      if( force_param )
        setForce( force + 1 );
   }

   // Switches to show either demo or example buttons. 
   const SetDemosExamples = () =>
   {
      var demo_elem = document.getElementById( "demos" );
      var new_demo_mode = demo_elem.checked;
      
      if( DemoMode !== new_demo_mode )
      {         
         setDemoMode( new_demo_mode );

         /* New useState's DemoMode settings will be available only on the next
            rerender, use new_demo_mode.
         */
         setPage( new_demo_mode ? DEFAULT_DEMO_PAGE : DEFAULT_EXAMPLES_PAGE );
      }
   }

   // Use page parameter provided with the URL, if any.
   const queryParameters = new URLSearchParams( window.location.search )
   const url_page_param = queryParameters.get( "page" )

   // url_page_param specifies initial page on startup.
   const [page, setPage] =
     useState( url_page_param == null ? DEFAULT_DEMO_PAGE : url_page_param );

   const [force, setForce] = useState( 0 );

   const [DemoMode, setDemoMode] = useState( true );
   
   let glg_component;    
   switch( page )
   {
      /////////////// Demos
    case "ProcessDemo":
      glg_component = <GlgProcessDemo glg_div_name="glg_process"/>;
      break;
      
    case "DashboardDemo":
      glg_component = <GlgDashboardDemo glg_div_name="glg_dashboard"/>;
      break;
       
    default:
    case "SCADAViewer":
      glg_component = <GlgSCADAViewerDemo glg_div_name="glg_scada_viewer"/>;
      break;

    case "ComboChart":
      glg_component = <GlgComboChartDemo glg_div_name="glg_combo_chart"/>;
      break;

    case "RTChart":
      glg_component = <GlgRTChartDemo glg_div_name="glg_rtchart"/>;
      break;

    case "RTChartSimple":
      glg_component = <GlgRTChartSimpleDemo glg_div_name="glg_rtchart_simple"/>;
      break;
       
    case "AirTraffic":
      glg_component = <GlgAirTrafficDemo glg_div_name="glg_air_traffic"/>;
      break;

    case "GIS":
      glg_component = <GlgGISDemo glg_div_name="glg_gis"/>;
      break;

    case "PowerMonitoring":
    case "DataCenter":
      glg_component = <GlgDataCenterDemo glg_div_name="glg_data_center"
                                         start_page={page} />;
      break;

    case "Circuit":
      glg_component = <GlgCircuitDemo glg_div_name="glg_circuit"/>;
      break;
       
    case "Avionics":
      glg_component = <GlgAvionicsDemo glg_div_name="glg_avionics"/>;
      break;

    case "Controls":
      glg_component = <GlgControlsDemo glg_div_name="glg_controls"/>;
      break;
       
    case "ProcessDiagram":
      /* Using key to remount the component with different page type when it
         changes.
      */
      glg_component =
        <GlgDiagramEditorDemo key={page}
                             glg_div_name="glg_process_diagram"
                             diagram_type={page}/>;
     break;
        
    case "DiagramEditor":
      /* Using key to remount the component with different page type when it
         changes.
      */
      glg_component =
        <GlgDiagramEditorDemo key={page}
          glg_div_name="glg_diagram_editor" diagram_type={page}/>;
      break;

    case "RobotArm":
      glg_component = <GlgRobotArmDemo glg_div_name="glg_robot_arm"/>;
      break;
       
    case "Satellite":
      glg_component = <GlgSatelliteDemo glg_div_name="glg_satellite"/>;
      break;
       
    case "Trajectory":
      glg_component = <GlgTrajectoryDemo glg_div_name="glg_trajectory"/>;
      break;
       
    case "AirCombat":
      glg_component = <GlgAirCombatDemo glg_div_name="glg_aircombat"/>;
      break;
       
    case "Map":
      glg_component = <GlgMapDemo glg_div_name="glg_map"/>;
      break;
       
    case "Graph":
      glg_component = <GlgGraphDemo glg_div_name="glg_graph"/>;
      break;
       
      /////////////// Examples
    case "RealTimeChart":
      glg_component =
        <GlgChartExample glg_div_name="glg_chart"
                         title="React: GLG RealTimeChart"/>;
      break;

    case "RealTimeChartSimple":
      glg_component =
        <GlgSimpleChartExample glg_div_name="glg_chart_simple"
                               title="React: GLG RealTimeChart (Simple)"/>;
      break;
      
    case "Dashboard":
      glg_component = <GlgDashboardExample glg_div_name="glg_dashboard"/>
      break;

    case "GlgSimpleViewer":
      glg_component =
        <GlgSimpleViewerExample glg_div_name="glg_simple_viewer"/>;
      break;

    case "GlgViewer":
      glg_component = <GlgViewerExample glg_div_name="glg_viewer"/>;
      break;
   }
         
   return (
           <>
             <div style={{margin: isMobile?
                          "10px 5px 8px 8px" :
                          "5px 5px 5px 30px"}}>
               <span style={{fontWeight: "bold", fontSize: "1.17em"}}>
                 GLG React Integration: </span>

               <div id="demos_examples"
                    className="radio_container"
                    style={{display: "inline-block", border: "0px"}}>
                 <div className="checkbox_div" style={{margin: "5px"}}>
                   <input type="radio" id="demos"
                          className="checkbox_input" value="0"
                          name="demos_examples" defaultChecked
                          onChange={ SetDemosExamples } />
                   <label htmlFor="demos"
                          className="checkbox_label">Demos</label>
                 </div>
                 
                 <div className="checkbox_div" style={{margin: "5px"}}>
                   <input type="radio" id="examples"
                          className="checkbox_input" value="1"
                          name="demos_examples"
                          onChange={ SetDemosExamples } />
                   <label htmlFor="examples"
                          className="checkbox_label">Examples</label>
                 </div>
               </div>

               { isMobile ? null :
                 <>
                   <span style={{marginLeft: "30px"}}>
                     <a href="https://www.genlogic.com/demos.html">
                       Demo Gallery</a>
                   </span>
                   
                   <span style={{marginLeft: "20px"}}>
                     <a href="https://www.genlogic.com/">Home</a>
                   </span>
                 </>
               }

             </div>

           { !DemoMode ? null :
            
             <div style={{width: "100%", marginBottom: "8px"}}>
               
               <button onClick={ ()=>onClick( "ProcessDemo" ) }
                       style={{margin: "3px"}}>
                 Process<br/>Demo</button>
           
               <button onClick={ ()=>onClick( "DashboardDemo" ) }
                       style={{margin: "3px"}}>
                 Dashboard<br/>Demo</button>
           
               <button onClick={ ()=>onClick( "SCADAViewer" ) }
                       style={{margin: "3px"}}>
                 SCADA<br/>Viewer</button>
               
               <button onClick={ ()=>onClick( "ComboChart" ) }
                       style={{margin: "3px"}}>
                 Combo<br/>Chart</button>
               
               <button onClick={ ()=>onClick( "RTChart" ) }
                       style={{margin: "3px"}}>
                 Real-Time Chart<br/>Demo</button>
               
               <button onClick={ ()=>onClick( "RTChartSimple" ) }
                       style={{margin: "3px"}}>
                 Real-Time Chart<br/>Basic Features</button>
               
               <button onClick={ ()=>onClick( "AirTraffic" ) }
                       style={{margin: "3px"}}>
                 Air Traffic<br/>Monitoring</button>
               
               <button onClick={ ()=>onClick( "GIS" ) }
                       style={{margin: "3px"}}>
                 GIS<br/>Demo</button>
               
               <button onClick={ ()=>onClick( "PowerMonitoring", true ) }
                       style={{margin: "3px"}}>
                 Power<br/>Monitoring</button>
               
               <button onClick={ ()=>onClick( "DataCenter", true ) }
                       style={{margin: "3px"}}>
                 Data Center<br/>Monitoring</button>
               
               <button onClick={ ()=>onClick( "Circuit" ) }
                       style={{margin: "3px"}}>
                 Electrical<br/>Circuit</button>
               
               <button onClick={ ()=>onClick( "Avionics" ) }
                       style={{margin: "3px"}}>
                 Avionics<br/>Dashboard</button>
               
               <button onClick={ ()=>onClick( "Controls" ) }
                       style={{margin: "3px"}}>
                 Controls<br/>Demo</button>
               
               <button onClick={ ()=>onClick( "ProcessDiagram" ) }
                       style={{margin: "3px"}}>
                 Process<br/>Diagram</button>
               
               <button onClick={ ()=>onClick( "DiagramEditor" ) }
                       style={{margin: "3px"}}>
                 Diagram<br/>Editor</button>
           
               <button onClick={ ()=>onClick( "RobotArm" ) }
                       style={{margin: "3px"}}>
                 Robot<br/>Arm</button>
           
               <button onClick={ ()=>onClick( "Satellite" ) }
                       style={{margin: "3px"}}>
                 Satellite<br/>Orbits</button>
           
               <button onClick={ ()=>onClick( "Trajectory" ) }
                       style={{margin: "3px"}}>
                 3D Trajectory<br/>Demo</button>
           
               <button onClick={ ()=>onClick( "AirCombat" ) }
                       style={{margin: "3px"}}>
                 Air Combat<br/>Simulation</button>
           
               <button onClick={ ()=>onClick( "Map" ) }
                       style={{margin: "3px"}}>
                 Supply Chain<br/>Visualization</button>
           
               <button onClick={ ()=>onClick( "Graph" ) }
                       style={{margin: "3px"}}>
                 2D and 3D<br/>Graphs</button>

             { !isMobile ? null :
               <>
                 <span style={{marginLeft: "10px"}}>
                   <a href="https://www.genlogic.com/demos.html">
                     Gallery</a>
                 </span>
                 
                 <span style={{marginLeft: "10px"}}>
                   <a href="https://www.genlogic.com/">Home</a>
                 </span>
               </>
             }
             
             </div>
           }

           { DemoMode ? null :
              
             <div style={{width: "100%", marginBottom: "8px"}}>
       
               <button onClick={ ()=>onClick( "RealTimeChart" ) }
                       style={{margin: "3px"}}>
                       RealTimeChart<br/>Extended Example</button>

               <button onClick={ ()=>onClick( "RealTimeChartSimple" ) }
                       style={{margin: "3px"}}>
                       RealTimeChart<br/>Simple Example</button>

               <button onClick={ ()=>onClick( "Dashboard" ) }
                       style={{margin: "3px"}}>
                       Dashboard<br/>Example</button>
            
               <button onClick={ ()=>onClick( "GlgSimpleViewer" ) }
                       style={{margin: "3px"}}>
                       GlgSimpleViewer<br/>Example</button>
           
               <button onClick={ ()=>onClick( "GlgViewer" ) }
                       style={{margin: "3px"}}>
                       GlgViewer<br/>Example</button>
             </div>
           }
             <hr/>
           
             {glg_component}

           </>
   );
}

export default App;
