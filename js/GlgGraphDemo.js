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

import { useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import GlgBase from './GlgBase.js';
import { GlgGraph } from './glg_scripts/misc_demos/GlgGraph.js'

function GlgGraphDemo( { glg_div_name, style } )
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

   // Text input values.
   const [title,  setTitle] = useState( "Bar Graph" );
   const [titleX, setTitleX] = useState( "Text_X" );
   const [titleY, setTitleY] = useState( "Text_Y" );

   // Button onClick callbacks.
   const ChangeSize = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.SetDrawingSize( true );
   };

   const LoadGraph = ( graph_type )=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.LoadGraph( graph_type );
   };

   const ChangeScrollType = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeScrollType();
   };

   const Reverse = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.Reverse();
   };

   const UpdateWholeFrame = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.UpdateWholeFrame();
   };

   const UpdateEachSample = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.UpdateEachSample();
   };

   const ChangeNumberOfSamples = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeNumberOfSamples();
   };

   const ChangeRange = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeRange();
   };

   const ChangeYLabels = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeYLabels();
   };

   const ChangeXLabels = ( param )=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeXLabels( param );
   };

   const ChangeYFormat = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ChangeYFormat();
   };

   const StartUpdate = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.StartUpdate();
   };

   const StopUpdate = ()=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.StopUpdate();
   };

   const ToggleGrid = ( param )=>{
      let script_instance = script_instance_ref.current.instance;
      if( script_instance )
        script_instance.ToggleGrid( param );
   };

   const SetTitles = ( title_p, titleX_p, titleY_p )=>{
      let script_instance = script_instance_ref.current.instance;

      setTitle( title_p );
      setTitleX( titleX_p );
      setTitleY( titleY_p );

      /* Use passed parameters: state variables will change only on the next
         rendering.
      */
      if( script_instance )
        script_instance.SetTitles( title_p, titleX_p, titleY_p );
   };

   // Specifies the script to be used by the GlgBase component.
   const script_constructor =
     ()=>new GlgGraph( glg_div_name, glg_path, standalone, isMobile );

   /* Pass glg_div_name and script_data as parameters to GlgBase. 
      Hide the Change Size button on mobile devices.
   */
   return (
            <>
              <form name="input_form" style={{marginBottom: "8px"}}>
                { isMobile ? null :
                  <button type="button"
                          onClick={ ChangeSize } style={{margin: "3px"}}>
                          Change Drawing Size</button>
                }
                
                <input value="Bars" type="button" style={{margin: "3px"}}
                       onClick={ ()=>LoadGraph( "bar" ) } />
                <input value="3D Bars" type="button" style={{margin: "3px"}}
                       onClick={ ()=>LoadGraph( "bar_3d" ) } />
                <input value="Line" type="button" style={{margin: "3px"}}
                       onClick={ ()=>LoadGraph( "line" ) } />
                <input value="3D Line" type="button" style={{margin: "3px"}}
                       onClick={ ()=>LoadGraph( "ribbon" ) } />
                
                <input value="Change Scroll Type" type="button"
                       style={{margin: "3px"}}
                       id={ glg_div_name + "_scroll_type_button"}
                       onClick={ ()=>ChangeScrollType() } />
                <input value="Reverse" type="button" style={{margin: "3px"}}
                       id={ glg_div_name + "_reverse_button" }
                       onClick={ ()=>Reverse() } />

                { isMobile ? null : <br/>}
                
                <input value="Update Whole Frame" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>UpdateWholeFrame() } />
                <input value="Update By 1 Sample" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>UpdateEachSample() } />
                <input value="Change Number of Samples" type="button" 
                       style={{margin: "3px"}}
                       onClick={ ()=>ChangeNumberOfSamples() } />
                <input value="Change Range" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>ChangeRange() } />

                { isMobile ? null : <br/>}

                <input value="Change Number of Y Labels" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>ChangeYLabels() } />
                <input value="Change Number of X Labels" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>ChangeXLabels( true ) } />
                <input value="Change Y Label Format" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>ChangeYFormat() } />

                { isMobile ? null : <br/>}
                
                <input value="Start Update" type="button"
                       style={{margin: "3px"}}
                       onClick={ ()=>StartUpdate() } />
                <input value="Stop Update" type="button" 
                       style={{margin: "3px"}}
                       onClick={ ()=>StopUpdate() } />

                <input value="Change X Grid" type="button" 
                       style={{margin: "3px"}}
                       id={ glg_div_name + "_x_grid_button" }
                       onClick={ ()=>ToggleGrid( true ) } />                
                <input value="Change Y Grid" type="button" 
                       style={{margin: "3px"}}
                       id={ glg_div_name + "_y_grid_button" }
                       onClick={ ()=>ToggleGrid( false ) } />
                
                <div style={{lineHeight: "30%"}}><br/></div>
                
                <span style={{marginLeft: "3px"}}>
                  Enter new text for graph annotations:</span>

                <div style={{lineHeight: "10%"}}><br/></div>

                <input type="text" style={{margin: "3px"}}
                       name="title" value={title}
                       onInput={ ()=>
                           SetTitles( document.input_form.title.value,
                                      document.input_form.titleX.value,
                                      document.input_form.titleY.value ) } />
                <input type="text" style={{margin: "3px"}}
                       name="titleX" value={titleX}
                       onInput={ ()=>
                           SetTitles( document.input_form.title.value,
                                      document.input_form.titleX.value,
                                      document.input_form.titleY.value ) } />
                <input type="text" style={{margin: "3px"}}
                       name="titleY" value={titleY}
                       onInput= { ()=>
                           SetTitles( document.input_form.title.value,
                                      document.input_form.titleX.value,
                                      document.input_form.titleY.value ) } />
              </form>
              
              <GlgBase glg_div_name={glg_div_name}
                       script_constructor={script_constructor}
                       parent_instance_ref={script_instance_ref} />
            </>
          );
}

export default GlgGraphDemo;
