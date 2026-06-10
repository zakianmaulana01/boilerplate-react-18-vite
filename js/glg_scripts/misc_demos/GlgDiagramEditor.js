//////////////////////////////////////////////////////////////////////////////
// GLG Diagram Demo: an example of using the GLG Extended API.
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files. The GLG library loads a GLG drawing
// and renders it on a web page, providing an API to handle user interaction
// with graphical objects in the drawing.
//
// The source code in the diagram_demo.js uses the GLG Extended API to
// implement the diagram editor functionality. The same source code is used
// by both the DIAGRAM DEMO and the PROCESS DIAGRAM demo. The type of the
// diagram is selected by the process_diagram parameter that is set outside
// and defines the type of the diagram: Process Diagram if true, Diagram Editor
// if false.
//
// The drawings are created using the GLG Graphics Builder, an interactive
// editor that allows to create grahical objects and define their dynamic
// behavior without any programming. The icons used in the diagram are
// dynamic GLG objects created with the Graphics Builder.
//
// Except for the changes to comply with the JavaScript syntax, this source
// is identical to the source code of the corresponding C/C++/C# and Java
// desktop versions of the demo.
//
// Only a single instance of this script per HTML page can be instantiated.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0, default-case: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

/* Update interval for the Process Diagram, msec. */
const UPDATE_INTERVAL = 1000;  /* Update once per second. */

// Object types
const
  NO_OBJ = 0,
  NODE = 1,
  LINK = 2;

// IH tokens
const
  IH_UNDEFINED_TOKEN = 0,
  IH_ICON_SELECTED = 1,
  IH_SAVE = 2,
  IH_INSERT = 3,
  IH_PRINT = 4,
  IH_CUT = 5,
  IH_PASTE = 6,
  IH_ZOOM_IN = 7,
  IH_ZOOM_OUT = 8,
  IH_ZOOM_TO = 9,
  IH_ZOOM_RESET = 10,
  IH_PROPERTIES = 11,
  IH_CREATION_MODE = 12,
  IH_DIALOG_APPLY = 13,
  IH_DIALOG_CLOSE = 14,
  IH_DIALOG_CANCEL = 15,
  IH_DIALOG_CONFIRM_DISCARD = 16,
  IH_DATASOURCE_SELECT = 17,
  IH_DATASOURCE_SELECTED = 18,
  IH_DATASOURCE_CLOSE = 19,
  IH_DATASOURCE_APPLY = 20,
  IH_DATASOURCE_LIST_SELECTION = 21,
  IH_MOUSE_PRESSED = 22,
  IH_MOUSE_RELEASED = 23,
  IH_MOUSE_MOVED = 24,
  IH_MOUSE_BUTTON3 = 25,
  IH_TOUCH_START = 26,
  IH_TOUCH_MOVED = 27,
  IH_TOUCH_END = 28,
  IH_FINISH_LINK = 29,
  IH_TEXT_INPUT_CHANGED = 30,
  IH_OK = 31,
  IH_CANCEL = 32,
  IH_ESC = 33;

const ButtonToken = function ( name, token )
{
   this.name = name;
   this.token = token;
}

// Name/Token array used to convert button names to IH tokens.
let ButtonTokenTable =
[
   new ButtonToken( "Save",             IH_SAVE ),
   new ButtonToken( "Insert",           IH_INSERT ),
   new ButtonToken( "Print",            IH_PRINT ),
   new ButtonToken( "Cut",              IH_CUT ),
   new ButtonToken( "Paste",            IH_PASTE ),
   new ButtonToken( "ZoomIn",           IH_ZOOM_IN ),
   new ButtonToken( "ZoomOut",          IH_ZOOM_OUT ),
   new ButtonToken( "ZoomTo",           IH_ZOOM_TO ),
   new ButtonToken( "ZoomReset",        IH_ZOOM_RESET ),
   new ButtonToken( "Properties",       IH_PROPERTIES ),
   new ButtonToken( "CreateMode",       IH_CREATION_MODE ),
   new ButtonToken( "DialogApply",      IH_DIALOG_APPLY ),
   new ButtonToken( "DialogClose",      IH_DIALOG_CLOSE ),
   new ButtonToken( "DialogCancel",     IH_DIALOG_CANCEL ),
   new ButtonToken( "OKDialogOK",       IH_OK ),
   new ButtonToken( "OKDialogCancel",   IH_CANCEL ),
   /* Process Diagram only */
   new ButtonToken( "DataSourceSelect", IH_DATASOURCE_SELECT ),
   new ButtonToken( "DataSourceClose",  IH_DATASOURCE_CLOSE ),
   new ButtonToken( "DataSourceApply",  IH_DATASOURCE_APPLY ),
   new ButtonToken( null,               0 )
];

// Default scale factor for icon buttons.
const DEFAULT_ICON_ZOOM_FACTOR = 10.0;

// Percentage of the button area to use for the icon.
const ICON_FIT_FACTOR = 0.6;

// Name of the button that activates selection mode.
const SELECT_BUTTON_NAME = "IconButton0";

/* Number of palette buttons to skip: the first button with the "select" icon 
   is already in the palette.
*/
const PALETTE_START_INDEX = 1;

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the diagram editor.
// Parameters:
//   glg_div_name    - name of parent div the drawing will be displayed in,
//                     will be passed by the caller.
//   is_mobile       - true if deployed on mobile devices.
//   is_standalone   - true if deployed in html, false if deployed in react or
//                     angular.
//   glg_path        - path to the directory where GLG drawings are located.
//   process_diagram - type of the : Process Diagram if true, Diagram Editor
//                     if false.
//////////////////////////////////////////////////////////////////////////////
export function GlgDiagramEditor( glg_div_name, glg_path,
                                  is_standalone, is_mobile, process_diagram )
{
   Debug( "New script for " + glg_div_name + ": "  +
          Object.getPrototypeOf( this ).constructor.name +
          " glg_path: " + glg_path );
    
   if( DEBUG_GLG_ERRORS )   
     GLG.ThrowExceptionOnError( true, true, true );
   else
     GLG.ThrowExceptionOnError( false, false, false );

   this.GLG_div_name = glg_div_name;
   this.IsMobile = is_mobile;
   this.Standalone = is_standalone;    

   // Use path to the drawings directory is supplied.
   this.GlgPath = glg_path;

   // Diagram type: true for ProcessDiagram, false for DiagramEditor.
   this.ProcessDiagram = process_diagram;      /* boolean */
   
   /* Scale factor for nodes placed in the drawing. */
   this.IconScale = ( is_mobile ? 2. : 1. );   /* double */

   /* Selection sensitivity in pixels, will be set to different values if a 
      touch device is detected.
   */
   this.SelectionResolution = ( is_mobile ? 10 : 5 );        /* int */
   this.PointSelectionResolution = ( is_mobile ? 20 : 4 );   /* int */
   
   this.Viewport = null;               /* GLG object: Top level viewport of 
                                          the loaded drawing. */
   this.TemplateDrawing = null;         /* GlgObject: Icon and dialog template 
                                          drawing. */
   this.DrawingArea = null;             /* GlgObject */
   this.PaletteTemplate = null;         /* GlgObject */

   this.ButtonTemplate = null;          /* GlgObject */
   this.SelectedObject = null;          /* GlgObject */
   this.StoredColor = null;             /* GlgObject */
   // Stores color during selection.
   this.LastColor = null;               /* GlgObject */
   this.CutBuffer = null;               /* GlgObject */
   this.PointMarker = null;             /* GlgObject */
   this.AttachmentMarker = null;        /* GlgObject */
   this.AttachmentNode = null;          /* GlgObject */
   this.AttachmentArray = null;         /* GLG group */
   this.NodeIconArray = null;           /* GLG group */
   this.NodeObjectArray = null;         /* GLG group */
   this.LinkIconArray = null;           /* GLG group */
   this.LinkObjectArray = null;         /* GLG group */

   /* Controls icon scaling depending. If set to true (Process Diagram), icons
      are automatically fit to fill the button. If set to false (Diagram 
      Editor), the default zoom factor will be used.
   */
   this.FitIcons = process_diagram;     /* boolean */

   /* The current state of the sticky mode, is controlled by the 
      ToggleStickyMode Button If set to true, multple instances of the selected
      item can be added to the drawing by clicking in the drawing area.
   */
   this.StickyCreateMode = false;       /* boolean */
   
   this.AllowUnconnectedLinks = true;   /* boolean */
   this.DialogDataChanged = false;      /* boolean */
   this.TraceMouseMove = false;         /* boolean */
   this.TraceMouseRelease = false;      /* boolean */

   this.NumColumns = -1;                /* int */
   this.SelectedObjectType = NO_OBJ;    /* int */
   this.CutBufferType = NO_OBJ;         /* int */

   // Used by the Process Diagram.
   this.DataSourceCounter = 0;          /* int */
   this.NumDatasources = 20;            /* int */
   this.TouchDevice = -1;               /* int */

   this.LastButton = null;                            /* String */
   this.CurrentDiagram = new GlgDiagramData();        /* GlgDiagramData */
   this.SavedDiagramData = null;                      /* JSON string */

   /* Temporary objects, create just once. */
   this.CursorPos  = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.WorldCoord = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.SelectRect = GLG.CreateGlgCube( null, null ); /* GlgCube */

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts diagram editor by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgDiagramEditor.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load drawings and misc. assets used in the demo. When assets are loaded, 
      LoadCB callback is invoked to start the demo.
   */
   this.LoadAssets( ()=>this.LoadCB(), null );
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgDiagramEditor.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Viewport )
     this.Viewport.ResetHierarchy();   // Undisplay GLG drawing.

   GLG.IHTerminate();
   
   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

//////////////////////////////////////////////////////////////////////////////
// Loads any drawings and assets required by the application and invokes the
// specified callback when done.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.LoadAssets = function( callback, user_data )
{
   Debug( "LoadAssets for: " + this.GLG_div_name );
   
   if( !this.Active )
     return;

   /* Define an internal variable to keep the number of loaded assets. */
   this.NumLoadedAssets = 0;

   /* HTML5 doesn't provide a scrollbar input element (only a range input 
      html element is available). This application needs to load GLG scrollbars
      used for integrated chart scrolling. For each loaded scrollbar, the 
      AssetLoaded callback is invoked with the supplied data array parameter.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( "scrollbar_h.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_h", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );
   GLG.LoadWidgetFromURL( this.GetFullName( "scrollbar_v.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_v", callback: callback,
                            user_data: user_data },
                          /*abort test function*/ ()=>!this.Active );   

   /* Load drawings used in the demo. For each loaded drawing, the AssetLoaded
      callback is invoked with the supplied data.
   */
   let drawing_name =
     ( this.ProcessDiagram ? "process_diagram.g" : "diagram.g" );
   GLG.LoadWidgetFromURL( this.GetFullName( drawing_name ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "main_drawing", callback: callback,
                            user_data: user_data } );
   drawing_name =
     ( this.ProcessDiagram ? "process_template.g" : "diagram_template.g" );
   GLG.LoadObjectFromURL( this.GetFullName( drawing_name ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "template_drawing", callback: callback,
                            user_data: user_data } );
}

////////////////////////////////////////////////////////////////////////////// 
GlgDiagramEditor.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AssetLoaded = function( glg_object, data, path )
{
   if( !this.Active )
     return;
   
   if( data.name == "scrollbar_h" )
   {
      if( glg_object != null )
        glg_object.SetResourceObject( "$config/GlgHScrollbar", glg_object );
   }
   else if( data.name == "scrollbar_v" )
   {
      if( glg_object != null )
        glg_object.SetResourceObject( "$config/GlgVScrollbar", glg_object );
   }
   else if( data.name == "main_drawing" )
   {
       this.Viewport = glg_object;
   }
   else if( data.name == "template_drawing" )
   {
      this.TemplateDrawing = glg_object;
   }
   else
     AppError( "Unexpected asset name: " + data.name );

   ++this.NumLoadedAssets;
    
   // Invoke the callback after all assets have been loaded.
   if( this.NumLoadedAssets == 4 )
     data.callback( data.user_data );
}


//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.LoadCB = function()
{
   Debug( "LoadCB for: " + this.GLG_div_name );

   if( !this.Active )
     return;

   if( this.Viewport == null || this.TemplateDrawing == null )
   {
      AppAlert( "Can't load a drawing or a template," +
                " check console messages for details." );
      return;
   }
   
   if( !document.getElementById( this.GLG_div_name ) )
   {
      Debug( "Can't find " + this.GLG_div_name +
             " div: it may have been removed from the document." );
      return;
   }
    
   // Disable spinning loader.   
   RemoveElement( this.GLG_div_name, "loader_container" );
    
   // Define the element in the HTML page to display the drawing.
   this.Viewport.SetParentElement( this.GLG_div_name );
    
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     this.Viewport.SetDResource( "LineWidth", 0 );
    
   this.StartDiagramDemo();
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.StartDiagramDemo = function()
{
   // Set selected pick resolution.
   this.Viewport.SetDResource( "$config/GlgPickResolution",
                               this.PointSelectionResolution );

   this.InitBeforeHierarchySetup();

   this.Viewport.SetupHierarchy();

   this.InitAfterHierarchySetup();
   
   this.Viewport.Update();    // Draw it

   // Start periodic updates of the Process Diagram.
   if( this.ProcessDiagram )
     setTimeout( ()=>this.UpdateProcessDiagram(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.InitBeforeHierarchySetup = function()
{
   /* Add Input callback used to handle user interaction. */
   this.Viewport.AddListener( GLG.GlgCallbackType.INPUT_CB,
                              this.InputCallback.bind( this ) );

   /* Add Trace callback used to handle mouse operations: selection, dragging,
      connection point highlight.
   */
   this.Viewport.AddListener( GLG.GlgCallbackType.TRACE_CB,
                              this.TraceCallback.bind( this ) );

   GLG.IHInit();

   // Fill out the palette before hierarchy setup.

   this.DrawingArea = this.Viewport.GetResourceObject( "DrawingArea" );
   if( this.DrawingArea == null )
   {
      AppAlert( "Can't find DrawingArea viewport." );
      return;
   }

   this.PaletteTemplate =
     this.TemplateDrawing.GetResourceObject( "PaletteTemplate" );
   if( this.PaletteTemplate == null )
   {
      AppAlert( "Can't find PaletteTemplate viewport." );
      return;
   }

   this.AddDialog( this.TemplateDrawing, "Dialog", "Object Properties" );
   this.AddDialog( this.TemplateDrawing, "OKDialog", null, 0, 0 );
   if( this.ProcessDiagram )
     this.AddDialog( this.TemplateDrawing, "DataSourceDialog", null );

   // Disable the exit button for the browser version of the demo.
   this.Viewport.SetDResource( "Exit/Visibility", 0 );
   
   this.SetupDiagramDrawing();
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.InitAfterHierarchySetup = function()
{
   // Position node icons inside the palette buttons.
   this.SetupObjectPalette( "IconButton", PALETTE_START_INDEX );

   // Install and start the top level interface handler.
   GLG.IHInstallAsInterface( this.MainIH.bind( this ) );
   GLG.IHStart();
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetupDiagramDrawing = function()
{
   this.SetPrompt( "" );

   /* Create a color object to store original node color during node 
      selection. */
   this.StoredColor =
     this.Viewport.GetResourceObject( "FillColor" ).CopyObject();

   // Set grid color (configuration parameter) to grey.
   this.Viewport.SetGResource( "$config/GlgGridPolygon/EdgeColor",
                          0.632441, 0.632441, 0.632441 );

   // Create a separate group to hold objects.
   let group =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null, null );
   group.SetSResource( "Name", "ObjectGroup" );
   this.DrawingArea.AddObjectToBottom( group );

   // Create groups to hold nodes and links.
   this.NodeIconArray =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
   this.NodeObjectArray =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
   this.LinkIconArray =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
   this.LinkObjectArray =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
   
   /* Scan palette template and extract icon and link objects, adding them
      to the buttons in the object palette.
   */
   GetPaletteIcons( this.PaletteTemplate, "Node",
                    this.NodeIconArray, this.NodeObjectArray );
   GetPaletteIcons( this.PaletteTemplate, "Link",
                    this.LinkIconArray, this.LinkObjectArray );

   this.FillObjectPalette( "ObjectPalette", "IconButton", PALETTE_START_INDEX );

   this.SetRadioBox( SELECT_BUTTON_NAME );  // Highlight Select button

   // Set initial sticky creation mode from the button state in the drawing.
   this.SetCreateMode( false );

   this.CurrentDiagram = new GlgDiagramData();
}

//////////////////////////////////////////////////////////////////////////////
// Sets create mode based on the state of the CreateMode button.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetCreateMode = function( set_button )
{
   if( !set_button )
   {
      let create_mode =
        Math.trunc( this.Viewport.GetDResource( "CreateMode/OnState" ) );
      this.StickyCreateMode = ( create_mode != 0 );
   }
   else   /* Restore button state from StickyCreateMode. */
     this.Viewport.SetDResource( "CreateMode/OnState",
                                 this.StickyCreateMode ? 1.0 : 0.0 );
}

//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AddDialog = function( drawing, dialog_name, title )
{
   let dialog = drawing.GetResourceObject( dialog_name );
   if( dialog == null )
   {
      AppAlert( "Can't find dialog: " + dialog_name );
      return;
   }

   /* Make the dialog a top-level window and make it invisible on startup. */
   dialog.SetDResource( "ShellType", GLG.GlgShellType.DIALOG_SHELL );
   if( title != null )
     dialog.SetSResource( "ScreenName", title );

   dialog.SetDResource( "Visibility", 0.0 );
   this.Viewport.AddObjectToBottom( dialog );
}

///////////////////////////////////////////////////////////////////////////
// Positions and displays the dialog.
///////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.PopupDialog = function( drawing, res_name )
{
   let dialog;
   
   if( res_name != null )
     dialog = drawing.GetResourceObject( res_name );
   else
     dialog = drawing;
   
   if( dialog == null )
   {
      this.SetError( "Can't find dialog." );
      return;
   }
   
   this.PositionDialog( dialog );
   dialog.SetDResource( "Visibility", 1.0 );
}

///////////////////////////////////////////////////////////////////////////
// Set dialog viewport size based on the size of the loaded dialog drawing,
// position the dialog.
// x and y offsets define offsets of the dialog center relatively to the
// center of its parent.
///////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.PositionDialog = function( dialog )
{
   /* Retrieve preferred dialog viewport width/height and x/y offsets defined
      in the loaded dialog drawing.
   */
   let width = GetPreferredValue( dialog, "Width", 300 );
   let height = GetPreferredValue( dialog, "Height", 20 );
   let x_offset = GetPreferredValue( dialog, "XOffset", 0 );
   let y_offset = GetPreferredValue( dialog, "YOffset", 0 );

   if( this.IsMobile )
   {
      let dialog_name = dialog.GetSResource( "Name" );
      
      switch( dialog_name )
      {
       case "Dialog":
         x_offset = 20;
         y_offset = 75;
         if( this.ProcessDiagram )
           height = 250;
         break;
       case "DataSourceDialog":
         x_offset = 100;
         y_offset = 100;
         height = 100;
         break;
       default: break;
      }
   }

   width *= this.CoordScale;
   height *= this.CoordScale;

   let parent_width = this.Viewport.GetDResource( "Screen/Width" );
   let parent_height = this.Viewport.GetDResource( "Screen/Height" );
      
   let x = parent_width / 2.0 - width / 2.0 + x_offset;
   let y = parent_height / 2.0 - height / 2.0 + y_offset;

   ConfigureWindow( dialog, x, y, width, height );
}

///////////////////////////////////////////////////////////////////////////
// Retrieves a preferred value defined in the loaded drawing by the
// specified name.If no preferred value is found, the supplied default
// value is returned.
///////////////////////////////////////////////////////////////////////////
function GetPreferredValue( drawing, name, default_value )
{
   if( drawing.HasResourceObject( name ) )
     return drawing.GetDResource( name );
   else
     return default_value;
}

//////////////////////////////////////////////////////////////////////////////
function ConfigureWindow( drawing,  x, y, width, height )
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

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.InputCallback = function( viewport, message_obj )
{
   if( !this.Active )
     return;

   let format      = message_obj.GetSResource( "Format" );
   let origin      = message_obj.GetSResource( "Origin" );
   let full_origin = message_obj.GetSResource( "FullOrigin" );
   let action      = message_obj.GetSResource( "Action" );
   let subaction   = message_obj.GetSResource( "SubAction" );
   
   let token = IH_UNDEFINED_TOKEN;

   // Handle the Dialog window closing.
   if( format == "Window" )
   {
      if( action == "DeleteWindow" )
        if( origin == "Dialog" )
          token = IH_DIALOG_CLOSE;
        else if( origin == "DataSourceDialog" )
          token = IH_DATASOURCE_CLOSE;
        else if( origin == "OKDialog" )
          token = IH_ESC;
        else
          return;
   }
   else if( format == "Button" )
   {
      if( action != "Activate" && action != "ValueChanged" )
        return;

      else if( origin.startsWith( "IconButton" ) )
      {
         let button = viewport.GetResourceObject( full_origin );
         let icon = button.GetResourceObject( "Icon" );
         if( icon == null )
           GLG.Error( GLG.GlgErrorType.USER_ERROR, "Can't find icon." );
         else
         {
            GLG.IHSetOParameter( GLG.IH_GLOBAL, "$selected_icon", icon );
            GLG.IHSetSParameter( GLG.IH_GLOBAL, "$selected_button",
                                 full_origin );
            token = IH_ICON_SELECTED;
         }
      }
      else
        token = ButtonToToken( origin );
   }
   else if( format == "Text" )
   {
      if( action == "ValueChanged" )
        token = IH_TEXT_INPUT_CHANGED;
   }
   else if( format == "List" )
   {
      if( action == "Select" && subaction == "DoubleClick" &&
          origin == "DSList" )
        token = IH_DATASOURCE_LIST_SELECTION;
   }

   if( token != IH_UNDEFINED_TOKEN )
     GLG.IHCallCurrIHWithToken( token );

   if( format != "Window" )
     this.Viewport.Update();
}

////////////////////////////////////////////////////////////////////////
// Handles mouse operations: selection, dragging, connection point
// highlight.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.TraceCallback = function( viewport, trace_info )
{
   if( !this.Active )
     return;

   let use_coords = false;
   let token = IH_UNDEFINED_TOKEN;

   // Detect touch device if it hasn't been detected yet.
   if( this.TouchDevice == -1 )
     if( trace_info.event_type == GLG.GlgEventType.TOUCH_START )
     {
        this.TouchDevice = 1;

        /* Increase pick resolution for any touch screen devices. 
           On startup, it was increased only for mobile devices.
        */
        this.SelectionResolution = 10;
        this.PointSelectionResolution = 20;
        this.Viewport.SetDResource( "$config/GlgPickResolution",
                                    this.PointSelectionResolution );
     }
     else if( trace_info.event_type == GLG.GlgEventType.MOUSE_PRESSED )
       this.TouchDevice = 0;
   
   let event_type = trace_info.event_type;
   switch( event_type )
   {
      /* Handle touch events to enable dragging on mobile devices.
         The SetTouchMode function is used to activate the touch mode on the
         touchStart event. It will be invoked later as needed to minimize 
         interference with page scrolling and zooming. 
         The touch mode stays active until the touchEnd or touchCancel event.
         If the touch mode is not activated, the browser will generate 
         simulated mouse move events which will enable mouse clicks but not the 
         touch dragging.
         The trace_info.button is set to 1 for all touch events for better
         compatibility with the mouse events.
      */
    case GLG.GlgEventType.TOUCH_START:
      token = IH_TOUCH_START; 
      use_coords = true;
      break;

    case GLG.GlgEventType.TOUCH_MOVED:
      if( !GLG.GetTouchMode() )
        return;
      token = IH_TOUCH_MOVED;
      use_coords = true;
      break;
      
    case GLG.GlgEventType.TOUCH_END:
    case GLG.GlgEventType.TOUCH_CANCEL:
      if( !GLG.GetTouchMode() )
        return;
      token = IH_TOUCH_END;
      use_coords = true;
      break;
      
    case GLG.GlgEventType.MOUSE_PRESSED:
      switch( trace_info.button )
      {
       case 1: token = IH_MOUSE_PRESSED; break;
       case 3: token = IH_MOUSE_BUTTON3; break;
       default: return;   /* Report only buttons 1 and 3 */
      }
      use_coords = true;
      break;
      
    case GLG.GlgEventType.MOUSE_RELEASED:
      if( trace_info.button != 1 )
        return;  // Trace only the left button releases.
      token = IH_MOUSE_RELEASED;
      use_coords = true;
      break;
      
    case GLG.GlgEventType.MOUSE_MOVED:
      token = IH_MOUSE_MOVED;
      use_coords = true;
      break;

    case GLG.GlgEventType.KEY_DOWN:
      if( trace_info.event.keyCode == 27 )
        token = IH_ESC;      // ESC key
      break;
         
    default: return;
   }

   switch( token )
   {
    case IH_UNDEFINED_TOKEN: 
      return;
    case IH_TOUCH_MOVED:
    case IH_MOUSE_MOVED:
      if( !this.TraceMouseMove )
        return;
      break;
    case IH_TOUCH_END:
    case IH_MOUSE_RELEASED:
      if( !this.TraceMouseRelease )
        return;
      break;
   }

   if( Math.trunc( this.DrawingArea.GetDResource( "ZoomToMode" ) ) != 0 )
     return;   // Don't handle mouse selection in ZoomTo mode.

   if( use_coords )
   {
      /* If nodes use viewports (buttons, gauges, etc.), need to convert 
         coordinates inside the selected viewport to the coordinates of the 
         drawing area.
      */
      if( !trace_info.viewport.Equals( this.DrawingArea ) && 
          !IsChildOf( this.DrawingArea, trace_info.viewport ) )
        return;   /* Mouse event outside of the drawing area. */

      this.CursorPos.x = trace_info.mouse_x * this.CoordScale;
      this.CursorPos.y = trace_info.mouse_y * this.CoordScale;
      this.CursorPos.z = 0.0;

      /* COORD_MAPPING_ADJ is added to the cursor coordinates for precise pixel
         mapping.
      */
      this.CursorPos.x += GLG.COORD_MAPPING_ADJ;
      this.CursorPos.y += GLG.COORD_MAPPING_ADJ;
      
      if( !trace_info.viewport.Equals( this.DrawingArea  ) )
        GLG.TranslatePointOrigin( trace_info.viewport, viewport,
                                  this.CursorPos );

      GLG.IHSetOParameterFromGPoint( GLG.IH_GLOBAL, "$cursor_pos",
                                     this.CursorPos );
   }

   // Pass token to the current IH.
   GLG.IHCallCurrIHWithToken( token );
}

////////////////////////////////////////////////////////////////////////
// Can be used only for drawable objects, and not for data objects that 
// can be constrained.
////////////////////////////////////////////////////////////////////////
function IsChildOf( grand, object )
{
   if( object == null )
     return false;
   
   if( object.Equals( grand ) )
     return true;
   
   return IsChildOf( grand, object.GetParent() );
}

////////////////////////////////////////////////////////////////////////
// Top level interface handler. 
// Parameters:
//   ih - interface handler handle
//   call_event - event the handler is invoked with
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.MainIH = function( ih, call_event )
{
   /* A handler can be invoked with the following event types:
      GLG_HI_SETUP_EVENT - triggered when handler is started by IHStart 
      GLG_MESSAGE_EVENT  - trigerred when handler is called by 
                           IHCallCurrIHWithToken, IHCallCurrIH, etc.
      GLG_CLEANUP_EVENT  - trigerred when handler is uninstalled by 
                           IHUninstall
   */
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      // Retrieve the token from the event and handle known tokens as needed.
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_SAVE:
         this.Save( this.CurrentDiagram );
         break;
               
       case IH_INSERT:
         this.Load();
         break;

       case IH_PRINT:
         Print();
         break;

       case IH_CUT:
         this.Cut();
         break;

       case IH_PASTE:
         this.Paste();
         break;

       case IH_ZOOM_IN:
         this.DrawingArea.SetZoom( null, 'i', 0.0 );
         this.Viewport.Update();
         break;
         
       case IH_ZOOM_OUT:
         this.DrawingArea.SetZoom( null, 'o', 0.0 );
         this.Viewport.Update();
         break;
               
       case IH_ZOOM_TO:
         this.DrawingArea.SetZoom( null, 't', 0.0 );
         this.Viewport.Update();
         break;
         
       case IH_ZOOM_RESET:
         this.DrawingArea.SetZoom( null, 'n', 0.0 );
         this.Viewport.Update();
         break;

       case IH_ICON_SELECTED:
         /* Retrieve selected icon parameters. 
            $selected_icon   - parameter of type GlgObject
            $selected_button - parameter of type S (string) 
            These parameters are global and are assigned in the input callback
            InputCallback.
         */

         let icon = GLG.IHGetOParameter( GLG.IH_GLOBAL, "$selected_icon" );
         let button_name =
           GLG.IHGetSParameter( GLG.IH_GLOBAL, "$selected_button" );
         if( icon == null || button_name == null )
         {
            this.SetError( "null icon or icon button name." );
            break;
         }
         
         /* Object to use in the drawing. In case of connectors, uses 
            only a part of the icon (the connector object) without the 
            end markers.
         */
         let object = icon.GetResourceObject( "Object" );
         if( object == null )
           object = icon;
         
         let icon_type = object.GetSResource( "IconType" );
         if( icon_type == null )
         {
            this.SetError( "Can't find icon type." );
            break;
         }
         
         if( icon_type == "Select" )
         {
            this.SetRadioBox( SELECT_BUTTON_NAME ); // Highlight Select button
            this.SetPrompt( "" );
         }

         /* For an icon type "Link" or "Node", install a corresponding 
            handler, set its parameters, and start the handler.

            "template" parameter supplies the GlgObject id of the selected
            icon to be added to the drawing area, either a link or a node.
            "button_name" parameter supplies the name of the selected icon 
            button.
            
            The parameters are passed to the handler function and can be 
            retrieved using GlgIHSet*Parameter.
         */
         else if( icon_type == "Link" )
         {
            GLG.IHInstallAsInterface( this.AddLinkIH.bind( this ) );
            GLG.IHSetOParameter( GLG.IH_NEW, "template", object );
            GLG.IHSetSParameter( GLG.IH_NEW, "button_name", button_name );
            GLG.IHStart();
         }
         else if( icon_type == "Node" )
         {
            GLG.IHInstallAsInterface( this.AddNodeIH.bind( this ) );
            GLG.IHSetOParameter( GLG.IH_NEW, "template", object );
            GLG.IHSetSParameter( GLG.IH_NEW, "button_name", button_name );
            GLG.IHStart();
         }
         this.Viewport.Update();
         break;
         
       case IH_CREATION_MODE:
         /* Set sticky creation mode from the button. */
         this.SetCreateMode( false );
         break;
         
       case IH_TOUCH_START:
       case IH_MOUSE_PRESSED:
         /* Selects the object and installs MoveObjectIH to drag the 
            object with the mouse.
            "$cursor_pos" is a global parameter assigned in TraceCallback
            when the object is moved or dragged.
         */
         this.SelectObjectWithMouse( GLG.IHGetOParameter( GLG.IH_GLOBAL,
                                                          "$cursor_pos" ) );
         /* All tokens that originate from the TraceCB require an explicit 
            update. For tokens originating from the InputCB, update is 
            done at the end of the InputCB.
         */            
         this.Viewport.Update();

         /* Set the touch mode on the touchStart event if some object is 
            selected. The touch mode suppresses generating simulated mouse 
            events and uses touchMove events for dragging.
         */
         if( token == IH_TOUCH_START && this.SelectedObject != null )
           GLG.SetTouchMode();
         break;
         
       case IH_ESC:
       case IH_MOUSE_BUTTON3:
         break;    /* Allow: do nothing. */
         
       default: 
         /* Handle unrecognized tokens. In this demo, unrecognized tokens
            are passed to a special "pass-through" handler 
            EditPropertiesIH, which is used to handle the Properties 
            dialog. 
            
            Properties dialog is a floating dialog that can remain open, 
            and its content is changed to show properties of the selected 
            object. A "pass-through" handler is a special handler type 
            that handles floating dialogs.
         */

         /* Set a global flag indicating the current handler is invoked
            as a "pass-through" handler with a token passed from the
            previous handler.
         */
         GLG.IHSetBParameter( GLG.IH_GLOBAL, "fall_through_call", true );
         
         let edit_properties_handler =
           GLG.CreateGlgIHHandlerInterface( this.EditPropertiesIH.bind( this ) );

         /* Install EditPropertiesIH handler, start it and invoke it with 
            a given token.
         */ 
         GLG.IHPassToken( edit_properties_handler, token, false );
         
         /* Reset the flag */
         GLG.IHSetBParameter( GLG.IH_GLOBAL, "fall_through_call", false );

         if( !GLG.IHGetBParameter( GLG.IH_GLOBAL, "token_used" ) )
           this.SetError( "Invalid token." );
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      // Invoked when the handler is uninstalled via IHUninstall.
      this.SetError( "Main ih handler should never be uninstalled." );
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// Handles object selection and prepares for moving the object with 
// the mouse.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SelectObjectWithMouse = function( cursor_pos_obj )
{
   let selection = this.GetObjectsAtCursor( cursor_pos_obj );

   let num_selected;
   if( selection != null && ( num_selected = selection.GetSize() ) != 0 )
   {
      // Some object were selected, process the selection.
      for( let i=0; i < num_selected; ++i )
      {
         let sel_object = selection.GetElement( i );
         
         /* Find if the object itself is a link or a node, of if it's a part
            of a node. If it's a part of a node, get the node object ID.
         */
         let selection_info = GetSelectedObject( sel_object );
         sel_object = selection_info.glg_object;
         let selection_type = selection_info.type;
         
         if( selection_type != NO_OBJ )
         {
            this.SelectGlgObject( sel_object, selection_type );
            
            this.CustomSelectObjectCB( this.Viewport, sel_object,
                                       GetData( sel_object ),
                                       selection_type == NODE );
            
            // Prepare for dragging the object with the mouse.
            GLG.IHInstallAsInterface( this.MoveObjectIH.bind( this ) );
            
            // Store the start point.
            GLG.IHSetOParameter( GLG.IH_NEW, "start_point", cursor_pos_obj );
            
            GLG.IHStart();            
            return;
         }
      }
   }
   
   this.SelectGlgObject( null, 0 );    // Unselect
}

////////////////////////////////////////////////////////////////////////
// Handler parameters:
//   start_point (G data obj)
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.MoveObjectIH = function( ih, call_event )
{
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      this.TraceMouseMove = true;
      this.TraceMouseRelease = true;
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_TOUCH_MOVED:
       case IH_MOUSE_MOVED:
         let data = GetData( this.SelectedObject );
         
         let start_point_obj = GLG.IHGetOParameter( ih, "start_point" );
         let cursor_pos_obj =
           GLG.IHGetOParameter( GLG.IH_GLOBAL, "$cursor_pos" );
         
         MoveObject( this.SelectedObject, start_point_obj, cursor_pos_obj );
         this.Viewport.Update();
         
         if( this.SelectedObjectType == NODE )
         {
            // Update the X and Y in the node's data struct.
            this.UpdateNodePosition( this.SelectedObject, data );
            
            /* Don't need to update the attached links' points, since 
               the stored positions of the first and last points are
               not used: they are constrained to nodes and positioned 
               by them. */
         }
         else   /* LINK */
         {
            let link_data = data;
            if( link_data.start_node != null )
              this.UpdateNodePosition( link_data.start_node.graphics, null );
            if( link_data.end_node != null )
              this.UpdateNodePosition( link_data.end_node.graphics, null );
            
            // Update stored point values.
            StorePointData( link_data, this.SelectedObject );
         }
         
         // Update the start point for the next move.
         GLG.IHChangeOParameter( ih, "start_point", cursor_pos_obj );
         
         this.Viewport.Update();
         break;
         
       case IH_TOUCH_END:
       case IH_MOUSE_RELEASED:
         // Uninstall the handler on mouse release.
         GLG.IHUninstall();
         break;
         
       default:
         /* Unrecognized token: uninstall current handler and invoke the 
            parent handler, passing the call_event to it.
         */
         GLG.IHUninstallWithEvent( call_event );
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      this.TraceMouseMove = false;
      this.TraceMouseRelease = false;
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// The AddNodeIH handler is invoked by the IHCallCurrIHWithToken
// function in the TraceCallback with the following tokens:
// IH_MOUSE_PRESSED, IH_MOUSE_MOVED, as well as
// IH_TOUCH_START and IH_TOUCH_MOVED.
//
// Handler parameters:
//   template    (obj)
//   button_name (string)
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AddNodeIH = function( ih, call_event )
{
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      this.TraceMouseMove = true;
      this.SetRadioBox( GLG.IHGetSParameter( ih, "button_name" ) );
      this.SetPrompt( "Position the node." );
      this.Viewport.Update(); 
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_TOUCH_START:
       case IH_MOUSE_PRESSED:
         // Query node type.
         let template = GLG.IHGetOParameter( ih, "template" );
         let node_type = Math.trunc( template.GetDResource( "Index" ) );
         
         let cursor_pos_obj =
           GLG.IHGetOParameter( GLG.IH_GLOBAL, "$cursor_pos" );
         let new_node = this.AddNodeAt( node_type, null, cursor_pos_obj, 
                                        GLG.GlgCoordType.SCREEN_COORD );
         this.CustomAddObjectCB( this.Viewport, new_node, GetData( new_node ),
                                 true );
         this.SelectGlgObject( new_node, NODE );

         /* In StickyCreateMode, keep adding nodes at each mouse click 
            position.
         */
         if( !this.StickyCreateMode )
           GLG.IHUninstall();
         
         this.Viewport.Update();
         break;
         
       case IH_TOUCH_MOVED: 
       case IH_MOUSE_MOVED: 
         break;   // Allow: do nothing.
         
       default:
         /* Unrecognized token: uninstall current handler and invoke the 
            parent handler, passing the call_event to it.
         */
         GLG.IHUninstallWithEvent( call_event );
         break;
      }
      break;

    // Triggered when handler is uninstalled.      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      this.TraceMouseMove = false;
      this.SetRadioBox( SELECT_BUTTON_NAME );   // Highlight Select button
      this.SetPrompt( "" );
      this.Viewport.Update();
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// The AddLinkIH handler is invoked via IHCallCurrIHWithToken function
// with the following tokens:
//   IH_MOUSE_PRESSED, IH_MOUSE_MOVED, IH_ESC and IH_MOUSE_BUTTON3,
//      as well as ID_TOUCH_START, ID_TOUCH_MOVED and ID_TOUCH_END are 
//      passed from the TraceCallback;
//   IH_FINISH_LINK is passed from the AddLinkIH handler itself when the
//      user finishes link creation.
//
// Handler parameters:
//   template (obj)
//   button_name (string)
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AddLinkIH = function( ih, call_event )
{
   let
     template,
     cursor_pos_obj,
     start_point_obj,
     sel_node,
     point, 
     pt_array,
     drag_link;
   let link_data;
   let
     link_type,
     edge_type;
   let
     first_node,
     middle_point_added;
   
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      this.TraceMouseMove = true;

      /* For touch devices, touch moves highlight attachment points,
         while touch end attaches to the selected point under the touch.
      */
      if( this.TouchDevice )
        this.TraceMouseRelease = true;
      
      this.SetRadioBox( GLG.IHGetSParameter( ih, "button_name" ) );
      
      // Store link type
      template = GLG.IHGetOParameter( ih, "template" );
      link_type = Math.trunc( template.GetDResource( "Index" ) );
      GLG.IHSetIParameter( ih, "link_type", link_type );
      
      // Store edge type
      let link_info = GetCPContainer( template );
      edge_type = link_info.type;
      GLG.IHSetIParameter( ih, "edge_type", edge_type );

      GLG.IHSetOParameter( ih, "drag_link", null );
      /* Fall through */

    case GLG.GlgCallEventType.HI_RESETUP_EVENT:
      /* This event type is triggered by the IHResetup call in this handler,
         which is used to reset the handler to the inital state to continue
         creating new links of this type when StickyCreateMode=True.
      */
      GLG.IHSetBParameter( ih, "first_node", true );
      GLG.IHSetBParameter( ih, "middle_point_added", false );
      
      this.SetPrompt( "Select the first node or attachment point." );
      this.Viewport.Update();
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      first_node = GLG.IHGetBParameter( ih, "first_node" );
      drag_link = GLG.IHGetOParameter( ih, "drag_link" );
      
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
         /* On mobile devices, start tracing attachment points on touch start,
            highlighting them as the touch moves and using the closest point
            on touch end.
         */
       case IH_TOUCH_START:
         GLG.SetTouchMode();

         if( first_node )
           break;
          
         /* else: Fall through to set link visible if the first node has been
            selected on a touch device. For devices with a mouse, it's done on a
            mouse move. On touch devices, touch move may not happen if the user
            just taps on nodes without touch dragging.
         */
         
       case IH_TOUCH_MOVED:
       case IH_MOUSE_MOVED:
         cursor_pos_obj = GLG.IHGetOParameter( GLG.IH_GLOBAL, "$cursor_pos" );

         /* Finds attachment point(s) of a node under the mouse and
            sets the attachment_point, attachment_point_array and 
            new_attachment_node parameters.
         */
         this.StoreAttachmentPoints( cursor_pos_obj, IH_MOUSE_MOVED );
         
         point = GLG.IHGetOParameter( ih, "attachment_point" );
         pt_array = GLG.IHGetOParameter( ih, "attachment_point_array" );
         sel_node = GLG.IHGetOParameter( ih, "new_attachment_node" );
         
         if( point != null )
           this.ShowAttachmentPoints( point, null, null, 0 );
         else if( pt_array != null )
         {
            this.ShowAttachmentPoints( null, pt_array, sel_node, 1 );
         }
         else
           // No point or no selection: erasing attachment points feedback.
           this.EraseAttachmentPoints();
         
         // If the first node has been selected, drag the link's last point.
         if( !first_node )
         {
            link_data = GetData( drag_link );
            
            /* First time: set link direction depending of the direction
               of the first mouse move, then make the link visible.
            */
            if( link_data.first_move )
            {
               start_point_obj = GLG.IHGetOParameter( ih, "start_point" );
               SetEdgeDirection( drag_link, start_point_obj, cursor_pos_obj );
               drag_link.SetDResource( "Visibility", 1.0 );
               link_data.first_move = false;
            }

            this.SetLastPoint( drag_link, cursor_pos_obj, false, false );
            
            middle_point_added =
              GLG.IHGetBParameter( ih, "middle_point_added" );
            if( !middle_point_added )
              SetArcMiddlePoint( drag_link );
         }
         this.Viewport.Update();
         break;
               
       case IH_TOUCH_END:
       case IH_MOUSE_PRESSED:
         cursor_pos_obj = GLG.IHGetOParameter( GLG.IH_GLOBAL, "$cursor_pos" );

         /* Finds attachment point(s) of a node under the mouse and
            sets the attachment_point, attachment_point_array and 
            new_attachment_node parameters.
         */
         this.StoreAttachmentPoints( cursor_pos_obj, IH_MOUSE_PRESSED );
         
         point = GLG.IHGetOParameter( ih, "attachment_point" );
         sel_node = GLG.IHGetOParameter( ih, "new_attachment_node" );
         
         if( point != null )
         {
            if( first_node )
            {	       
               GLG.IHSetOParameter( ih, "first_point", point );
               
               link_type = GLG.IHGetIParameter( ih, "link_type" );
               drag_link = this.AddLinkObject( link_type, null );
               GLG.IHSetOParameter( ih, "drag_link", drag_link );
               
               // First point
               ConstrainLinkPoint( drag_link, point, false );
               AttachFramePoints( drag_link );
               
               // Wire up the start node
               link_data = GetData( drag_link );
               link_data.start_node = GetData( sel_node );
               
               /* Store cursor position for setting direction based on the
                  first mouse move.
               */
               GLG.IHSetOParameter( ih, "start_point", cursor_pos_obj );
               link_data.first_move = true;
               drag_link.SetDResource( "Visibility", 0.0 );
               
               GLG.IHChangeBParameter( ih, "first_node", false );
               this.SetPrompt( "Select the second node or additional points." );

               this.EraseAttachmentPoints();  /* Provides visual feedback */
            }
            else
            {  
               let first_point;
               
               first_point = GLG.IHGetOptOParameter( ih, "first_point", null );
               if( point == first_point )
               {
                  this.SetError( "The two nodes are the same, " +
                                 "chose a different second node." );
                  break;
               }
               
               // Last point
               ConstrainLinkPoint( drag_link, point, true ); 
               AttachFramePoints( drag_link );
               
               middle_point_added =
                 GLG.IHGetBParameter( ih, "middle_point_added" );
               if( !middle_point_added )
                 SetArcMiddlePoint( drag_link );
               
               // Wire up the end node
               link_data = GetData( drag_link );
               link_data.end_node = GetData( sel_node );
               
               this.FinalizeLink( drag_link );
               GLG.IHChangeOParameter( ih, "drag_link", null );
               
               if( this.StickyCreateMode )
               {
                  GLG.IHCallCurrIHWithToken( IH_FINISH_LINK );
                  GLG.IHResetup( ih );   // Start over to create more links.
               }
               else
                 GLG.IHUninstall();   /* Will call IH_FINISH_LINK */
            }
         }
         else
         {
            /* No point or no selection: erase attachment point feedback 
               and add middle link points.
            */
            this.EraseAttachmentPoints();
            
            if( first_node )
            {
               // No first point yet: can't connect.
               this.SetError( "Invalid connection point!" );  
               break;
            }
            
            // Add middle link point
            AddLinkPoints( drag_link, 1 );
            GLG.IHChangeBParameter( ih, "middle_point_added", true );
            
            /* Set the last point of a linear link or the middle point of 
               the arc link.
            */
            edge_type = GLG.IHGetIParameter( ih, "edge_type" );            
            this.SetLastPoint( drag_link, cursor_pos_obj, false, 
                          edge_type == GLG.GlgObjectType.ARC );
            AttachFramePoints( drag_link );
            
            /* Set the last point of the arc link, offsetting it from the 
               middle point.
            */
            if( edge_type == GLG.GlgObjectType.ARC )
              this.SetLastPoint( drag_link, cursor_pos_obj, true, false );
         }

         this.Viewport.Update();
         break;  
         
       case IH_FINISH_LINK:    // Finish the current link.
         drag_link = GLG.IHGetOptOParameter( ih, "drag_link", null );
         if( drag_link != null )
         {
            // Finish the last link
            if( this.AllowUnconnectedLinks && this.FinishLink( drag_link ) )
              ;   // Keep the link even if its second end is not connected.
            else
            {
               // Delete the link if its second end is not connected.
               let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );
               group.DeleteThisObject( drag_link );
            }
            
            GLG.IHChangeOParameter( ih, "drag_link", null );
         }
         this.EraseAttachmentPoints();   
         this.Viewport.Update();
         break;
         
       case IH_ESC:
       case IH_MOUSE_BUTTON3:
         drag_link = GLG.IHGetOptOParameter( ih, "drag_link", null );
         if( drag_link != null && this.StickyCreateMode )
         {
            // Stop adding points to this link.
            GLG.IHCallCurrIHWithToken( IH_FINISH_LINK );
            GLG.IHResetup( ih );   // Start over to create more links.
         }
         else
           /* No curr link or !StickyCreateMode: finish the current link 
              if any and stop adding links.
           */
           GLG.IHUninstall();      // Will call IH_FINISH_LINK
         break;
         
       default:
         GLG.IHUninstallWithEvent( call_event ); // Pass to the parent IH.
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      GLG.IHCallCurrIHWithToken( IH_FINISH_LINK ); // Finish the current link
      
      this.TraceMouseMove = false;
      this.TraceMouseRelease = false;
      this.SetRadioBox( SELECT_BUTTON_NAME );   // Highlight Select button
      this.SetPrompt( "" );
      this.Viewport.Update();
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// Finds attachment point(s) of a node under the cursor.
//
// Stores the node and either the selected attachment point or all 
// attachment points as parameters of the invoking IH: attachment_point, 
// attachment_array and attachment_node.
//
// Stores nulls if no node is selected.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.StoreAttachmentPoints =
  function( cursor_pos_obj, event_type )
{
   let
     point = null,
     pt_array = null,
     sel_node = null;
      
   let selection = this.GetObjectsAtCursor( cursor_pos_obj );
   
   let num_selected;
   if( selection != null && ( num_selected = selection.GetSize() ) != 0 )
   {
      /* Some object were selected, process the selection to find the point 
         to connect to */
      for( let i=0; i < num_selected; ++i )
      {
         let sel_object = selection.GetElement( i );
            
         /* Find if the object itself is a link or a node, or if it's a part
            of a node. If it's a part of a node, get the node object ID.
         */
         let selection_info = GetSelectedObject( sel_object );
         sel_object = selection_info.glg_object;
         let selection_type = selection_info.type;

         if( selection_type == NODE )
         {
            /* Node may have multiple attachment points: get an array of 
               marked attachment points.
            */
            pt_array = GetNodeAttachmentPoints( sel_object, "CP" );
            if( pt_array != null )
            {
               point = this.GetSelectedPoint( pt_array, cursor_pos_obj );
               
               /* Use attachment points array to highlight all attachment 
                  points only if no specific point is selected, and only
                  on the mouse move. On the mouse press, the specific point
                  is used to connect to.
               */
               if( point != null || event_type != IH_MOUSE_MOVED )
                 pt_array = null;
            }
            else
            {
               let type = Math.trunc( sel_object.GetDResource( "Type" ) );
               if( type == GLG.GlgObjectType.REFERENCE )
               {
                  // Use reference's anchor point as an attachment point
                  point = sel_object.GetResourceObject( "Point" );
               }
               else
                 continue;
            }

            /* If found a point to connect to, stop search and use it.
               If found a node with attachment points, stop search and
               highlight the points.
            */
            if( point != null || pt_array != null )
            {
               if( point != null )
                 // If found attachment point, reset pt_array
                 pt_array = null;
               
               sel_node = sel_object;
               break;
            }
         }

         // No point to connect to: continue searching all selected objects.
      }
      
      // Store as parameters of the invoking handler.
      GLG.IHSetOParameter( GLG.IH_CURR, "attachment_point", point );
      GLG.IHSetOParameter( GLG.IH_CURR, "attachment_point_array", pt_array );
      GLG.IHSetOParameter( GLG.IH_CURR, "new_attachment_node", sel_node );
   }
}
   
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.EditPropertiesIH = function( ih, call_event )
{
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      GLG.IHSetBParameter( GLG.IH_GLOBAL, "token_used", true );
      
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_TEXT_INPUT_CHANGED:
         if( this.SelectedObject == null )
           break;
         
         this.DialogDataChanged = true;
         break;
         
       case IH_PROPERTIES:
         this.FillData();
         this.PopupDialog( this.Viewport, "Dialog" ); 
         this.Viewport.Update();
         break;
               
       case IH_DATASOURCE_SELECT:   /* Process Diagram only */
         if( this.SelectedObject == null )
         {
            this.SetError( "Select an object in the drawing first." );
            this.Viewport.Update();
            break;
         }
         
         /* Returns with IH_DATASOURCE_SELECTED and $rval containing 
            selected datasource string. 
         */
         GLG.IHInstallAsInterface( this.GetDataSourceIH.bind( this ) );
         GLG.IHStart();
         break;
         
       case IH_DATASOURCE_SELECTED:   /* Process Diagram only */
         // Get the selection.
         let rval = GLG.IHGetSParameter( ih, "$rval" );
         this.Viewport.SetSResource( "Dialog/DialogDataSource/TextString",
                                     rval );
         this.DialogDataChanged = true;
         break;
         
       case IH_DIALOG_CANCEL:
         this.DialogDataChanged = false;
         this.FillData();
         this.Viewport.Update();
         break;
         
       case IH_DIALOG_APPLY:
         this.ApplyDialogData();
         this.DialogDataChanged = false;
         this.Viewport.Update();
         break;
         
       case IH_DIALOG_CLOSE:
         if( !this.DialogDataChanged )    // No changes: close the dialog.
         {
            this.Viewport.SetDResource( "Dialog/Visibility", 0.0 );
            this.Viewport.Update();
            break;
         }
         
         // Data changed: confirm discarding changes.
         
         /* Store the CLOSE action that initiated the confirmation,
            to close the data dialog when confirmed.
         */
         GLG.IHSetIParameter( ih, "op", token );
         
         GLG.IHCallCurrIHWithToken( IH_DIALOG_CONFIRM_DISCARD );
         break;
         
       case IH_DIALOG_CONFIRM_DISCARD:
         /* Returns with IH_OK with IH_CANCEL.
            All parameters are optional, except for the message parameter.
         */
         GLG.IHInstallAsInterface( this.ConfirmIH.bind( this ) );
         GLG.IHSetSParameter( GLG.IH_NEW,
                              "title", "Confirmation Dialog" );
         GLG.IHSetSParameter( GLG.IH_NEW, "message", 
                              "Do you want to save dialog changes?" );
         GLG.IHSetSParameter( GLG.IH_NEW, "ok_label", "Save" );
         GLG.IHSetSParameter( GLG.IH_NEW, "cancel_label", "Discard" );
         GLG.IHSetBParameter( GLG.IH_NEW, "modal_dialog", true ); 
         GLG.IHStart();
         break;
               
       case IH_OK:       // Save changes.
       case IH_CANCEL:   // Discard changes.
         GLG.IHCallCurrIHWithToken( token == IH_OK ? 
                                    IH_DIALOG_APPLY : IH_DIALOG_CANCEL );
         
         /* Close the data dialog if that's what initiated the confirmation. */
         if( GLG.IHGetOptIParameter( ih, "op", 0 ) == IH_DIALOG_CLOSE )
           GLG.IHCallCurrIHWithToken( IH_DIALOG_CLOSE );
         break;
               
       case IH_ESC: 
         break;     // Allow: do nothing.
               
       default: 
         if( !this.DialogDataChanged )    // No changes.
         {
            GLG.IHSetBParameter( GLG.IH_GLOBAL, "token_used", false );
            UninstallPassTroughIH( call_event );
            break;
         }
         
         /* Data changed: ignore the action and confirm discarding changes.
            Alternatively, data changes could be applied automatically 
            when the text field looses focus, the way it is done in the 
            GLG editors, which would eliminate a need for a confirmation 
            dialog for discarding changed data.
         */
         
         // Restore state of any ignored toggles.
         this.RestoreToggleStateWhenDisabled( token );
         
         GLG.IHCallCurrIHWithToken( IH_DIALOG_CONFIRM_DISCARD );
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      this.DialogDataChanged = false;
      break;
   }
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.GetDataSourceIH = function( ih, call_event )
{
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
    this.PopupDialog( this.Viewport, "DataSourceDialog" ); 
      this.Viewport.Update();
      break;
      
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_DATASOURCE_APPLY:
       case IH_DATASOURCE_LIST_SELECTION:
         let sel_item =
           this.Viewport.GetSResource( "DataSourceDialog/DSList/SelectedItem" );
         GLG.IHUninstall();

         /* Set the return value in the parent datastore and call the parent. */
         GLG.IHSetSParameter( GLG.IH_CURR, "$rval", sel_item );
         GLG.IHCallCurrIHWithToken( IH_DATASOURCE_SELECTED ); 
         break;
         
       case IH_DATASOURCE_CLOSE:
         GLG.IHUninstall();
         break;
         
       default: 
         GLG.IHUninstallWithEvent( call_event );
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      this.Viewport.SetDResource( "DataSourceDialog/Visibility", 0.0 ); 
      this.Viewport.Update();
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// OK/Cancel confirmation dialog. 
//
// Handler parameters:
//   message
//   title (optional, default "Confirm")
//   ok_label (optional, def. "OK")
//   cancel_label (optional, def. "Cancel")
//   modal_dialog (optional, def. true)
//   allow_ESC (optional, def. true )
//   requested_op (optional, default - undefined (0) )
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.ConfirmIH = function( ih, call_event )
{
   switch( GLG.IHGetType( call_event ) )
   {
    case GLG.GlgCallEventType.HI_SETUP_EVENT:
      let dialog = this.Viewport.GetResourceObject( "OKDialog" );
      dialog.SetSResource( "ScreenName",
                           GLG.IHGetOptSParameter( ih, "title", "Confirm" ) );
      dialog.SetSResource( "OKDialogOK/LabelString",
                           GLG.IHGetOptSParameter( ih, "ok_label", "OK" ) );
      dialog.SetSResource( "OKDialogCancel/LabelString",
                           GLG.IHGetOptSParameter( ih, "cancel_label",
                                                   "Cancel" ) );
      dialog.SetSResource( "DialogMessage/String",
                           GLG.IHGetSParameter( ih, "message" ) );
      dialog.SetDResource( "DialogMessage/FontType", 6 );
      this.PopupDialog( dialog, null );
      this.Viewport.Update();
      break;
            
    case GLG.GlgCallEventType.MESSAGE_EVENT:
      let token = GLG.IHGetToken( call_event );
      switch( token )
      {
       case IH_OK:
       case IH_CANCEL:
         GLG.IHUninstallWithToken( token );   // Pass selection to the parent.
         break;

       case IH_ESC:
         if( GLG.IHGetOptBParameter( ih, "allow_ESC", true ) )
           GLG.IHUninstall();
         break;
         
       default: 
         if( GLG.IHGetOptBParameter( ih, "modal_dialog", true ) )
         {
            this.RestoreToggleStateWhenDisabled( token );
            this.SetError( "Please select one of the choices from " +
                           "the confirmation dialog." );
            this.Viewport.Update();
         }
         else
           GLG.IHUninstallWithEvent( call_event );
         break;
      }
      break;
      
    case GLG.GlgCallEventType.CLEANUP_EVENT:
      this.Viewport.SetDResource( "OKDialog/Visibility", 0.0 );
      this.Viewport.Update();
      break;
   }
}

////////////////////////////////////////////////////////////////////////
// Restore state of any pressed toggles ignored or disabled by the 
// confirmation dialog.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.RestoreToggleStateWhenDisabled = function( token )
{
   switch( token )
   {
    case IH_ICON_SELECTED:
      DeselectButton( GLG.IHGetSParameter( GLG.IH_GLOBAL,
                                           "$selected_button" ) );
      break;
      
    case IH_CREATION_MODE:
      this.SetCreateMode( true );
      break;
   }
}

////////////////////////////////////////////////////////////////////////
function UninstallPassTroughIH( call_event )
{
   if( GLG.IHGetBParameter( GLG.IH_GLOBAL, "fall_through_call" ) )
     /* A fall-through invokation: a parent handler passed an unused event 
        to this IH for possible processing, discard The event. Passing 
        the event to the parent IH would cause infinite recursion.
     */
     GLG.IHUninstall();
   else
     /* Not a pass-through invokation: the IH was not uninstalled and 
        is current. Pass an unused event to the parent handler for
        processing.
     */              
     GLG.IHUninstallWithEvent( call_event );           
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.ShowAttachmentPoints =
  function( point, pt_array, sel_node, highlight_type )
{
   let screen_point;

   if( point != null )
   {
      if( this.AttachmentArray != null )
        this.EraseAttachmentPoints();   
      
      // Get screen coords of the connector point, not the cursor
      // position: may be a few pixels off.
      screen_point = point.GetGResource( "XfValue" );
      
      this.DrawingArea.ScreenToWorld( true, screen_point, this.WorldCoord );
      
      if( this.AttachmentMarker == null )
      {
         if( this.TouchDevice )
         {
            this.AttachmentMarker = this.PointMarker.CopyObject();

            // Increase selected point size on touch devices.
            this.AttachmentMarker.SetDResource( "MarkerSize", 100 );
         }              
         else
           this.AttachmentMarker = this.PointMarker;

         this.DrawingArea.AddObjectToBottom( this.AttachmentMarker );
      }
      
      // Position the feedback marker over the connector.
      this.AttachmentMarker.SetGResourceFromPoint( "Point", this.WorldCoord );
      
      this.AttachmentMarker.SetDResource( "HighlightType", highlight_type );
   }
   else if( pt_array != null )
   {
      if( sel_node == this.AttachmentNode )
        return;    // Attachment points are already shown for this node.
      
      // Erase previous attachment feedback if shown.
      this.EraseAttachmentPoints();   
      
      let size = pt_array.GetSize();
      this.AttachmentArray =
        GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                          GLG.GlgContainerType.GLG_OBJECT, size, 0, null );
      this.AttachmentNode = sel_node;
         
      for( let i=0; i<size; ++i )
      {
         let marker = this.PointMarker.CopyObject();

         if( this.TouchDevice )
           // Increase attachment point size on touch devices.
           marker.SetDResource( "MarkerSize", 30 );
         
         point = pt_array.GetElement( i );
            
         // Get the screen coords of the connector point.
         screen_point = point.GetGResource( "XfValue" );
         
         this.DrawingArea.ScreenToWorld( true, screen_point, this.WorldCoord );
         
         // Position the feedback marker over the connector.
         marker.SetGResourceFromPoint( "Point", this.WorldCoord );
         
         marker.SetDResource( "HighlightType", highlight_type );
         
         this.AttachmentArray.AddObjectToBottom( marker );
      }
      this.DrawingArea.AddObjectToBottom( this.AttachmentArray );
   }
}

////////////////////////////////////////////////////////////////////////
// Erases attachment points feedback if shown. Returns true if feedback
// was erased, of false if there was nothing to erase.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.EraseAttachmentPoints = function()
{
   if( this.AttachmentMarker != null )
   {
      this.DrawingArea.DeleteThisObject( this.AttachmentMarker );
      this.AttachmentMarker = null;
      return true;
   }
   
   if( this.AttachmentArray != null )
   {
      this.DrawingArea.DeleteThisObject( this.AttachmentArray );
      this.AttachmentArray = null;
      this.AttachmentNode = null;
      return true;
   }
   
   return false;    // Nothing to erase.
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.FinalizeLink = function( link )
{
   let arrow_type = link.GetResourceObject( "ArrowType" );
   if( arrow_type != null )
     arrow_type.SetDResource( null, GLG.GlgArrowType.MIDDLE_FILL_ARROW );

   let link_data = GetData( link );

   // Store points
   StorePointData( link_data, link );
   
   // Add link data to the link list
   let link_list = this.CurrentDiagram.getLinkList();
   link_list.push( link_data );
   
   // After storing color: changes color to select.
   this.SelectGlgObject( link, LINK );
   
   this.CustomAddObjectCB( this.Viewport, link, GetData( link ), false );
}

////////////////////////////////////////////////////////////////////////
// Stores point coordinates in the link data structure as an array.
////////////////////////////////////////////////////////////////////////
function StorePointData( link_data, link )
{
   let link_info = GetCPContainer( link );
   let point_container = link_info.glg_object;
      
   let num_points = point_container.GetSize();

   // Create a new array and discard the old one for simplicity.
   link_data.point_array = new Array( num_points );
   for( let i=0; i<num_points; ++i )
   {
      let point_obj = point_container.GetElement( i ); // GLG Data of G type
      let glg_point = point_obj.GetGResource( null );  // GlgPoint
      link_data.point_array[i] = glg_point;
   }
}
      
////////////////////////////////////////////////////////////////////////
// Restores link's middle points from the link data's stored vector.
// The first and last point's values are not used: they are constrained 
// to nodes and positioned/controlled by them.
////////////////////////////////////////////////////////////////////////
function RestorePointData( link_data, link )
{
   // Set middle point values
   if( link_data.point_array != null )
   {
      let num_points = link_data.point_array.length;
      
      let link_info = GetCPContainer( link );
      let point_container = link_info.glg_object;
      
      /* Skip the first and last point if they are constrained to nodes.
         Set only the unconnected ends and middle points.
      */
      let start = ( link_data.getStartNode() != null ? 1 : 0 );
      let end =
        ( link_data.getEndNode() != null ? num_points - 1 : num_points );

      /* Skip the first and last point: constrained to nodes.
         Set only the middle points.
      */
      for( let i=start; i<end; ++i )
      {
         let point = point_container.GetElement( i );  // GLG data of G type
         let saved_point = link_data.point_array[i];   // GlgPoint
         point.SetGResourceFromPoint( null, saved_point );
      }
   }
}

////////////////////////////////////////////////////////////////////////
function GetPointFromObj( point_obj )
{
   return point_obj.GetGResource( null );
}

////////////////////////////////////////////////////////////////////////
function MoveObject( object, start_point_obj, end_point_obj )
{
   object.MoveObject( GLG.GlgCoordType.SCREEN_COORD,
                      GetPointFromObj( start_point_obj ), 
                      GetPointFromObj( end_point_obj ) );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.UpdateNodePosition = function( node, node_data )
{
   if( node_data == null )
     node_data = GetData( node );
   
   this.GetPosition( node, this.WorldCoord );
   node_data.position.CopyFrom( this.WorldCoord );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.GetObjectsAtCursor = function( cursor_pos_obj )
{
   let cursor_pos = GetPointFromObj( cursor_pos_obj );

   /* Select all objects in the vicinity of the +-SelectionResolution 
      pixels from the actual mouse click position.
   */
   this.SelectRect.p1.x = cursor_pos.x - this.SelectionResolution;
   this.SelectRect.p1.y = cursor_pos.y - this.SelectionResolution;
   this.SelectRect.p2.x = cursor_pos.x + this.SelectionResolution;
   this.SelectRect.p2.y = cursor_pos.y + this.SelectionResolution;
   
   return GLG.CreateSelection( this.DrawingArea,
                               this.SelectRect, this.DrawingArea );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SelectGlgObject =
  function( glg_object, selected_type )
{
   let name;

   if( GLG.ObjectsEqual( glg_object, this.SelectedObject ) )
     return;   // No change
   
   if( this.LastColor != null ) // Restore the color of previously selected node
   {
      this.LastColor.SetResourceFromObject( null, this.StoredColor );
      this.LastColor = null;
   }

   this.SelectedObject = glg_object;
   this.SelectedObjectType = selected_type;
   
   // Show object selection
   if( glg_object != null )
   {
      // Change color to highlight selected node or link.
      if( glg_object.HasResourceObject( "SelectColor" ) )
      {
         this.LastColor = glg_object.GetResourceObject( "SelectColor" );
         
         // Store original color
         this.StoredColor.SetResourceFromObject( null, this.LastColor );
         
         // Set color to red to highlight selection.
         this.LastColor.SetGResource( null, 1.0, 0.0, 0.0 );
      }
      name = GetObjectLabel( this.SelectedObject );
   }
   else
     name = "NONE";
   
   // Display selected object name at the bottom.
   this.Viewport.SetSResource( "SelectedObject", name );
   
   this.FillData();
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.Cut = function()
{
   if( this.NoSelection() )
     return;
   
   // Disallow deleting a node without deleting the link first.
   if( this.SelectedObjectType == NODE &&
       this.NodeConnected( this.SelectedObject ) )
   {
      this.SetError( "Remove links connected to the node before removing " +
                     "the node!" );
      return;
   }
   
   let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );
   
   if( group.ContainsObject( this.SelectedObject ) )
   {
      // Store the node or link in the cut buffer.
      this.CutBuffer = this.SelectedObject;
      this.CutBufferType = this.SelectedObjectType;
      
      // Delete the node
      group.DeleteThisObject( this.SelectedObject );

      // Delete the data
      let data = GetData( this.SelectedObject );
      let list = null;

      this.CustomCutObjectCB( this.Viewport, this.SelectedObject, data,
                              this.SelectedObjectType == NODE );

      if( this.SelectedObjectType == NODE )
        list = this.CurrentDiagram.getNodeList();
      else  // Link
        list = this.CurrentDiagram.getLinkList();

      RemoveArrayElement( list, data );

      this.SelectGlgObject( null, 0 );
   }
   else
     this.SetError( "Cut failed." );    
}

////////////////////////////////////////////////////////////////////////
function RemoveArrayElement( array, data )
{
   for( let i=0; i<array.length; ++i )
     if( array[i] == data )
     {
        array.splice( i, 1 );
        return;
     }
      
   AppError( "Deleting data failed!" );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.Paste = function()
{
   if( this.CutBuffer == null )
   {
      this.SetError( "Empty cut buffer, cut some object first." );
      return;
   }
   
   let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );

   let data = GetData( this.CutBuffer );
   this.CustomPasteObjectCB( this.Viewport, this.CutBuffer, data,
                             this.CutBufferType == NODE );

   let list = null;
   if( this.CutBufferType == NODE )
   {
      group.AddObjectToBottom( this.CutBuffer );     // In front
      list = this.CurrentDiagram.getNodeList();
      list.push( data );
   }
   else // LINK
   {
      group.AddObjectToTop( this.CutBuffer );        // Behind
      list = this.CurrentDiagram.getLinkList();
      list.push( data );
   }
   
   this.SelectGlgObject( this.CutBuffer, this.CutBufferType );
   
   // Allow pasting just once to avoid handling the data copy
   this.CutBuffer = null;
}

////////////////////////////////////////////////////////////////////////
// Saves a diagram as a JSON string.
// The demo uses this JSON string to demonstrate loading a diagram from
// JSON when the Load button is pressed.
// In an application, the JSON string may be sent to a server to be
// saved.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.Save = function( diagram )
{
   /* Using \t for better console output. A real application could omit
      the third parameter for more compact output.
   */
   let json_string =
     JSON.stringify( diagram, this.replacer.bind( this ), '\t' );

   /* Save the current diagram to use it as test for loading.
      In a real application, the JSON string will be sent to the server
      to be saved.
   */
   this.SavedDiagramData = json_string;
   
   // Empty the drawing area.
   this.UnsetDiagram( diagram );

   // Print to the console for demo and debugging.
   WriteLine( "SAVED DIGRAM DATA" );
   WriteLine( json_string );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.replacer = function( name, value )
{
   switch( name )
   {
    case "datasource":
      if( this.ProcessDiagram )
        return value;
      else
        return undefined;         // Save datasource only for ProcessDiagram.

    case "start_node":
    case "end_node":
    if( value == null )
      return value;      // This is an unconnected end of a link.

    // For the start and end nodes, save their indices in the node array. 
    let node_list = this.CurrentDiagram.getNodeList();
    return node_list.indexOf( value );

    case "position":
    case "link_color": 
      // These fields are GLG points: save only their x, y and z fields.
      return { x : value.x, y : value.y, z : value.z };

    case "point_array":
      if( value.length == 0 )
        return value;
      
      /* Point array contains GLG data objects of G (geometrical) type,
         save their x, y and z fields.
      */
      let array = [];
      for( let i=0; i<value.length; ++i )
      {
         let point = value[ i ];   // GlgPoint
         array.push( { x : point.x, y : point.y, z : point.z } );
      }
      return array;
      
    default: return value;
  
      // These fields are used only at run time and do not get saved.
    case "graphics":    return undefined;
    case "first_move":  return undefined;
   }
}

////////////////////////////////////////////////////////////////////////
// Load a diagram from a JSON string.
// The demo loads a diagram from a diagram previously saved as a
// JSON string by the Save() method.
// In a real application, a previously stored diagram may be loaded
// from a JSON string receved from a server.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.Load = function()
{
   /* In the demo, load the previously saved diagram and use it to demonstrate
      how to load a diagram from a JSON string.
   */
   if( this.SavedDiagramData == null )
     this.SetError( "Save the diagram first." );
   else
   {
      this.UnsetDiagram( this.CurrentDiagram );   // Erase the current diagram.
      
      /* Load a new diagram from a previously saved JSON string.
         In a real application, a prevously saved diagram can be retrieved
         from a server in the JSON format.
      */
      let diagram_data;
      try
      {
         diagram_data = JSON.parse( this.SavedDiagramData );
      }
      catch( error )
      {
         this.SetError( "JSON parse error: " + error );
         this.SavedDiagramData = null;
         return;
      }
      
      this.SetDiagram( diagram_data );
      this.SavedDiagramData = null;
   }
}

////////////////////////////////////////////////////////////////////////
function Print()
{
   window.print();
}

////////////////////////////////////////////////////////////////////////
// If AllowUnconnectedLinks=true, keep the link if it has at least two 
// points.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.FinishLink = function( link )
{
   let link_info = GetCPContainer( link );
   
   let point_container = link_info.glg_object;
   
   let edge_type = link_info.type;
   if( edge_type == GLG.GlgObjectType.ARC )
     return false;      // Disconnected arc links are not allowed.
   
   let size = point_container.GetSize();
   
   /* The link must have at least two points already defined, and one extra
      point that was added to drag the next point.
   */
   if( size < 3 )
     return false;
   
   // Delete the unfinished, unconnected point.
   let suspend_info = link.SuspendObject();
   point_container.DeleteBottomObject();
   link.ReleaseObject( suspend_info );
   
   this.FinalizeLink( link );
   return true;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetPrompt = function( message )
{
   this.Viewport.SetSResource( "Prompt/String", message );
   this.Viewport.Update();
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetError = function( message )
{
   GLG.Bell();
   this.SetPrompt( message );
   AppLog( message );
   AppAlert( message );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.NoSelection = function()
{
   if( this.SelectedObject != null )
     return false;
   else
   {
      this.SetError( "Select some object first." );
      return true;
   }
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AddNodeAt =
  function( node_type, node_data, position_obj, coord_system )
{     
   let store_position;
   
   if( node_data == null )
   {
      node_data = new GlgNodeData( null );
      node_data.node_type = node_type;
      
      // Add node data to the node list
      let node_list = this.CurrentDiagram.getNodeList();
      node_list.push( node_data );
      
      if( this.ProcessDiagram )
      {
         // Assign an arbitrary datasource initially.
         node_data.datasource = "DataSource" + this.DataSourceCounter;
         
         ++this.DataSourceCounter;
         if( this.DataSourceCounter >= this.NumDatasources )
           this.DataSourceCounter = 0;
      }
   }
   
   // Create the node based on the node type
   let new_node = this.CreateNode( node_data );
   
   // Make label visible and set its string.
   if( new_node.HasResourceObject( "Label" ) )
   {
      new_node.SetDResource( "Label/Visibility", 1.0 );
      new_node.SetSResource( "Label/String", node_data.object_label );
   }
   
   // Store datasource as a tag of the node's Value resource, if it exists.
   if( this.ProcessDiagram )
   {
      let value_obj = new_node.GetResourceObject( "Value" );
      let datasource = node_data.datasource;
      
      if( value_obj != null && datasource != null && datasource.length != 0  )
      {
         let tag_obj =
           GLG.CreateObject( GLG.GlgObjectType.TAG,
                             "Value", datasource, null, null );
         value_obj.SetResourceObject( "TagObject", tag_obj );
      }
   }
   
   let position;
   
   // No cursor position: get position from the data struct.      
   if( position_obj == null )
   {
      /* Using CreateGlgPointFromPoint() instead of CopyGlgPoint().
         We are loading new diagram: node_data.position is obtained from JSON.
         It has x, y and z properties, but it is not a GLG point.
      */
      position = GLG.CreateGlgPointFromPoint( node_data.position );
      store_position = false;
   }
   else
   {
      position = GetPointFromObj( position_obj );
      store_position = true;
   }
   
   node_data.graphics = new_node;  // Pointer from data struct to graphics

   /* dd the object to the drawing first, so that it's hierarchy is setup
      for positioning it.
   */
   let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );
   group.AddObjectToBottom( new_node );

   // Transform the object to set its size and position.
   this.PlaceObject( new_node, position, coord_system, this.WorldCoord );
   
   if( store_position )
     node_data.position.CopyFrom( this.WorldCoord );

   return new_node;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.CreateNode = function( node_data )
{
   // Get node template from the palette
   let new_node = this.NodeObjectArray.GetElement( node_data.node_type );
         
   // Create a new node instance 
   new_node = new_node.CloneObject( GLG.GlgCloneType.STRONG_CLONE );
   
   /* Name node using an "object" prefix (used to distiguish
      nodes from links on selection).
   */
   new_node.SetSResource( "Name", "object" );
   
   AddCustomData( new_node, node_data );
   
   if( this.ProcessDiagram )
   {
      // Init label data using node's InitLabel if exists.
      if( new_node.HasResourceObject( "InitLabel" ) )
        node_data.object_label = new_node.GetSResource( "InitLabel" );
   }
   
   return new_node;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.CreateLink = function( link_data )
{
   // Get link template from the palette
   let new_link = this.LinkObjectArray.GetElement( link_data.link_type );
   
   // Create a new link instance 
   new_link = new_link.CloneObject( GLG.GlgCloneType.STRONG_CLONE );
   
   /* Name link using a "link" prefix (used to distiguish
      links from nodes on selection).
   */
   new_link.SetSResource( "Name", "link" );

   /* If point_array exists, create/add middle link points
      If not an arc, it's created with 2 points by default, 
      add ( num_points - 2 ) more. If it's an arc, AddLinkPoints
      will do nothing.
   */
   let num_points;
   if( link_data.point_array != null &&
       ( num_points = link_data.point_array.length ) > 2 )
     AddLinkPoints( new_link, num_points - 2 );
   
   AddCustomData( new_link, link_data );
   
   return new_link;
}

/////////////////////////////////////////////////////////////////////////
// Connects the first or last point of the link.
/////////////////////////////////////////////////////////////////////////
function ConstrainLinkPoint( link, point, last_point )
{
   let link_info = GetCPContainer( link );
   
   let point_container = link_info.glg_object;
   
   let link_point =
     point_container.GetElement( last_point ?
                                 point_container.GetSize() - 1 : 0 );
   
   let suspend_info = link.SuspendObject();
   link_point.ConstrainObject( point );
   link.ReleaseObject( suspend_info );

   /* Store point name for save/load. 
      If it's not a named attachment point, use reference anchor point.
   */
   let point_name = point.GetSResource( "Name" );
   if( point_name == null || point_name.length == 0 )
     point_name = "Point";
   
   let link_data = GetData( link );
   if( last_point )
     link_data.end_point_name = point_name;
   else
     link_data.start_point_name = point_name;
}

/////////////////////////////////////////////////////////////////////////
// Positions the arc's middle point if it's not explicitly defined.
/////////////////////////////////////////////////////////////////////////
function SetArcMiddlePoint( link )
{
   let link_info = GetCPContainer( link );
   let point_container = link_info.glg_object;
   let edge_type = link_info.type;
   
   if( edge_type != GLG.GlgObjectType.ARC )
     return;
   
   // Offset the arc's middle point if wasn't set.
   let start_point = point_container.GetElement( 0 );
   let middle_point = point_container.GetElement( 1 );
   let end_point = point_container.GetElement( 2 );
   
   let pt1 = start_point.GetGResource( null );
   let pt2 = end_point.GetGResource( null );
   
   // Offset the middle point.
   middle_point.SetGResource( null,
              ( pt1.x + pt2.x ) / 2.0 + ( pt1.y - pt2.y != 0.0 ? 50.0 : 0.0 ),
              ( pt1.y + pt2.y ) / 2.0 + ( pt1.y - pt2.y != 0.0 ? 0.0 : 50.0 ),
              ( pt1.z + pt2.z ) / 2.0 );
}

/////////////////////////////////////////////////////////////////////////
// Handles links with labels: constrains frame's points to the link's 
// points.
/////////////////////////////////////////////////////////////////////////
function AttachFramePoints( link )
{
   let frame = link.GetResourceObject( "Frame" );
   if( frame == null ) // Link without label and frame
     return;
      
   let link_info = GetCPContainer( link );
   let link_point_container = link_info.glg_object;

   // Always use the first segment of the link to attach the frame.
   let link_start_point = link_point_container.GetElement( 0 );
   let link_end_point = link_point_container.GetElement( 1 );
      
   let frame_point_container = frame.GetResourceObject( "CPArray" );
   let size = frame_point_container.GetSize();
   let frame_start_point = frame_point_container.GetElement( 0 );
   let frame_end_point = frame_point_container.GetElement( size - 1 );
      
   let suspend_info = link.SuspendObject();
      
   frame_start_point.ConstrainObject( link_start_point );
   frame_end_point.ConstrainObject( link_end_point );
   
   link.ReleaseObject( suspend_info );
}

/////////////////////////////////////////////////////////////////////////
// Set last point of the link (dragging).
/////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetLastPoint =
  function( link, cursor_pos_obj, offset, arc_middle_point )
{
   let link_info = GetCPContainer( link );
   let point_container = link_info.glg_object;
   
   let cursor_pos = GetPointFromObj( cursor_pos_obj );
   
   /* Offset the point: used to offset the arc's last point from the 
      middle one while dragging.
   */
   if( offset )
   {
      cursor_pos.x += 10.0;
      cursor_pos.y += 10.0;
   }
   
   let point;
   if( arc_middle_point )
     // Setting the middle point of an arc.
     point = point_container.GetElement( 1 );
   else
     // Setting the last point.
     point = point_container.GetElement( point_container.GetSize() - 1 );
   
   this.DrawingArea.ScreenToWorld( true, cursor_pos, this.WorldCoord );
   point.SetGResourceFromPoint( null, this.WorldCoord );
}

/////////////////////////////////////////////////////////////////////////
function AddLinkPoints( link, num_points )
{
   let link_info = GetCPContainer( link );
   if( link_info.type == GLG.GlgObjectType.ARC )
     return; // Arc connectors have fixed number of points: don't add.
   
   let point_container = link_info.glg_object;
   
   let point = point_container.GetElement( 0 );
   
   let suspend_info = link.SuspendObject();
   for( let i=0; i<num_points; ++i )
   {
      let add_point = point.CloneObject( GLG.GlgCloneType.FULL_CLONE );

      /* If point was attached to a node's attachment point, it may inherit
         its transformation - delete it from the cloned point.
      */
      add_point.SetResourceObject( "Xform", null );
      point_container.AddObjectToBottom( add_point );
   }
   link.ReleaseObject( suspend_info );
}

/////////////////////////////////////////////////////////////////////////
// Set the direction of the recta-linera connector depending on the 
// direction of the first mouse move.
/////////////////////////////////////////////////////////////////////////
function SetEdgeDirection( link, start_pos_obj, end_pos_obj )
{
   let direction;
   
   let link_info = GetCPContainer( link );
   let edge_type = link_info.type;
   
   if( edge_type == GLG.GlgObjectType.ARC || edge_type == 0 )
     return;      // Arc or polygon
   
   let start_pos = GetPointFromObj( start_pos_obj );
   let end_pos = GetPointFromObj( end_pos_obj );

   if( Math.abs( start_pos.x - end_pos.x ) > 
       Math.abs( start_pos.y - end_pos.y ) )
     direction = GLG.GlgOrientationType.HORIZONTAL;
   else
     direction = GLG.GlgOrientationType.VERTICAL;
   
   link.SetDResource( "EdgeDirection", direction );
   
   let link_data = GetData( link );
   link_data.link_direction = direction;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.AddLinkObject = function( link_type, link_data )
{     
   let link;
   
   if( link_data == null )    // Creating a new link interactively
   {	 
      link_data = new GlgLinkData();
      link_data.link_type = link_type;
      
      link = this.CreateLink( link_data );
      
      // Store color
      link_data.link_color = link.GetGResource( "EdgeColor" );
      
      /* Don't add link data to the link list or store points: 
         will be done when finished creating the link.
      */
   }
   else  // Creating a link from data on load.
   {
      link = this.CreateLink( link_data );
      
      // Set color
      link.SetGResourceFromPoint( "EdgeColor", link_data.link_color );
      
      // Enable arrow type if defined 
      let arrow_type = link.GetResourceObject( "ArrowType" );
      if( arrow_type != null )
        arrow_type.SetDResource( null, GLG.GlgArrowType.MIDDLE_FILL_ARROW );
      
      // Restore connector direction if recta-linear
      let direction = link.GetResourceObject( "EdgeDirection" );
      if( direction != null )
        direction.SetDResource( null, link_data.link_direction );
      
      // Constrain end points to start and end nodes 
      let start_node = link_data.getStartNode();
      if( start_node != null )
      {
         let node1 = start_node.graphics;
         let point1 = node1.GetResourceObject( link_data.start_point_name  );
         ConstrainLinkPoint( link, point1, false ); // First point
      }
      
      let end_node = link_data.getEndNode();
      if( end_node != null )
      {
         let node2 = end_node.graphics;         
         let point2 = node2.GetResourceObject( link_data.end_point_name );         
         ConstrainLinkPoint( link, point2, true ); // Last point
      }
      
      AttachFramePoints( link );
      
      RestorePointData( link_data, link );
   }

   // Display the label if it's a link with a label.
   if( link.HasResourceObject( "Label" ) )
     link.SetSResource( "Label/String", link_data.object_label );
   
   link_data.graphics = link;     // Pointer from data struct to graphics
   
   // Add to the top of the draw list to be behind other objects.
   let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );
   group.AddObjectToTop( link );
   
   return link;
}

////////////////////////////////////////////////////////////////////////
// Set the object size and position.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.PlaceObject =
  function( node, pos, coord_type, world_coord )
{
   /* World coordinates of the node are returned to be stored in the node's
      data structure.
   */
   if( coord_type == GLG.GlgCoordType.SCREEN_COORD ) 
     this.DrawingArea.ScreenToWorld( true, pos, world_coord );
   else
     world_coord.CopyFrom( pos );
   
   let type = Math.trunc( node.GetDResource( "Type" ) );
   if( type == GLG.GlgObjectType.REFERENCE )
   {
      // Reference: can use its point to position it.
      node.SetGResourceFromPoint( "Point", world_coord );
      
      if( this.IconScale != 1.0 )   // Change node size if required.
        // Scale object around the origin, which is now located at pos.
        node.ScaleObject( coord_type, pos,
                          this.IconScale, this.IconScale, 1.0 );
   }
   else
   {
      // Arbitrary object: move its box's center to the cursor position.
      node.PositionObject( coord_type, 
                           ( GLG.GlgAnchoringType.HCENTER |
                             GLG.GlgAnchoringType.VCENTER ),
                           pos.x, pos.y, pos.z );

      if( this.IconScale != 1.0 )   // Change node size if required.
        // Scale object around the center of it's bounding box.
        node.ScaleObject( coord_type, null,
                          this.IconScale, this.IconScale, 1.0 );
   }
}
      
////////////////////////////////////////////////////////////////////////
// Get the link's control points container based on the link type.   
////////////////////////////////////////////////////////////////////////
function GetCPContainer( link )
{
   let link_type = Math.trunc( link.GetDResource( "Type" ) );

   switch( link_type )
   {
    case GLG.GlgObjectType.POLYGON:
      return { glg_object : link, type : 0 };

    case GLG.GlgObjectType.GROUP: // Group containing a polygon with a label
      return GetCPContainer( link.GetResourceObject( "Link" ) );

    case GLG.GlgObjectType.CONNECTOR:
      let type = Math.trunc( link.GetDResource( "EdgeType" ) );
      return { glg_object : link, type : type };

    default: AppAlert( "Invalid link type." ); return null;
   }
}

////////////////////////////////////////////////////////////////////////
// Determines what node or link the object belongs to and returns it. 
// Also returns type of the object: NODE or LINK.
////////////////////////////////////////////////////////////////////////
function GetSelectedObject( glg_object )
{
   while( glg_object != null )
   {
      // Check if the object has IconType.
      if( glg_object.HasResourceObject( "IconType" ) )
      {
         let type_string = glg_object.GetSResource( "IconType" );
         if( type_string == "Link" )
           return { glg_object : glg_object, type : LINK };	   
         else if( type_string == "Node" )
           return { glg_object : glg_object, type : NODE };
      }

      glg_object = glg_object.GetParent();
   }

   // No node/link parent found - no selection.
   return { glg_object : null, type : NO_OBJ };
}

////////////////////////////////////////////////////////////////////////
// Returns an array of all attachment points, i.e. the points whose 
// names start with the name_prefix.
////////////////////////////////////////////////////////////////////////
function GetNodeAttachmentPoints( sel_object, name_prefix )
{
   /* Query a list of the selected object's control points. 
      For a reference object, it includes both its anchor point and its
      attachment points.
   */
   let pt_array = sel_object.CreatePointArray( 0 );
   if( pt_array == null )
     return null;
   
   let size = pt_array.GetSize();
   let attachment_pt_array = 
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
   
   // Add points that start with the name_prefix to attachment_pt_array.
   for( let i=0; i<size; ++i )
   {
      let point = pt_array.GetElement( i );
      let name = point.GetSResource( "Name" );
      if( name != null && name.startsWith( name_prefix ) )
        attachment_pt_array.AddObjectToBottom( point );
   }

   if( attachment_pt_array.GetSize() == 0 )
     attachment_pt_array = null;
   
   return attachment_pt_array;
}

////////////////////////////////////////////////////////////////////////
// Checks if one of the point array's points is under the cursor.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.GetSelectedPoint =
  function( pt_array, cursor_pos_obj )
{
   if( pt_array == null )
     return null;
   
   let cursor_pos = GetPointFromObj( cursor_pos_obj );
   
   let size = pt_array.GetSize();
   
   for( let i=0; i<size; ++i )
   {
      let point = pt_array.GetElement( i );
      
      // Get position in screen coords.
      let screen_pos = point.GetGResource( "XfValue" );
      if( Math.abs( cursor_pos.x - screen_pos.x ) < this.PointSelectionResolution &&
          Math.abs( cursor_pos.y - screen_pos.y ) < this.PointSelectionResolution )
        return point;
   }
   return null;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetDiagram = function( diagram_data )
{
   this.CurrentDiagram = new GlgDiagramData();
   let node_list = this.CurrentDiagram.getNodeList();
   let link_list = this.CurrentDiagram.getLinkList();

   for( let i=0; i < diagram_data.node_list.length; ++i )
   {
      let node_data = new GlgNodeData( diagram_data.node_list[i] );      
      node_list.push( node_data );
      this.AddNodeAt( 0, node_data, null, GLG.GlgCoordType.PARENT_COORD );
   }
   
   for( let i=0; i < diagram_data.link_list.length; ++i )
   {
      let link_data = new GlgLinkData( diagram_data.link_list[i], node_list );
      link_list.push( link_data );
      this.AddLinkObject( 0, link_data );
   }
   
   this.Viewport.Update();
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.UnsetDiagram = function( diagram )
{
   this.SelectGlgObject( null, 0 );
   
   let node_list = diagram.getNodeList();
   let link_list = diagram.getLinkList();
   
   let group = this.DrawingArea.GetResourceObject( "ObjectGroup" );
   
   for( let i=0; i < node_list.length; ++i )
   {
      let node_data = node_list[i];
      if( node_data.graphics != null )
        group.DeleteThisObject( node_data.graphics );
   }
   
   for( let i=0; i < link_list.length; ++i )
   {
      let link_data = link_list[i];
      if( link_data.graphics != null )
        group.DeleteThisObject( link_data.graphics );
   }
   
   this.CurrentDiagram = new GlgDiagramData();
   this.Viewport.Update();
}

//////////////////////////////////////////////////////////////////////////////
// Fills the object palette with buttons containing node and link icons
// from the palette template. Palette template is a convenient place to 
// edit all icons instead of placing them into the object palette buttons. 
//
// Icons named "Node0", "Node1", etc. were extracted into the NodeIconArray.
// The LinkIconArray contains icons named "Link0", "Link1", etc.
// Here, we place all node and link icons inside the object palette buttons 
// named IconButton<N>, staring with the start_index to skip the first 
// button which already contains the select button. 
// The palette buttons are created by copying an empty template button.
// Parameters:
//  palette_name       Name of the object palette to add buttons to.
//  button_name        Base name of the object palette buttons.
//  start_index        Number of buttons to skip (the first button
//                     with the select icon is already in the palette).
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.FillObjectPalette =
  function( palette_name, button_name, start_index )
{
   let palette = this.Viewport.GetResourceObject( "ObjectPalette" );
   
   /* Find and store an empty palette button used as a template.
      Search the button at the top viewport level, since palette's
      HasResources=NO.
   */
   this.ButtonTemplate =
     this.Viewport.GetResourceObject( button_name + start_index );
   
   if( this.ButtonTemplate == null )
   {
      this.SetError( "Can't find palette button to copy!" );
      return;
   }
   
   // Delete the template button from the palette but keep it around.
   palette.DeleteThisObject( this.ButtonTemplate );
   
   // Store NumColumns info.
   this.NumColumns =
     Math.trunc( this.ButtonTemplate.GetDResource( "NumColumns" ) );
   
   // Add all icons from each array, increasing the start_index. */
   start_index = 
     this.FillObjectPaletteFromArray( palette, button_name, start_index,
                                      this.LinkIconArray, this.LinkObjectArray,
                                      "Link" );
   start_index = 
     this.FillObjectPaletteFromArray( palette, button_name, start_index,
                                      this.NodeIconArray, this.NodeObjectArray,
                                      "Node" );
   
   // Store the marker template for attachment points feedback.
   this.PointMarker = this.PaletteTemplate.GetResourceObject( "PointMarker" );
   
   // Cleanup
   this.ButtonTemplate = null;
   this.PaletteTemplate = null;
   this.NodeIconArray = null;
   this.LinkIconArray = null;
}

//////////////////////////////////////////////////////////////////////////////
// Adds object palette buttons containing all icons from an array.
// icon_array is an array of icon objects to use in the palette button.
// object_array is an array of objects to use in the drawing.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.FillObjectPaletteFromArray =
  function( palette, button_name, start_index, icon_array,
            object_array, default_tooltip )
{
   /* Add all icons from the icon array to the palette using a copy of 
      the template button.
   */
   let size = icon_array.GetSize();
   let button_index = start_index;
   for( let i=0; i<size; ++i )
   { 
      let icon = icon_array.GetElement( i );
      let glg_object = object_array.GetElement( i );
      
      // Set uniform icon name to simplify selection.
      icon.SetSResource( "Name", "Icon" );
      
      // For nodes, set initial label.
      if( default_tooltip == "Node" && glg_object.HasResourceObject( "Label" ) )
      {
         let label;
         if( glg_object.HasResourceObject( "InitLabel" ) )
           label = glg_object.GetSResource( "InitLabel" );
         else
           label = "";
         
         glg_object.SetSResource( "Label/String", label );
      }
      
      // Create a button to hold the icon.
      let button =
        this.ButtonTemplate.CloneObject( GLG.GlgCloneType.STRONG_CLONE ); 

      // Set button name by appending its index as a suffix (IconButtonN).
      button.SetSResource( "Name", button_name + button_index );
      
      // Set tooltip string.
      let tooltip = icon.GetResourceObject( "TooltipString" );
      if( tooltip != null )
        // Use a custom tooltip from the icon if defined.
        button.SetResourceFromObject( "TooltipString", tooltip );
      else   // Use the supplied default tooltip.
        button.SetSResource( "TooltipString", default_tooltip );
      
      // Position the button by setting row and column indices.
      button.SetDResource( "RowIndex",
                           Math.trunc( button_index / this.NumColumns ) );
      button.SetDResource( "ColumnIndex", button_index % this.NumColumns );
      
      /* Zoom palette icon button to scale icons displayed in it. 
         Preliminary zoom by 10 for better fitting, will be precisely 
         adjusted later. 
      */
      button.SetDResource( "Zoom", DEFAULT_ICON_ZOOM_FACTOR );
      
      button.AddObjectToBottom( icon );
      
      palette.AddObjectToBottom( button );
      ++button_index;
   }
   
   return button_index; /* Return the next start index. */
}

//////////////////////////////////////////////////////////////////////////////
// Positions node icons inside the palette buttons.
// Invoked after the drawing has been setup, which is required by 
// PositionObject().
// Parameters:
//   button_name        Base name of the palette buttons.
//   start_index        Number of buttons to skip (the select and link
//                      buttons are already in the palette).
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetupObjectPalette =
  function( button_name, start_index )
{
   /* Find icons in the palette template and add them to the palette,
      using a copy of the template button.
   */
   for( let i = start_index; ; ++i )
   {      
      let button = this.Viewport.GetResourceObject( button_name + i );
      
      if( button == null )
        return;    // No more buttons
      
      let icon = button.GetResourceObject( "Icon" );
      let type = Math.trunc( icon.GetDResource( "Type" ) );      
      
      if( type == GLG.GlgObjectType.REFERENCE )
        icon.SetGResource( "Point", 0.0, 0.0, 0.0 );  // Center position
      else
        icon.PositionObject( GLG.GlgCoordType.PARENT_COORD,
                             ( GLG.GlgAnchoringType.HCENTER |
                               GLG.GlgAnchoringType.VCENTER ),
                             0.0, 0.0, 0.0 );    // Center position
      
      let zoom_factor = this.GetIconZoomFactor( button, icon );
      
      // Query an additional icon scale factor if defined in the icon.
      if( icon.HasResourceObject( "IconScale" ) )
        zoom_factor *= icon.GetDResource( "IconScale" );
      
      // Zoom palette icon button to scale icons displayed in it.
      button.SetDResource( "Zoom", zoom_factor );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Returns a proper zoom factor to precisely fit the icon in the button.
// Used for automatic fitting if FitIcons = true.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.GetIconZoomFactor = function( button, icon )
{
   if( !this.FitIcons )
     return DEFAULT_ICON_ZOOM_FACTOR;

   let point1 = GLG.CreateGlgPoint( 0, 0, 0 );
   let point2 = GLG.CreateGlgPoint( 0, 0, 0 );
   
   let zoom_factor = button.GetDResource( "Zoom" );
   
   let box = icon.GetBox();
   button.ScreenToWorld( true, box.p1, point1 );
   button.ScreenToWorld( true, box.p2, point2 );
   
   let extent_x = Math.abs( point1.x - point2.x );
   let extent_y = Math.abs( point1.y - point2.y );
   let extent = Math.max( extent_x, extent_y );

   // Reduce garbage collection.
   GLG.ReleaseToCache( point1 );
   GLG.ReleaseToCache( point2 );
   
   /* Increase zoom so that the icon fills the percentage of the button
      defined by the ICON_FIT_FACTOR. 
   */
   zoom_factor = 2000.0 / extent * ICON_FIT_FACTOR;
   return zoom_factor;
}

//////////////////////////////////////////////////////////////////////////////
// Queries items in the palette and fills array of node or link icons.
// For each palette item, an icon is added to the icon_array, and the 
// object to be used in the drawing is added to the object_array.
// In case of connectors, the object uses only a part of the icon 
// (the connector object) without the end markers.
//////////////////////////////////////////////////////////////////////////////
function GetPaletteIcons( palette, icon_name, icon_array, object_array )
{      
   for( let i=0; ; ++i )
   {
      // Get icon[i]
      let icon = palette.GetResourceObject( icon_name + i );
      if( icon == null )
        break;
      
      /* Object to use in the drawing. In case of connectors, uses only a
         part of the icon (the connector object) without the end markers.
      */
      let glg_object = icon.GetResourceObject( "Object" );
      if( glg_object == null )
        glg_object = icon;
      
      if( !glg_object.HasResourceObject( "IconType" ) )
      {
         this.SetError( "Can't find IconType resource." );
         continue;
      }
      
      let type_string = glg_object.GetSResource( "IconType" );
      
      /* Using icon base name as icon type since they are the same,
         i.e. "Node" and "Node", or "Link" and "Link".
      */
      if( type_string == icon_name )
      {
         // Found an icon of requested type, add it to the array.
         icon_array.AddObjectToBottom( icon );
         object_array.AddObjectToBottom( glg_object );
         
         // Set index to match the index in the icon name, i.e. 0 for Icon0.
         glg_object.SetDResource( "Index", i );
      }
   }

   let size = icon_array.GetSize();
   if( size == 0 )
     AppAlert( "Can't find any icons of this type." );
   else
     AppLog("Scanned " + size + " " + icon_name +  " icons");
}

////////////////////////////////////////////////////////////////////////
// Adds custom data to the graphical object
////////////////////////////////////////////////////////////////////////
function AddCustomData( glg_object, data )
{
   /* Add back-pointer from graphics to the link's data struct,
      keeping the data already attached (if any).
   */
   let custom_data = glg_object.GetResourceObject( "CustomData" );
   if( custom_data == null )
   {
      /* No custom data attached: create an extra group and attach it 
         to object as custom data.
      */
      custom_data =
        GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                          GLG.GlgContainerType.GLG_OBJECT, 0, 0, null );
      glg_object.SetResourceObject( "CustomData", custom_data );
   }

   /* To allow using non-glg objects, use a group with element type
      NATIVE_OBJECT as a holder. The first element of the group will keep
      the custom data pointer (pointer to the Link or Node structure).
   */
   let holder_group =
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.NATIVE_OBJECT, 0, 0, null );
   holder_group.SetSResource( "Name", "PtrHolder" );
   
   holder_group.AddObjectToBottom( data );
   
   // Add it to custom data.
   custom_data.AddObjectToBottom( holder_group );
}

////////////////////////////////////////////////////////////////////////
// Get custom data attached to the graphical object
////////////////////////////////////////////////////////////////////////
function GetData( glg_object )
{
   let holder_group = glg_object.GetResourceObject( "PtrHolder" );
   return holder_group.GetElement( 0 );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetRadioBox = function( button_name )
{
   /* Always highlight the new button: the toggle would unhighlight if 
      clicked on twice.
   */
   let button = this.Viewport.GetResourceObject( button_name );
   if( button != null )
     button.SetDResource( "OnState", 1.0 );
   
   // Unhighlight the previous button.
   if( this.LastButton != null && this.LastButton != button_name )
   {
      button = this.Viewport.GetResourceObject( this.LastButton );
      if( button != null )
        button.SetDResource( "OnState", 0.0 );
   }
   
   this.LastButton = button_name;   // Store the last button.
}

////////////////////////////////////////////////////////////////////////
// Deselects the button.
////////////////////////////////////////////////////////////////////////
function DeselectButton( button_name )
{
   let button = this.Viewport.GetResourceObject( button_name );
   button.SetDResource( "OnState", 0.0 );
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.GetPosition = function( glg_object, coord ) 
{
   let type = Math.trunc( glg_object.GetDResource( "Type" ) );
   if( type == GLG.GlgObjectType.REFERENCE )
   {
      // Reference: can use its point to position it.
      coord.CopyFrom( glg_object.GetGResource( "Point" ) );
   }
   else
   {
      // Arbitrary object: convert the box's center to the world coords.
      
      // Get object center in screen coords.
      let box = glg_object.GetBox();

      let center = GLG.CreateGlgPoint( ( box.p1.x + box.p2.x ) / 2.0,
                                       ( box.p1.y + box.p2.y ) / 2.0,
                                       ( box.p1.z + box.p2.z ) / 2.0 );

      this.DrawingArea.ScreenToWorld( true, center, coord );
   }
}

////////////////////////////////////////////////////////////////////////
// Fills Properties dialog with the selected object data.
////////////////////////////////////////////////////////////////////////   
GlgDiagramEditor.prototype.FillData = function()
{
   let 
     label,
     object_data,
     datasource = null;

   switch( this.SelectedObjectType )
   {
    default:
      label = "NO_OBJECT";
      object_data = "";
      datasource = "";
      break;
      
    case NODE:	 
    case LINK:	 
      label = GetObjectLabel( this.SelectedObject );
      object_data = GetObjectData( this.SelectedObject );
      if( this.ProcessDiagram )
      {
         datasource = GetObjectDataSource( this.SelectedObject );
         
         // Substitute an empty string instead of null for display.
         if( datasource == null )
           datasource = "";
      }
      break;
   }   
   
   this.Viewport.SetSResource( "Dialog/DialogName/TextString", label );
   this.Viewport.SetSResource( "Dialog/DialogData/TextString", object_data );
   
   // For Process Diagram also set the datasource field.
   if( this.ProcessDiagram )
     this.Viewport.SetSResource( "Dialog/DialogDataSource/TextString", 
                                 datasource );
}

////////////////////////////////////////////////////////////////////////
// Stores data from the dialog fields in the object.
////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.ApplyDialogData = function()
{
   // Store data from the dialog fields in the object.
   let label = this.Viewport.GetSResource( "Dialog/DialogName/TextString" );
   let object_data = this.Viewport.GetSResource( "Dialog/DialogData/TextString" );
   
   switch( this.SelectedObjectType )
   {
    case NODE:
    case LINK:
      break;
    default: return true;
   }   
   
   // Store data
   SetObjectLabel( this.SelectedObject, label );
   SetObjectData( this.SelectedObject, object_data );
   
   if( this.ProcessDiagram )
   {
      let datasource =
        this.Viewport.GetSResource( "Dialog/DialogDataSource/TextString" );
      SetObjectDataSource( this.SelectedObject, datasource );
   }
   
   this.Viewport.Update();
   return true;
}

////////////////////////////////////////////////////////////////////////
function GetObjectLabel( glg_object )
{
   let data = GetData( glg_object );
   if( data instanceof GlgNodeData )
     return data.object_label;
   else
     return data.object_label;
}

////////////////////////////////////////////////////////////////////////
function SetObjectLabel( glg_object, label )
{
   // Display label in the node or link object if it has a label.
   if( glg_object.HasResourceObject( "Label" ) )
     glg_object.SetSResource( "Label/String", label );
   
   let data = GetData( glg_object );
   if( data instanceof GlgNodeData )
     data.object_label = label;
   else if( data instanceof GlgLinkData )
     data.object_label = label;
}

////////////////////////////////////////////////////////////////////////
function GetObjectData( glg_object )
{
   let data = GetData( glg_object );
   if( data instanceof GlgNodeData )
     return data.object_data;
   else
     return data.object_data;
}

////////////////////////////////////////////////////////////////////////
function SetObjectData( glg_object, object_data )
{
   let data = GetData( glg_object );
   if( data instanceof GlgNodeData )
     data.object_data = object_data;
   else
     data.object_data = object_data;
}

////////////////////////////////////////////////////////////////////////
function GetObjectDataSource( glg_object )
{
   let  data = GetData( glg_object );
   if( data instanceof GlgNodeData )
     return data.datasource;
   else
     return data.datasource;
}

////////////////////////////////////////////////////////////////////////
function SetObjectDataSource( glg_object, datasource )
{
   if( datasource != null && datasource.length == 0 )
     datasource = null;  // Substitute null for empty datasource strings.
   
   let data = GetData( glg_object );
   if( data instanceof GlgNodeData )
   {
      if( glg_object.HasResourceObject( "Value" ) )
        glg_object.SetSResource( "Value/Tag", datasource );
      
      data.datasource = datasource;
   }
   else
     data.datasource = datasource;
}

////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.NodeConnected = function( node )
{
   for( let i=0; i< this.CurrentDiagram.getLinkList().length; ++ i )
   {
      let link_data = this.CurrentDiagram.getLinkList()[i];
      
      let start_node = link_data.getStartNode();
      let end_node = link_data.getEndNode();
      if( ( start_node != null && start_node.graphics == node ) ||
          ( end_node != null && end_node.graphics == node ) )
        return true;      
   }
   return false;
}

////////////////////////////////////////////////////////////////////////
function ButtonToToken( button_name )
{
   for( let i=0; ButtonTokenTable[i].name != null; ++i )
     if( button_name == ButtonTokenTable[i].name )
       return ButtonTokenTable[i].token;
   
   return IH_UNDEFINED_TOKEN;   /* 0 */
}

//////////////////////////////////////////////////////////////////////////////
// Updates all tags defined in the drawing for the Process Diagram.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.UpdateProcessDiagram = function()
{
   if( !this.Active )
     return;

   /* Since new nodes may be added or removed in the process of the diagram
      editing, get the current list of tags every time. In an application 
      that just displays the diagram without editing, the tag list may be
      obtained just once (initially) and used to subscribe to data.
      Query only unique tags.
   */
   let tag_list = this.DrawingArea.CreateTagList( true );
   if( tag_list != null )
   {
      let size = tag_list.GetSize();
      for( let i=0; i<size; ++i )
      {
         let data_object = tag_list.GetElement( i );
         let tag_name = data_object.GetSResource( "Tag" );

         let new_value = GetTagValue( tag_name, data_object );
         this.DrawingArea.SetDTag( tag_name, new_value, true );
      }
      
      this.Viewport.Update( this.DrawingArea );
   }

   // Restart update timer.
   setTimeout( ()=>this.UpdateProcessDiagram(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
// Get new value based on a tag name. In a real application, the value
// is obtained from a process database. PLC or another live datasource.
// In the demo, use random data.
//////////////////////////////////////////////////////////////////////////////
function GetTagValue( tag_name, data_object )
{
   // Get the current value
   let value = data_object.GetDResource( null );
   
   // Increase it.
   let increment = GLG.Rand( 0.0, 0.1 );
   
   let direction;
   if( value == 0.0 )
     direction = 1.0;
   else if( value == 1.0 )
     direction = -1.0;
   else
     direction = GLG.Rand( -1.0, 1.0 );
   
   if( direction > 0.0 )
     value += increment;
   else
     value -= increment;
   
   if( value > 1.0 )
     value = 1.0;
   else if( value < 0.0 )
     value = 0.0;
   
   return value;
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 900 / 700;
   
   const MIN_WIDTH = 600;
   const MAX_WIDTH = 1000;
   const SCROLLBAR_WIDTH = 15;

   let span = document.body.clientWidth - SCROLLBAR_WIDTH;    

   if( this.SizeIndex == undefined )   // First time: initialize.
   {
      this.SizeIndex = 0;

      if( this.IsMobile )
      {
         /* Mobile devices use fixed device-width: disable Change Drawing Size 
            button. If it's not standalone, it is handled outside of this 
            script.
         */
         if( this.Standalone )
           RemoveElement( null, this.GLG_div_name + "_change_size" );
      }
      else   /* Desktop */
      {      
         const small_sizes  = [ 1, 1.5,  2.,   2.5 ];
         const medium_sizes = [ 1, 0.75, 1.25, 1.5 ];
         const large_sizes  = [ 1, 0.6,  1.25, 1.5 ];
         
         if( span < 600 )
           this.SetDrawingSize.size_array = small_sizes;
         else if( span < 800 )
           this.SetDrawingSize.size_array = medium_sizes;
         else
           this.SetDrawingSize.size_array = large_sizes;
         
         this.SetDrawingSize.num_sizes = this.SetDrawingSize.size_array.length;
         
         /* Handle browser zooming. */
         this.ResizeListener = ()=>this.SetDrawingSize( false );
         window.addEventListener( "resize", this.ResizeListener );
      }
   }
   else if( next_size )
   {
      ++this.SizeIndex;
      this.SizeIndex %= this.SetDrawingSize.num_sizes;
   }
    
   let drawing_area = document.getElementById( this.GLG_div_name );
   if( this.IsMobile )
   {
      /* Mobile devices use constant device-width, adjust only the height 
         of the drawing to keep the aspect ratio.
      */
      drawing_area.style.height =
        "" + Math.trunc( drawing_area.clientWidth / ASPECT_RATIO ) + "px";
   }
   else   /* Desktop */
   {
      let start_width;
      if( span < MIN_WIDTH )
        start_width = MIN_WIDTH;
      else if( span > MAX_WIDTH )
        start_width = MAX_WIDTH;
      else
        start_width = span;

      let size_coeff = this.SetDrawingSize.size_array[ this.SizeIndex ];
      let width = Math.trunc( Math.max( start_width * size_coeff, MIN_WIDTH ) );
      drawing_area.style.width = "" + width + "px";
      drawing_area.style.height = 
        "" + Math.trunc( width / ASPECT_RATIO ) + "px";
   }

   // Adjust canvas resolution for mobile devices and browser zoom state.
   if( !next_size )
     this.SetCanvasResolution();
}

//////////////////////////////////////////////////////////////////////////////
// Increases canvas resolution for mobile devices with HiDPI displays and for
// browser zooming. Sets CoordScale global variable.
//////////////////////////////////////////////////////////////////////////////
GlgDiagramEditor.prototype.SetCanvasResolution = function()
{
   let TextScale, PixelOffsetScale, ScreenCoordScale, NativeWidgetTextScale;

   if( this.IsMobile )
   {
      /* CoordScale parameter defines canvas coordinate scaling.
         Values greater than 1 increase canvas resolution and result in 
         sharper rendering. On mobile devices with devicePixelRatio > 1,
         the value of devicePixelRatio may be used for very crisp rendering
         with very thin lines. For pixel ration greater than 2, limit 
         CoordScale to 2 to draw thicker lines.

         CanvasScale > 1 makes text smaller. The TextScale parameter defines
         the text scaling factor used to increase text size.

         The PixelOffsetScale parameter is used to scale pixel offsets,
         such as pixel offsets used in layout of charts. When text is scaled,
         pixel offsets are usually scaled by the same factor to increase space
         allowed for the enlarged text.

         The ScreenCoordScale parameter specifies a scaling factor for fixed
         scale viewports that use screen coordinates. If the size of the fixed
         scale viewport (such as a height of a toolbar) is controlled by a pixel
         offset transformation, ScreenCoordScale may be set to the same value as
         PixelOffsetScale to scale the content of the viewport proportionally
         to its height increase.

         The NativeWidgetTextScale parameter defines the scaling factor that is
         used to scale down text in native widgets (such as native buttons, 
         toggles, etc.) to match the scale of the drawing.
      */
      if( window.devicePixelRatio > 2. )
        this.CoordScale = 2.;
      else
        this.CoordScale = window.devicePixelRatio;

      TextScale = 1.5;
      PixelOffsetScale = TextScale;
      ScreenCoordScale = PixelOffsetScale;
      NativeWidgetTextScale = 0.75;
   }
   else   // Desktop
   {
      /* Change canvas resolution to match browser zoom state. */
      this.CoordScale = window.devicePixelRatio;      
      TextScale = window.devicePixelRatio;
      PixelOffsetScale = window.devicePixelRatio;
      ScreenCoordScale = window.devicePixelRatio;
      NativeWidgetTextScale = 1.;    // Don't change native text size.
   }

   GLG.SetCanvasScale( this.CoordScale, TextScale, NativeWidgetTextScale,
                       PixelOffsetScale, ScreenCoordScale );
}

//////////////////////////////////////////////////////////////////////////
function RemoveElement( parent_id, child_id )
{
   let element;
   if( parent_id == null )
     // No parent was provided: remove from document.
     element = document.getElementById( child_id );
   else
   {
      // Parent ID was provided: remove from parent.
      let parent = document.getElementById( parent_id );
      if( parent == null )
        return;
      element = parent.querySelector( "#" + child_id );
   }
   
   if( element != null )
     element.parentNode.removeChild( element );
}

//////////////////////////////////////////////////////////////////////////////
function Debug( message )
{
   if( DEBUG )
     console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppAlert( message )
{
   window.alert( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppLog( message )
{
   console.log( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppError( message )
{
   console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
function WriteLine( line )
{
   console.log( line );
}

//////////////////////////////////////////////////////////////////////////////
// Holds node data.
//////////////////////////////////////////////////////////////////////////////
function GlgNodeData( loaded_data )
{   
   if( loaded_data == null )
   {
      this.node_type = 0;                            /* int */
      this.position = GLG.CreateGlgPoint( 0, 0, 0 ); /* GlgPoint */
      this.object_label = "";                        /* String */
      this.object_data = "";                         /* String */
      this.datasource = "";                          /* String */
   }
   else
   {
      /* Using CreateGlgPointFromPoint() instead of CopyGlgPoint().
         We are loading new diagram: loaded_data.position is obtained from JSON.
         It has x, y and z properties, but it is not a GLG point.
      */
      this.node_type = loaded_data.node_type;
      this.position = GLG.CreateGlgPointFromPoint( loaded_data.position );
      this.object_label = loaded_data.object_label;
      this.object_data = loaded_data.object_data;
      if( this.ProcessDiagram )
        this.datasource = loaded_data.datasource;
      else
        this.datasource = "";      
   }
   
   this.graphics = null;                             /* GlgObject */
}

//////////////////////////////////////////////////////////////////////////////
// Holds link data.
//////////////////////////////////////////////////////////////////////////////
function GlgLinkData( loaded_data, node_list )
{   
   if( loaded_data == null )
   {
      this.link_type = 0;               /* int */
      this.link_direction = 0;          /* int */
      this.link_color = null;           /* GlgPoint */
      this.start_node = null;           /* GlgNodeData */
      this.end_node = null;             /* GlgNodeData */
      this.start_point_name = null;     /* String */
      this.end_point_name = null;       /* String */
      this.object_label = "A1";         /* String */
      this.object_data = "";            /* String */
      this.point_array = [];            /* Array of GlgPoints */
      this.datasource = "";             /* String */
   }
   else
   {
      /* Using CreateGlgPointFromPoint() instead of CopyGlgPoint().
         We are loading new diagram: loaded_data's link_color and elements of 
         point_array are obtained from JSON. They have x, y and z properties,
         but it is not a GLG point.
      */
      this.link_type        = loaded_data.link_type;
      this.link_direction   = loaded_data.link_direction;
      this.link_color       =
        GLG.CreateGlgPointFromPoint( loaded_data.link_color );
      this.start_point_name = loaded_data.start_point_name;
      this.end_point_name   = loaded_data.end_point_name;
      this.object_label     = loaded_data.object_label;
      this.object_data      = loaded_data.object_data;
      this.point_array      = [];

      /* Convert saved indices to node objects. */
      this.start_node       = node_list[ loaded_data.start_node ];
      this.end_node         = node_list[ loaded_data.end_node ];

      /* Convert to point array elements to GlgPoint. */
      for( let i=0; i<loaded_data.point_array.length; ++i )
      {
         let glg_point =
           GLG.CreateGlgPointFromPoint( loaded_data.point_array[ i ] );
         this.point_array.push( glg_point );
      }
      
      if( this.ProcessDiagram )
        this.datasource = loaded_data.datasource;
      else
        this.datasource = "";      
   }
   
   this.graphics = null;                /* GlgObject */
   this.first_move = false;             /* boolean */
}

GlgLinkData.prototype.getStartNode = function(){ return this.start_node };
GlgLinkData.prototype.getEndNode = function(){ return this.end_node };
GlgLinkData.prototype.setStartNode = function( node ){ this.start_node = node };
GlgLinkData.prototype.setEndNode = function( node ){ this.end_node = node };

//////////////////////////////////////////////////////////////////////////////
// Holds diagram connectivity data as node and link lists.
//////////////////////////////////////////////////////////////////////////////
function GlgDiagramData()
{
   this.node_list = [];
   this.link_list = [];
}

GlgDiagramData.prototype.getNodeList = function(){ return this.node_list };
GlgDiagramData.prototype.getLinkList = function(){ return this.link_list };

//////////////////////////////////////////////////////////////////////////////
// Custom callbacks, place application-specific code into these callbacks.
//////////////////////////////////////////////////////////////////////////////

GlgDiagramEditor.prototype.CustomAddObjectCB =
  function( viewport, icon, data, is_node )
{
}

GlgDiagramEditor.prototype.CustomSelectObjectCB =
  function( viewport, icon, data, is_node )
{
}

GlgDiagramEditor.prototype.CustomCutObjectCB =
  function( viewport, icon, data, is_node )
{
}

GlgDiagramEditor.prototype.CustomPasteObjectCB =
  function( viewport, icon, data, is_node )
{
}
