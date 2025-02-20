# Shriveling World in Blender

## Intro

[Shriveling World](https://theworldisnotflat.github.io/shriveling_world_documentation) is a web app intended to explore shriveled maps (multi-modal maps) of different datasets directly in your browser.

The application allows you to get an accurate representation of the model through interactive parameters.
But it is now easier to use advanced 3D software to fine tune the appearance of the outputs.

## Why Blender?

We chose [Blender](https://www.blender.org) because it’s a free and cross platform open source 3D creation suite that allows advanced shading, lighting and rendering options to tweak the visual output of the Shriveling World app.

Of course any 3D tool could be used as long as it supports .obj file.

**[Download Blender](https://www.blender.org/download/)**
(At least 2.91.0 Beta as of november 13th 2020)

The tutorial below is designed as a quick start to import data from the Shriveling App and effectively organize your scene in Blender[^version].


## Step by step 

#### Export from Shriveling world

When working in Blender you want to dispose of highest quality geometries.

* High definition cones: __Cones__, __coneStep__, value __1__
* Uncut cones (because current algorithm in _Shriveling world_ is, say, un-perfect): __Cones__, __withLimits__, __un-check__ (is checked by default)
* High definition curves: __Curves__, __number of points__, value __200__ (200 is the maximum, default is 50)
* Extrude countries: __Countries__, __extruded__, value __- 100__
* Export countries: __Countries__, __Export with__, __check__ (already checked by default)

After exporting from the app you should have a zip file containing 4 files:

- _country.obj_, the country limits contained in the 'geojson' input file
- _sceneCones.obj_, base geometry for terrestrial transport
- _sceneCurvesLongHaul.obj_, long distance flights
- _sceneCurvesShortHaul.obj_, short distance flights

Let’s get started.

### Import OBJ

1. Open Blender
2. New File > General
3. With your mouse in the [_3D Viewport_](https://docs.blender.org/manual/en/latest/interface/window_system/introduction.html) editor’s area **remove everything in the scene**
   - Press **A** (Select All)
	- Press **X** (then confirm by pressing **D**, **Enter** or click **“Delete”** in the contextual pop-up) or press **BackSpace** (for instant delete)
4. File > Import > Wavefront (.obj)

 In the _Blender File View_, find and select the .obj file on your system, then click **Import OBJ** or press **Enter**. The OBJ import allows only one file at a time.

Objects are named before exportation from 'Shriveling world' and will show in the right [_Outliner_](https://docs.blender.org/manual/en/latest/editors/outliner.html) panel:

 * _cone Tokyo_
 * _cone Hiroshima_
 * ...
 * _curve HST 001_
 * _curve HST 002_
 * _curve Aircraft 001_
 * ...

 For the sake of organization we can import each .obj file in a [collection](https://docs.blender.org/manual/en/latest/scene_layout/collections/introduction.html). We could do this by creating a collection for each additional import and renaming each collection to our needs in the [_Outliner_](https://docs.blender.org/manual/en/latest/editors/outliner.html).

 Select the desired collection in the _Outliner_ before importing the corresponding file as mentioned before.

Now we have imported our meshes, we can work in Blender as we like.
Tweak the geometry, set materials, lights, cameras and make renders.

However a few tips could be helpful.

### The beauties of Blender interface

The __Viewport__ is the central part of the screen, where all the objects and the scene are.

* It is often useful to toggle on and off __Show overlays__. For instance when a group of objects is selected, modified and you want to see the result in render; then toggle off View overlay hides the yellow selection lighting; here is the way:
   * in the top right part of the _Viewport_ toggle the __Show overlays__ checkbox. Grids, red and green lines, the orange halo of selection, etc.  will disappear.

#### Navigating in the scene
* Rotation of the view = maintain __middle click__ and move mouse
* Translation of the view = maintain __middle click + Shift__ and move mouse

#### Navigating around objects
As objects of the Shriveling project are located in reference to the center of the Earth, it proves convenient to adapt the navigation rules that by default consider the center of the Earth as th main reference point:
* In __Blender preferences__, accessed by the general menu __Edit__, and __Préferences__
* Choose the tab __Navigation__
* Toggle the box __Orbit around selection__

### Working with 3D objects

<small>J’inclus (temporairement) une [initiation à la modélisation sous Blender](https://perso.liris.cnrs.fr/vincent.nivoliers/mif27/tuto_blender28.php) en français (comme l’équipe actuelle est essentiellement francophone). Son auteur [Vincent Nivoliers](https://perso.liris.cnrs.fr/vincent.nivoliers/) travaille comme assistant professeur à [LIRIS](https://liris.cnrs.fr) (je suis tombé dessus totalement par hasard) mais revenons à nos moutons…</small>

#### Moving objects

Select objects and then:
* type __G__ and then mouse movements move selected objects

Move objects to the center:
If you imported the objects unprojected, the _World origin_ where the _Cursor_ of _Blender_ is, is at the center of the earth of the geographical objects generated by _Shriveling world_. This is also where is located the _center_ of all your objects. Once all the treatments have been done you may want to move your geometry at the center. 
1. Select the object, e.g the cones
2. From the menu __Object__, __Set Origin__, __Origin to Geometry__ this will move a little dot, its _Origin_ somewhere at the center of this object. This point is to become the point of reference of your scene.
3. Move cursor to there: __SHIFT + S__, __Cursor to active__
4. Move the _Cursor_ back at _World origin_: __SHIFT + S__, __Cursor to world origin__
5. Select all the objects
6. From the menu __Object__, __Snap__, __Selection to Cursor__

#### Zoom on objects

In _Layout_ view, choose from the menu _View_ the submenu _Frame all_

#### Test and correct normals

At the moment, volumes exported from _Shriveling world_, cones and countries, may exhibit _normals_ issues. Id est, interior and exterior normal vectors may be inverted. This will cause errors and unexpected results with boolean operations on geometries.

* To show normals of objects:
   * Go to __Viewport overlays__ menu in the top right par of the _Viewport_ window
   * Select __Face orientation__
   * From now, exterior faces are _blue_ and interior faces are _red_

* To modify the normals/the orientation of faces
   * In __Object mode__, select an object
   * Shift to Edit mode by pressing __Tab__
   * Select all vertices of the object by typing __A__
   * Press __Alt+N__ for the _Normals_ menu
   * Click __Recalculate outside__ to force all facets as outside (blue)

#### Cones

The shriveled topology exported as .obj file is composed of individual “cones” each named by the city on top.

Our intention here is to turn the collection of cones into a single multi-cones surface and remove the unneeded artifacts below the surface.

###### Simplify cones
Cones have complex geometry at the base that are complicating any operation on the geometry in Blender. Hence the need to remove it. 
1. Select the bottom vertices
    - Select all cones, in __Object mode__
    - Shift to __Edit mode__, by typing __SHIFT__
    - Make sure you are in __X Ray__, the small icon on top right of the __Viewport__
    - Select the top vertices of the cones
    - Extend selection with the menu __Select__, __Select more__
    - Invert selction with the menu __Select__, __Invert__
2. Merge the bottom vertices in a single point
    - Type __M__ and then __At center__
    - Type __G__ and move down the point so as to generate a buoy like shape
3. [Workaround](https://github.com/nickberckley/bool_tool/issues/34) to prepare the cones before [BoolTool](https://github.com/nickberckley/bool_tool/releases) operations
    - Select all cones, in __Object mode__
    - Shift to __Edit mode__, by typing __SHIFT__
    - Select all nodes by typing __A__
    - Pres __M__ and then __Merge by distance__
4. Combine the cones into a single, simplified shape with [BoolTool addon](https://github.com/nickberckley/bool_tool/releases)
    - Select __only two__ cones by mouse click
    - Use the _BoolTool_ function from the menu __Object__, __Boolean__, __Union__ (Boolean is on the bottom of the __Object__ menu)
    - Repeat the operation (all cones together [fails with BoolTool v 1.1.3](https://github.com/nickberckley/bool_tool/issues/34))
  
BoolTool is an addon, installed from the [BoolTool website](https://extensions.blender.org/add-ons/bool-tool/).

#### Clean up countries border volumes

Steps from a country volume already extruded in _Shriveling world_. Cleanup step is necessary to have a _clean_ geometry. We will rirstly turn the volume into a surface, then extrude it before converge it to the centre of the earth

1. In __Edit__ mode select all the bottom vertices
2. Type __Suppr__ all __Vertices__, the volume has become a surface
3. On the left choose __Extrude__ and extrude the surface towards the senter of the earth
4. Select all the bottom vertices
5. Type __m__, click __At center__
6. Type __n__, select the __Item__ tab and for the vertex coordinate values type __0__, __0__ and __0__

You may also want to [check and correct normals](#test-and-correct-normals)

It is recommended to simplify the geometry of the contour, as too many vertices (in the thousands) will make further operations costly in memory and computing power.

1. Select the object
2. Make sure to toggle __X rays__ for a correct selection of vertices
3. In __Edit__ mode select all the top vertices
4. In the menus __Mesh__, __Clean up__, __Decimate geometry__
5. Chek the normals

#### Cut cones at continent/countries border

_We consider that you have already extruded the continent shape in _Shiveling world_ before exporting_.

* Select the cones
* Click in the properties window (bottom right) on the __Modifier__ tab
* Click __Add modifier__
* Choose __Boolean__ from the _Generate_ section
* Select the __Intersect__ transformation
* Select the continents or countries shape

#### Curves

Depending on the value set for _Curves > number of points_[^naming] before exporting, results may vary (higher number should give more accurate curves).

In Blender, the straightforward way to work with things that looks like curve is using, guess what, _[Curves](https://docs.blender.org/manual/en/latest/modeling/curves/introduction.html)_! We are going to convert our faceless meshes to real curves… but before that:

<small>Temporary comment:</small>
For now the exported mesh geometry for “curves” include center of the earth reference vertex for each “curve”. If we find a solution it would be nice to export the .obj file without those center vertices.

Let’s remove those vertex in Blender.

#### Remove center vertex

1. Toggle X-Ray (with your mouse in the top right corner of the  _3D Viewport_ press **Alt+Z** or click on the <img src="./img/icon_x-ray@2x.png" alt="X-Ray Icon Inactive" title="X-Ray Icon Inactive" width="20" height="20" /> icon) to enable the selection of overlapping elements.
2. Select all the “curve” objects. Either :
	-  by pressing **A** (Select All) while your mouse is in the _3D Viewport_ (and with only the wanted objects visible)
	- with one of the _[selection tools](https://docs.blender.org/manual/en/latest/interface/selecting.html#selection-tools)_
	- with the _[Outliner](https://docs.blender.org/manual/en/latest/scene_layout/view_layers/introduction.html#outliner)_.
	**Warning:** depending on context (for example if the last active object was hidden from view), one pitfall could be a selection with no active object at all (with only orange outline). Be sure to have an [active object](https://docs.blender.org/manual/en/latest/scene_layout/object/selecting.html#selections-and-the-active-object) (with yellow outline) in the selection before continuing.
3. Switch to _Edit Mode_ (Press **Tab**).
4. Select all the vertices located at the World Origin with the _Select Box_ tool.
5. Delete them (Press **X** then **Enter**)

#### Move objects to center of the grid

Once the geometry is in desired shape it is convenient to move the objects to the center of the _Blender_ __World__.
To do so:
1. Select all objects
2. From the menu __Object__, __Snap__, __Snap cursor to origin__
3. __Object__, __Snap__, __Selection to cursor__

#### Convert objects to curves

In order to control size of curves we need to convert the imported meshes int curves objects in Blender:

1. Switch to _Object Mode_ (Press **Tab**)
2. Select all the meshes you want to convert
   * Beware: you should first manually select one curve in the _Viewport_ before selecting all the others; the first selected should appear in yellow and the others on orange; if you have not done this subsequent operations may not work
3. Convert still selected objects to curve (_Object > Convert to > Curve from Mesh/Text_ or press **F3** (Menu Search), type “convert” and choose corresponding function)

#### Set curves width
1. Select the curves you want to modify
2. Open _Object Data Properties_ [tab](https://docs.blender.org/manual/en/latest/interface/window_system/tabs_panels.html) located at the bottom right
3. Check that _Fill Mode_ is set to “Full”
4. Open _[Geometry](https://docs.blender.org/manual/en/latest/modeling/curves/properties/geometry.html#)_ panel and in the _Bevel_ [subpanel](https://docs.blender.org/manual/en/latest/interface/window_system/tabs_panels.html#panels) set _Depth_. A proposed relevant value can be __0.02 m__

This operation may be done on only one object and then [applied to others](#apply-properties-to-all-selected-objects).

#### Apply properties to all selected objects

To apply properties to all selected objects (because changes you make in _Object Data Properties_ only affect active object) **right click** on the modified _[Fields](https://docs.blender.org/manual/en/latest/interface/controls/buttons/fields.html)_ to open a contextual menu and choose _Copy to Selected_. In case you have already [joined the curves](#cones), this step is not needed.

### Rendering

#### Removing objects from rendering
You may remove from rendering several objects, e.g. countries, and keep then for a later use:
1. in the _Scene collection_ right click on an objet or a collection of objects
2. in the popup menu choose __Visibility__
3. in the sub-menu choose __Disable in render__

A quicker and more convenient way consists in adding columns in objects box on top right. Click the tiny funnel on top right, and select the __Disable in Renders__ selection toggle.

#### Rendering parameters

Rendering parameters can be accessed in the properties box, down right. Click on the __Render properties__ tab.

* In Blender two main __Rendering engines__ are available:
  * [EEVEE](https://docs.blender.org/manual/en/latest/render/eevee/introduction.html), by default, is fast with decent result
  * [Cycles](https://docs.blender.org/manual/en/latest/render/cycles/introduction.html) allows to reach photorealism but can be slow
* It is preferable to synchronize the values of sampling between _Render_ and _Viewport_, at the level __64__. Shadows should be better rendered while working on the scene

#### Transparent background

So far a __transparent background__ gives good results in rendering. In order to get this:
* Set _background_ to _black_
  * In the down right properties box select __World properties__
  * Change __Color__ to black (so that the background does not interfere with the objects in scene)
* You'll also need to remove the background from the render:
   * In the down right properties box select __Render properties__
   * Down below in section __Film__ click __Transparent__ (Film refers to the historical celluloid ribbon on which cartoons where drawn)

### Using HDRI

HDRI, or High Dynamic Range Images, can be used to generate a relevant lighting environment. Good results are obtained with a photo studio lighting environment.

1. Download [a studio HRDI (image)](https://hdrihaven.com/hdri/?c=studio&h=studio_small_03). Resolution is not an issue since we only use the HDRI for generating a lighting environment, and not for complex reflections on mirror surfaces, so a small size HDRI will be enough.
* _The following instructions come from [this extremely useful video tutorial](https://www.youtube.com/watch?v=sbAj3IFlBL0)_
2. Load the HRDI
     * In _World_ properties click on the colored dot beside __Color__, set it to __Environment texture__
     * Click __Open__ and catch the HDRI image you have downloaded
3. Move and rotate the HDRI (in order to locate our scene right where it should be in the studio)
     * Click on the top right corner of the render view to open a second render view
     * Change to __Shader editor__ from the top left icon
     * From a menu in the top left part of the _Viewport_ switch from __Object__ to __World__
     * Add a _Texture coordinate_ node by __Shift+A__ and type __Texture coordinate__
     * Add a _Mapping_ node by __Shift+A__ and type ___Mapping___
     * Connect the __Generated output__ of the _Texture coordinate_ to the __Vector__ of the _Mapping_ node
     * Connect the Vector of the _Mapping_ node to the __Vector__ of the __HDRI__ node
     * Play around with __Location__ and with __Rotation__ X, Y and Z to locate the objects of the scene right where they should be in the studio :)
4. Remove HDRI image from view:
     * In the bottom right window select __Render Properties__
     * In the __Film__ section tick the box __Transparent__

### Camera

WIP Explain different [Camera](https://docs.blender.org/manual/en/latest/render/cameras.html#properties) settings (*Orthographic* vs *Perspective* for example) specific to Shriveling.

If in the [first step](#import-obj) you removed the default camera, you will need to create a new one.

#### Create camera

1. In Modelling mode
2. In top left part of the _3D viewport_ click on __Add__ and then on __Camera__

#### Update camera view

__Ctrl+Alt+0__ in case you have a numpad

It is possible to lock the camera to the current view:
1. type __N__, a tiny menu on the right of the viewport shows up
2. switch to the __View__ section of this menu
3. then in __View lock__ select __Camera to view__

#### Use current view to adjust the camera

* In the menu __View_ -> __Align View__ -> __Align Active Camera to View__

#### Objects lost from sight in Camera view

* The camera view may be lost ot a "user perspective" that is precised in the upper left part of the _Viewport_. Toggling between the two perspectives is done by a click on the __Camera icon__ on the right of the _Viewport_ or by choosing from top left part of the Viewport __View -> Camera -> Active camera__.

* Objects may be lost from view when zooming or de-zooming with the camera view selected. This unintended behavior can be adapted by changing the camera properties:
  1. Select the camera
  2. Click on the __Camera tab__ in the Object properties box, down right
  3. In section __Lens__ set __Clip end__ at a different value, for instance from 100 m to __1000 m__


### Materials / Shading / Lighting

WIP Explain briefly which _[Materials](https://docs.blender.org/manual/en/latest/render/materials/introduction.html)_ and/or _[Shaders](https://docs.blender.org/manual/en/latest/render/shader_nodes/introduction.html)_ to use to get nice results.

WIP PBR vs NPR, shadeless, transparency, colors…

#### Curves material
Good results have been obtained by using an Emission material for curves that allows to set a very bright color.
* First select a curve
* In the right down __Material Properties box__, create (1) or attribute an existing material (2) to the object:
  1. Create a __New__ material with:
      * __Surface__ set to __Emission__
	  * __Color__ set to Red, Blue or else
	  * __Strength__ default value of __1__ may be adjusted to __2__ or more. This parameter should be considered together with the width of the curve, [set by the Bevel value](#convert-objects-to-curves)
  2. A tiny button on the left gives access to _existing_ materials. Beware: if you change the material properties here this will affect the other objects using this material

This operation may be done on only one object and then [applied to others](#apply-properties-to-all-selected-objects).

#### The shaders with nodes

Shaders can be awfully complicated. This is why the Shaders interface is here to help.

* It is strongly recommended to use the __Node wrangler__ addon
* It is relevant to [toggle/un-toggle the Overlays](#the-beauties-of-blender-interface)
* After a click on the material, __Ctrl+T__  will generate a texture. We can remove the __Image texture__ and remake the connection (thanks to Node wrangler)
* After a click on Mappîng, __Ctrl+Shift+click__ will generate a viewer; connecting the MApping to different variables of the Texture coordinates box will generate colors in the objects that can be used to create gradients; in order to highlight some parts of the geometry we want to emphasize
* In the end reconnect directly the material to the __Surface__ of __Material output__

### Lights

Good results are obtained by using one or several _suns_ and additional punctual sources (_point_) to highlight some elements of the scene.

#### Creating a light
* In __Layout view__, click on internal menu __Add__ and then __Light__
* Existing lights can be turned into _sun_ or _point_ source in the down right box:
  * click on the __Light__ tab
  * change __Point__ into __Sun__ or vice-versa
* __Strength__ may need to be adjusted to higher values than default 1. Value __2__ gives good results
* In case where two _Suns_ are introduced, their __Angles__ must be adjusted to create the desired effect


[^version]: Note: Blender evolves quickly. Since version 2.79b the whole interface has changed and a lot of new features are implemented. The base concepts remain the same so you could get interesting results with any version suited to your computer. However, this tutorial is clearly geared towards recent versions (since 2.80).

[^naming]: In the web-app the naming could be subject to change. “There are only two hard things in Computer Science: cache invalidation and naming things.” -- Phil Karlton. [Some jokes about that infamous quote](https://martinfowler.com/bliki/TwoHardThings.html), [Reference from David Karlton (Phil’s son)](https://www.karlton.org/2017/12/naming-things-hard/ ) and BTW [Stack exchange is your second best friend after Google](https://skeptics.stackexchange.com/questions/19836/has-phil-karlton-ever-said-there-are-only-two-hard-things-in-computer-science)
