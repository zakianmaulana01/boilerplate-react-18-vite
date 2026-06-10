//////////////////////////////////////////////////////////////////////////////
// GLG Supply Chain Visualization Demo
//
//The demo demonstrates GLG features that can be used in supply chain
// monitoring applications, including on-the-fly creation of dynamic
// nodes and links, positioning them on the map and updating with
// real-time data.
//
// The demo is written in pure HTML5 and JavaScript. The source code of the
// demo uses the GLG Toolkit JavaScript Library supplied by the included
// Glg*.js and GlgToolkit*.js files.
//
// The library loads a GLG drawing and renders it on a web page, providing
// an API to animate the drawing with real-time data and handle user
// interaction with graphical objects in the drawing.
//
// The drawings are created using the GLG Graphics Builder, an interactive
// editor that allows to create grahical objects and define their dynamic
// behavior without any programming.
//
// Except for the changes to comply with the JavaScript syntax, this source
// is identical to the source code of the corresponding C/C++, Java and C#
// versions of the demo.
//////////////////////////////////////////////////////////////////////////////

/* eslint eqeqeq: 0 */

import { GlgToolkit } from '../GlgToolkitDemo.mod.js'

// Enable general debugging/diagnostics information.
const DEBUG = false;

/* Debugging: set the variable to true to throw an exception on a GLG error
   instead of just displaying an error message on the console.
*/
const DEBUG_GLG_ERRORS = false;

// Graphics update interval.
const UPDATE_INTERVAL = 30;    // msec

const UPDATE_N = 4;     // Update on every 4-th iteration of the simulated data.

const ICON_SCALE = 0.6; // Icon size coefficient.

// Global handle to the GLG Toolkit library.
let GLG = new GlgToolkit();

//////////////////////////////////////////////////////////////////////////////
// Creates an instance of the process demo.
// Parameters:
//   glg_div_name  - name of parent div the drawing will be displayed in,
//                   will be passed by the caller.
//   is_mobile     - true if deployed on mobile devices.
//   is_standalone - true if deployed in html, false if deployed in react or
//                   angular.
//   glg_path      - path to the directory where GLG drawings are located.
//////////////////////////////////////////////////////////////////////////////
export function GlgMap( glg_div_name, glg_path, is_standalone, is_mobile )
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

   // Top level viewport of the loaded drawing. 
   this.Drawing = null;               /* GlgObject */

   // Viewport used as a parent of a loaded map viewport.
   this.MapContainer = null;          /* GlgObject */
   this.LinkTemplate = null;          /* GlgObject */
   this.IconArray = null;             /* GlgObject */
   this.FacilitiesGroup = null;       /* GlgObject */
   this.LinksGroup = null;            /* GlgObject */
   this.SelectedColorIndex = null;    /* GlgObject */
   this.SelectedObject = null;        /* GlgObject */
   this.FlowDisplayObj = null;        /* GlgObject */
   this.MapViewport = null;           /* GlgObject */
   this.Palette = null;               /* GlgObject */

   this.USMapData = null;             /* Raw data */
   this.USFacilities = null;          /* String */
   this.USLinks = null;               /* String */
   this.WorldMapData = null;          /* Raw data */
   this.WorldFacilities = null;       /* String */
   this.WorldLinks = null;            /* String */
   
   // GLG extent in world coordinates
   this.GlgMinX = null;               /* double */
   this.GlgMaxX = null;               /* double */
   this.GlgMinY = null;               /* double */
   this.GlgMaxY = null;               /* double */

   // Map extent in degrees, mapped to the GLG extent.
   this.MapMinX = null;               /* double */
   this.MapMaxX = null;               /* double */
   this.MapMinY = null;               /* double */
   this.MapMaxY = null;               /* double */

   // Temporary variables, allocate once.
   this.Point       = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.WorldPoint  = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.LatLonPoint = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.XYPoint     = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */

   // Calculated values
   this.MapCenter   = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */
   this.MapExtent   = GLG.CreateGlgPoint( 0, 0, 0 );   /* GlgPoint */

   this.Counter = 0;                  /* int - controls update frequency. */
   this.ColorScheme = 0;              /* int */

   // Start with the US map.
   this.USMap = true;	              /* boolean */   
   this.PerformUpdates = true;        /* boolean */

   // Animate flow with "moving ants" dynamics.
   this.ShowFlow = true;              /* boolean */
   this.Stretch = false;              /* boolean */
   this.StartDragging = false;        /* boolean */
   this.FirstLoadError = true;        /* boolean */

   /* Buffer for reading strings. */
   this.buffer_length = 256;          /* Initial buffer length */
   this.buffer = new Uint16Array( this.buffer_length );

   /* Coefficient for canvas resolution. It will be adjusted in 
      SetCanvasResolution() for mobile devices with HiDPI displays as well as 
      on browser zoom.
   */
   this.CoordScale = 1;
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Starts map demo by loading its drawing.
////////////////////////////////////////////////////////////////////////////// 
GlgMap.prototype.Start = function()
{
   Debug( "Starting: " + this.GLG_div_name );

   this.Active = true;
   
   // Set initial size of the drawing.
   this.SetDrawingSize( false );

   /* Load misc. assets such as GLG scrollbars. When assets are loaded, 
      LoadDrawing callback is invoked that loads a GLG drawing defined by
      DrawingName variable.
   */
   this.LoadAssets( ()=>this.LoadDrawing(), null );
}

////////////////////////////////////////////////////////////////////////////// 
// Script entry point: Performs cleanup.
////////////////////////////////////////////////////////////////////////////// 
GlgMap.prototype.Cleanup = function()
{
   Debug( "Cleanup for: " + this.GLG_div_name );
   
   this.Active = false;    // Ignore any pending updates and callbacks.

   if( this.Drawing )
     this.Drawing.ResetHierarchy();   // Undisplay GLG drawing.

   if( this.ResizeListener )
     window.removeEventListener( "resize", this.ResizeListener );
}

////////////////////////////////////////////////////////////////////////////// 
// Load a GLG drawing from a file.
////////////////////////////////////////////////////////////////////////////// 
GlgMap.prototype.LoadDrawing = function()
{
   Debug( "LoadDrawing for: " + this.GLG_div_name );
   
   if( !this.Active )
     return;

   /* Load a drawing from the specified drawing file. 
      The LoadCB callback will be invoked when the drawing has been loaded.

      Using "bind( this )" as a shorter way to provide "this" compared with 
      using lambda: with bind, we do not need to specify parameter list that
      we would need to provide for lambda.
   */
   GLG.LoadWidgetFromURL( this.GetFullName( "map_demo.g" ), null,
                          this.LoadCB.bind( this ), /*user data*/ null,
                          /*abort test function*/ ()=>!this.Active );
}

////////////////////////////////////////////////////////////////////////////// 
GlgMap.prototype.GetFullName = function( drawing_name )
{
   if( this.GlgPath == null )
     return drawing_name;

   return this.GlgPath + "/" + drawing_name;
}

//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.LoadCB =
  function( /*GlgObject*/ drawing, /*Object*/ user_data, /*String*/ path )
{
   Debug( "LoadCB for: " + this.GLG_div_name );

   if( !this.Active )
     return;

   if( drawing == null )
   {
      AppAlert( "Can't load drawing, check console message for details." );
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
   drawing.SetParentElement( this.GLG_div_name );
    
   // Disable viewport border to use the border of the glg_area.
   if( this.Standalone )
     drawing.SetDResource( "LineWidth", 0 );
    
   this.StartSupplyChainDemo( drawing );
}

//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.StartSupplyChainDemo = function( drawing )
{
   this.Drawing = drawing;

   this.InitDrawing();
   this.Drawing.InitialDraw();

   // Start periodic updates.
   setTimeout( ()=>this.UpdateMap(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.InitDrawing = function()
{
   // Extract node icons from the palette      
   this.IconArray = this.ReadPalette( this.Palette );

   this.MapContainer = this.Drawing.GetResourceObject( "MapContainer" );
   
   this.LoadMap();

   /* Make Selection Dialog a floating dialog, adjust its height and vertical 
      placement, and set its title.
   */
   this.Drawing.SetDResource( "SelectionDialog/ShellType",
                              GLG.GlgShellType.DIALOG_SHELL );
   this.Drawing.SetDResource( "SelectionDialog/DialogHeight", 150 );
   this.Drawing.SetDResource( "SelectionDialog/DialogY", -700 );
   this.Drawing.SetSResource( "SelectionDialog/Screen/ScreenName",
                              "Selection Information" );

   this.Drawing.AddListener( GLG.GlgCallbackType.INPUT_CB,
                             this.InputCallback.bind( this ) );
   this.Drawing.AddListener( GLG.GlgCallbackType.TRACE_CB,
                             this.TraceCallback.bind( this ) );
}

//////////////////////////////////////////////////////////////////////////
// Load a new map file. 
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.LoadMap = function()
{
   // Load the map viewport from pre-fetched raw data.
   this.MapViewport =
     GLG.LoadWidget( this.USMap ? this.USMapData : this.WorldMapData );

   if( this.MapViewport == null )
     AppAlert( "Can't load map viewport, check console message for details." );
      
   // Set viewport name.
   this.MapViewport.SetSResource( "Name", "MapArea" );

   /* Set control points of the map viewport to fill the whole area of the
      MapContainer viewport.
   */
   this.MapViewport.SetGResource( "Point1", -1000.0, -1000.0, 0.0 );
   this.MapViewport.SetGResource( "Point2",  1000.0,  1000.0, 0.0 );
   
   this.MapContainer.AddObjectToTop( this.MapViewport );

   // Query extent info from the map.
   this.GetExtentInfo( this.MapViewport );

   // Read facilities info and creates facilities group (used as a layer).
   this.FacilitiesGroup =
     this.ReadFacilities( this.USMap ?
                          this.USFacilities : this.WorldFacilities );

   if( this.FacilitiesGroup != null )
   {
      // Create connection links (creates a group used as a layer)
      this.LinksGroup =
        this.ConnectFacilities( this.USMap ? this.USLinks : this.WorldLinks );

      if( this.LinksGroup != null )   // Add link group to the drawing
        this.MapViewport.AddObjectToBottom( this.LinksGroup ); 

      // Add facilities last to be in front of links.
      this.MapViewport.AddObjectToBottom( this.FacilitiesGroup ); 

      // Set the icon size of the facility nodes
      this.SetIconSize();
   }
      
   // Set initial visibility of the value display labels to on.
   this.Drawing.SetDResource( "MapArea/Icon0/Group/ValueLabel/Visibility",
                              1.0 );
   this.Drawing.SetDResource( "MapArea/Link0/ValueLabel/Visibility", 1.0 );

   // Set initial color sheme.
   this.Drawing.SetDResource( "MapArea/ColorIndex", this.ColorScheme );
   this.Drawing.SetDResource( "MapArea/Icon0/Group/ColorIndex",
                              this.ColorScheme );

   // Erase the dialog if displayed
   this.Drawing.SetDResource( "SelectionDialog/Visibility", 0.0 ); 

   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.UnloadMap = function()
{
   this.FacilitiesGroup = null;
   this.LinksGroup = null;

   this.FlowDisplayObj = null;
   this.SelectedColorIndex = null;
   this.SelectedObject = null;
   
   // Delete the old map drawing.
   this.MapContainer.DeleteThisObject( this.MapViewport );
   this.MapViewport = null;
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.ChangeMap = function()
{
   // Show "Loading map" message.
   this.MapViewport.SetDResource( "LoadMessage/Visibility", 1 );
   this.Drawing.Update();

   // Yield to let browser shows the message before proceeding.
   setTimeout( ()=>this.ChangeMapCB(), 10 );
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.ChangeMapCB = function()
{
   if( !this.Active )
     return;
   
   this.UnloadMap();   // Delete the old map.	    
   this.LoadMap();     // Load new map.
   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.SetIconSize = function()
{
   /* Adjust icon size by a specified factor. */
   if( ICON_SCALE > 0.0 )
     this.Drawing.SetDResource( "MapArea/Icon0/Template/IconScale",
                                ICON_SCALE );
}

//////////////////////////////////////////////////////////////////////////
// Extract icons from the palette and return an array of icons to use
// for nodes.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadPalette =
  function( /* GlgObject */ palette_obj )   /* GlgObject */
{
   if( palette_obj == null )
     return null;    // No palette: don't generate icons.
   
   // Get palette viewport named "Icons"
   let palette_vp = palette_obj.GetResourceObject( "Icons" );   /* GlgObject */
   if( palette_vp == null )
     AppAlert( "Can't find palette object." );
   
   // Find link template and store it for creating links.
   this.LinkTemplate = palette_vp.GetResourceObject( "Link" );
   
   if( !this.ShowFlow )   // Set line type to solid line if no flow.
     this.LinkTemplate.SetDResource( "Line/LineType", 0.0 );

   let icon_array =      /* GlgObject */
     GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                       GLG.GlgContainerType.GLG_OBJECT,
                       0, 0, null, null );
   for( let i=0; ; ++i )
   {
      // Get icon[i]
      let icon = palette_vp.GetResourceObject( "Icon" + i );   /* GlgObject */
      if( icon != null )
        icon_array.AddObjectToBottom( icon );
      else
      {
         if( i == 0 )     // First time: can't find any icons!
         {
            AppAlert( "Can't find facilities icons." );
            return null;
         }
         break;
      }
   }
   return icon_array;
}

//////////////////////////////////////////////////////////////////////////
// Reads facilities data and generates an array of facility objects
// using the facility palette. 
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadFacilities =
  function( /* String */ facilities_data )   /* GlgObject */
{
   let
     facility_group,   /* GlgObject */
     icon;             /* GlgObject */

   if( facilities_data == null )     
     return null;   // No facilities
   
   if( this.IconArray == null )
   {
      AppAlert( "No icon palette." );
      return null;
   }

   let stream = new InputStream( facilities_data );    /* InputStream */
   
   let num_facilities = 0;    /* int */
   while( true )
   {
      // Read facility record
      let facility_name = this.ReadName( stream );   /* String  */

      if( facility_name == null )
        break;

      let y = this.ReadDouble( stream );
      let y_char = ReadChar( stream );
      
      let x = this.ReadDouble( stream );
      let x_char = ReadChar( stream );

      if( y == null || y_char == null || x == null || x_char == null )
      {
         AppAlert( "Syntax error reading facilities file." );
         break;
      }

      ++num_facilities;
      
      if( x_char == 'W' ||  x_char == 'w' )
        x = 180.0 + ( 180.0 - x );
      if( y_char == 'S' ||  x_char == 's' )
        y = -y;
      
      if( facility_group == null )   // First time: create.
      {
         facility_group =
           GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                             GLG.GlgContainerType.GLG_OBJECT,
                             0, 0, null, null );
         facility_group.SetSResource( "Name", "Facilities" );
      }
      
      // Add named icon.
      let icon_name = "Icon" + ( num_facilities - 1 );
      icon = this.AddNode( facility_group, icon_name, x, y );

      // Set facility display label and value.
      icon.SetSResource( "Template/Label/String", facility_name );
      icon.SetDResource( "Template/Value", GLG.Rand( 10.0, 300.0 ) );
   }

   AppLog( "Scanned " + num_facilities + " facilities" );
   return facility_group;
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.AddNode =
  function( /* GlgObject */ container, /* String */ obj_name,
            /* double */ lon, /* double */ lat )         /* GlgObject */
{      
   /* Always use the first icon. Subdrawing dynamics is used to change
      shapes.
   */
   let icon = this.IconArray.GetElement( 0 );   /* GlgObject  */

   // Create a copy of it.
   icon = icon.CloneObject( GLG.GlgCloneType.STRONG_CLONE );

   // Set object name
   icon.SetSResource( "Name", obj_name );      
   icon.SetSResource( "TooltipString", obj_name );      
   
   // Set position
   this.LatLonPoint.x = lon;
   this.LatLonPoint.y = lat;
   this.LatLonPoint.z = 0.0;
   this.GetXY( this.LatLonPoint, this.XYPoint );
   
   icon.SetGResourceFromPoint( "Position", this.XYPoint );      
   
   container.AddObjectToBottom( icon );
   return icon;
}

//////////////////////////////////////////////////////////////////////////
// Reads connectivity data and creates links to connect facilities.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.ConnectFacilities =
  function( /* String */ links_data )   /* GlgObject */
{
   let link_group = null;   /* GlgObject */
      
   if( links_data == null || this.FacilitiesGroup == null )
     return null;

   if( this.LinkTemplate == null )
   {
      AppAlert( "Can't find link template." );
      return null;
   }

   let stream = new InputStream( links_data );    /* InputStream */

   let size = this.FacilitiesGroup.GetSize();
   let num_links = 0;
   while( true )
   {
      // Read link record
      
      let from_node = this.ReadInt( stream );
      if( from_node == null )
        break;

      let to_node = this.ReadInt( stream );	 
      if( to_node == null )
      {
         AppAlert( "Syntax error reading links file." );
         break;
      }

      ++num_links;
      
      if( from_node < 0 || to_node < 0 || from_node >= size || to_node >= size )
      {
         AppAlert( "Invalid link index." );
         break;
      }

      if( link_group == null )   // First time: create.
      {
         link_group =
           GLG.CreateObject( GLG.GlgObjectType.ARRAY,
                             GLG.GlgContainerType.GLG_OBJECT,
                             0, 0, null, null );
         link_group.SetSResource( "Name", "Connections" );
      }
         
      let link =   /* GlgObject */
        this.AddLink( link_group, from_node, to_node,
                      "Link" + ( num_links - 1 ) );

      // Set flow attribute and color.
      let flow = GLG.Rand( 1.0, 9.0 );    /* double */
      let color = Math.trunc( flow ) / 2;       /* double */
      link.SetDResource( "Line/LineWidth", flow );
      link.SetDResource( "Line/LineColorIndex", color );
      link.SetDResource( "Value", flow );
   }

   AppLog( "Scanned " + num_links + " links" );
   return link_group;
}

//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.AddLink =
  function( /* GlgObject */ container, /* int */ from_node,
            /* int */ to_node, /* String */ name )    /* GlgObject */
{      
   let   /* GlgObject */
     icon_point,
     link_point,
     xform_point;
   
   // Create an instance of the link template (polygon and label).
   let link =      /* GlgObject */
     this.LinkTemplate.CloneObject( GLG.GlgCloneType.STRONG_CLONE );
   link.SetSResource( "Name", name );
   link.SetSResource( "TooltipString", name );

   /* Constrain the end points to facility nodes. Constrain the link
      polygon end points, and also the point of the path xform used
      to keep the label in the middle of the link.
   */
        
   let link_polygon = link.GetResourceObject( "Line" );   /* GlgObject */
   let xform_pt_array =
     link.GetResourceObject( "PathXform/XformAttr1" );    /* GlgObject */
   
   // First point
   let icon = this.FacilitiesGroup.GetElement( from_node );   /* GlgObject */
   icon_point = icon.GetResourceObject( "Point" );
   link_point = link_polygon.GetElement( 0 );
   xform_point = xform_pt_array.GetElement( 0 );
   link_point.ConstrainObject( icon_point );
   xform_point.ConstrainObject( icon_point );
         
   // Second point.
   icon = this.FacilitiesGroup.GetElement( to_node );
   icon_point = icon.GetResourceObject( "Point" );
   link_point = link_polygon.GetElement( 1 );
   xform_point = xform_pt_array.GetElement( 1 );
   link_point.ConstrainObject( icon_point );
   xform_point.ConstrainObject( icon_point );
   
   container.AddObjectToBottom( link );   
   return link;
}

//////////////////////////////////////////////////////////////////////////
// Query the extend info from the generated map. The map drawing has named 
// custom properties attached to it which keep the extent information. The
// map was generated in such a way that map's extent in lat/lon degrees 
// (MapMinX, MapMinY, MapMaxX and MapMaxY) was mapped to the full GLG extent
// of +-1000.0 This information is used later to convert from lat/lon to x/y
// and vice versa.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.GetExtentInfo = function( /* GlgObject */ drawing )
{
   /* Query map extent from the loaded map drawing (kept as named custom 
      properties attached to the drawing).
   */
   this.MapMinX = drawing.GetDResource( "MinX" );
   this.MapMaxX = drawing.GetDResource( "MaxX" );
   this.MapMinY = drawing.GetDResource( "MinY" );
   this.MapMaxY = drawing.GetDResource( "MaxY" );

   // Calculate center and extent, used in coordinate conversion.
   this.MapCenter.x = ( this.MapMinX + this.MapMaxX ) / 2.0;
   this.MapCenter.y = ( this.MapMinY + this.MapMaxY ) / 2.0;
   this.MapCenter.z = 0.0;
   
   this.MapExtent.x = this.MapMaxX - this.MapMinX;
   this.MapExtent.y = this.MapMaxY - this.MapMinY;
   this.MapExtent.z = 0.0;
   
   // Full Glg extent is used for the map, hardcoded. Stretch must be TRUE.
   this.GlgMinX = -1000.0;
   this.GlgMaxX =  1000.0;
   this.GlgMinY = -1000.0;
   this.GlgMaxY =  1000.0;
   
   // Query if the drawing preserves X/Y ratio.
   let stretch = drawing.GetDResource( "Stretch" );   /* double */
   this.Stretch = ( stretch != 0.0 );
}

//////////////////////////////////////////////////////////////////////////
// Handle user interaction.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.InputCallback = function( /* GlgObject */ vp, /* GlgObject */ message_obj )
{
   if( !this.Active )
     return;

   let origin = message_obj.GetSResource( "Origin" );
   let format = message_obj.GetSResource( "Format" );
   let action = message_obj.GetSResource( "Action" );

   if( action == "DeleteWindow" )
   {
      if( origin == "SelectionDialog" )
      {
         // Close selection dialog
         this.Drawing.SetDResource( "SelectionDialog/Visibility", 0.0 );
         this.Drawing.Update();	 
      }
   }
   else if( format == "Button" )
   {
      if( action != "Activate" )
        return;

      if( origin == "CloseDialog" )
      {
         this.Drawing.SetDResource( "SelectionDialog/Visibility", 0.0 );
         this.Drawing.Update();	 
      }
      else if( origin == "ZoomIn" )
        this.MapViewport.SetZoom( null, 'i', 0.0 );
      else if( origin == "ZoomOut" )
        this.MapViewport.SetZoom( null, 'o', 0.0 );
      else if( origin == "ZoomReset" )
        this.MapViewport.SetZoom( null, 'n', 0.0 );
      else if( origin == "ZoomTo" )
      {
         this.StartDragging = true;
         this.MapViewport.SetZoom( null, 't', 0.0 );
      }
      else if( origin == "ColorScheme" )
      {
         this.ColorScheme ^= 1;    // Toggle between 0 and 1
         this.Drawing.SetDResource( "MapArea/ColorIndex", this.ColorScheme );
         this.Drawing.SetDResource( "MapArea/Icon0/Group/ColorIndex",
                                    this.ColorScheme );
         this.Drawing.Update();
      }
      else if( origin == "Connections" )
      {
         ToggleResource( this.Drawing, "MapArea/Connections/Visibility" );
      }
      else if( origin == "ValueDisplay" )
      {
         // Visibility of all labels is constrained, set just one.
         ToggleResource( this.Drawing,
                         "MapArea/Icon0/Group/ValueLabel/Visibility" );
         ToggleResource( this.Drawing, "MapArea/Link0/ValueLabel/Visibility" );
      }
      else if( origin == "Map" )
      {
         ToggleResource( this.Drawing, "MapArea/MapGroup/Visibility" );
      }
      else if( origin == "Update" )
      {
         this.PerformUpdates = !this.PerformUpdates;
      }	
      else if( origin == "MapType" )  // Toggle US and world map
      {
         this.USMap = !this.USMap;
         this.ChangeMap();
         return;
      }	
   }
   /* Process mouse clicks on objects of interests in the drawing: 
      implemented as an Action with the "Node", "Link" or other label 
      attached to an object and activated on a mouse click. 
   */
   else if( format == "CustomEvent" )
   {
      if( this.MapViewport.GetDResource( "ZoomToMode" ) != 0 )	   
        return;  // Don't handle selection in ZoomTo mode.
      
      let
        label = null,             /* String */
        visibility_name = null,   /* String */
        icon_name;                /* String */
      let has_data = false;       /* boolean */
      let highlight_obj = null;   /* GlgObject */
      let data = 0.0;             /* double  */
         
      let event_label = message_obj.GetSResource( "EventLabel" );  /* String */
      if( event_label == "BackgroundVP" )
      {
         /* The background viewport selection is reported only if there
            are no other selections: erase the highlight.
         */
         this.Highlight( this.Drawing, null );
         this.Drawing.Update();
         return;
      }
      // Process state selection on the US map.
      else if( event_label == "MapSelection" )
      {
         label = "None";
         
         /* The selection is reported for the MapGroup. The OrigObject is
            used to get the object ID of the selected lower level state 
            polygon.
         */
         highlight_obj = message_obj.GetResourceObject( "OrigObject" );
         icon_name = highlight_obj.GetSResource( "Name" );
         has_data = false;
         visibility_name = "MapArea/MapGroup/Visibility";	    
         
         // Location is set to the mouse click by the preceding TraceCallback.
      }
      else if( event_label == "Node" )
      {
         let node = message_obj.GetResourceObject( "Object" );   /* GlgObject */
         icon_name = node.GetSResource( "Name" );
         this.SelectedObject = node;

         // Query the label of the selected node
         label = node.GetSResource( "Group/Label/String" );
         
         // Query node location.
         let position = node.GetGResource( "Position" );   /* GlgPoint */
         
         // Convert world coordinates to lat/lon
         this.GetLatLon( position, this.LatLonPoint );

         /* Generate a location info string by converting +- sign info 
            into the N/S, E/W suffixes.
         */
         let location_str = CreateLocationString( this.LatLonPoint ); /*String*/

         // Display position info in the dialog
         this.Drawing.SetSResource( "SelectionDialog/Location", location_str );
         
         data = node.GetDResource( "Group/Value" );
         has_data = true;
         visibility_name = "MapArea/Icon0/Visibility";
      }
      else if( event_label == "Link" )
      {
         let link = message_obj.GetResourceObject( "Object" );   /* GlgObject */
         icon_name = link.GetSResource( "Name" );
         this.SelectedObject = link;
         
         label = "None";
         data = link.GetDResource( "Value" );
         has_data = true;
         visibility_name = "MapArea/Connections/Visibility";

         // Location is set to the mouse click by the preceding TraceCallback.
      }
      else
        return;  // No selection
      
      // Check if this layer is visible.
      let visibility_value =            /* double */
        this.Drawing.GetDResource( visibility_name );

      if( visibility_value == 1.0 )
      {
         if( icon_name == null )
           icon_name = "";
         
         // Display the icon name, label and data in the dialog.
         this.Drawing.SetSResource( "SelectionDialog/ID", icon_name ); 
         this.Drawing.SetSResource( "SelectionDialog/Facility", label ); 
         if( has_data )
           this.Drawing.SetDResource( "SelectionDialog/Data", data );
         this.Drawing.SetDResource( "SelectionDialog/DataLabel/Visibility",
                                    has_data ? 1.0 : 0.0 );
         
         // Graph's Visibility is constrained to the DataLabel's Visibility
         if( has_data )
           // Reset the graph by setting all datasamples to 0
           this.Drawing.SetDResource( "SelectionDialog/Graph/DataGroup/Points/DataSample%/Value", 0.0 );

         this.Drawing.SetDResource( "SelectionDialog/Visibility", 1.0 );
         this.Highlight( this.Drawing, highlight_obj );
      }
   }

   if( format != "Window" )
     this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Is used to obtain coordinates of the mouse click. 
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.TraceCallback =
  function( /* GlgObject */ viewport, /* GlgTraceData */ trace_info )
{      
   if( !this.Active )
     return;

   // Use the MapArea events only.
   if( !trace_info.viewport.Equals( this.MapViewport ) )
     return;

   let event_type = trace_info.event_type;
   switch( event_type )
   {
    case GLG.GlgEventType.TOUCH_START:
      // On mobile devices, enable touch dragging for defining ZoomTo region.
      if( !this.StartDragging )
         return;
      
      GLG.SetTouchMode();        /* Start dragging via touch events. */
      this.StartDragging = false;     /* Reset for the next time. */
      /* Fall through */

     case GLG.GlgEventType.MOUSE_PRESSED:
      this.Point.x = trace_info.mouse_x * this.CoordScale;
      this.Point.y = trace_info.mouse_y * this.CoordScale;
      this.Point.z = 0;
      
      /* COORD_MAPPING_ADJ is added to the cursor coordinates for precise
         pixel mapping.
      */
      this.Point.x += GLG.COORD_MAPPING_ADJ;
      this.Point.y += GLG.COORD_MAPPING_ADJ;
      break;

    default: return;
   }      

   if( this.MapViewport.GetDResource( "ZoomToMode" ) != 0 )	   
     return;    // Ignore clicks in zoom mode. 

   viewport.ScreenToWorld( true, this.Point, this.WorldPoint );

   /* Generate a location info string by converting +- sign info into the
      N/S, E/W suffixes.
   */
   let location_str = CreateLocationString( this.WorldPoint );   /* String */
   this.Drawing.SetSResource( "SelectionDialog/Location", location_str );   

   /* Set facility to "None" for now: will be set by the Select callback
      if any selected.
   */
   this.Drawing.SetSResource( "SelectionDialog/ID", "None" );
   this.Drawing.SetSResource( "SelectionDialog/Facility", "None" );
   
   // Not an icon or link: no associated data.
   this.Drawing.SetDResource( "SelectionDialog/DataLabel/Visibility", 0.0 );
      
   this.Drawing.SetDResource( "SelectionDialog/Visibility", 1.0 );
   this.Drawing.Update();
}

//////////////////////////////////////////////////////////////////////////
// Highlight or unhighlight selected map polygon.
// Changes the index of the color list transform attached to the object's
// FillColor.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.Highlight =
  function( /* GlgObject */ viewport, /* GlgObject */ sel_object )
{
   // Restore the color of the prev. highlighted object.
   if( this.SelectedColorIndex != null )
   {
      this.SelectedColorIndex.SetDResource( null, 0.0 );
      this.SelectedColorIndex = null;
   }

   // Highlight new object by changing its color
   if( sel_object != null )
   {
      this.SelectedColorIndex =
        sel_object.GetResourceObject( "SelectColorIndex" );
      if( this.SelectedColorIndex != null )
        this.SelectedColorIndex.SetDResource( null, 1.0 );
   }
}

//////////////////////////////////////////////////////////////////////////
// Converts Lat/Lon to X/Y in GLG world coordinates.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.GetXY = function( /* GlgPoint */ lat_lon, /* GlgPoint */ xy )
{
   GLG.GlmConvert( GLG.GlgProjectionType.RECTANGULAR_PROJECTION, this.Stretch, 
                   GLG.GlgCoordType.OBJECT_COORD, /* coord_to_lat_lon */ false,
                   this.MapCenter, this.MapExtent, 0.0,
                   this.GlgMinX, this.GlgMaxX, this.GlgMinY, this.GlgMaxY,
                   lat_lon, xy );
}

//////////////////////////////////////////////////////////////////////////
// Converts Lat/Lon to X/Y in GLG world coordinates.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.GetLatLon =
  function( /* GlgPoint */ xy, /* GlgPoint */ lat_lon )
{ 
   GLG.GlmConvert( GLG.GlgProjectionType.RECTANGULAR_PROJECTION, this.Stretch, 
                   GLG.GlgCoordType.OBJECT_COORD, /* coord_to_lat_lon */ true,
                   this.MapCenter, this.MapExtent, 0.0,
                   this.GlgMinX, this.GlgMaxX, this.GlgMinY, this.GlgMaxY,
                   xy, lat_lon );
}

//////////////////////////////////////////////////////////////////////////
// Generate a location info string by converting +- sign info into the
// N/S, E/W suffixes, and decimal fraction to deg, min, sec.
//////////////////////////////////////////////////////////////////////////
function CreateLocationString( /* GlgPoint */ point )   /* String */
{
   let x_deg, y_deg, x_min, y_min, x_sec, y_sec;  /* int */
   let char_x, char_y;  /* String */
   let lat, lon;        /* double */

   if( point.z < 0.0 )
     return "";

   lon = point.x;
   lat = point.y;
   
   if( lon < 0.0 )
   {
      lon = -lon;
      char_x = 'W';
   }
   else if( lon >= 360.0 )
   {
      lon -= 360.0;
      char_x = 'E';
   }
   else if( lon >= 180.0 )
   {
      lon = 180.0 - ( lon - 180.0 );
      char_x = 'W';
   }
   else
     char_x = 'E';
   
   if( lat < 0.0 )
   {
      lat = -lat;
      char_y = 'S';
   }
   else
     char_y = 'N';
   
   x_deg = Math.trunc( lon );
   x_min = Math.trunc( ( lon - x_deg ) * 60.0 );
   x_sec = Math.trunc( ( lon - x_deg - x_min / 60.0 ) * 3600.0 );
   
   y_deg = Math.trunc( lat );
   y_min = Math.trunc( ( lat - y_deg ) * 60.0 );
   y_sec = Math.trunc( ( lat - y_deg - y_min / 60.0 ) * 3600.0 );
   
   let location_string =
     "Lon=" + x_deg + "\u00B0" + 
          GLG.PrintfI( "%02d", x_min ) + "'" + 
          GLG.PrintfI( "%02d", x_sec ) + '"' + char_x +
     "  Lat=" + y_deg + "\u00B0" + 
          GLG.PrintfI( "%02d", y_min ) + "'" + 
          GLG.PrintfI( "%02d", y_sec ) + '"' + char_y;
   return location_string;
}

//////////////////////////////////////////////////////////////////////////
// Update display with data.
//////////////////////////////////////////////////////////////////////////
GlgMap.prototype.UpdateMap = function()
{
   if( !this.Active )
     return;
   
   let size;   /* int */
   let value;     /* double */
   let res_name;  /* String */

   if( this.PerformUpdates )
   {
      if( this.ShowFlow )
      {
         if( this.FlowDisplayObj == null )   // First time.
           this.FlowDisplayObj =
             this.Drawing.GetResourceObject( "MapArea/Link0/Line/LineType" );
         
         /* Links's flow is constrained: animating one animates all. 
            Flow direction is defined by the order of the links points when
            constrained.
         */
         if( this.FlowDisplayObj != null )
         {
            // Query the current line type and offset
            let flow_data =
              this.FlowDisplayObj.GetDResource( null );  /* double */
            let line_type = Math.trunc( flow_data ) % 32;   /* int */
            let offset = Math.trunc( flow_data ) / 32;      /* int */
               
            // Increase the offset and set it back.
            --offset;
            if( offset < 0 )
              offset = 32 * 31;
            flow_data = offset * 32 + line_type;
            this.FlowDisplayObj.SetDResource( null, flow_data );      
         }
         }
      
      // Update facility values every time.
      size = this.FacilitiesGroup.GetSize();
      for( let i=0; i<size; ++i )
      {
         value = GLG.Rand( 30.0, 500.0 );
         res_name = "MapArea/Icon" + i;
         let icon = this.Drawing.GetResourceObject( res_name );  /* GlgObject */
         icon.SetDResource( "Group/Value", value );
            
         // Update selected object data display in the SelectionDialog.
         if( icon.Equals( this.SelectedObject ) )
         {
            this.Drawing.SetDResource( "SelectionDialog/Data", value );
            this.Drawing.SetDResource( "SelectionDialog/Graph/DataGroup/EntryPoint",
                                       value / 500.0 );
            // To scroll ticks.
            this.Drawing.SetSResource( "SelectionDialog/Graph/XMajorGroup/TicksEntryPoint", "" );
         }
         
         if( ( this.Counter % UPDATE_N ) == 0 ) // Update icon type every n-th time.
         {
            if( GLG.Rand( 0.0, 10.0 ) > 2.0 )
            {
               let icon_type =  /* double */
                 icon.GetDResource( "Group/Graphics/IconType" );
               
               if( icon_type != 0.0 )
                 icon_type = 0.0;
               else		 
                 icon_type = GLG.Rand( 0.0, 6.0 );
               
               icon.SetDResource( "Group/Graphics/IconType", icon_type );
            }
         }
      }
         
      if( ( this.Counter % UPDATE_N ) == 0 )  // Update link values every n-th time.
      {
         size = this.LinksGroup.GetSize();
         for( let i=0; i<size; ++i )
         {      
            value = GLG.Rand( 1.0, 9.0 );
            res_name = "MapArea/Link" + i;
            let link = this.Drawing.GetResourceObject( res_name ); /*GlgObject*/
            link.SetDResource( "Value", value );
            if( this.ShowFlow )
              link.SetDResource( "Line/LineWidth", value );
            link.SetDResource( "Line/LineColorIndex", Math.trunc( value ) / 2 );
               
            // Update selected object data display in the SelectionDialog.
            if( link.Equals( this.SelectedObject ) )
            {
               this.Drawing.SetDResource( "SelectionDialog/Data", value );
               this.Drawing.SetDResource( "SelectionDialog/Graph/DataGroup/EntryPoint", 
                                          value / 10.0 );
               // To scroll ticks.
               this.Drawing.SetSResource( "SelectionDialog/Graph/XMajorGroup/TicksEntryPoint", "" );
            }
         }
      }
      
      ++this.Counter;
      if( this.Counter > 1000 )
        this.Counter = 0;
      
      this.Drawing.Update();
   }
   
  // Restart update timer.
  setTimeout( ()=>this.UpdateMap(), UPDATE_INTERVAL );
}

//////////////////////////////////////////////////////////////////////////
// Toggle resource between 0 and 1.
//////////////////////////////////////////////////////////////////////////
function ToggleResource( /* GlgObject */ glg_object, /* String */ res_name )
{
   let value = glg_object.GetDResource( res_name );   /* double */
   glg_object.SetDResource( res_name, value != 0.0 ? 0.0 : 1.0 );
}

//////////////////////////////////////////////////////////////////////////////
// Loads assets required by the application and invokes the specified
// callback when done.
//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.LoadAssets = function( callback )
{

   /* Define an internal variable to keep the number of loaded assets. */
   this.NumLoadedAssets = 0;

   let abort_test_function = ()=>!this.Active;
   
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
                          { name: "scrollbar_h", callback: callback },
                          abort_test_function );
   GLG.LoadWidgetFromURL( this.GetFullName( "scrollbar_v.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "scrollbar_v", callback: callback },
                          abort_test_function );
   
   GLG.LoadObjectFromURL( this.GetFullName( "palette.g" ), null,
                          this.AssetLoaded.bind( this ),
                          { name: "palette", callback: callback },
                          abort_test_function );
   
   GLG.LoadAsset( this.GetFullName( "us_map.g" ),
                  GLG.GlgHTTPRequestResponseType.GLG_DRAWING,
                  this.AssetLoaded.bind( this ),
                  { name: "us_map", callback: callback },
                  abort_test_function );

   GLG.LoadAsset( this.GetFullName( "facilities_s" ),
                  GLG.GlgHTTPRequestResponseType.TEXT,
                  this.AssetLoaded.bind( this ),
                  { name: "facilities_s", callback: callback },
                  abort_test_function );

   GLG.LoadAsset( this.GetFullName( "links_s" ),
                  GLG.GlgHTTPRequestResponseType.TEXT,
                  this.AssetLoaded.bind( this ),
                  { name: "links_s", callback: callback },
                  abort_test_function );
   
   GLG.LoadAsset( this.GetFullName( "world_map.g" ),
                  GLG.GlgHTTPRequestResponseType.GLG_DRAWING,
                  this.AssetLoaded.bind( this ),
                  { name: "world_map", callback: callback },
                  abort_test_function );
   
   GLG.LoadAsset( this.GetFullName( "facilities_w" ),
                  GLG.GlgHTTPRequestResponseType.TEXT,
                  this.AssetLoaded.bind( this ),
                  { name: "facilities_w", callback: callback },
                  abort_test_function );
   
   GLG.LoadAsset( this.GetFullName( "links_w" ),
                  GLG.GlgHTTPRequestResponseType.TEXT,
                  this.AssetLoaded.bind( this ),
                  { name: "links_w", callback: callback },
                  abort_test_function );
}

//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.AssetLoaded = function( loaded_data, data, path )
{
   if( !this.Active )
     return;

   switch( data.name )
   {
    case "scrollbar_h":
      if( loaded_data != null )    /* GlgObject */
        loaded_data.SetResourceObject( "$config/GlgHScrollbar", loaded_data );
      break;

    case "scrollbar_v":
      if( loaded_data != null )    /* GlgObject */
        loaded_data.SetResourceObject( "$config/GlgVScrollbar", loaded_data );
      break;

    case "palette":
      this.LoadCheck( loaded_data, data.name );
      this.Palette = loaded_data;       /* GlgObject */
      break;

    case "us_map":
      this.LoadCheck( loaded_data, data.name );
      this.USMapData = loaded_data;        /* Raw data */
      break;

    case "world_map":
      this.LoadCheck( loaded_data, data.name );
      this.WorldMapData = loaded_data;     /* Raw data */
      break;

    case "facilities_s":
      this.LoadCheck( loaded_data, data.name );
      this.USFacilities = loaded_data;     /* Uint8Array */
      break;

    case "facilities_w":
      this.LoadCheck( loaded_data, data.name );
      this.WorldFacilities = loaded_data;  /* Uint8Array */
      break;

    case "links_s":
      this.LoadCheck( loaded_data, data.name );
      this.USLinks = loaded_data;          /* Uint8Array */
      break;

    case "links_w":
      this.LoadCheck( loaded_data, data.name );
      this.WorldLinks = loaded_data;       /* Uint8Array */
      break;
      
    default:
      AppError( "Unexpected asset name" );
      break;
   }

   ++this.NumLoadedAssets;
    
   // Invoke the callback after all assets have been loaded.
   if( this.NumLoadedAssets == 9 )
     data.callback( data.user_data );
}

//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.LoadCheck = function( loaded_data, asset_name )
{
   if( this.FirstLoadError && loaded_data == null )
   {
      this.FirstLoadError = false;
      AppAlert( "Can't load " + asset_name +
             " asset, check console message for details." );
   }
}

//////////////////////////////////////////////////////////////////////////////
// Changes drawing size while maintaining width/height aspect ratio.
//////////////////////////////////////////////////////////////////////////////
GlgMap.prototype.SetDrawingSize = function( next_size )
{
   const ASPECT_RATIO = 800 / 625;
   
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
GlgMap.prototype.SetCanvasResolution = function()
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
      NativeWidgetTextScale = 0.6;
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
     AppLog( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppAlert( message )
{
   window.alert( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppError( message )
{
   console.error( message );
}

//////////////////////////////////////////////////////////////////////////////
function AppLog( message )
{
   console.log( message );
}

const SPACE_CHAR = ' '.charCodeAt( 0 );
const TAB_CHAR   = '\t'.charCodeAt( 0 );
const NL_CHAR    = '\n'.charCodeAt( 0 );
const CR_CHAR    = '\r'.charCodeAt( 0 );

/////////////////////////////////////////////////////////////////////
// Reads a string into a buffer, returns string length or 0 if
// no string was read.
// Automatically consumes trailing white space.
/////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadSimpleString =
  function( /* InputStream */ stream )  /* int */
{
   let next_char;    /* String */
      
   this.buffer_length = 0;
   this.buffer[ 0 ] = SPACE_CHAR;
      
   // Skip white places
   while( this.buffer[ 0 ] == SPACE_CHAR ||
          this.buffer[ 0 ] == TAB_CHAR ||
          this.buffer[ 0 ] == NL_CHAR ||
          this.buffer[ 0 ] == CR_CHAR )
   {
      next_char = stream.ReadChar();
      if( next_char == null )
        return 0;
      
      this.buffer[ 0 ] = next_char;
   }

   let offset = 0;       /* int */
   while( this.buffer[ offset ] != SPACE_CHAR &&
          this.buffer[ offset ] != TAB_CHAR &&
          this.buffer[ offset ] != NL_CHAR &&
          this.buffer[ offset ] != CR_CHAR )
   {
      ++offset;
      if( offset == this.buffer_length )   // Increase buffer size
      {	 
         let new_buffer = new Uint16Array( this.buffer_length * 2 );
         for( let i=0; i<this.buffer_length; ++i )	   
           new_buffer[i] = this.buffer[i];
         this.buffer = new_buffer;
         this.buffer_length *= 2;
      }
      
      next_char = stream.ReadChar();
      if( next_char == null )
        return offset;   // The last char may have no space after it: accept
      
      this.buffer[ offset ] = next_char;
   }
   return offset;
}

/////////////////////////////////////////////////////////////////////
// Returns null if no string was read.
/////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadString =
  function( /* InputStream */ stream )   /* String */
{
   let length = this.ReadSimpleString( stream );   /* Int */
   if( length == 0 )
     return null;

   return String.fromCharCode.apply( null, this.buffer.slice( 0, length ) );
}

/////////////////////////////////////////////////////////////////////
// Reads name (that may include spaces) until the ":" terminator.
// Returns null if no name was read.
/////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadName = function( /* InputStream */ stream )   /* String */
{
   let name = null;    /* String */

   while( true )
   {
      let name_part = this.ReadString( stream );    /* String */
      if( name_part == null || name_part == ":" )
        return name;
      
      if( name == null )
        name = name_part;
      else
        name = name + " " + name_part;
   }
}

/////////////////////////////////////////////////////////////////////
// Returns null if no character was read.
/////////////////////////////////////////////////////////////////////
function ReadChar( /* InputStream */ stream )   /* String */
{
   let ch;   /* String */

   while( true )
   {
      ch = stream.ReadChar();
      if( ch == null )
        return null;
      
      if( ch != SPACE_CHAR &&
          ch != TAB_CHAR &&
          ch != NL_CHAR &&
          ch != CR_CHAR )
        break;
   }
   return String.fromCharCode( ch );
}

/////////////////////////////////////////////////////////////////////
// Returns null if no integer was read.
/////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadInt = function( /* InputStream */ stream )   /* int */
{
   let string = this.ReadString( stream );
   if( string == null )
     return null;

   let value = parseInt( string );
   if( isNaN( value ) )
     return null;

   return value;
}

/////////////////////////////////////////////////////////////////////
// Returns null if no double value was read.
/////////////////////////////////////////////////////////////////////
GlgMap.prototype.ReadDouble = function( /* InputStream */ stream )  /* double */
{
   let string = this.ReadString( stream );
   if( string == null )
     return null;

   let value = parseFloat( string );
   if( isNaN( value ) )
     return null;

   return value;
}

////////////////////////////////////////////////////////////////////////
function InputStream( /* String */ data )
{
   this.length = data.length;                    /* int */
   this.curr_index = 0;                          /* int */
   this.has_more = ( this.length > 0 );          /* boolean */

   this.array = new Uint16Array( this.length );  /* Uint16Array */
   for( let i=0; i<this.length; ++i )
     this.array[ i ] = data.charCodeAt( i );
}

////////////////////////////////////////////////////////////////////////
// Returns null on end of stream.
////////////////////////////////////////////////////////////////////////
InputStream.prototype.ReadChar = function()    /* String */
{
   if( this.curr_index >= this.length )
     return null;

   let data = this.array[ this.curr_index ];
   ++this.curr_index;
   this.has_more = ( this.curr_index < this.length );
   return data;
}
